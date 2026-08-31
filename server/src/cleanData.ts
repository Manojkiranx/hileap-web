import mongoose from 'mongoose';
import dotenv from 'dotenv';

import User from './models/User';
import Customer from './models/Customer';
import Bill from './models/Bill';
import Payment from './models/Payment';
import InventoryItem from './models/InventoryItem';
import InventoryTransaction from './models/InventoryTransaction';
import Complaint from './models/Complaint';
import Salary from './models/Salary';
import LocationUpdate from './models/LocationUpdate';
import AuditLog from './models/AuditLog';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/hileap_db';

export const purgeTestData = async () => {
  try {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(MONGODB_URI);
      console.log(`[CleanData] Connected to ${MONGODB_URI}`);
    }

    // Purge test collections
    const customersRes = await Customer.deleteMany({});
    const billsRes = await Bill.deleteMany({});
    const paymentsRes = await Payment.deleteMany({});
    const complaintsRes = await Complaint.deleteMany({});
    const salariesRes = await Salary.deleteMany({});
    const locationsRes = await LocationUpdate.deleteMany({});
    const invTransRes = await InventoryTransaction.deleteMany({});
    const invItemsRes = await InventoryItem.deleteMany({});
    const auditRes = await AuditLog.deleteMany({});

    // Delete dummy employees while preserving Admin accounts
    const usersRes = await User.deleteMany({ role: { $ne: 'Admin' } });

    console.log('[CleanData] Test data successfully purged:');
    console.log(`  - Customers removed: ${customersRes.deletedCount}`);
    console.log(`  - Bills removed: ${billsRes.deletedCount}`);
    console.log(`  - Payments removed: ${paymentsRes.deletedCount}`);
    console.log(`  - Complaints removed: ${complaintsRes.deletedCount}`);
    console.log(`  - Salaries removed: ${salariesRes.deletedCount}`);
    console.log(`  - Location updates removed: ${locationsRes.deletedCount}`);
    console.log(`  - Inventory items removed: ${invItemsRes.deletedCount}`);
    console.log(`  - Inventory transactions removed: ${invTransRes.deletedCount}`);
    console.log(`  - Non-Admin users removed: ${usersRes.deletedCount}`);
    console.log(`  - Audit logs removed: ${auditRes.deletedCount}`);

    return {
      success: true,
      purged: {
        customers: customersRes.deletedCount,
        bills: billsRes.deletedCount,
        payments: paymentsRes.deletedCount,
        complaints: complaintsRes.deletedCount,
        salaries: salariesRes.deletedCount,
        locationUpdates: locationsRes.deletedCount,
        inventoryItems: invItemsRes.deletedCount,
        inventoryTransactions: invTransRes.deletedCount,
        nonAdminUsers: usersRes.deletedCount,
        auditLogs: auditRes.deletedCount,
      },
    };
  } catch (err: any) {
    console.error('[CleanData Error]:', err);
    throw err;
  }
};

if (require.main === module) {
  purgeTestData()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
