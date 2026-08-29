export interface User {
  employeeId: string;
  name: string;
  phone?: string;
  email?: string;
  role: 'Admin' | 'Collection-Agent' | 'Customer-Service-Agent' | 'Customer';
  assignedWorks?: string[];
  employmentStatus?: 'ACTIVE' | 'INACTIVE' | 'ON_LEAVE';
  workStatus?: 'AVAILABLE' | 'BUSY' | 'OFFLINE';
  salaryDetails?: {
    baseSalary: number;
    allowances: number;
    deductions: number;
  };
  workingHours?: {
    startTime: string;
    endTime: string;
    timezone: string;
  };
}

export interface Customer {
  _id?: string;
  customerId: string;
  name: string;
  phone?: string;
  altPhone?: string;
  address: string;
  area: string;
  location: {
    latitude: number;
    longitude: number;
  };
  subscriptionType: 'CABLE' | 'WIFI' | 'BOTH';
  planName: string;
  monthlyBill: number;
  boxId: string;
  setTopBoxSerial?: string;
  routerSerial?: string;
  status: 'ACTIVE' | 'PAUSED' | 'UNSUBSCRIBED';
  previousUnpaidBalance: number;
  installationDate?: string;
  notes?: string;
  pendingAmount?: number;
  currentMonthBill?: number;
  totalUnpaidBills?: number;
  totalSuccessfulPayments?: number;
}

export interface Bill {
  billId: string;
  customerId: string;
  month: string;
  amount: number;
  dueDate: string;
  status: 'UNPAID' | 'PAID' | 'PARTIALLY_PAID';
  paidAmount: number;
}

export interface CorrectionRecord {
  previousAmount: number;
  newAmount: number;
  correctedBy: string;
  reason: string;
  correctedAt: string;
}

export interface Payment {
  _id?: string;
  paymentId: string;
  customerId: string;
  amount: number;
  paymentMethod: 'UPI' | 'CASH' | 'BANK_TRANSFER';
  collectionAgentId: string;
  billingMonth: string;
  paymentDate: string;
  status: 'SUCCESSFUL' | 'CORRECTED' | 'CANCELLED';
  correctionHistory?: CorrectionRecord[];
  notes?: string;
}

export interface InventoryItem {
  _id?: string;
  itemId: string;
  itemType: 'SET_TOP_BOX' | 'WIFI_ROUTER' | 'WIFI_MODEM' | 'CABLE' | 'OPTICAL_FIBER' | 'OTHER';
  name: string;
  serialNumber?: string;
  stockQuantity: number;
  unit: 'METERS' | 'PIECES';
  status: 'AVAILABLE' | 'ASSIGNED' | 'USED' | 'DAMAGED';
  assignedAgentId?: string;
  assignedCustomerId?: string;
}

export interface InventoryTransaction {
  transactionId: string;
  itemId?: string;
  itemType: string;
  transactionType: string;
  employeeId: string;
  customerId?: string;
  complaintId?: string;
  quantityOrLength: number;
  serialNumber?: string;
  reason?: string;
  createdBy: string;
  createdAt: string;
}

export interface HardwareUsed {
  itemType: string;
  serialNumber?: string;
  lengthMeters?: number;
  quantity?: number;
}

export interface Complaint {
  _id?: string;
  complaintId: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  complaintType: string;
  description: string;
  location: {
    latitude: number;
    longitude: number;
  };
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  status: 'OPEN' | 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  assignedAgentId?: string;
  assignedTime?: string;
  completedTime?: string;
  resolutionNotes?: string;
  hardwareUsed?: HardwareUsed[];
  createdAt?: string;
}

export interface Salary {
  salaryId: string;
  employeeId: string;
  employeeName?: string;
  employeeRole?: string;
  month: string;
  baseSalary: number;
  allowances: number;
  deductions: number;
  bonus: number;
  netSalary: number;
  paymentStatus: 'PENDING' | 'PAID';
  paymentDate?: string;
}

export interface AuditLog {
  logId: string;
  userEmployeeId: string;
  userRole: string;
  action: string;
  entity: string;
  entityId?: string;
  previousValue?: any;
  newValue?: any;
  ipAddress?: string;
  timestamp: string;
}

export interface LiveLocationAgent {
  employeeId: string;
  name: string;
  phone: string;
  workStatus: string;
  isWithinWorkingHours: boolean;
  latitude: number | null;
  longitude: number | null;
  lastUpdated: string | null;
}
