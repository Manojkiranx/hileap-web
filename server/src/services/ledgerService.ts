import Customer from '../models/Customer';
import Bill from '../models/Bill';
import Payment from '../models/Payment';
import SystemSettings from '../models/SystemSettings';
import { logAuditEvent } from './auditService';

export interface IPendingBalanceSummary {
  previousUnpaidBalance: number;
  totalUnpaidBills: number;
  totalSuccessfulPayments: number;
  pendingAmount: number;
  currentMonthBill: number;
}

/**
 * Calculates pending amount according to Section 6:
 * Pending Amount = Previous Unpaid Balance + All Previous Unpaid Bills + Current Unpaid Bill - Successful Payments
 */
export const calculateCustomerPendingAmount = async (customerId: string): Promise<IPendingBalanceSummary> => {
  const customer = await Customer.findOne({ customerId });
  if (!customer) {
    throw new Error(`Customer ${customerId} not found.`);
  }

  const previousUnpaidBalance = customer.previousUnpaidBalance || 0;

  // Fetch all bills for this customer
  const bills = await Bill.find({ customerId });
  const totalBillsAmount = bills.reduce((acc, b) => acc + b.amount, 0);

  // Fetch all SUCCESSFUL payments for this customer
  const payments = await Payment.find({ customerId, status: 'SUCCESSFUL' });
  const totalSuccessfulPayments = payments.reduce((acc, p) => acc + p.amount, 0);

  // Get current month bill (if exists)
  const currentMonthStr = new Date().toISOString().slice(0, 7);
  const currentBillObj = bills.find((b) => b.month === currentMonthStr);
  const currentMonthBill = currentBillObj ? currentBillObj.amount : customer.monthlyBill;

  const rawPending = previousUnpaidBalance + totalBillsAmount - totalSuccessfulPayments;
  const pendingAmount = Math.max(0, rawPending);

  return {
    previousUnpaidBalance,
    totalUnpaidBills: totalBillsAmount,
    totalSuccessfulPayments,
    pendingAmount,
    currentMonthBill,
  };
};

/**
 * Record a payment collected by an agent
 */
export const recordPayment = async (data: {
  customerId: string;
  amount: number;
  paymentMethod: 'UPI' | 'CASH' | 'BANK_TRANSFER';
  collectionAgentId: string;
  billingMonth: string;
  notes?: string;
}) => {
  const { customerId, amount, paymentMethod, collectionAgentId, billingMonth, notes } = data;

  if (amount <= 0 || isNaN(amount)) {
    throw new Error('Payment amount must be a positive number greater than 0.');
  }

  const summary = await calculateCustomerPendingAmount(customerId);

  // Check overpayment configuration
  const allowOverpaymentSetting = await SystemSettings.findOne({ key: 'ALLOW_OVERPAYMENT' });
  const allowOverpayment = allowOverpaymentSetting ? Boolean(allowOverpaymentSetting.value) : false;

  if (!allowOverpayment && amount > summary.pendingAmount && summary.pendingAmount > 0) {
    throw new Error(`Payment amount (₹${amount}) exceeds maximum pending balance (₹${summary.pendingAmount}).`);
  }

  const paymentId = `PAY-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

  const payment = new Payment({
    paymentId,
    customerId,
    amount,
    paymentMethod,
    collectionAgentId,
    billingMonth,
    status: 'SUCCESSFUL',
    notes,
  });

  await payment.save();

  await logAuditEvent({
    userEmployeeId: collectionAgentId,
    userRole: 'Collection-Agent',
    action: 'RECORD_PAYMENT',
    entity: 'Payment',
    entityId: paymentId,
    newValue: { customerId, amount, paymentMethod, billingMonth },
  });

  return payment;
};

/**
 * Correct a payment entry with full audit record and history
 */
export const correctPaymentEntry = async (
  paymentId: string,
  newAmount: number,
  reason: string,
  correctedByEmployeeId: string,
  correctedByRole: string
) => {
  if (!reason || reason.trim().length === 0) {
    throw new Error('Reason for correction is required.');
  }

  if (newAmount <= 0 || isNaN(newAmount)) {
    throw new Error('New payment amount must be a positive number.');
  }

  const payment = await Payment.findOne({ paymentId });
  if (!payment) {
    throw new Error(`Payment record ${paymentId} not found.`);
  }

  const previousAmount = payment.amount;

  payment.correctionHistory.push({
    previousAmount,
    newAmount,
    correctedBy: correctedByEmployeeId,
    reason,
    correctedAt: new Date(),
  });

  payment.amount = newAmount;
  payment.status = 'CORRECTED';
  await payment.save();

  await logAuditEvent({
    userEmployeeId: correctedByEmployeeId,
    userRole: correctedByRole,
    action: 'CORRECT_PAYMENT',
    entity: 'Payment',
    entityId: paymentId,
    previousValue: { amount: previousAmount },
    newValue: { amount: newAmount, reason },
  });

  return payment;
};
