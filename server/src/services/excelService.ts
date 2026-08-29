import ExcelJS from 'exceljs';
import Payment from '../models/Payment';
import Customer from '../models/Customer';
import User from '../models/User';

export interface IExcelFilterOptions {
  startDate?: string;
  endDate?: string;
  collectionAgentId?: string;
  customerId?: string;
  status?: string;
  subscriptionType?: string;
}

export const generateCollectionExcel = async (filters: IExcelFilterOptions): Promise<Buffer> => {
  const query: any = {};

  if (filters.status) {
    query.status = filters.status;
  }

  if (filters.collectionAgentId) {
    query.collectionAgentId = filters.collectionAgentId;
  }

  if (filters.customerId) {
    query.customerId = filters.customerId;
  }

  if (filters.startDate || filters.endDate) {
    query.paymentDate = {};
    if (filters.startDate) {
      query.paymentDate.$gte = new Date(filters.startDate);
    }
    if (filters.endDate) {
      const eDate = new Date(filters.endDate);
      eDate.setHours(23, 59, 59, 999);
      query.paymentDate.$lte = eDate;
    }
  }

  const payments = await Payment.find(query).sort({ paymentDate: -1 });

  // Map customer & agent details
  const customerIds = [...new Set(payments.map((p) => p.customerId))];
  const agentIds = [...new Set(payments.map((p) => p.collectionAgentId))];

  const customers = await Customer.find({ customerId: { $in: customerIds } });
  const agents = await User.find({ employeeId: { $in: agentIds } });

  const customerMap = new Map(customers.map((c) => [c.customerId, c]));
  const agentMap = new Map(agents.map((a) => [a.employeeId, a.name]));

  // Create Excel Workbook
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'HiLeap Network Distributor System';
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet('Collection Ledger', {
    views: [{ state: 'frozen', ySplit: 1 }],
  });

  worksheet.columns = [
    { header: 'Payment ID', key: 'paymentId', width: 18 },
    { header: 'Customer ID', key: 'customerId', width: 15 },
    { header: 'Customer Name', key: 'customerName', width: 22 },
    { header: 'Phone', key: 'phone', width: 15 },
    { header: 'Address', key: 'address', width: 30 },
    { header: 'Service Type', key: 'subscriptionType', width: 14 },
    { header: 'Amount (₹)', key: 'amount', width: 14 },
    { header: 'Payment Method', key: 'paymentMethod', width: 16 },
    { header: 'Collection Agent', key: 'agentName', width: 20 },
    { header: 'Employee ID', key: 'agentId', width: 15 },
    { header: 'Date', key: 'date', width: 14 },
    { header: 'Time', key: 'time', width: 12 },
    { header: 'Billing Month', key: 'billingMonth', width: 14 },
    { header: 'Status', key: 'status', width: 14 },
    { header: 'Corrections Count', key: 'corrections', width: 16 },
  ];

  // Header Styling
  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFF' }, size: 11 };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: '0284C7' }, // Brand blue
  };
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

  payments.forEach((p) => {
    const cust = customerMap.get(p.customerId);

    // Apply subscriptionType filter if provided
    if (filters.subscriptionType && cust && cust.subscriptionType !== filters.subscriptionType) {
      return;
    }

    const pDate = new Date(p.paymentDate);
    const dateStr = pDate.toISOString().slice(0, 10);
    const timeStr = pDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

    worksheet.addRow({
      paymentId: p.paymentId,
      customerId: p.customerId,
      customerName: cust ? cust.name : 'Unknown',
      phone: cust ? cust.phone : 'N/A',
      address: cust ? cust.address : 'N/A',
      subscriptionType: cust ? cust.subscriptionType : 'N/A',
      amount: p.amount,
      paymentMethod: p.paymentMethod,
      agentName: agentMap.get(p.collectionAgentId) || 'Unknown Agent',
      agentId: p.collectionAgentId,
      date: dateStr,
      time: timeStr,
      billingMonth: p.billingMonth,
      status: p.status,
      corrections: p.correctionHistory ? p.correctionHistory.length : 0,
    });
  });

  // Format currency column
  worksheet.getColumn('amount').numFmt = '₹#,##0.00';

  const buffer = await workbook.xlsx.writeBuffer();
  return buffer as unknown as Buffer;
};
