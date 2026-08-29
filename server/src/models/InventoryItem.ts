import mongoose, { Schema, Document } from 'mongoose';

export interface IInventoryItem extends Document {
  itemId: string;
  itemType: 'SET_TOP_BOX' | 'WIFI_ROUTER' | 'WIFI_MODEM' | 'CABLE' | 'OPTICAL_FIBER' | 'OTHER';
  name: string;
  serialNumber?: string;
  stockQuantity: number; // Meters for Cable/Fiber, Count for devices
  unit: 'METERS' | 'PIECES';
  status: 'AVAILABLE' | 'ASSIGNED' | 'USED' | 'DAMAGED';
  assignedAgentId?: string;
  assignedCustomerId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const InventoryItemSchema: Schema = new Schema(
  {
    itemId: { type: String, required: true, unique: true, index: true },
    itemType: {
      type: String,
      enum: ['SET_TOP_BOX', 'WIFI_ROUTER', 'WIFI_MODEM', 'CABLE', 'OPTICAL_FIBER', 'OTHER'],
      required: true,
      index: true,
    },
    name: { type: String, required: true },
    serialNumber: { type: String, sparse: true, index: true },
    stockQuantity: { type: Number, required: true, default: 0 },
    unit: {
      type: String,
      enum: ['METERS', 'PIECES'],
      default: 'PIECES',
    },
    status: {
      type: String,
      enum: ['AVAILABLE', 'ASSIGNED', 'USED', 'DAMAGED'],
      default: 'AVAILABLE',
      index: true,
    },
    assignedAgentId: { type: String },
    assignedCustomerId: { type: String },
  },
  { timestamps: true }
);

export default mongoose.model<IInventoryItem>('InventoryItem', InventoryItemSchema);
