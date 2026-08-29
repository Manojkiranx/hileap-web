import request from 'supertest';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import app from '../server';
import User from '../models/User';
import Customer from '../models/Customer';
import Bill from '../models/Bill';
import Payment from '../models/Payment';
import InventoryItem from '../models/InventoryItem';
import Complaint from '../models/Complaint';
import { calculateCustomerPendingAmount } from '../services/ledgerService';
import { isWithinWorkingHours } from '../services/locationService';

describe('Cable & Wi-Fi Management System - Comprehensive Integration Tests', () => {
  let adminToken: string;
  let collectionAgentToken: string;
  let serviceAgentToken: string;
  let unauthorizedAgentToken: string;

  beforeAll(async () => {
    // Connect to test MongoDB database
    const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/hileap_test_db';
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoUri);
    }

    // Clear test collections
    await User.deleteMany({});
    await Customer.deleteMany({});
    await Bill.deleteMany({});
    await Payment.deleteMany({});
    await InventoryItem.deleteMany({});
    await Complaint.deleteMany({});

    const passwordHash = await bcrypt.hash('TestPass@123', 10);

    // 1. Seed Admin
    await User.create({
      employeeId: 'EMP-ADMIN',
      name: 'Test Admin',
      phone: '9999999999',
      email: 'admin@test.com',
      password: passwordHash,
      role: 'Admin',
      assignedWorks: ['admin_management'],
      employmentStatus: 'ACTIVE',
    });

    // 2. Seed Authorized Collection Agent (Rule 1 satisfied)
    await User.create({
      employeeId: 'EMP-COLL-AUTH',
      name: 'Authorized Collector',
      phone: '8888888888',
      email: 'collector@test.com',
      password: passwordHash,
      role: 'Collection-Agent',
      assignedWorks: ['door_cable_collection'],
      employmentStatus: 'ACTIVE',
    });

    // 3. Seed Unauthorized Collection Agent (Rule 1 NOT satisfied - no collection work)
    await User.create({
      employeeId: 'EMP-COLL-UNAUTH',
      name: 'Unauthorized Collector',
      phone: '7777777777',
      email: 'unauthcollector@test.com',
      password: passwordHash,
      role: 'Collection-Agent',
      assignedWorks: ['office_work_only'],
      employmentStatus: 'ACTIVE',
    });

    // 4. Seed Customer Service Agent
    await User.create({
      employeeId: 'EMP-SVC',
      name: 'Test Field Tech',
      phone: '6666666666',
      email: 'tech@test.com',
      password: passwordHash,
      role: 'Customer-Service-Agent',
      assignedWorks: ['customer_service'],
      employmentStatus: 'ACTIVE',
      workStatus: 'AVAILABLE',
      workingHours: { startTime: '00:00', endTime: '23:59', timezone: 'Asia/Kolkata' },
    });

    // Login Admin
    const adminRes = await request(app)
      .post('/api/auth/login')
      .send({ identifier: 'admin@test.com', password: 'TestPass@123' });
    adminToken = adminRes.body.token;

    // Login Authorized Collector
    const collRes = await request(app)
      .post('/api/auth/login')
      .send({ identifier: 'collector@test.com', password: 'TestPass@123' });
    collectionAgentToken = collRes.body.token;

    // Login Unauthorized Collector
    const unauthCollRes = await request(app)
      .post('/api/auth/login')
      .send({ identifier: 'unauthcollector@test.com', password: 'TestPass@123' });
    unauthorizedAgentToken = unauthCollRes.body.token;

    // Login Service Agent
    const svcRes = await request(app)
      .post('/api/auth/login')
      .send({ identifier: 'tech@test.com', password: 'TestPass@123' });
    serviceAgentToken = svcRes.body.token;
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  /* -------------------------------------------------------------------------- */
  /* TEST GROUP 1: AUTHENTICATION & RULE 1 ROLE-BASED AUTHORIZATION            */
  /* -------------------------------------------------------------------------- */
  describe('Authentication & Authorization RBAC (Rules 1, 2, 3, 4, 5)', () => {
    it('1.1 Login fails with invalid password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ identifier: 'admin@test.com', password: 'WrongPassword' });
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('1.2 Rule 1: Authorized Collection Agent can access collection endpoint', async () => {
      const res = await request(app)
        .get('/api/payments')
        .set('Authorization', `Bearer ${collectionAgentToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('1.3 Rule 1: Unauthorized Collection Agent without assigned collection work is rejected with 403 Forbidden', async () => {
      const res = await request(app)
        .post('/api/payments')
        .set('Authorization', `Bearer ${unauthorizedAgentToken}`)
        .send({ customerId: 'CUST-1', amount: 500 });
      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Unauthorized collection work');
    });

    it('1.4 Rule 2: Collection Agent cannot edit customer details (rejected with 403)', async () => {
      const res = await request(app)
        .put('/api/customers/CUST-1001')
        .set('Authorization', `Bearer ${collectionAgentToken}`)
        .send({ name: 'Hacked Name' });
      expect(res.status).toBe(403);
    });

    it('1.5 Rule 3 & 5: Only Admin can add master inventory (Collection/Service agents rejected)', async () => {
      const res = await request(app)
        .post('/api/inventory')
        .set('Authorization', `Bearer ${serviceAgentToken}`)
        .send({ itemType: 'SET_TOP_BOX', name: 'STB Test', serialNumber: 'STB-TEST-001' });
      expect(res.status).toBe(403);
    });
  });

  /* -------------------------------------------------------------------------- */
  /* TEST GROUP 2: AUTOMATIC PENDING AMOUNT CALCULATIONS & LEDGER              */
  /* -------------------------------------------------------------------------- */
  describe('Automatic Pending Amount Calculation & Payment Ledger (Section 6 & 12)', () => {
    it('2.1 Calculates pending balance accurately: Previous Balance + Bills - Payments', async () => {
      const customer = await Customer.create({
        customerId: 'CUST-TEST-101',
        name: 'Ledger Test Customer',
        phone: '9840000000',
        address: '123 Test St',
        area: 'Anna Nagar',
        subscriptionType: 'CABLE',
        planName: 'Standard',
        monthlyBill: 400,
        boxId: 'BOX-TEST-101',
        previousUnpaidBalance: 200,
      });

      await Bill.create({
        billId: 'BILL-2026-08-CUST-TEST-101',
        customerId: 'CUST-TEST-101',
        month: '2026-08',
        amount: 400,
        dueDate: new Date(),
        status: 'UNPAID',
      });

      // Initial Pending = 200 (Previous) + 400 (Bill) = 600
      let summary = await calculateCustomerPendingAmount('CUST-TEST-101');
      expect(summary.pendingAmount).toBe(600);

      // Record ₹250 Payment
      await request(app)
        .post('/api/payments')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ customerId: 'CUST-TEST-101', amount: 250, paymentMethod: 'UPI' });

      // Updated Pending = 600 - 250 = 350
      summary = await calculateCustomerPendingAmount('CUST-TEST-101');
      expect(summary.pendingAmount).toBe(350);
    });

    it('2.2 Rejects payment with zero or negative amount', async () => {
      const res = await request(app)
        .post('/api/payments')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ customerId: 'CUST-TEST-101', amount: -50 });
      expect(res.status).toBe(400);
    });

    it('2.3 Corrects payment entry with mandatory reason and maintains audit history', async () => {
      const payRes = await request(app)
        .post('/api/payments')
        .set('Authorization', `Bearer ${collectionAgentToken}`)
        .send({ customerId: 'CUST-TEST-101', amount: 100, paymentMethod: 'CASH' });

      const paymentId = payRes.body.data.paymentId;

      // Correct entry to 150
      const correctRes = await request(app)
        .post(`/api/payments/${paymentId}/correct`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ newAmount: 150, reason: 'Corrected typo in receipt amount.' });

      expect(correctRes.status).toBe(200);
      expect(correctRes.body.data.status).toBe('CORRECTED');
      expect(correctRes.body.data.amount).toBe(150);
      expect(correctRes.body.data.correctionHistory).toHaveLength(1);
      expect(correctRes.body.data.correctionHistory[0].previousAmount).toBe(100);
      expect(correctRes.body.data.correctionHistory[0].reason).toBe('Corrected typo in receipt amount.');
    });
  });

  /* -------------------------------------------------------------------------- */
  /* TEST GROUP 3: INVENTORY VALIDATIONS (RULES 6, 7, 8, 9)                    */
  /* -------------------------------------------------------------------------- */
  describe('Hardware Usage Strict Validation (Rules 6, 7, 8, 9)', () => {
    it('3.1 Rule 6: Rejects Set-top Box usage if serial number is missing', async () => {
      const res = await request(app)
        .post('/api/inventory/take')
        .set('Authorization', `Bearer ${serviceAgentToken}`)
        .send({
          complaintId: 'CMP-1001',
          customerId: 'CUST-TEST-101',
          items: [{ itemType: 'SET_TOP_BOX', serialNumber: '' }],
        });
      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Set-top Box serial number is mandatory');
    });

    it('3.2 Rule 7: Rejects Router usage if serial number is missing', async () => {
      const res = await request(app)
        .post('/api/inventory/take')
        .set('Authorization', `Bearer ${serviceAgentToken}`)
        .send({
          complaintId: 'CMP-1001',
          customerId: 'CUST-TEST-101',
          items: [{ itemType: 'WIFI_ROUTER', serialNumber: '' }],
        });
      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Wi-Fi Router/Modem serial number is mandatory');
    });

    it('3.3 Rule 8: Rejects Cable usage if length is missing or zero', async () => {
      const res = await request(app)
        .post('/api/inventory/take')
        .set('Authorization', `Bearer ${serviceAgentToken}`)
        .send({
          complaintId: 'CMP-1001',
          customerId: 'CUST-TEST-101',
          items: [{ itemType: 'CABLE', lengthMeters: 0 }],
        });
      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Cable length in meters is mandatory');
    });

    it('3.4 Rule 9: Rejects Optical Fiber usage if length is missing or zero', async () => {
      const res = await request(app)
        .post('/api/inventory/take')
        .set('Authorization', `Bearer ${serviceAgentToken}`)
        .send({
          complaintId: 'CMP-1001',
          customerId: 'CUST-TEST-101',
          items: [{ itemType: 'OPTICAL_FIBER', lengthMeters: 0 }],
        });
      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Optical Fiber length in meters is mandatory');
    });

    it('3.5 Successfully records hardware taken when all mandatory properties are provided', async () => {
      const res = await request(app)
        .post('/api/inventory/take')
        .set('Authorization', `Bearer ${serviceAgentToken}`)
        .send({
          complaintId: 'CMP-1001',
          customerId: 'CUST-TEST-101',
          items: [
            { itemType: 'SET_TOP_BOX', serialNumber: 'STB-VALID-101' },
            { itemType: 'CABLE', lengthMeters: 30 },
          ],
        });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.transactions).toHaveLength(2);
    });
  });

  /* -------------------------------------------------------------------------- */
  /* TEST GROUP 4: WORKING HOURS & LOCATION TRACKING                           */
  /* -------------------------------------------------------------------------- */
  describe('Working Hours & Location Tracking (Rule 10 / Section 16)', () => {
    it('4.1 Helper accurately evaluates working hours window', () => {
      const activeConfig = { startTime: '00:00', endTime: '23:59', timezone: 'Asia/Kolkata' };
      expect(isWithinWorkingHours(activeConfig)).toBe(true);
    });

    it('4.2 Accepts GPS update from Service Agent during working shift', async () => {
      const res = await request(app)
        .post('/api/locations')
        .set('Authorization', `Bearer ${serviceAgentToken}`)
        .send({ latitude: 13.0827, longitude: 80.2707, accuracy: 10 });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  /* -------------------------------------------------------------------------- */
  /* TEST GROUP 5: ADMIN PASSWORD CHANGE, HARD DELETE & SUBSCRIPTION TOGGLE    */
  /* -------------------------------------------------------------------------- */
  describe('Admin Password Security, Hard Delete & Subscription Toggle', () => {
    it('5.1 Change password fails if old password is incorrect', async () => {
      const res = await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ oldPassword: 'WrongOldPassword', newPassword: 'NewAdminPass@2026' });
      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Current password is incorrect');
    });

    it('5.2 Change password succeeds with valid old password', async () => {
      const res = await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ oldPassword: 'TestPass@123', newPassword: 'NewAdminPass@2026' });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify login works with new password
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ identifier: 'admin@test.com', password: 'NewAdminPass@2026' });
      expect(loginRes.status).toBe(200);
      expect(loginRes.body.token).toBeDefined();
    });

    it('5.3 Toggle subscription switches customer status between ACTIVE and UNSUBSCRIBED', async () => {
      const res1 = await request(app)
        .patch('/api/customers/CUST-TEST-101/toggle-subscription')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res1.status).toBe(200);
      expect(res1.body.data.status).toBe('UNSUBSCRIBED');

      const res2 = await request(app)
        .patch('/api/customers/CUST-TEST-101/toggle-subscription')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res2.status).toBe(200);
      expect(res2.body.data.status).toBe('ACTIVE');
    });

    it('5.4 Hard Delete permanently removes customer document from database', async () => {
      const delRes = await request(app)
        .delete('/api/customers/CUST-TEST-101')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(delRes.status).toBe(200);
      expect(delRes.body.success).toBe(true);

      const findRes = await Customer.findOne({ customerId: 'CUST-TEST-101' });
      expect(findRes).toBeNull();
    });

    it('5.5 Delete All Audit Logs clears all entries from MongoDB', async () => {
      const delRes = await request(app)
        .delete('/api/audit-logs')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(delRes.status).toBe(200);
      expect(delRes.body.success).toBe(true);
      expect(delRes.body.message).toContain('All security audit logs deleted successfully');
    });

    it('5.6 Delete Payment History within Date Range purges matching entries from MongoDB', async () => {
      const delRes = await request(app)
        .post('/api/payments/delete-history')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ startDate: '2026-01-01', endDate: '2026-12-31' });
      expect(delRes.status).toBe(200);
      expect(delRes.body.success).toBe(true);
      expect(delRes.body.deletedCount).toBeGreaterThanOrEqual(1);
    });

    it('5.7 GET /api/customers/me returns logged in customer profile & live ledger details', async () => {
      const newCust = await Customer.create({
        customerId: 'CUST-PORTAL-TEST',
        name: 'Portal Test Customer',
        phone: '9777777777',
        address: '123 Portal St',
        area: 'Athippaly',
        subscriptionType: 'BOTH',
        planName: 'Combo High Speed',
        monthlyBill: 800,
        boxId: 'BOX-PORTAL-100',
        status: 'ACTIVE',
      });

      const custLoginRes = await request(app)
        .post('/api/auth/customer-login')
        .send({ identifier: 'CUST-PORTAL-TEST' });

      expect(custLoginRes.status).toBe(200);
      const custToken = custLoginRes.body.token;

      const profileRes = await request(app)
        .get('/api/customers/me')
        .set('Authorization', `Bearer ${custToken}`);

      expect(profileRes.status).toBe(200);
      expect(profileRes.body.success).toBe(true);
      expect(profileRes.body.data.customerId).toBe('CUST-PORTAL-TEST');
      expect(profileRes.body.data.monthlyBill).toBe(800);
      expect(profileRes.body.data.pendingAmount).toBeDefined();

      await Customer.deleteOne({ customerId: 'CUST-PORTAL-TEST' });
    });
  });
});
