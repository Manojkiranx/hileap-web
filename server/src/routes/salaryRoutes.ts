import { Router, Response } from 'express';
import Salary from '../models/Salary';
import User from '../models/User';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { requireAdmin } from '../middleware/rbac';
import { logAuditEvent } from '../services/auditService';

const router = Router();

// GET /api/salaries - Employee views own salary; Admin views all (Rule 13)
router.get('/', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { employeeId, month } = req.query;
    const query: any = {};

    if (req.user!.role !== 'Admin') {
      // Strictly restrict non-admin employees to their OWN salary record (Rule 13)
      query.employeeId = req.user!.employeeId;
    } else if (employeeId) {
      query.employeeId = employeeId;
    }

    if (month) query.month = month;

    const salaries = await Salary.find(query).sort({ month: -1 });

    // Join employee names for Admin view
    const empIds = [...new Set(salaries.map((s) => s.employeeId))];
    const employees = await User.find({ employeeId: { $in: empIds } }).select('employeeId name role');
    const empMap = new Map(employees.map((e) => [e.employeeId, e]));

    const result = salaries.map((s) => ({
      ...s.toObject(),
      employeeName: empMap.get(s.employeeId)?.name || 'Unknown Employee',
      employeeRole: empMap.get(s.employeeId)?.role || 'N/A',
    }));

    res.json({ success: true, count: result.length, data: result });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/salaries - Admin only create/update salary
router.post('/', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { employeeId, month, baseSalary, allowances, deductions, bonus, paymentStatus } = req.body;

    const netSalary =
      Number(baseSalary || 0) +
      Number(allowances || 0) +
      Number(bonus || 0) -
      Number(deductions || 0);

    const salaryId = `SAL-${month}-${employeeId}`;

    let salary = await Salary.findOne({ salaryId });
    if (salary) {
      salary.baseSalary = baseSalary;
      salary.allowances = allowances;
      salary.deductions = deductions;
      salary.bonus = bonus;
      salary.netSalary = netSalary;
      salary.paymentStatus = paymentStatus || salary.paymentStatus;
      if (paymentStatus === 'PAID') salary.paymentDate = new Date();
      await salary.save();
    } else {
      salary = new Salary({
        salaryId,
        employeeId,
        month,
        baseSalary,
        allowances,
        deductions,
        bonus,
        netSalary,
        paymentStatus: paymentStatus || 'PENDING',
        paymentDate: paymentStatus === 'PAID' ? new Date() : undefined,
      });
      await salary.save();
    }

    await logAuditEvent({
      userEmployeeId: req.user!.employeeId,
      userRole: req.user!.role,
      action: 'UPSERT_SALARY',
      entity: 'Salary',
      entityId: salaryId,
      newValue: { employeeId, month, netSalary, paymentStatus },
    });

    res.json({ success: true, data: salary });
  } catch (err: any) {
    if (err.code === 11000) {
      res.status(400).json({ success: false, message: 'A salary record for this employee and month already exists.' });
      return;
    }
    res.status(400).json({ success: false, message: err.message });
  }
});

export default router;
