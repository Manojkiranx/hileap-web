import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';

/**
 * Ensures user is Admin.
 */
export const requireAdmin = (req: AuthRequest, res: Response, next: NextFunction): void => {
  if (!req.user) {
    res.status(401).json({ success: false, message: 'Authentication required.' });
    return;
  }

  if (req.user.role !== 'Admin') {
    res.status(403).json({ success: false, message: 'Forbidden: Admin access required.' });
    return;
  }

  next();
};

/**
 * Enforces Rule 1: Collection Agent access requires:
 * role = Collection-Agent AND assigned work is door_cable_collection OR door_wifi_collection
 */
export const requireCollectionAgent = (req: AuthRequest, res: Response, next: NextFunction): void => {
  if (!req.user) {
    res.status(401).json({ success: false, message: 'Authentication required.' });
    return;
  }

  const isCollectionRole = req.user.role === 'Collection-Agent';
  const hasAssignedCollectionWork =
    Array.isArray(req.user.assignedWorks) &&
    req.user.assignedWorks.some((w: string) => ['door_cable_collection', 'door_wifi_collection'].includes(w));

  if (!isCollectionRole || !hasAssignedCollectionWork) {
    res.status(403).json({
      success: false,
      message: 'Forbidden: Collection Agent access requires authorized role and assigned collection work.',
    });
    return;
  }

  next();
};

/**
 * Enforces Service Agent role authorization.
 */
export const requireServiceAgent = (req: AuthRequest, res: Response, next: NextFunction): void => {
  if (!req.user) {
    res.status(401).json({ success: false, message: 'Authentication required.' });
    return;
  }

  const isServiceRole = req.user.role === 'Customer-Service-Agent';
  const hasAssignedServiceWork =
    Array.isArray(req.user.assignedWorks) && req.user.assignedWorks.includes('customer_service');

  if (!isServiceRole || !hasAssignedServiceWork) {
    res.status(403).json({
      success: false,
      message: 'Forbidden: Customer-Service Agent access requires authorized role and assigned service work.',
    });
    return;
  }

  next();
};

/**
 * Allows Admin or any specified roles.
 */
export const requireAnyRole = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required.' });
      return;
    }

    if (req.user.role === 'Admin' || roles.includes(req.user.role)) {
      next();
      return;
    }

    res.status(403).json({
      success: false,
      message: `Forbidden: Action requires one of roles: [${roles.join(', ')}] or Admin.`,
    });
  };
};
