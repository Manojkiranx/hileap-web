import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import User from '../models/User';
import Salary from '../models/Salary';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { requireAdmin } from '../middleware/rbac';
import { logAuditEvent } from '../services/auditService';

const router = Router();

// GET /api/employees - Admin only list employees
router.get('/', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { role } = req.query;
    const query: any = {};
    if (role) query.role = role;

    const employees = await User.find(query).select('-password').sort({ createdAt: -1 });
    res.json({ success: true, count: employees.length, data: employees });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/employees - Admin create employee
router.post('/', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const {
      name,
      phone,
      email,
      password,
      role,
      assignedWorks,
      assignedLocalities,
      workingHours,
      salaryDetails,
    } = req.body;

    if (!name || !name.trim()) {
      res.status(400).json({ success: false, message: 'Full Name is required.' });
      return;
    }
    if (!phone || !phone.trim()) {
      res.status(400).json({ success: false, message: 'Phone Number is required.' });
      return;
    }
    if (!email || !email.trim()) {
      res.status(400).json({ success: false, message: 'Email address is required.' });
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    const existing = await User.findOne({ email: cleanEmail });
    if (existing) {
      res.status(400).json({ success: false, message: 'An employee with this email already exists.' });
      return;
    }

    // Find the highest existing employee numeric ID to avoid collision after deletions
    const existingUsers = await User.find({ employeeId: { $regex: /^EMP-\d+$/ } }).select('employeeId');
    let maxId = 100;
    existingUsers.forEach((u) => {
      const match = u.employeeId.match(/^EMP-(\d+)$/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxId) maxId = num;
      }
    });
    const employeeId = `EMP-${maxId + 1}`;

    const hashedPassword = await bcrypt.hash(password || 'AgentPass@123', 10);

    const newEmployee = new User({
      employeeId,
      name: name.trim(),
      phone: phone.trim(),
      email: cleanEmail,
      password: hashedPassword,
      role: role || 'Collection-Agent',
      assignedWorks: assignedWorks || [],
      assignedLocalities: assignedLocalities || [],
      workingHours: workingHours || { startTime: '09:00', endTime: '18:00', timezone: 'Asia/Kolkata' },
      salaryDetails: salaryDetails || { baseSalary: 18000, allowances: 0, deductions: 0 },
      employmentStatus: 'ACTIVE',
      workStatus: 'OFFLINE',
    });

    await newEmployee.save();

    // Create initial salary record for current month safely using upsert to avoid duplicate key errors
    const monthStr = new Date().toISOString().slice(0, 7);
    const netSalary =
      (salaryDetails?.baseSalary || 18000) +
      (salaryDetails?.allowances || 2500) -
      (salaryDetails?.deductions || 500);

    const salaryId = `SAL-${monthStr}-${employeeId}`;
    await Salary.findOneAndUpdate(
      { salaryId },
      {
        $setOnInsert: {
          salaryId,
          employeeId,
          month: monthStr,
          baseSalary: salaryDetails?.baseSalary || 18000,
          allowances: salaryDetails?.allowances || 2500,
          deductions: salaryDetails?.deductions || 500,
          bonus: 0,
          netSalary,
          paymentStatus: 'PENDING',
        },
      },
      { upsert: true, new: true }
    );

    await logAuditEvent({
      userEmployeeId: req.user!.employeeId,
      userRole: req.user!.role,
      action: 'CREATE_EMPLOYEE',
      entity: 'User',
      entityId: employeeId,
      newValue: { employeeId, name, role, assignedWorks },
    });

    res.status(201).json({
      success: true,
      data: {
        employeeId: newEmployee.employeeId,
        name: newEmployee.name,
        email: newEmployee.email,
        phone: newEmployee.phone,
        role: newEmployee.role,
        assignedWorks: newEmployee.assignedWorks,
      },
    });
  } catch (err: any) {
    console.error('Error creating employee:', err);
    res.status(400).json({ success: false, message: err.message || 'Failed to create employee.' });
  }
});

// PUT /api/employees/:id - Admin update employee
router.put('/:id', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const employee = await User.findOne({ employeeId: req.params.id });
    if (!employee) {
      res.status(404).json({ success: false, message: 'Employee not found.' });
      return;
    }

    const previousValue = {
      role: employee.role,
      assignedWorks: employee.assignedWorks,
      employmentStatus: employee.employmentStatus,
    };

    if (req.body.password) {
      req.body.password = await bcrypt.hash(req.body.password, 10);
    }

    Object.assign(employee, req.body);
    await employee.save();

    await logAuditEvent({
      userEmployeeId: req.user!.employeeId,
      userRole: req.user!.role,
      action: 'UPDATE_EMPLOYEE',
      entity: 'User',
      entityId: employee.employeeId,
      previousValue,
      newValue: req.body,
    });

    res.json({ success: true, data: employee });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// DELETE /api/employees/:id - Admin delete employee
router.delete('/:id', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const employee = await User.findOne({ employeeId: req.params.id });
    if (!employee) {
      res.status(404).json({ success: false, message: 'Employee not found.' });
      return;
    }

    if (employee.employeeId === req.user!.employeeId) {
      res.status(400).json({ success: false, message: 'Admin cannot delete their own active account.' });
      return;
    }

    await User.findOneAndDelete({ employeeId: req.params.id });

    await logAuditEvent({
      userEmployeeId: req.user!.employeeId,
      userRole: req.user!.role,
      action: 'DELETE_EMPLOYEE',
      entity: 'User',
      entityId: req.params.id,
    });

    res.json({ success: true, message: 'Employee account removed successfully.' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
