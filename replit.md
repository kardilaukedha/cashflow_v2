# Cashflow & HR Management App

## Overview
A full-stack web application for cashflow tracking and HR management (employee salary, loans, field sales tracking). Built with React + TypeScript frontend and Express.js + PostgreSQL backend.

## Architecture

### Frontend
- **Framework**: React 18 + TypeScript
- **Build tool**: Vite (port 5000)
- **Styling**: Tailwind CSS
- **Charts**: Recharts
- **Icons**: Lucide React
- **Auth**: Custom JWT-based auth via backend API

### Backend
- **Runtime**: Node.js (CommonJS)
- **Framework**: Express.js (port 8000)
- **Database**: PostgreSQL via `pg` (Pool)
- **Auth**: JWT (jsonwebtoken) + bcryptjs password hashing
- **File uploads**: Multer (stored in `server/uploads/`)

### Database
- **Provider**: Replit PostgreSQL (DATABASE_URL secret)
- **Schema**: Initialized via `server/init_db.sql`
- **Tables**: 41 tables covering users, employees, salary, cashflow, field sales (Sariroti), and settings

## Running the Application
```
npm run dev
```
This runs both the Express server (`node server/index.js`) and Vite (`vite`) concurrently.

## Key Environment Variables (Secrets)
- `DATABASE_URL` — PostgreSQL connection string
- `SESSION_SECRET` — JWT signing secret

## Authentication
- Custom users table (`users`) with bcrypt-hashed passwords
- JWT tokens stored in localStorage (`sb_token`)
- Roles: `superadmin`, `admin_keuangan`, `admin_sariroti`, `karyawan`, `karyawan_sariroti`
- Default superadmin: `admin@admin.com` / `admin123`

## API Structure
- `POST /api/auth/login` — Login with email/password
- `GET /api/auth/me` — Get current user
- `POST /api/auth/register` — Register new user
- `POST /api/auth/create-user` — Create user (superadmin only)
- `DELETE /api/auth/delete-user/:userId` — Delete user (superadmin only)
- `GET/POST/PUT/DELETE /api/sku-items` — SKU management CRUD (GET: all authenticated users; POST/PUT/DELETE: superadmin, admin_sariroti only)
- `GET/POST/PUT/DELETE /api/:table` — Generic CRUD for any table
- `POST /api/checkin` — Field visit check-in with GPS + selfie
- `POST /api/checkout/:checkinId` — Field visit checkout
- Special routes for: stores, visit plans, laporan karyawan, performa karyawan, sariroti settings

## Frontend API Client
`src/lib/supabase.ts` exports a `supabase` object that mimics the Supabase client API but proxies all calls to the local Express backend at `/api`.

## File Structure
```
├── src/                    # React frontend
│   ├── components/         # UI components
│   ├── contexts/           # AuthContext
│   ├── lib/               # supabase.ts (API client), utils, permissions
│   └── main.tsx
├── server/
│   ├── index.js           # Express API server
│   ├── init_db.sql        # Database schema initialization
│   └── uploads/           # Uploaded files (selfies, store photos)
├── supabase/migrations/   # Legacy Supabase migrations (reference only)
└── package.json
```

## Database Schema Initialization
On first run (or fresh DB), run:
```bash
node -e "
const { Pool } = require('pg');
const fs = require('fs');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
pool.query(fs.readFileSync('server/init_db.sql', 'utf8'))
  .then(() => { console.log('Done'); pool.end(); })
  .catch(e => { console.error(e.message); pool.end(); });
"
```
The server also auto-migrates on startup:
- `visit_checkins` table: adds GPS/checkout columns
- `sku_items` table: creates table and seeds 92 SKU items from the static list if empty

## SKU Management
- **Table**: `sku_items` (id, kode, nama, kategori, cbp, is_active)
- **Admin component**: `src/components/sariroti/SkuManager.tsx` — CRUD interface for managing SKUs
- **Picker**: `src/components/sariroti/SkuPickerModal.tsx` — loads SKUs from DB, supports quantity per SKU
- **Permission**: `manage_sku` — only `superadmin` and `admin_sariroti` can create/edit/delete; all authenticated users can read

## Visit Plan Date Restriction
- Users can select a plan date from today up to 3 days in the future
- Date picker enforced via min/max attributes on the date input

## Mobile-Responsive Design
- **Sidebar**: Responsive drawer — visible as sidebar on desktop (lg+), hamburger menu overlay on mobile (<lg)
- **Dashboard**: Sticky top nav bar on mobile with hamburger + app title + role badge; `p-4` mobile / `p-6` desktop
- **Tables**: All admin tables (EmployeeSalary, Loans, Users, Positions) use horizontal scroll (`overflow-x-auto` + `min-w-[...]`) on mobile
- **Cards/Grids**: SummaryCards use `grid-cols-2` on mobile, `md:grid-cols-4` on desktop. Forms use `grid-cols-1` on mobile, `sm:grid-cols-2` on desktop
- **Settings**: Horizontal scrollable tab bar on mobile, sidebar tabs on desktop
- **CSS Animations**: `animate-slide-in` for mobile drawer entrance (defined in `src/index.css`)
- **Safe area**: `safe-top` / `safe-bottom` classes for iOS notch support
