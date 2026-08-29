import { Router, Response } from 'express';
import Customer from '../models/Customer';
import User from '../models/User';
import Payment from '../models/Payment';
import Complaint from '../models/Complaint';
import InventoryItem from '../models/InventoryItem';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { requireAdmin } from '../middleware/rbac';
import { calculateCustomerPendingAmount } from '../services/ledgerService';

const router = Router();

// GET /api/reports/dashboard-metrics - Admin Dashboard summary metrics
router.get('/dashboard-metrics', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const totalCustomers = await Customer.countDocuments();
    const activeCustomers = await Customer.countDocuments({ status: 'ACTIVE' });
    const pausedCustomers = await Customer.countDocuments({ status: 'PAUSED' });
    const unsubscribedCustomers = await Customer.countDocuments({ status: 'UNSUBSCRIBED' });

    // Collection metrics
    const currentMonthStr = new Date().toISOString().slice(0, 7);
    const monthStart = new Date(currentMonthStr + '-01T00:00:00.000Z');

    const monthPayments = await Payment.find({
      status: 'SUCCESSFUL',
      paymentDate: { $gte: monthStart },
    });
    const monthCollection = monthPayments.reduce((acc, p) => acc + p.amount, 0);

    const allPayments = await Payment.find({ status: 'SUCCESSFUL' });
    const totalCollection = allPayments.reduce((acc, p) => acc + p.amount, 0);

    // Compute total pending across all customers
    const customers = await Customer.find({ status: { $ne: 'UNSUBSCRIBED' } });
    let totalPendingAmount = 0;

    for (const c of customers) {
      const summary = await calculateCustomerPendingAmount(c.customerId);
      totalPendingAmount += summary.pendingAmount;
    }

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
        totalPendingAmount,
        monthCollection,
        totalCollection,
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
