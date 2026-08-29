import mongoose, { Schema, Document } from 'mongoose';

export interface ICustomer extends Document {
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
  installationDate: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const CustomerSchema: Schema = new Schema(
  {
    customerId: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    phone: { type: String, default: '', index: true },
    altPhone: { type: String },
    address: { type: String, required: true },
    area: { type: String, required: true, index: true },
    location: {
      latitude: { type: Number, required: true, default: 13.0827 },
      longitude: { type: Number, required: true, default: 80.2707 },
    },
    subscriptionType: {
      type: String,
      enum: ['CABLE', 'WIFI', 'BOTH'],
      required: true,
    },
    planName: { type: String, required: true },
    monthlyBill: { type: Number, required: true, min: 0 },
    boxId: { type: String, required: true, unique: true, index: true },
    setTopBoxSerial: { type: String },
    routerSerial: { type: String },
    status: {
      type: String,
      enum: ['ACTIVE', 'PAUSED', 'UNSUBSCRIBED'],
      default: 'ACTIVE',
      index: true,
    },
    previousUnpaidBalance: { type: Number, default: 0 },
    installationDate: { type: Date, default: Date.now },
    notes: { type: String },
  },
  { timestamps: true }
);

export default mongoose.model<ICustomer>('Customer', CustomerSchema);
