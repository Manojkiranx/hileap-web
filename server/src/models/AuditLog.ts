import mongoose, { Schema, Document } from 'mongoose';

export interface IAuditLog extends Document {
  logId: string;
  userEmployeeId: string;
  userRole: string;
  action: string;
  entity: string;
  entityId?: string;
  previousValue?: any;
  newValue?: any;
  ipAddress?: string;
  timestamp: Date;
}

const AuditLogSchema: Schema = new Schema(
  {
    logId: { type: String, required: true, unique: true, index: true },
    userEmployeeId: { type: String, required: true, index: true },
    userRole: { type: String, required: true },
    action: { type: String, required: true },
    entity: { type: String, required: true },
    entityId: { type: String },
    previousValue: { type: Schema.Types.Mixed },
    newValue: { type: Schema.Types.Mixed },
    ipAddress: { type: String },
    timestamp: { type: Date, default: Date.now, index: true },
  },
  { timestamps: false }
);

export default mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);
