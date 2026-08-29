import AuditLog from '../models/AuditLog';

export interface IAuditOptions {
  userEmployeeId: string;
  userRole: string;
  action: string;
  entity: string;
  entityId?: string;
  previousValue?: any;
  newValue?: any;
  ipAddress?: string;
}

export const logAuditEvent = async (options: IAuditOptions): Promise<void> => {
  try {
    const logId = `AUD-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    const log = new AuditLog({
      logId,
      userEmployeeId: options.userEmployeeId,
      userRole: options.userRole,
      action: options.action,
      entity: options.entity,
      entityId: options.entityId,
      previousValue: options.previousValue,
      newValue: options.newValue,
      ipAddress: options.ipAddress || '127.0.0.1',
      timestamp: new Date(),
    });
    await log.save();
  } catch (err) {
    console.error('Failed to log audit event:', err);
  }
};
