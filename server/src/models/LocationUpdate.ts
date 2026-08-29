import mongoose, { Schema, Document } from 'mongoose';

export interface ILocationUpdate extends Document {
  employeeId: string;
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp: Date;
  workingStatus: string;
}

const LocationUpdateSchema: Schema = new Schema(
  {
    employeeId: { type: String, required: true, index: true },
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    accuracy: { type: Number },
    timestamp: { type: Date, default: Date.now, index: true },
    workingStatus: { type: String, default: 'AVAILABLE' },
  },
  { timestamps: false }
);

export default mongoose.model<ILocationUpdate>('LocationUpdate', LocationUpdateSchema);
