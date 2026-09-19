import { Router, Response } from 'express';
import Portal from '../models/Portal';
import Customer from '../models/Customer';
import User from '../models/User';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { requireAdmin } from '../middleware/rbac';
import { logAuditEvent } from '../services/auditService';

const router = Router();

// Seed initial default portals if collection is empty
const defaultPortals = [
  { name: 'TCCL', url: 'https://tccl.in/recharge', category: 'CABLE', active: true },
  { name: 'TACTV', url: 'https://tactv.in/recharge', category: 'CABLE', active: true },
  { name: 'WIFI', url: 'https://external-recharge-portal.example.com/wifi-recharge', category: 'WIFI', active: true },
];

async function ensureDefaultPortals() {
  try {
    const count = await Portal.countDocuments();
    if (count === 0) {
      await Portal.insertMany(defaultPortals);
      console.log('[Portal] Seeded default portals: TCCL, TACTV, WIFI');
    }
  } catch (err) {
    console.error('[Portal Seed Error]:', err);
  }
}

// GET /api/portals - List configured portals
router.get('/', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await ensureDefaultPortals();
    const portals = await Portal.find().sort({ createdAt: 1 });
    res.json({ success: true, data: portals });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/portals - Admin create new portal
router.post('/', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name, url, category, active } = req.body;

    if (!name || !name.trim()) {
      res.status(400).json({ success: false, message: 'Portal Name is required.' });
      return;
    }
    if (!url || !url.trim()) {
      res.status(400).json({ success: false, message: 'Portal URL is required.' });
      return;
    }

    const existing = await Portal.findOne({ name: name.trim() });
    if (existing) {
      res.status(400).json({ success: false, message: `A portal named "${name.trim()}" already exists.` });
      return;
    }

    const portal = new Portal({
      name: name.trim(),
      url: url.trim(),
      category: category || 'OTHER',
      active: active !== undefined ? Boolean(active) : true,
    });

    await portal.save();

    await logAuditEvent({
      userEmployeeId: req.user!.employeeId,
      userRole: req.user!.role,
      action: 'CREATE_PORTAL',
      entity: 'Portal',
      entityId: portal.name,
      newValue: req.body,
    });

    res.status(201).json({ success: true, data: portal });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// PUT /api/portals/:id - Admin update existing portal
router.put('/:id', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name, url, category, active } = req.body;
    const portal = await Portal.findById(req.params.id);

    if (!portal) {
      res.status(404).json({ success: false, message: 'Portal not found.' });
      return;
    }

    const previousValue = portal.toObject();

    if (name && name.trim()) portal.name = name.trim();
    if (url && url.trim()) portal.url = url.trim();
    if (category) portal.category = category;
    if (active !== undefined) portal.active = Boolean(active);

    await portal.save();

    await logAuditEvent({
      userEmployeeId: req.user!.employeeId,
      userRole: req.user!.role,
      action: 'UPDATE_PORTAL',
      entity: 'Portal',
      entityId: portal.name,
      previousValue,
      newValue: portal.toObject(),
    });

    res.json({ success: true, message: 'Portal updated successfully.', data: portal });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// DELETE /api/portals/:id - Admin delete portal with safety check
router.delete('/:id', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const portal = await Portal.findById(req.params.id);
    if (!portal) {
      res.status(404).json({ success: false, message: 'Portal not found.' });
      return;
    }

    // Portal Deletion Safety (Req 16): Check if any Customer or User is assigned to this portal
    const customerInUse = await Customer.exists({
      $or: [{ cablePortal: portal.name }, { wifiPortal: portal.name }],
    });

    const userInUse = await User.exists({ assignedPortal: portal.name });

    if (customerInUse || userInUse) {
      res.status(400).json({
        success: false,
        message: `Cannot delete portal "${portal.name}" because it is currently assigned to existing customers or staff members. Please reassign those records first or set portal status to Inactive.`,
      });
      return;
    }

    await Portal.findByIdAndDelete(req.params.id);

    await logAuditEvent({
      userEmployeeId: req.user!.employeeId,
      userRole: req.user!.role,
      action: 'DELETE_PORTAL',
      entity: 'Portal',
      entityId: portal.name,
    });

    res.json({ success: true, message: `Portal "${portal.name}" deleted successfully.` });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
