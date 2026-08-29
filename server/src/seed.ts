import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

import User from './models/User';
import Customer from './models/Customer';
import Bill from './models/Bill';
import Payment from './models/Payment';
import InventoryItem from './models/InventoryItem';
import InventoryTransaction from './models/InventoryTransaction';
import Complaint from './models/Complaint';
import Salary from './models/Salary';
import SystemSettings from './models/SystemSettings';
import LocationUpdate from './models/LocationUpdate';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/hileap_db';

export const seedDatabase = async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log(`[Seed] Connected to ${MONGODB_URI}`);

    // Clear existing collections for clean seed
    await User.deleteMany({});
    await Customer.deleteMany({});
    await Bill.deleteMany({});
    await Payment.deleteMany({});
    await InventoryItem.deleteMany({});
    await InventoryTransaction.deleteMany({});
    await Complaint.deleteMany({});
    await Salary.deleteMany({});
    await SystemSettings.deleteMany({});
    await LocationUpdate.deleteMany({});

    console.log('[Seed] Cleared database collections.');

    // 1. Seed System Settings
    await SystemSettings.create([
      { key: 'COMPANY_UPI_ID', value: 'hileapnetwork@upi' },
      { key: 'COMPANY_UPI_QR_URL', value: 'https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=upi://pay?pa=hileapnetwork@upi&pn=HiLeap%20Network' },
      { key: 'RECHARGE_URL', value: 'https://external-recharge-portal.example.com/recharge?boxId={BOX_ID}&customerId={CUSTOMER_ID}' },
      { key: 'PAUSE_RESUME_URL', value: 'https://external-recharge-portal.example.com/pause-resume?boxId={BOX_ID}&customerId={CUSTOMER_ID}' },
      { key: 'UNSUBSCRIBE_URL', value: 'https://external-recharge-portal.example.com/unsubscribe?boxId={BOX_ID}&customerId={CUSTOMER_ID}' },
      { key: 'ALLOW_OVERPAYMENT', value: false },
    ]);

    // 2. Passwords Hashing
    const adminPass = await bcrypt.hash('HileapAdmin@2026', 10);
    const agentPass = await bcrypt.hash('AgentPass@123', 10);

    // 3. Seed Users / Employees
    const adminUser = await User.create({
      employeeId: 'EMP-100',
      name: 'Rajesh Sharma (Admin)',
      phone: '+919876543210',
      email: 'admin@hileap.com',
      password: adminPass,
      role: 'Admin',
      assignedWorks: ['admin_management'],
      employmentStatus: 'ACTIVE',
      workStatus: 'OFFLINE',
      salaryDetails: { baseSalary: 60000, allowances: 10000, deductions: 2000 },
      workingHours: { startTime: '09:00', endTime: '18:00', timezone: 'Asia/Kolkata' },
    });

    const collAgent1 = await User.create({
      employeeId: 'EMP-101',
      name: 'Karthik Raja',
      phone: '+919876543211',
      email: 'coll1@hileap.com',
      password: agentPass,
      role: 'Collection-Agent',
      assignedWorks: ['door_cable_collection'],
      employmentStatus: 'ACTIVE',
      workStatus: 'OFFLINE',
      salaryDetails: { baseSalary: 18000, allowances: 2500, deductions: 500 },
      workingHours: { startTime: '09:00', endTime: '18:00', timezone: 'Asia/Kolkata' },
    });

    const collAgent2 = await User.create({
      employeeId: 'EMP-102',
      name: 'Anita Venkatesh',
      phone: '+919876543212',
      email: 'coll2@hileap.com',
      password: agentPass,
      role: 'Collection-Agent',
      assignedWorks: ['door_wifi_collection'],
      employmentStatus: 'ACTIVE',
      workStatus: 'OFFLINE',
      salaryDetails: { baseSalary: 19000, allowances: 2500, deductions: 500 },
      workingHours: { startTime: '09:00', endTime: '18:00', timezone: 'Asia/Kolkata' },
    });

    const svcAgent1 = await User.create({
      employeeId: 'EMP-103',
      name: 'Suresh Kumar (Field Tech)',
      phone: '+919876543213',
      email: 'svc1@hileap.com',
      password: agentPass,
      role: 'Customer-Service-Agent',
      assignedWorks: ['customer_service'],
      employmentStatus: 'ACTIVE',
      workStatus: 'AVAILABLE',
      salaryDetails: { baseSalary: 22000, allowances: 3000, deductions: 800 },
      workingHours: { startTime: '09:00', endTime: '18:00', timezone: 'Asia/Kolkata' },
    });

    const svcAgent2 = await User.create({
      employeeId: 'EMP-104',
      name: 'Praveen Chandran (Field Tech)',
      phone: '+919876543214',
      email: 'svc2@hileap.com',
      password: agentPass,
      role: 'Customer-Service-Agent',
      assignedWorks: ['customer_service'],
      employmentStatus: 'ACTIVE',
      workStatus: 'AVAILABLE',
      salaryDetails: { baseSalary: 23000, allowances: 3000, deductions: 800 },
      workingHours: { startTime: '09:00', endTime: '18:00', timezone: 'Asia/Kolkata' },
    });

    console.log('[Seed] Created Employees.');

    // 4. Seed Initial Field Agent Locations
    await LocationUpdate.create([
      {
        employeeId: 'EMP-103',
        latitude: 13.0827,
        longitude: 80.2707,
        accuracy: 10,
        timestamp: new Date(),
        workingStatus: 'AVAILABLE',
      },
      {
        employeeId: 'EMP-104',
        latitude: 13.0418,
        longitude: 80.2341,
        accuracy: 15,
        timestamp: new Date(),
        workingStatus: 'AVAILABLE',
      },
    ]);

    // 5. Seed Customers
    const customers = await Customer.create([
      {
        customerId: 'CUST-1001',
        name: 'Ravi Kumar',
        phone: '9840123456',
        altPhone: '9840999888',
        address: 'No. 14, 2nd Main Road, Anna Nagar',
        area: 'Anna Nagar',
        location: { latitude: 13.085, longitude: 80.2101 },
        subscriptionType: 'BOTH',
        planName: 'HD Cable + 100Mbps Fiber Combo',
        monthlyBill: 750,
        boxId: 'BOX-AN-1001',
        setTopBoxSerial: 'STB-AN-9901',
        routerSerial: 'RTR-AN-8801',
        status: 'ACTIVE',
        previousUnpaidBalance: 500,
        notes: 'VIP Customer. Prefers morning service calls.',
      },
      {
        customerId: 'CUST-1002',
        name: 'Priya Sundaram',
        phone: '9840234567',
        address: 'Flat 3B, Sunshine Apartments, T. Nagar',
        area: 'T. Nagar',
        location: { latitude: 13.0418, longitude: 80.2341 },
        subscriptionType: 'WIFI',
        planName: '200Mbps Ultra Fiber',
        monthlyBill: 999,
        boxId: 'BOX-TN-1002',
        routerSerial: 'RTR-TN-8802',
        status: 'ACTIVE',
        previousUnpaidBalance: 0,
        notes: 'Doorbell broken, please call before arriving.',
      },
      {
        customerId: 'CUST-1003',
        name: 'Mohamed Ibrahim',
        phone: '9840345678',
        address: 'Door 45, Beach Road, Velachery',
        area: 'Velachery',
        location: { latitude: 12.9756, longitude: 80.2207 },
        subscriptionType: 'CABLE',
        planName: 'Digital Standard Pack',
        monthlyBill: 350,
        boxId: 'BOX-VEL-1003',
        setTopBoxSerial: 'STB-VEL-9903',
        status: 'PAUSED',
        previousUnpaidBalance: 350,
        notes: 'Requested temporary pause while out of town.',
      },
      {
        customerId: 'CUST-1004',
        name: 'Lakshmi Narayanan',
        phone: '9840456789',
        address: '88 Mount Road, Guindy',
        area: 'Guindy',
        location: { latitude: 13.0067, longitude: 80.202 },
        subscriptionType: 'BOTH',
        planName: 'Premium 300Mbps Combo',
        monthlyBill: 1200,
        boxId: 'BOX-GND-1004',
        setTopBoxSerial: 'STB-GND-9904',
        routerSerial: 'RTR-GND-8804',
        status: 'ACTIVE',
        previousUnpaidBalance: 0,
        notes: 'Timely payments via UPI.',
      },
    ]);

    console.log('[Seed] Created Customers.');

    // 6. Seed Bills & Payments
    const currentMonth = new Date().toISOString().slice(0, 7); // e.g. "2026-08"

    await Bill.create([
      {
        billId: `BILL-${currentMonth}-CUST-1001`,
        customerId: 'CUST-1001',
        month: currentMonth,
        amount: 750,
        dueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
        status: 'UNPAID',
      },
      {
        billId: `BILL-${currentMonth}-CUST-1002`,
        customerId: 'CUST-1002',
        month: currentMonth,
        amount: 999,
        dueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
        status: 'PAID',
        paidAmount: 999,
      },
    ]);

    await Payment.create([
      {
        paymentId: 'PAY-10001',
        customerId: 'CUST-1002',
        amount: 999,
        paymentMethod: 'UPI',
        collectionAgentId: 'EMP-102',
        billingMonth: currentMonth,
        paymentDate: new Date(),
        status: 'SUCCESSFUL',
        notes: 'UPI payment received via QR code scan.',
      },
    ]);

    // 7. Seed Master Inventory
    await InventoryItem.create([
      {
        itemId: 'INV-101',
        itemType: 'SET_TOP_BOX',
        name: 'HiLeap HD Smart Box v4',
        serialNumber: 'STB-STOCK-9001',
        stockQuantity: 1,
        unit: 'PIECES',
        status: 'AVAILABLE',
      },
      {
        itemId: 'INV-102',
        itemType: 'SET_TOP_BOX',
        name: 'HiLeap HD Smart Box v4',
        serialNumber: 'STB-STOCK-9002',
        stockQuantity: 1,
        unit: 'PIECES',
        status: 'AVAILABLE',
      },
      {
        itemId: 'INV-103',
        itemType: 'WIFI_ROUTER',
        name: 'Dual-Band Gigabit Wi-Fi 6 Router',
        serialNumber: 'RTR-STOCK-7001',
        stockQuantity: 1,
        unit: 'PIECES',
        status: 'AVAILABLE',
      },
      {
        itemId: 'INV-104',
        itemType: 'CABLE',
        name: 'RG6 Coaxial Cable Roll',
        stockQuantity: 500,
        unit: 'METERS',
        status: 'AVAILABLE',
      },
      {
        itemId: 'INV-105',
        itemType: 'OPTICAL_FIBER',
        name: '2-Core Armored Outdoor Fiber Cable',
        stockQuantity: 1000,
        unit: 'METERS',
        status: 'AVAILABLE',
      },
    ]);

    console.log('[Seed] Created Inventory.');

    // 8. Seed Complaints
    await Complaint.create([
      {
        complaintId: 'CMP-1001',
        customerId: 'CUST-1001',
        customerName: 'Ravi Kumar',
        customerPhone: '9840123456',
        customerAddress: 'No. 14, 2nd Main Road, Anna Nagar',
        complaintType: 'Wi-Fi Signal Loss',
        description: 'Internet red light blinking on fiber modem since yesterday night.',
        location: { latitude: 13.085, longitude: 80.2101 },
        priority: 'HIGH',
        status: 'OPEN',
      },
    ]);

    // 9. Seed Salaries
    await Salary.create([
      {
        salaryId: `SAL-${currentMonth}-EMP-101`,
        employeeId: 'EMP-101',
        month: currentMonth,
        baseSalary: 18000,
        allowances: 2500,
        deductions: 500,
        bonus: 0,
        netSalary: 20000,
        paymentStatus: 'PAID',
        paymentDate: new Date(),
      },
      {
        salaryId: `SAL-${currentMonth}-EMP-103`,
        employeeId: 'EMP-103',
        month: currentMonth,
        baseSalary: 22000,
        allowances: 3000,
        deductions: 800,
        bonus: 1000,
        netSalary: 25200,
        paymentStatus: 'PENDING',
      },
    ]);

    console.log('[Seed] Database seed completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('[Seed Error]:', err);
    process.exit(1);
  }
};

if (require.main === module) {
  seedDatabase();
}
