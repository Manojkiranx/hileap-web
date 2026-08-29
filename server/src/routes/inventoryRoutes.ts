import { Router, Response } from 'express';
import InventoryItem from '../models/InventoryItem';
import InventoryTransaction from '../models/InventoryTransaction';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { requireAdmin, requireServiceAgent, requireAnyRole } from '../middleware/rbac';
import { logAuditEvent } from '../services/auditService';

const router = Router();

// GET /api/inventory - List inventory items
router.get('/', authenticateToken, requireAnyRole('Admin', 'Customer-Service-Agent'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { itemType, status } = req.query;
    const query: any = {};
    if (itemType) query.itemType = itemType;
    if (status) query.status = status;

    const items = await InventoryItem.find(query).sort({ createdAt: -1 });
    res.json({ success: true, count: items.length, data: items });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/inventory/transactions - List inventory transactions
router.get('/transactions', authenticateToken, requireAnyRole('Admin', 'Customer-Service-Agent'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { complaintId, employeeId } = req.query;
    const query: any = {};
    if (complaintId) query.complaintId = complaintId;
    if (employeeId) query.employeeId = employeeId;

    const transactions = await InventoryTransaction.find(query).sort({ createdAt: -1 });
    res.json({ success: true, count: transactions.length, data: transactions });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/inventory - ADMIN ONLY: Add new inventory stock/item (Rule 5)
router.post('/', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { itemType, name, serialNumber, stockQuantity, unit } = req.body;

    // Enforce serial number for STB / Router if creating serialised item
    if (['SET_TOP_BOX', 'WIFI_ROUTER', 'WIFI_MODEM'].includes(itemType) && !serialNumber) {
      res.status(400).json({ success: false, message: `${itemType} requires a unique serial number.` });
      return;
    }

    const count = await InventoryItem.countDocuments();
    const itemId = `INV-${1000 + count + 1}`;

    const newItem = new InventoryItem({
      itemId,
      itemType,
      name,
      serialNumber,
      stockQuantity: ['SET_TOP_BOX', 'WIFI_ROUTER', 'WIFI_MODEM'].includes(itemType) ? 1 : Number(stockQuantity || 0),
      unit: ['CABLE', 'OPTICAL_FIBER'].includes(itemType) ? 'METERS' : unit || 'PIECES',
      status: 'AVAILABLE',
    });

    await newItem.save();

    // Create Transaction record for STOCK_IN
    const tx = new InventoryTransaction({
      transactionId: `TX-${Date.now()}`,
      itemId,
      itemType,
      transactionType: 'STOCK_IN',
      employeeId: req.user!.employeeId,
      quantityOrLength: newItem.stockQuantity,
      serialNumber,
      reason: 'Initial Stock Addition',
      createdBy: req.user!.employeeId,
    });
    await tx.save();

    await logAuditEvent({
      userEmployeeId: req.user!.employeeId,
      userRole: req.user!.role,
      action: 'ADD_INVENTORY',
      entity: 'InventoryItem',
      entityId: itemId,
      newValue: req.body,
    });

    res.status(201).json({ success: true, data: newItem });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// POST /api/inventory/bulk - ADMIN ONLY: Bulk add hardware items/stock
router.post('/bulk', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { itemType, name, serialNumbers, quantity, unit } = req.body;

    if (!name || !name.trim()) {
      res.status(400).json({ success: false, message: 'Hardware name/model is required.' });
      return;
    }

    const createdItems: any[] = [];
    const createdTxs: any[] = [];
    let startCount = await InventoryItem.countDocuments();

    // Case 1: List of serial numbers provided (e.g. STB / Router bulk batch)
    if (Array.isArray(serialNumbers) && serialNumbers.length > 0) {
      for (const sn of serialNumbers) {
        const cleanSn = String(sn).trim();
        if (!cleanSn) continue;

        startCount++;
        const itemId = `INV-${1000 + startCount}`;

        const newItem = new InventoryItem({
          itemId,
          itemType: itemType || 'SET_TOP_BOX',
          name: name.trim(),
          serialNumber: cleanSn,
          stockQuantity: 1,
          unit: unit || 'PIECES',
          status: 'AVAILABLE',
        });
        await newItem.save();
        createdItems.push(newItem);

        const tx = new InventoryTransaction({
          transactionId: `TX-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          itemId,
          itemType: itemType || 'SET_TOP_BOX',
          transactionType: 'BULK_STOCK_IN',
          employeeId: req.user!.employeeId,
          quantityOrLength: 1,
          serialNumber: cleanSn,
          reason: 'Bulk Hardware Addition',
          createdBy: req.user!.employeeId,
        });
        await tx.save();
        createdTxs.push(tx);
      }
    } else {
      // Case 2: Quantity based addition (e.g. 500m fiber or 50 pieces connectors)
      const qty = Number(quantity) || 1;
      startCount++;
      const itemId = `INV-${1000 + startCount}`;

      const newItem = new InventoryItem({
        itemId,
        itemType: itemType || 'CABLE',
        name: name.trim(),
        stockQuantity: qty,
        unit: ['CABLE', 'OPTICAL_FIBER'].includes(itemType) ? 'METERS' : unit || 'PIECES',
        status: 'AVAILABLE',
      });
      await newItem.save();
      createdItems.push(newItem);

      const tx = new InventoryTransaction({
        transactionId: `TX-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        itemId,
        itemType: itemType || 'CABLE',
        transactionType: 'BULK_STOCK_IN',
        employeeId: req.user!.employeeId,
        quantityOrLength: qty,
        reason: 'Bulk Stock Addition',
        createdBy: req.user!.employeeId,
      });
      await tx.save();
      createdTxs.push(tx);
    }

    await logAuditEvent({
      userEmployeeId: req.user!.employeeId,
      userRole: req.user!.role,
      action: 'BULK_ADD_INVENTORY',
      entity: 'InventoryItem',
      newValue: { name, count: createdItems.length },
    });

    res.status(201).json({
      success: true,
      message: `Successfully added ${createdItems.length} hardware item(s) to stock.`,
      count: createdItems.length,
      data: createdItems,
    });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message || 'Failed to bulk add hardware items.' });
  }
});

// PUT /api/inventory/:id - ADMIN ONLY: Edit master inventory (Rule 5)
router.put('/:id', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const item = await InventoryItem.findOne({ itemId: req.params.id });
    if (!item) {
      res.status(404).json({ success: false, message: 'Inventory item not found.' });
      return;
    }

    const previousValue = item.toObject();
    Object.assign(item, req.body);
    await item.save();

    await logAuditEvent({
      userEmployeeId: req.user!.employeeId,
      userRole: req.user!.role,
      action: 'UPDATE_INVENTORY',
      entity: 'InventoryItem',
      entityId: item.itemId,
      previousValue,
      newValue: req.body,
    });

    res.json({ success: true, data: item });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// DELETE /api/inventory/:id - ADMIN ONLY: Delete item (Rule 5)
router.delete('/:id', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const item = await InventoryItem.findOneAndDelete({ itemId: req.params.id });
    if (!item) {
      res.status(404).json({ success: false, message: 'Inventory item not found.' });
      return;
    }

    await logAuditEvent({
      userEmployeeId: req.user!.employeeId,
      userRole: req.user!.role,
      action: 'DELETE_INVENTORY',
      entity: 'InventoryItem',
      entityId: req.params.id,
    });

    res.json({ success: true, message: 'Inventory item deleted.' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/inventory/take - Customer-Service Agent records hardware taken for a job/setup (Rules 6, 7, 8, 9)
router.post('/take', authenticateToken, requireServiceAgent, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { customerId, items } = req.body;
    const complaintId = req.body.complaintId || req.body.jobType || 'NEW_SETUP_OR_REPLACEMENT';

    if (!Array.isArray(items) || items.length === 0) {
      res.status(400).json({ success: false, message: 'At least one hardware item must be specified.' });
      return;
    }

    // Strict Rule Validation:
    // Rule 6: STB serial number REQUIRED
    // Rule 7: Wi-Fi Router/Modem serial number REQUIRED
    // Rule 8: Cable length REQUIRED
    // Rule 9: Optical fiber length REQUIRED
    for (const item of items) {
      const type = String(item.itemType).toUpperCase();

      if (type === 'SET_TOP_BOX') {
        if (!item.serialNumber || item.serialNumber.trim() === '') {
          res.status(400).json({
            success: false,
            message: 'Set-top Box serial number is mandatory (Rule 6).',
          });
          return;
        }
      } else if (type === 'WIFI_ROUTER' || type === 'WIFI_MODEM') {
        if (!item.serialNumber || item.serialNumber.trim() === '') {
          res.status(400).json({
            success: false,
            message: 'Wi-Fi Router/Modem serial number is mandatory (Rule 7).',
          });
          return;
        }
      } else if (type === 'CABLE') {
        if (!item.lengthMeters || Number(item.lengthMeters) <= 0) {
          res.status(400).json({
            success: false,
            message: 'Cable length in meters is mandatory (Rule 8).',
          });
          return;
        }
      } else if (type === 'OPTICAL_FIBER') {
        if (!item.lengthMeters || Number(item.lengthMeters) <= 0) {
          res.status(400).json({
            success: false,
            message: 'Optical Fiber length in meters is mandatory (Rule 9).',
          });
          return;
        }
      }
    }

    const recordedTransactions = [];

    // Process hardware usage and update stock / status
    for (const item of items) {
      const type = String(item.itemType).toUpperCase();
      const qtyOrLength = ['CABLE', 'OPTICAL_FIBER'].includes(type) ? Number(item.lengthMeters) : 1;

      // Find matching item in master stock if exists
      let stockItem = null;
      if (item.serialNumber) {
        stockItem = await InventoryItem.findOne({ serialNumber: item.serialNumber });
      } else {
        stockItem = await InventoryItem.findOne({ itemType: type, status: 'AVAILABLE' });
      }

      if (stockItem) {
        if (stockItem.unit === 'METERS') {
          stockItem.stockQuantity = Math.max(0, stockItem.stockQuantity - qtyOrLength);
        } else {
          stockItem.status = 'USED';
          stockItem.assignedAgentId = req.user!.employeeId;
          stockItem.assignedCustomerId = customerId;
        }
        await stockItem.save();
      }

      const tx = new InventoryTransaction({
        transactionId: `TX-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        itemId: stockItem ? stockItem.itemId : undefined,
        itemType: type,
        transactionType: 'USED',
        employeeId: req.user!.employeeId,
        customerId,
        complaintId,
        quantityOrLength: qtyOrLength,
        serialNumber: item.serialNumber,
        reason: `Hardware used for complaint ${complaintId}`,
        createdBy: req.user!.employeeId,
      });

      await tx.save();
      recordedTransactions.push(tx);
    }

    await logAuditEvent({
      userEmployeeId: req.user!.employeeId,
      userRole: req.user!.role,
      action: 'RECORD_HARDWARE_USAGE',
      entity: 'Complaint',
      entityId: complaintId,
      newValue: items,
    });

    res.json({
      success: true,
      message: 'Hardware usage recorded successfully.',
      transactions: recordedTransactions,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
