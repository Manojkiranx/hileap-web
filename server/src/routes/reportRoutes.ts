import { Router, Response } from 'express';
import Customer from '../models/Customer';
import User from '../models/User';
import Payment from '../models/Payment';
import Complaint from '../models/Complaint';
import InventoryItem from '../models/InventoryItem';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { requireAdmin } from '../middleware/rbac';
import { calculateCustomerPendingAmount } from '../services/ledgerService';

import Bill from '../models/Bill';

const router = Router();

// GET /api/reports/dashboard-metrics - Admin Dashboard summary metrics
router.get('/dashboard-metrics', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const currentMonthStr = new Date().toISOString().slice(0, 7); // e.g. "2026-09"
    const monthStart = new Date(currentMonthStr + '-01T00:00:00.000Z');

    const [
      totalCustomers,
      activeCustomers,
      pausedCustomers,
      unsubscribedCustomers,
      currentMonthBillsAgg,
      sumPreviousUnpaidAgg,
      sumPastUnpaidBillsAgg,
      monthPaymentsAgg,
      allPaymentsAgg,
      allBillsAgg,
      totalEmployees,
      collectionAgentsCount,
      serviceAgentsCount,
      workingAgentsCount,
      openComplaints,
      assignedComplaints,
      inProgressComplaints,
      completedComplaints,
      availableInventory,
      usedInventory,
    ] = await Promise.all([
      Customer.countDocuments(),
      Customer.countDocuments({ status: 'ACTIVE' }),
      Customer.countDocuments({ status: 'PAUSED' }),
      Customer.countDocuments({ status: 'UNSUBSCRIBED' }),

      // 1. Current Month Bills Total
      Bill.aggregate([{ $match: { month: currentMonthStr } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),

      // 2. Sum of Previous Unpaid Balances on Customers
      Customer.aggregate([
        { $match: { status: { $ne: 'UNSUBSCRIBED' } } },
        { $group: { _id: null, total: { $sum: '$previousUnpaidBalance' } } },
      ]),

      // 3. Sum of Unpaid Bills from Past Months
      Bill.aggregate([
        { $match: { month: { $lt: currentMonthStr }, status: { $ne: 'PAID' } } },
        { $group: { _id: null, total: { $sum: { $subtract: ['$amount', { $ifNull: ['$paidAmount', 0] }] } } } },
      ]),

      // 4. Month Collection
      Payment.aggregate([
        { $match: { status: 'SUCCESSFUL', paymentDate: { $gte: monthStart } } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),

      // 5. Total Collection All Time
      Payment.aggregate([
        { $match: { status: 'SUCCESSFUL' } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),

      // 6. Total Bills All Time
      Bill.aggregate([{ $group: { _id: null, total: { $sum: '$amount' } } }]),

      // Counts
      User.countDocuments({ employmentStatus: 'ACTIVE' }),
      User.countDocuments({ role: 'Collection-Agent', employmentStatus: 'ACTIVE' }),
      User.countDocuments({ role: 'Customer-Service-Agent', employmentStatus: 'ACTIVE' }),
      User.countDocuments({ role: 'Customer-Service-Agent', workStatus: 'BUSY' }),

      Complaint.countDocuments({ status: 'OPEN' }),
      Complaint.countDocuments({ status: 'ASSIGNED' }),
      Complaint.countDocuments({ status: 'IN_PROGRESS' }),
      Complaint.countDocuments({ status: 'COMPLETED' }),

      InventoryItem.countDocuments({ status: 'AVAILABLE' }),
      InventoryItem.countDocuments({ status: 'USED' }),
    ]);

    const totalCurrentMonthBill = currentMonthBillsAgg[0]?.total || 0;
    const sumPreviousUnpaid = sumPreviousUnpaidAgg[0]?.total || 0;
    const sumPastUnpaidBills = sumPastUnpaidBillsAgg[0]?.total || 0;
    const totalOldBalance = sumPreviousUnpaid + sumPastUnpaidBills;

    const monthCollection = monthPaymentsAgg[0]?.total || 0;
    const totalCollection = allPaymentsAgg[0]?.total || 0;
    const totalBills = allBillsAgg[0]?.total || 0;

    // Yet to collect (total pending balance across all active customers)
    const rawPending = sumPreviousUnpaid + totalBills - totalCollection;
    const totalPendingAmount = Math.max(0, rawPending);

    // 6-Month Trend Data for Graph
    const trendMonths: string[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      trendMonths.push(d.toISOString().slice(0, 7));
    }

    const [monthlyBillsAgg, monthlyPaymentsAgg] = await Promise.all([
      Bill.aggregate([
        { $match: { month: { $in: trendMonths } } },
        { $group: { _id: '$month', total: { $sum: '$amount' } } },
      ]),
      Payment.aggregate([
        { $match: { status: 'SUCCESSFUL' } },
        {
          $group: {
            _id: { $substr: [{ $dateToString: { format: '%Y-%m-%d', date: '$paymentDate' } }, 0, 7] },
            total: { $sum: '$amount' },
          },
        },
      ]),
    ]);

    const billsMap: Record<string, number> = {};
    monthlyBillsAgg.forEach((b) => { billsMap[b._id] = b.total; });

    const paymentsMap: Record<string, number> = {};
    monthlyPaymentsAgg.forEach((p) => { paymentsMap[p._id] = p.total; });

    const monthlyTrendData = trendMonths.map((mStr) => {
      const dateObj = new Date(mStr + '-01');
      const monthLabel = dateObj.toLocaleString('en-US', { month: 'short' });
      return {
        monthKey: mStr,
        month: monthLabel,
        billing: billsMap[mStr] || 0,
        collection: paymentsMap[mStr] || 0,
      };
    });

    res.json({
      success: true,
      data: {
        totalCustomers,
        activeCustomers,
        pausedCustomers,
        unsubscribedCustomers,
        totalCurrentMonthBill,
        totalOldBalance,
        totalPendingAmount,
        yetToCollect: totalPendingAmount,
        monthCollection,
        totalCollection,
        monthlyTrendData,
        totalEmployees,
        collectionAgentsCount,
        serviceAgentsCount,
        workingAgentsCount,
        complaints: {
          open: openComplaints,
          assigned: assignedComplaints,
          inProgress: inProgressComplaints,
          completed: completedComplaints,
        },
        inventory: {
          available: availableInventory,
          used: usedInventory,
        },
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
