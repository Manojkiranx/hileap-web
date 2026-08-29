import { Router, Response } from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { requireAdmin, requireServiceAgent } from '../middleware/rbac';
import { recordLocationUpdate, getLiveAgentLocations } from '../services/locationService';

const router = Router();

// POST /api/locations - Service Agent shares GPS coordinates
router.post('/', authenticateToken, requireServiceAgent, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { latitude, longitude, accuracy } = req.body;

    if (latitude === undefined || longitude === undefined) {
      res.status(400).json({ success: false, message: 'Latitude and longitude coordinates are required.' });
      return;
    }

    const update = await recordLocationUpdate(
      req.user!.employeeId,
      Number(latitude),
      Number(longitude),
      accuracy ? Number(accuracy) : undefined
    );

    res.json({ success: true, message: 'Location recorded.', data: update });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// GET /api/locations/live - Admin only view of active field agent locations
router.get('/live', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const liveLocations = await getLiveAgentLocations();
    res.json({ success: true, count: liveLocations.length, data: liveLocations });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
