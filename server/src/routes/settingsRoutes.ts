import { Router, Response } from 'express';
import SystemSettings from '../models/SystemSettings';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { requireAdmin } from '../middleware/rbac';

const router = Router();

// Default system configurations
const DEFAULT_SETTINGS: Record<string, any> = {
  COMPANY_UPI_ID: process.env.COMPANY_UPI_ID || 'hileapnetwork@upi',
  COMPANY_UPI_QR_URL: process.env.COMPANY_UPI_QR_URL || 'https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=upi://pay?pa=hileapnetwork@upi&pn=HiLeap%20Network',
  RECHARGE_URL: process.env.RECHARGE_URL || 'https://external-recharge-portal.example.com/recharge?boxId={BOX_ID}&customerId={CUSTOMER_ID}',
  PAUSE_RESUME_URL: process.env.PAUSE_RESUME_URL || 'https://external-recharge-portal.example.com/pause-resume?boxId={BOX_ID}&customerId={CUSTOMER_ID}',
  UNSUBSCRIBE_URL: process.env.UNSUBSCRIBE_URL || 'https://external-recharge-portal.example.com/unsubscribe?boxId={BOX_ID}&customerId={CUSTOMER_ID}',
  ALLOW_OVERPAYMENT: false,
  COMPANY_LOCALITIES: [
    'Athippaly',
    'Athippaly vayal',
    'Kaaramoola',
    'Manjamoola',
    '4th mile',
    'Nambalakodu',
    'Killur',
    'Kammathi',
    'Thakaramoola',
    'Edalamoola',
    'Kallingara',
    'Madamoola',
    'Chalivayal',
    'Dharmagiri',
    'Devarshola',
    'Padanthora',
    'Nelakodu',
  ],
};

// GET /api/settings - Fetch all settings
router.get('/', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const settings = await SystemSettings.find();
    const result: Record<string, any> = { ...DEFAULT_SETTINGS };

    settings.forEach((s) => {
      result[s.key] = s.value;
    });

    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/settings - Admin update settings
router.put('/', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const newSettings = req.body; // Key-Value pair object

    for (const [key, value] of Object.entries(newSettings)) {
      await SystemSettings.findOneAndUpdate(
        { key },
        { key, value },
        { upsert: true, new: true }
      );
    }

    res.json({ success: true, message: 'Settings updated successfully.' });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
});

export default router;
