import { Router, Response } from 'express';
import AuditLog from '../models/AuditLog';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { requireAdmin } from '../middleware/rbac';

const router = Router();

// GET /api/audit-logs - Admin only
router.get('/', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const logs = await AuditLog.find().sort({ timestamp: -1 }).limit(200);
    res.json({ success: true, count: logs.length, data: logs });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/audit-logs - Admin only clear all logs
router.delete('/', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const result = await AuditLog.deleteMany({});
    res.json({
      success: true,
      message: `All security audit logs deleted successfully (${result.deletedCount} entries removed).`,
      deletedCount: result.deletedCount,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
