import mongoose, { Schema, Document } from 'mongoose';

export interface IInventoryTransaction extends Document {
  transactionId: string;
  itemId?: string;
  itemType: string;
  transactionType: 'STOCK_IN' | 'ASSIGNED' | 'USED' | 'RETURNED' | 'DAMAGED' | 'LOST' | 'ADJUSTMENT';
  employeeId: string;
  customerId?: string;
  complaintId?: string;
  quantityOrLength: number;
  serialNumber?: string;
  reason?: string;
  createdBy: string;
  createdAt: Date;
}

const InventoryTransactionSchema: Schema = new Schema(
  {
    transactionId: { type: String, required: true, unique: true, index: true },
    itemId: { type: String, index: true },
    itemType: { type: String, required: true },
    transactionType: {
      type: String,
      enum: ['STOCK_IN', 'ASSIGNED', 'USED', 'RETURNED', 'DAMAGED', 'LOST', 'ADJUSTMENT'],
      required: true,
      index: true,
    },
    employeeId: { type: String, required: true, index: true },
    customerId: { type: String },
    complaintId: { type: String },
    quantityOrLength: { type: Number, required: true },
    serialNumber: { type: String },
    reason: { type: String },
    createdBy: { type: String, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export default mongoose.model<IInventoryTransaction>('InventoryTransaction', InventoryTransactionSchema);
