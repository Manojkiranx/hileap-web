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
    const totalCustomers = await Customer.countDocuments();
    const activeCustomers = await Customer.countDocuments({ status: 'ACTIVE' });
    const pausedCustomers = await Customer.countDocuments({ status: 'PAUSED' });
    const unsubscribedCustomers = await Customer.countDocuments({ status: 'UNSUBSCRIBED' });

    const currentMonthStr = new Date().toISOString().slice(0, 7); // e.g. "2026-09"
    const monthStart = new Date(currentMonthStr + '-01T00:00:00.000Z');

    // 1. Total Current Month Bill (Bills created for current month)
    const currentMonthBills = await Bill.find({ month: currentMonthStr });
    const totalCurrentMonthBill = currentMonthBills.reduce((acc, b) => acc + b.amount, 0);

    // 2. Total Old Balance (Sum of initial previousUnpaidBalance + unpaid bills from past months)
    const activeCustomersList = await Customer.find({ status: { $ne: 'UNSUBSCRIBED' } });
    const sumPreviousUnpaid = activeCustomersList.reduce((acc, c) => acc + (c.previousUnpaidBalance || 0), 0);

    const pastUnpaidBills = await Bill.find({
      month: { $lt: currentMonthStr },
      status: { $ne: 'PAID' },
    });
    const sumPastUnpaidBills = pastUnpaidBills.reduce((acc, b) => acc + (b.amount - (b.paidAmount || 0)), 0);

    const totalOldBalance = sumPreviousUnpaid + sumPastUnpaidBills;

    // Collection metrics
    const monthPayments = await Payment.find({
      status: 'SUCCESSFUL',
      paymentDate: { $gte: monthStart },
    });
    const monthCollection = monthPayments.reduce((acc, p) => acc + p.amount, 0);

    const allPayments = await Payment.find({ status: 'SUCCESSFUL' });
    const totalCollection = allPayments.reduce((acc, p) => acc + p.amount, 0);

    // Compute total pending across all active/paused customers
    let totalPendingAmount = 0;
    for (const c of activeCustomersList) {
      const summary = await calculateCustomerPendingAmount(c.customerId);
      totalPendingAmount += summary.pendingAmount;
    }

    // 6-Month Trend Data for Graph
    const trendMonths: string[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      trendMonths.push(d.toISOString().slice(0, 7));
    }

    const monthlyTrendData = await Promise.all(
      trendMonths.map(async (mStr) => {
        const mStart = new Date(mStr + '-01T00:00:00.000Z');
        const mEnd = new Date(mStart.getFullYear(), mStart.getMonth() + 1, 1);

        const mBills = await Bill.find({ month: mStr });
        const billing = mBills.reduce((acc, b) => acc + b.amount, 0);

        const mPays = await Payment.find({
          status: 'SUCCESSFUL',
          paymentDate: { $gte: mStart, $lt: mEnd },
        });
        const collection = mPays.reduce((acc, p) => acc + p.amount, 0);

        // Format month name (e.g., "Sep")
        const dateObj = new Date(mStr + '-01');
        const monthLabel = dateObj.toLocaleString('en-US', { month: 'short' });

        return {
          monthKey: mStr,
          month: monthLabel,
          billing,
          collection,
        };
      })
    );

    // Employee counts
    const totalEmployees = await User.countDocuments({ employmentStatus: 'ACTIVE' });
    const collectionAgentsCount = await User.countDocuments({ role: 'Collection-Agent', employmentStatus: 'ACTIVE' });
    const serviceAgentsCount = await User.countDocuments({ role: 'Customer-Service-Agent', employmentStatus: 'ACTIVE' });
    const workingAgentsCount = await User.countDocuments({ role: 'Customer-Service-Agent', workStatus: 'BUSY' });

    // Complaint stats
    const openComplaints = await Complaint.countDocuments({ status: 'OPEN' });
    const assignedComplaints = await Complaint.countDocuments({ status: 'ASSIGNED' });
    const inProgressComplaints = await Complaint.countDocuments({ status: 'IN_PROGRESS' });
    const completedComplaints = await Complaint.countDocuments({ status: 'COMPLETED' });

    // Inventory status
    const availableInventory = await InventoryItem.countDocuments({ status: 'AVAILABLE' });
    const usedInventory = await InventoryItem.countDocuments({ status: 'USED' });

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
