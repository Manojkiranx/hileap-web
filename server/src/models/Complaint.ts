import mongoose, { Schema, Document } from 'mongoose';

export interface IHardwareUsed {
  itemType: string;
  serialNumber?: string;
  lengthMeters?: number;
  quantity?: number;
}

export interface IComplaint extends Document {
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
  assignedTime?: Date;
  completedTime?: Date;
  resolutionNotes?: string;
  hardwareUsed: IHardwareUsed[];
  createdAt: Date;
  updatedAt: Date;
}

const HardwareUsedSchema = new Schema(
  {
    itemType: { type: String, required: true },
    serialNumber: { type: String },
    lengthMeters: { type: Number },
    quantity: { type: Number },
  },
  { _id: false }
);

const ComplaintSchema: Schema = new Schema(
  {
    complaintId: { type: String, required: true, unique: true, index: true },
    customerId: { type: String, required: true, index: true },
    customerName: { type: String, required: true },
    customerPhone: { type: String, required: true },
    customerAddress: { type: String, required: true },
    complaintType: { type: String, required: true },
    description: { type: String, required: true },
    location: {
      latitude: { type: Number, required: true, default: 13.0827 },
      longitude: { type: Number, required: true, default: 80.2707 },
    },
    priority: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'],
      default: 'MEDIUM',
    },
    status: {
      type: String,
      enum: ['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'],
      default: 'OPEN',
      index: true,
    },
    assignedAgentId: { type: String, index: true },
    assignedTime: { type: Date },
    completedTime: { type: Date },
    resolutionNotes: { type: String },
    hardwareUsed: [HardwareUsedSchema],
  },
  { timestamps: true }
);

export default mongoose.model<IComplaint>('Complaint', ComplaintSchema);
