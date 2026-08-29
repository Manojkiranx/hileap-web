import mongoose, { Schema, Document } from 'mongoose';

export interface IArea extends Document {
  name: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const AreaSchema: Schema = new Schema(
  {
    name: { type: String, required: true, unique: true, index: true, trim: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model<IArea>('Area', AreaSchema);
