import mongoose, { Schema, Document } from 'mongoose';

export interface ISalary extends Document {
  salaryId: string;
  employeeId: string;
  month: string; // YYYY-MM
  baseSalary: number;
  allowances: number;
  deductions: number;
  bonus: number;
  netSalary: number;
  paymentStatus: 'PENDING' | 'PAID';
  paymentDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const SalarySchema: Schema = new Schema(
  {
    salaryId: { type: String, required: true, unique: true, index: true },
    employeeId: { type: String, required: true, index: true },
    month: { type: String, required: true, index: true },
    baseSalary: { type: Number, required: true, min: 0 },
    allowances: { type: Number, default: 0, min: 0 },
    deductions: { type: Number, default: 0, min: 0 },
    bonus: { type: Number, default: 0, min: 0 },
    netSalary: { type: Number, required: true },
    paymentStatus: {
      type: String,
      enum: ['PENDING', 'PAID'],
      default: 'PENDING',
    },
    paymentDate: { type: Date },
  },
  { timestamps: true }
);

export default mongoose.model<ISalary>('Salary', SalarySchema);
