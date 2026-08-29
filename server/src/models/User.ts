import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  employeeId: string;
  name: string;
  phone: string;
  email: string;
  password: string;
  role: 'Admin' | 'Collection-Agent' | 'Customer-Service-Agent';
  assignedWorks: string[]; // e.g. ['door_cable_collection', 'door_wifi_collection', 'customer_service']
  assignedLocalities: string[]; // e.g. ['Athippaly', 'Kaaramoola']
  employmentStatus: 'ACTIVE' | 'INACTIVE' | 'ON_LEAVE';
  workStatus: 'AVAILABLE' | 'BUSY' | 'OFFLINE';
  salaryDetails: {
    baseSalary: number;
    allowances: number;
    deductions: number;
  };
  workingHours: {
    startTime: string; // e.g. "09:00"
    endTime: string;   // e.g. "18:00"
    timezone: string;  // e.g. "Asia/Kolkata"
  };
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema: Schema = new Schema(
  {
    employeeId: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String, required: true, unique: true, index: true, lowercase: true },
    password: { type: String, required: true },
    role: {
      type: String,
      enum: ['Admin', 'Collection-Agent', 'Customer-Service-Agent'],
      required: true,
      index: true,
    },
    assignedWorks: [{ type: String }],
    assignedLocalities: [{ type: String }],
    employmentStatus: {
      type: String,
      enum: ['ACTIVE', 'INACTIVE', 'ON_LEAVE'],
      default: 'ACTIVE',
    },
    workStatus: {
      type: String,
      enum: ['AVAILABLE', 'BUSY', 'OFFLINE'],
      default: 'OFFLINE',
    },
    salaryDetails: {
      baseSalary: { type: Number, default: 0 },
      allowances: { type: Number, default: 0 },
      deductions: { type: Number, default: 0 },
    },
    workingHours: {
      startTime: { type: String, default: '09:00' },
      endTime: { type: String, default: '18:00' },
      timezone: { type: String, default: 'Asia/Kolkata' },
    },
    lastLoginAt: { type: Date },
  },
  { timestamps: true }
);

export default mongoose.model<IUser>('User', UserSchema);
