import mongoose, { Schema, Document } from 'mongoose';

export interface IPortal extends Document {
  name: string;
  url: string;
  category: 'CABLE' | 'WIFI' | 'BOTH' | 'OTHER';
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const PortalSchema: Schema = new Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    url: { type: String, required: true, trim: true },
    category: {
      type: String,
      enum: ['CABLE', 'WIFI', 'BOTH', 'OTHER'],
      default: 'OTHER',
    },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model<IPortal>('Portal', PortalSchema);
