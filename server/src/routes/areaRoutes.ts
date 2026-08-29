import { Router, Response } from 'express';
import Area from '../models/Area';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { requireAdmin, requireAnyRole } from '../middleware/rbac';
import { logAuditEvent } from '../services/auditService';

const router = Router();

// Default 12 initial areas
export const DEFAULT_AREAS = [
  'Athippaly',
  'Athippaly vayal',
  'Kaaramoola',
  'Kallingara',
  '4th mile',
  'Manjamoola',
  'Thakaramoola',
  'Madamoola',
  'Edalamoola',
  'Nambalakodu',
  'Kammathi',
  'Killur',
];

// Helper function to seed areas if collection is empty
export const ensureDefaultAreas = async () => {
  const count = await Area.countDocuments();
  if (count === 0) {
    for (const name of DEFAULT_AREAS) {
      await Area.create({ name, isActive: true });
    }
    console.log('[Area] Seeded initial 12 default areas.');
  }
};

// GET /api/areas - Public/Authenticated list active areas
router.get('/', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await ensureDefaultAreas();
    const areas = await Area.find({ isActive: true }).sort({ name: 1 });
    res.json({ success: true, count: areas.length, data: areas });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/areas - Admin create new area
router.post('/', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name } = req.body;

    if (!name || !name.trim()) {
      res.status(400).json({ success: false, message: 'Area name is required.' });
      return;
    }

    const cleanName = name.trim();
    const existing = await Area.findOne({ name: { $regex: new RegExp(`^${cleanName}$`, 'i') } });
    if (existing) {
      res.status(400).json({ success: false, message: 'Area already exists.' });
      return;
    }

    const newArea = new Area({ name: cleanName, isActive: true });
    await newArea.save();

    await logAuditEvent({
      userEmployeeId: req.user!.employeeId,
      userRole: req.user!.role,
      action: 'ADD_AREA',
      entity: 'Area',
      entityId: newArea._id.toString(),
      newValue: { name: cleanName },
    });

    res.status(201).json({ success: true, data: newArea, message: `Area "${cleanName}" created successfully.` });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
});

export default router;
