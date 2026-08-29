import mongoose, { Schema, Document } from 'mongoose';

export interface ICorrectionRecord {
  previousAmount: number;
  newAmount: number;
  correctedBy: string;
  reason: string;
  correctedAt: Date;
}

export interface IPayment extends Document {
  paymentId: string;
  customerId: string;
  amount: number;
  paymentMethod: 'UPI' | 'CASH' | 'BANK_TRANSFER';
  collectionAgentId: string;
  billingMonth: string; // "YYYY-MM"
  paymentDate: Date;
  status: 'SUCCESSFUL' | 'CORRECTED' | 'CANCELLED';
  correctionHistory: ICorrectionRecord[];
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const CorrectionRecordSchema = new Schema(
  {
    previousAmount: { type: Number, required: true },
    newAmount: { type: Number, required: true },
    correctedBy: { type: String, required: true },
    reason: { type: String, required: true },
    correctedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const PaymentSchema: Schema = new Schema(
  {
    paymentId: { type: String, required: true, unique: true, index: true },
    customerId: { type: String, required: true, index: true },
    amount: { type: Number, required: true, min: 0.01 },
    paymentMethod: {
      type: String,
      enum: ['UPI', 'CASH', 'BANK_TRANSFER'],
      default: 'UPI',
    },
    collectionAgentId: { type: String, required: true, index: true },
    billingMonth: { type: String, required: true },
    paymentDate: { type: Date, default: Date.now, index: true },
    status: {
      type: String,
      enum: ['SUCCESSFUL', 'CORRECTED', 'CANCELLED'],
      default: 'SUCCESSFUL',
      index: true,
    },
    correctionHistory: [CorrectionRecordSchema],
    notes: { type: String },
  },
  { timestamps: true }
);

export default mongoose.model<IPayment>('Payment', PaymentSchema);
