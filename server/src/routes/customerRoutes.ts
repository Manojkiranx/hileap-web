import { Router, Response } from 'express';
import Customer from '../models/Customer';
import Bill from '../models/Bill';
import SystemSettings from '../models/SystemSettings';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { requireAdmin, requireAnyRole } from '../middleware/rbac';
import { calculateCustomerPendingAmount } from '../services/ledgerService';
import { logAuditEvent } from '../services/auditService';

const router = Router();

// GET /api/customers/me - Fetch logged-in customer's profile & live ledger details
router.get('/me', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    let customerId = req.customer?.customerId || req.user?.customerId || req.user?.employeeId;

    if (!customerId) {
      res.status(400).json({ success: false, message: 'Customer identifier not found in session token.' });
      return;
    }

    const customer = await Customer.findOne({ customerId });
    if (!customer) {
      res.status(404).json({ success: false, message: 'Customer record not found in database.' });
      return;
    }

    const summary = await calculateCustomerPendingAmount(customer.customerId);
    const bills = await Bill.find({ customerId: customer.customerId }).sort({ createdAt: -1 });

    res.json({
      success: true,
      data: {
        ...customer.toObject(),
        pendingAmount: summary.pendingAmount,
        currentMonthBill: summary.currentMonthBill,
        totalUnpaidBills: summary.totalUnpaidBills,
        totalSuccessfulPayments: summary.totalSuccessfulPayments,
        pendingSummary: summary,
        bills,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/customers - List customers with pending amount computations
router.get('/', authenticateToken, requireAnyRole('Admin', 'Collection-Agent', 'Customer-Service-Agent'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { search, area, subscriptionType, status } = req.query;

    const query: any = {};

    if (status) query.status = status;
    if (area) query.area = area;
    if (subscriptionType) query.subscriptionType = subscriptionType;

    // Enforce Collection Agent assigned localities restriction
    if (
      req.user!.role === 'Collection-Agent' &&
      Array.isArray(req.user!.assignedLocalities) &&
      req.user!.assignedLocalities.length > 0
    ) {
      if (area) {
        if (req.user!.assignedLocalities.includes(String(area))) {
          query.area = area;
        } else {
          query.area = '__UNASSIGNED_LOCALITY_BLOCK__';
        }
      } else {
        query.area = { $in: req.user!.assignedLocalities };
      }
    }

    if (search) {
      const searchRegex = new RegExp(String(search), 'i');
      query.$or = [
        { customerId: searchRegex },
        { name: searchRegex },
        { phone: searchRegex },
        { boxId: searchRegex },
      ];
    }

    const customers = await Customer.find(query).sort({ createdAt: -1 });

    // Compute live pending balance for each customer
    const results = await Promise.all(
      customers.map(async (c) => {
        const summary = await calculateCustomerPendingAmount(c.customerId);
        return {
          ...c.toObject(),
          pendingAmount: summary.pendingAmount,
          currentMonthBill: summary.currentMonthBill,
          totalUnpaidBills: summary.totalUnpaidBills,
          totalSuccessfulPayments: summary.totalSuccessfulPayments,
        };
      })
    );

    res.json({ success: true, count: results.length, data: results });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/customers/:id - Single customer detail with full ledger info
router.get('/:id', authenticateToken, requireAnyRole('Admin', 'Collection-Agent', 'Customer-Service-Agent'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const customer = await Customer.findOne({ customerId: req.params.id });
    if (!customer) {
      res.status(404).json({ success: false, message: 'Customer not found.' });
      return;
    }

    const summary = await calculateCustomerPendingAmount(customer.customerId);
    const bills = await Bill.find({ customerId: customer.customerId }).sort({ createdAt: -1 });

    res.json({
      success: true,
      data: {
        ...customer.toObject(),
        pendingSummary: summary,
        bills,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/customers - Admin only create
router.post('/', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name, phone, area, subscriptionType, setTopBoxSerial, routerSerial } = req.body;

    if (!name || !name.trim()) {
      res.status(400).json({ success: false, message: 'Customer Name is required.' });
      return;
    }
    if (!area || !area.trim()) {
      res.status(400).json({ success: false, message: 'Area selection is required.' });
      return;
    }

    const count = await Customer.countDocuments();
    const customerId = req.body.customerId || `CUST-${1000 + count + 1}`;
    const subType = subscriptionType || 'BOTH';

    const defaultPlan =
      subType === 'CABLE' ? 'Cable TV Standard' : subType === 'WIFI' ? 'WiFi Broadband High Speed' : 'Cable + WiFi Combo';
    const defaultBill = subType === 'CABLE' ? 350 : subType === 'WIFI' ? 600 : 850;

    const newCustomer = new Customer({
      customerId,
      name: name.trim(),
      phone: phone ? phone.trim() : '',
      altPhone: req.body.altPhone || '',
      address: req.body.address || area.trim(),
      area: area.trim(),
      subscriptionType: subType,
      planName: req.body.planName || defaultPlan,
      monthlyBill: req.body.monthlyBill !== undefined && req.body.monthlyBill !== null && !isNaN(Number(req.body.monthlyBill)) ? Number(req.body.monthlyBill) : defaultBill,
      boxId: req.body.boxId || `BOX-${Date.now().toString().slice(-6)}`,
      setTopBoxSerial: setTopBoxSerial || '',
      routerSerial: routerSerial || '',
      status: req.body.status || 'ACTIVE',
      previousUnpaidBalance: req.body.previousUnpaidBalance || 0,
      notes: req.body.notes || '',
    });

    await newCustomer.save();

    // Generate initial bill for current month if active
    if (newCustomer.monthlyBill > 0) {
      const monthStr = new Date().toISOString().slice(0, 7);
      const billId = `BILL-${monthStr}-${customerId}`;

      const initialBill = new Bill({
        billId,
        customerId,
        month: monthStr,
        amount: newCustomer.monthlyBill,
        dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15 days due
        status: 'UNPAID',
      });
      await initialBill.save();
    }

    await logAuditEvent({
      userEmployeeId: req.user!.employeeId,
      userRole: req.user!.role,
      action: 'CREATE_CUSTOMER',
      entity: 'Customer',
      entityId: customerId,
      newValue: req.body,
    });

    res.status(201).json({ success: true, data: newCustomer });
  } catch (err: any) {
    console.error('Error creating customer:', err);
    res.status(400).json({ success: false, message: err.message || 'Failed to create customer.' });
  }
});

// PUT /api/customers/:id - Admin only edit
router.put('/:id', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const customer = await Customer.findOne({ customerId: req.params.id });
    if (!customer) {
      res.status(404).json({ success: false, message: 'Customer not found.' });
      return;
    }

    const previousValue = customer.toObject();
    Object.assign(customer, req.body);
    await customer.save();

    await logAuditEvent({
      userEmployeeId: req.user!.employeeId,
      userRole: req.user!.role,
      action: 'UPDATE_CUSTOMER',
      entity: 'Customer',
      entityId: customer.customerId,
      previousValue,
      newValue: req.body,
    });

    res.json({ success: true, data: customer });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// DELETE /api/customers/:id - Admin only permanent delete from database
router.delete('/:id', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const customer = await Customer.findOneAndDelete({ customerId: req.params.id });
    if (!customer) {
      res.status(404).json({ success: false, message: 'Customer not found.' });
      return;
    }

    await logAuditEvent({
      userEmployeeId: req.user!.employeeId,
      userRole: req.user!.role,
      action: 'PERMANENT_DELETE_CUSTOMER',
      entity: 'Customer',
      entityId: req.params.id,
      previousValue: { customerId: customer.customerId, name: customer.name },
    });

    res.json({ success: true, message: `Customer ${customer.name} (${customer.customerId}) permanently deleted from database.` });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PATCH /api/customers/:id/toggle-subscription - Admin toggle ACTIVE <-> UNSUBSCRIBED
router.patch('/:id/toggle-subscription', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const customer = await Customer.findOne({ customerId: req.params.id });
    if (!customer) {
      res.status(404).json({ success: false, message: 'Customer not found.' });
      return;
    }

    const previousStatus = customer.status;
    customer.status = previousStatus === 'ACTIVE' ? 'UNSUBSCRIBED' : 'ACTIVE';
    await customer.save();

    await logAuditEvent({
      userEmployeeId: req.user!.employeeId,
      userRole: req.user!.role,
      action: customer.status === 'ACTIVE' ? 'SUBSCRIBE_CUSTOMER' : 'UNSUBSCRIBE_CUSTOMER',
      entity: 'Customer',
      entityId: customer.customerId,
      previousValue: { status: previousStatus },
      newValue: { status: customer.status },
    });

    res.json({
      success: true,
      message: `Customer subscription status changed to ${customer.status}.`,
      data: customer,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/customers/:id/external-url - Get external recharge / subscription management URL
router.post('/:id/external-url', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { actionType } = req.body; // 'recharge' | 'pause_resume' | 'unsubscribe'
    const customer = await Customer.findOne({ customerId: req.params.id });

    if (!customer) {
      res.status(404).json({ success: false, message: 'Customer not found.' });
      return;
    }

    let templateKey = 'RECHARGE_URL';
    if (actionType === 'pause_resume') templateKey = 'PAUSE_RESUME_URL';
    if (actionType === 'unsubscribe') templateKey = 'UNSUBSCRIBE_URL';

    const setting = await SystemSettings.findOne({ key: templateKey });
    let urlTemplate = setting ? String(setting.value) : `https://external-recharge-portal.example.com/${actionType}?boxId={BOX_ID}&customerId={CUSTOMER_ID}`;

    const constructedUrl = urlTemplate
      .replace('{BOX_ID}', encodeURIComponent(customer.boxId))
      .replace('{CUSTOMER_ID}', encodeURIComponent(customer.customerId));

    await logAuditEvent({
      userEmployeeId: req.user!.employeeId,
      userRole: req.user!.role,
      action: `EXTERNAL_URL_${actionType.toUpperCase()}`,
      entity: 'Customer',
      entityId: customer.customerId,
      newValue: { constructedUrl },
    });

    res.json({ success: true, url: constructedUrl, boxId: customer.boxId });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
