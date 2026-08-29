import { Router, Response } from 'express';
import Complaint from '../models/Complaint';
import Customer from '../models/Customer';
import User from '../models/User';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { requireAdmin, requireServiceAgent, requireAnyRole } from '../middleware/rbac';
import { autoAssignComplaint } from '../services/assignmentService';
import { logAuditEvent } from '../services/auditService';

const router = Router();

// GET /api/complaints/my-complaints - Customer Portal fetch own complaints
router.get('/my-complaints', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const customerId = req.customer?.customerId || req.user?.employeeId;
    if (!customerId) {
      res.status(400).json({ success: false, message: 'Customer session invalid.' });
      return;
    }

    const complaints = await Complaint.find({ customerId }).sort({ createdAt: -1 });
    res.json({ success: true, count: complaints.length, data: complaints });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/complaints/customer-raise - Customer Portal Raise Complaint (STRICT 1 COMPLAINT / DAY LIMIT)
router.post('/customer-raise', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { complaintType, description, priority } = req.body;

    const customer = req.customer || (await Customer.findOne({ customerId: req.user?.employeeId }));
    if (!customer) {
      res.status(404).json({ success: false, message: 'Customer account record not found.' });
      return;
    }

    if (!complaintType || !description || !description.trim()) {
      res.status(400).json({ success: false, message: 'Complaint type and description are required.' });
      return;
    }

    // STRICT RULE: 1 Complaint per day limit check
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const existingToday = await Complaint.findOne({
      customerId: customer.customerId,
      createdAt: { $gte: startOfDay },
    });

    if (existingToday) {
      res.status(400).json({
        success: false,
        message: 'You have already raised a complaint today. Maximum limit is 1 complaint per day. Please check back tomorrow.',
        existingComplaint: existingToday,
      });
      return;
    }

    const count = await Complaint.countDocuments();
    const complaintId = `CMP-${1000 + count + 1}`;

    const newComplaint = new Complaint({
      complaintId,
      customerId: customer.customerId,
      customerName: customer.name,
      customerPhone: customer.phone || 'N/A',
      customerAddress: customer.address || customer.area,
      complaintType,
      description: description.trim(),
      location: customer.location || { latitude: 13.0827, longitude: 80.2707 },
      priority: priority || 'MEDIUM',
      status: 'OPEN',
      hardwareUsed: [],
    });

    await newComplaint.save();

    // Trigger auto-assignment to available field agent
    const assignedComplaint = await autoAssignComplaint(complaintId);

    await logAuditEvent({
      userEmployeeId: customer.customerId,
      userRole: 'Customer',
      action: 'CUSTOMER_RAISE_COMPLAINT',
      entity: 'Complaint',
      entityId: complaintId,
      newValue: { complaintType, description },
    });

    res.status(201).json({
      success: true,
      message: 'Complaint raised successfully! Our field service technician will address it shortly.',
      data: assignedComplaint || newComplaint,
    });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// GET /api/complaints - List complaints
router.get('/', authenticateToken, requireAnyRole('Admin', 'Customer-Service-Agent'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { status, assignedAgentId, priority } = req.query;
    const query: any = {};

    if (status) query.status = status;
    if (priority) query.priority = priority;

    // Service Agent sees their assigned complaints (or open ones)
    if (req.user!.role === 'Customer-Service-Agent') {
      query.$or = [{ assignedAgentId: req.user!.employeeId }, { status: 'OPEN' }];
    } else if (assignedAgentId) {
      query.assignedAgentId = assignedAgentId;
    }

    const complaints = await Complaint.find(query).sort({ createdAt: -1 });
    res.json({ success: true, count: complaints.length, data: complaints });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/complaints - Create new complaint & trigger auto-assignment
router.post('/', authenticateToken, requireAnyRole('Admin', 'Customer-Service-Agent'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { customerId, complaintType, description, priority } = req.body;

    const customer = await Customer.findOne({ customerId });
    if (!customer) {
      res.status(404).json({ success: false, message: 'Customer not found.' });
      return;
    }

    const count = await Complaint.countDocuments();
    const complaintId = `CMP-${1000 + count + 1}`;

    const newComplaint = new Complaint({
      complaintId,
      customerId,
      customerName: customer.name,
      customerPhone: customer.phone,
      customerAddress: customer.address,
      complaintType,
      description,
      location: customer.location || { latitude: 13.0827, longitude: 80.2707 },
      priority: priority || 'MEDIUM',
      status: 'OPEN',
      hardwareUsed: [],
    });

    await newComplaint.save();

    // Trigger auto-assignment to available field agent
    const assignedComplaint = await autoAssignComplaint(complaintId);

    await logAuditEvent({
      userEmployeeId: req.user!.employeeId,
      userRole: req.user!.role,
      action: 'CREATE_COMPLAINT',
      entity: 'Complaint',
      entityId: complaintId,
      newValue: { complaintType, description, priority },
    });

    res.status(201).json({ success: true, data: assignedComplaint });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// PUT /api/complaints/:id/status - Update complaint status (Accept / Start Work)
router.put('/:id/status', authenticateToken, requireAnyRole('Admin', 'Customer-Service-Agent'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { status } = req.body;
    const complaint = await Complaint.findOne({ complaintId: req.params.id });

    if (!complaint) {
      res.status(404).json({ success: false, message: 'Complaint not found.' });
      return;
    }

    complaint.status = status;
    if (status === 'IN_PROGRESS' && req.user!.role === 'Customer-Service-Agent') {
      req.user!.workStatus = 'BUSY';
      await req.user!.save();
    }
    await complaint.save();

    res.json({ success: true, data: complaint });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// POST /api/complaints/:id/complete - Complete complaint & reset agent status AVAILABLE (Rule 11)
router.post('/:id/complete', authenticateToken, requireAnyRole('Admin', 'Customer-Service-Agent'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { resolutionNotes, hardwareUsed } = req.body;
    const complaint = await Complaint.findOne({ complaintId: req.params.id });

    if (!complaint) {
      res.status(404).json({ success: false, message: 'Complaint not found.' });
      return;
    }

    complaint.status = 'COMPLETED';
    complaint.completedTime = new Date();
    complaint.resolutionNotes = resolutionNotes || 'Resolved successfully.';
    if (Array.isArray(hardwareUsed)) {
      complaint.hardwareUsed = hardwareUsed;
    }
    await complaint.save();

    // Reset Service Agent status from BUSY to AVAILABLE
    if (complaint.assignedAgentId) {
      const agent = await User.findOne({ employeeId: complaint.assignedAgentId });
      if (agent && agent.role === 'Customer-Service-Agent') {
        agent.workStatus = 'AVAILABLE';
        await agent.save();
      }
    }

    await logAuditEvent({
      userEmployeeId: req.user!.employeeId,
      userRole: req.user!.role,
      action: 'COMPLETE_COMPLAINT',
      entity: 'Complaint',
      entityId: complaint.complaintId,
      newValue: { resolutionNotes, hardwareUsed },
    });

    res.json({ success: true, data: complaint });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
});

export default router;
