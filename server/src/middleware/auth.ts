import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import Customer from '../models/Customer';
import User from '../models/User';

export interface AuthRequest extends Request {
  user?: any;
  customer?: any;
}

const JWT_SECRET = process.env.JWT_SECRET || 'hileap_super_secret_jwt_key_2026';

export const authenticateToken = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    let token = req.cookies?.token;

    if (!token && req.headers.authorization) {
      const parts = req.headers.authorization.split(' ');
      if (parts.length === 2 && parts[0] === 'Bearer') {
        token = parts[1];
      }
    }

    if (!token) {
      res.status(401).json({ success: false, message: 'Authentication token required.' });
      return;
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; role: string; customerId?: string };

    if (decoded.role === 'Customer') {
      const customer = await Customer.findById(decoded.userId);
      if (!customer) {
        res.status(401).json({ success: false, message: 'Customer account not found.' });
        return;
      }
      req.customer = customer;
      req.user = {
        employeeId: customer.customerId,
        name: customer.name,
        phone: customer.phone,
        role: 'Customer',
      };
      next();
      return;
    }

    const user = await User.findById(decoded.userId).select('-password');

    if (!user) {
      res.status(401).json({ success: false, message: 'User account not found.' });
      return;
    }

    if (user.employmentStatus !== 'ACTIVE') {
      res.status(403).json({ success: false, message: 'Employee account is inactive or on leave.' });
      return;
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ success: false, message: 'Invalid or expired session token.' });
  }
};
