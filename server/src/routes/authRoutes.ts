import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import Customer from '../models/Customer';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { logAuditEvent } from '../services/auditService';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'hileap_super_secret_jwt_key_2026';

// POST /api/auth/customer-login - Customer Portal Login
router.post('/customer-login', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { identifier } = req.body;

    if (!identifier || !identifier.trim()) {
      res.status(400).json({ success: false, message: 'Please enter your Customer ID or Phone Number.' });
      return;
    }

    const cleanId = identifier.trim();
    const customer = await Customer.findOne({
      $or: [
        { customerId: cleanId.toUpperCase() },
        { phone: cleanId },
        { boxId: cleanId.toUpperCase() },
      ],
    });

    if (!customer) {
      res.status(401).json({ success: false, message: 'Customer record not found. Please check your Customer ID or Phone Number.' });
      return;
    }

    if (customer.status === 'UNSUBSCRIBED') {
      res.status(403).json({ success: false, message: 'Customer subscription is inactive.' });
      return;
    }

    const token = jwt.sign(
      { userId: customer._id, customerId: customer.customerId, role: 'Customer' },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000,
    });

    res.json({
      success: true,
      message: 'Welcome to Customer Portal!',
      token,
      user: {
        employeeId: customer.customerId,
        customerId: customer.customerId,
        name: customer.name,
        phone: customer.phone,
        area: customer.area,
        role: 'Customer',
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || 'Server error during customer login.' });
  }
});

// POST /api/auth/login
router.post('/login', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
      res.status(400).json({ success: false, message: 'Email/Employee ID and password are required.' });
      return;
    }

    const user = await User.findOne({
      $or: [
        { email: identifier.toLowerCase().trim() },
        { employeeId: identifier.toUpperCase().trim() },
      ],
    });

    if (!user) {
      res.status(401).json({ success: false, message: 'Invalid credentials.' });
      return;
    }

    if (user.employmentStatus !== 'ACTIVE') {
      res.status(403).json({ success: false, message: 'Account is inactive. Contact Admin.' });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      res.status(401).json({ success: false, message: 'Invalid credentials.' });
      return;
    }

    // Set online/available work status if service agent
    if (user.role === 'Customer-Service-Agent') {
      user.workStatus = 'AVAILABLE';
    }
    user.lastLoginAt = new Date();
    await user.save();

    const token = jwt.sign(
      { userId: user._id, employeeId: user.employeeId, role: user.role },
      JWT_SECRET,
      { expiresIn: '12h' }
    );

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 12 * 60 * 60 * 1000,
    });

    await logAuditEvent({
      userEmployeeId: user.employeeId,
      userRole: user.role,
      action: 'LOGIN',
      entity: 'User',
      entityId: user.employeeId,
    });

    res.json({
      success: true,
      message: 'Login successful.',
      token,
      user: {
        employeeId: user.employeeId,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        assignedWorks: user.assignedWorks,
        workStatus: user.workStatus,
        workingHours: user.workingHours,
        salaryDetails: user.salaryDetails,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || 'Server error during login.' });
  }
});

// POST /api/auth/logout
router.post('/logout', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (req.user) {
      req.user.workStatus = 'OFFLINE';
      await req.user.save();

      await logAuditEvent({
        userEmployeeId: req.user.employeeId,
        userRole: req.user.role,
        action: 'LOGOUT',
        entity: 'User',
        entityId: req.user.employeeId,
      });
    }

    res.clearCookie('token');
    res.json({ success: true, message: 'Logged out successfully.' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || 'Logout error.' });
  }
});

// POST /api/auth/change-password - Change user password (Admin & Staff)
router.post('/change-password', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      res.status(400).json({ success: false, message: 'Current password and new password are required.' });
      return;
    }

    if (newPassword.length < 6) {
      res.status(400).json({ success: false, message: 'New password must be at least 6 characters long.' });
      return;
    }

    const user = await User.findById(req.user!._id);
    if (!user) {
      res.status(404).json({ success: false, message: 'User account not found.' });
      return;
    }

    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      res.status(400).json({ success: false, message: 'Current password is incorrect. Please verify and try again.' });
      return;
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();

    await logAuditEvent({
      userEmployeeId: user.employeeId,
      userRole: user.role,
      action: 'CHANGE_PASSWORD',
      entity: 'User',
      entityId: user.employeeId,
    });

    res.json({ success: true, message: 'Password updated successfully.' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || 'Server error while changing password.' });
  }
});

// GET /api/auth/me
router.get('/me', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  res.json({
    success: true,
    user: req.user,
  });
});

export default router;
