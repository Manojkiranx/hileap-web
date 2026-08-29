import { Router, Response } from 'express';
import Payment from '../models/Payment';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { requireAdmin, requireCollectionAgent, requireAnyRole } from '../middleware/rbac';
import { recordPayment, correctPaymentEntry } from '../services/ledgerService';
import { generateCollectionExcel } from '../services/excelService';

const router = Router();

// GET /api/payments - List payments with filters
router.get('/', authenticateToken, requireAnyRole('Admin', 'Collection-Agent'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { customerId, agentId, status } = req.query;
    const query: any = {};

    if (customerId) query.customerId = customerId;
    if (status) query.status = status;

    // If Collection Agent, enforce viewing relevant payments or their own
    if (req.user!.role === 'Collection-Agent') {
      if (agentId && agentId !== req.user!.employeeId) {
        res.status(403).json({ success: false, message: 'Collection agents cannot inspect other agents payments.' });
        return;
      }
      query.collectionAgentId = req.user!.employeeId;
    } else if (agentId) {
      query.collectionAgentId = agentId;
    }

    const payments = await Payment.find(query).sort({ paymentDate: -1 });
    res.json({ success: true, count: payments.length, data: payments });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/payments - Record new payment
router.post('/', authenticateToken, requireAnyRole('Admin', 'Collection-Agent'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // Enforce Rule 1 if Collection Agent
    if (req.user!.role === 'Collection-Agent') {
      const hasWork = Array.isArray(req.user!.assignedWorks) &&
        req.user!.assignedWorks.some((w: string) => ['door_cable_collection', 'door_wifi_collection'].includes(w));
      if (!hasWork) {
        res.status(403).json({ success: false, message: 'Unauthorized collection work assignment.' });
        return;
      }
    }

    const payment = await recordPayment({
      customerId: req.body.customerId,
      amount: Number(req.body.amount),
      paymentMethod: req.body.paymentMethod || 'UPI',
      collectionAgentId: req.user!.employeeId,
      billingMonth: req.body.billingMonth || new Date().toISOString().slice(0, 7),
      notes: req.body.notes,
    });

    res.status(201).json({ success: true, data: payment });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// POST /api/payments/:id/correct - Correct entry with mandatory reason & audit trail
router.post('/:id/correct', authenticateToken, requireAnyRole('Admin', 'Collection-Agent'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { newAmount, reason } = req.body;

    const payment = await correctPaymentEntry(
      req.params.id,
      Number(newAmount),
      reason,
      req.user!.employeeId,
      req.user!.role
    );

    res.json({ success: true, data: payment });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// POST /api/payments/delete-history - Delete payment history within Date Range (Admin only)
router.post('/delete-history', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { startDate, endDate } = req.body;

    if (!startDate || !endDate) {
      res.status(400).json({ success: false, message: 'Please select both From Date and To Date.' });
      return;
    }

    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);

    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      res.status(400).json({ success: false, message: 'Invalid date format provided.' });
      return;
    }

    const result = await Payment.deleteMany({
      paymentDate: { $gte: start, $lte: end },
    });

    res.json({
      success: true,
      message: `Successfully deleted ${result.deletedCount} payment history entries between ${startDate} and ${endDate}.`,
      deletedCount: result.deletedCount,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/payments/export - Download Excel file (Admin only)
router.get('/export', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const filters = {
      startDate: req.query.startDate as string,
      endDate: req.query.endDate as string,
      collectionAgentId: req.query.collectionAgentId as string,
      customerId: req.query.customerId as string,
      status: req.query.status as string,
      subscriptionType: req.query.subscriptionType as string,
    };

    const buffer = await generateCollectionExcel(filters);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="collection_report_${Date.now()}.xlsx"`);
    res.send(buffer);
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
