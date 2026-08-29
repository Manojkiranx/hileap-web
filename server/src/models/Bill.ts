import mongoose, { Schema, Document } from 'mongoose';

export interface IBill extends Document {
  billId: string;
  customerId: string;
  month: string; // "YYYY-MM"
  amount: number;
  dueDate: Date;
  status: 'UNPAID' | 'PAID' | 'PARTIALLY_PAID';
  paidAmount: number;
  createdAt: Date;
  updatedAt: Date;
}

const BillSchema: Schema = new Schema(
  {
    billId: { type: String, required: true, unique: true, index: true },
    customerId: { type: String, required: true, index: true },
    month: { type: String, required: true, index: true },
    amount: { type: Number, required: true, min: 0 },
    dueDate: { type: Date, required: true },
    status: {
      type: String,
      enum: ['UNPAID', 'PAID', 'PARTIALLY_PAID'],
      default: 'UNPAID',
    },
    paidAmount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.model<IBill>('Bill', BillSchema);
