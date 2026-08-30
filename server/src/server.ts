import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import path from 'path';

import authRoutes from './routes/authRoutes';
import customerRoutes from './routes/customerRoutes';
import employeeRoutes from './routes/employeeRoutes';
import paymentRoutes from './routes/paymentRoutes';
import inventoryRoutes from './routes/inventoryRoutes';
import complaintRoutes from './routes/complaintRoutes';
import locationRoutes from './routes/locationRoutes';
import salaryRoutes from './routes/salaryRoutes';
import auditRoutes from './routes/auditRoutes';
import areaRoutes from './routes/areaRoutes';
import settingsRoutes from './routes/settingsRoutes';
import reportRoutes from './routes/reportRoutes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/hileap_db';

import fs from 'fs';

// Security & Middleware
app.use(helmet({ contentSecurityPolicy: false }));
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, postman, same-origin)
      if (!origin) return callback(null, true);
      const allowedOrigins = [
        process.env.FRONTEND_URL,
        'http://localhost:3000',
        'http://localhost:5000',
      ].filter(Boolean);

      if (
        allowedOrigins.includes(origin) ||
        origin.endsWith('.vercel.app') ||
        origin.endsWith('.onrender.com')
      ) {
        return callback(null, true);
      }
      return callback(null, true);
    },
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(morgan('dev'));

// Rate limiting for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { success: false, message: 'Too many login attempts. Please try again later.' },
});
app.use('/api/auth', authLimiter);

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/areas', areaRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/complaints', complaintRoutes);
app.use('/api/locations', locationRoutes);
app.use('/api/salaries', salaryRoutes);
app.use('/api/audit-logs', auditRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/reports', reportRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'UP',
    system: 'HiLeap Cable & Wi-Fi Management System',
    timestamp: new Date().toISOString(),
  });
});

// Production Client Static Serving (if bundled together)
if (process.env.NODE_ENV === 'production') {
  const clientDist = path.join(__dirname, '../../client/dist');
  if (fs.existsSync(clientDist)) {
    app.use(express.static(clientDist));
    app.get('*', (req, res) => {
      res.sendFile(path.join(clientDist, 'index.html'));
    });
  }
}

// Structured error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('API Error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error occurred.',
  });
});

import User from './models/User';
import bcrypt from 'bcryptjs';

const ensureAdminUser = async () => {
  try {
    const adminEmail = 'sabiesh@gmail.com';
    const adminPass = await bcrypt.hash('HileapAdmin@2026', 10);
    let admin = await User.findOne({ email: adminEmail });

    if (!admin) {
      const oldAdmin = await User.findOne({ email: 'admin@hileap.com' });
      if (oldAdmin) {
        oldAdmin.email = adminEmail;
        oldAdmin.name = 'Sabiesh (Admin)';
        oldAdmin.password = adminPass;
        await oldAdmin.save();
        console.log(`[Auto-Admin] Updated existing admin email to ${adminEmail}`);
      } else {
        await User.create({
          employeeId: 'EMP-100',
          name: 'Sabiesh (Admin)',
          phone: '+919876543210',
          email: adminEmail,
          password: adminPass,
          role: 'Admin',
          assignedWorks: ['admin_management'],
          employmentStatus: 'ACTIVE',
          workStatus: 'OFFLINE',
          salaryDetails: { baseSalary: 60000, allowances: 10000, deductions: 2000 },
          workingHours: { startTime: '09:00', endTime: '18:00', timezone: 'Asia/Kolkata' },
        });
        console.log(`[Auto-Admin] Created admin user: ${adminEmail}`);
      }
    } else {
      admin.password = adminPass;
      await admin.save();
      console.log(`[Auto-Admin] Admin user ${adminEmail} verified in MongoDB.`);
    }
  } catch (err: any) {
    console.error('[Auto-Admin Error]:', err.message);
  }
};

// Connect Database & Start Server
export const startServer = async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log(`[MongoDB] Connected successfully to ${MONGODB_URI}`);

    // Automatically ensure Admin user exists on every server startup
    await ensureAdminUser();

    const server = app.listen(PORT, () => {
      console.log(`[HiLeap Server] Running on http://localhost:${PORT}`);
    });

    return { app, server };
  } catch (error) {
    console.error('[MongoDB Connection Error]:', error);
    process.exit(1);
  }
};

if (process.env.NODE_ENV !== 'test') {
  startServer();
}

export default app;
