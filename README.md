# Cable TV & Wi-Fi Network Distributor Management System

A production-ready full-stack business management application for Cable TV and Wi-Fi Network Distributor companies built with **Node.js**, **Express**, **TypeScript**, **MongoDB (Mongoose)**, **React (Vite + TypeScript)**, and **Tailwind CSS**.

---

## 🌟 Key Features

### 1. Employee Authorization & Role-Based Security
- **Admin**: Complete system control over customers, employees, master inventory, live tracking map, salaries, audit logs, and external subscription integrations.
- **Collection Agent**: Strictly restricted access to door-to-door payment collection features. Access is authorized **ONLY** when `role === 'Collection-Agent'` **AND** assigned work includes `door_cable_collection` or `door_wifi_collection` (Rule 1). Cannot edit customers, modify inventory, or access Admin APIs.
- **Customer-Service Agent**: Field tech dashboard displaying assigned complaints, customer map locations, hardware taken logger, and automatic geolocation sharing.

### 2. Automatic Pending Amount Ledger Engine
Calculates customer pending balances dynamically without manual entry:
```text
Pending Amount = Previous Unpaid Balance + All Previous Unpaid Bills - Successful Payments
```
Maintains audit trail on payment corrections with mandatory reason logging.

### 3. Excel Collection Export (.xlsx)
Generates dynamic Excel spreadsheets dynamically from MongoDB using `exceljs`, featuring header styling, money formatting, and custom date/agent/customer filters.

### 4. External Subscription URL Integration
Redirects Admin to official external recharge portals with customer Box ID pre-filled using URL templates:
`https://external-recharge-portal.example.com/recharge?boxId={BOX_ID}&customerId={CUSTOMER_ID}`

### 5. Hardware Usage Logging & Strict Validations
- Master inventory editable **ONLY by Admin** (Rule 5).
- Customer-Service Agents log hardware taken for jobs with strict validation rules:
  - **Set-top Box**: Serial number **REQUIRED** (Rule 6).
  - **Wi-Fi Router/Modem**: Serial number **REQUIRED** (Rule 7).
  - **Cable**: Length in meters **REQUIRED** (Rule 8).
  - **Optical Fiber**: Length in meters **REQUIRED** (Rule 9).

### 6. Field Tech Live GPS Map & Auto Complaint Assignment
- Periodic Geolocation tracking active **ONLY** while field tech is logged in and within working hours (`Asia/Kolkata` timezone - Section 16 & Rule 10).
- Nearest available agent complaint assignment using the Haversine distance formula.
- Automatically transitions agent status `AVAILABLE` -> `BUSY` -> `AVAILABLE` on ticket completion (Section 23).

---

## 🏗️ Project Architecture

```text
hileap-web/
├── server/                      # Node.js + Express + TypeScript API Server
│   ├── src/
│   │   ├── controllers/        # Request handling logic
│   │   ├── middleware/         # Auth JWT verification & RBAC rules
│   │   ├── models/             # Mongoose MongoDB schemas
│   │   ├── routes/             # RESTful API routes
│   │   ├── services/           # Ledger Engine, Excel Service, Auto Assignment, Location Service
│   │   ├── tests/              # Integration test suite (Jest + Supertest)
│   │   ├── seed.ts             # Development seed script
│   │   └── server.ts           # App entry point
│   ├── tsconfig.json
│   └── package.json
│
├── client/                      # React + Vite + TypeScript Frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── admin/          # Admin Dashboard, Customers, Collections, Employees, Inventory, Map
│   │   │   ├── collection/     # Collection Agent restricted desk & UPI Modal
│   │   │   ├── service/        # Field tech complaints & hardware usage logger
│   │   │   └── common/         # Sidebar, Navbar, ProtectedRoute
│   │   ├── context/            # AuthContext & Geolocation tracking
│   │   ├── pages/              # LoginPage
│   │   ├── services/           # Axios API client
│   │   └── types/              # TypeScript interfaces
│   ├── index.html
│   ├── tailwind.config.js
│   └── package.json
│
├── render.yaml                  # Render deployment configuration
├── vercel.json                  # Vercel deployment configuration
├── .env.example                 # Environment variables template
└── README.md
```

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- Node.js v18+ installed
- MongoDB installed locally or MongoDB Atlas connection string

### 2. Backend Setup
```bash
cd server
npm install
```

Create a `.env` file inside `server/`:
```env
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/hileap_db
JWT_SECRET=hileap_super_secret_jwt_key_2026
```

### 3. Seed Development Database
Populate database with Admin, Collection Agents, Field Techs, Customers, Bills, Inventory, and Complaints:
```bash
npm run seed
```

Default Seed Accounts:
- **Admin**: `admin@hileap.com` / `HileapAdmin@2026`
- **Collection Agent**: `coll1@hileap.com` / `AgentPass@123`
- **Service Tech 1**: `svc1@hileap.com` / `AgentPass@123`
- **Service Tech 2**: `svc2@hileap.com` / `AgentPass@123`

### 4. Run Integration Tests
```bash
npm test
```

### 5. Run Backend Server
```bash
npm run dev
```

### 6. Frontend Setup
In a separate terminal:
```bash
cd client
npm install
npm run dev
```
Open `http://localhost:3000` in your browser.

---

## 🌐 Deployment Instructions

### Render Deployment (Backend Service)
1. Push project to GitHub.
2. Connect repository to Render as a **Web Service**.
3. Set Root Directory: `server`
4. Build Command: `npm install && npm run build`
5. Start Command: `npm start`
6. Configure environment variables (`MONGODB_URI`, `JWT_SECRET`, `NODE_ENV=production`).

### Vercel Deployment (Frontend Service)
1. Connect repository to Vercel.
2. Root Directory: `./` (Vercel automatically detects `vercel.json`).
3. Build Command: `cd client && npm install && npm run build`
4. Output Directory: `client/dist`

---

## 🧪 Acceptance Testing Scenarios

- **Scenario A (Collection Agent)**: Login as `coll1@hileap.com`. Verify restricted dashboard. Click UPI to open QR modal. Record payment of ₹500. Verify balance updates. Try accessing `/admin` -> observe `403 Access Denied`.
- **Scenario B (Service Tech Agent)**: Login as `svc1@hileap.com`. Observe GPS tracking indicator active during working hours. Click "Log Hardware Taken" for a ticket. Try submitting STB without serial -> observe validation error. Enter serial -> submit successfully. Click Complete Ticket -> observe status becomes `AVAILABLE`.
- **Scenario C (Admin)**: Login as `admin@hileap.com`. View live agent map & collection stats. Click "Download Collection Details (.xlsx)". Click "Recharge" on a customer -> observe external URL generated with `{BOX_ID}` pre-filled.
