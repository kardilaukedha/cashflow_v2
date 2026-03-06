# Cashflow & HR Management System

A comprehensive financial and human resources management system for businesses.

## Tech Stack

- **Frontend:** React 18 + TypeScript + Vite 5
- **Backend:** Express.js (Node.js) on port 8000
- **Database:** Replit PostgreSQL (via DATABASE_URL)
- **Auth:** JWT tokens (stored in localStorage)
- **Styling:** Tailwind CSS
- **Charts:** Recharts
- **Icons:** Lucide React
- **File Uploads:** Multer (selfie photos stored in `server/uploads/`)

## Project Structure

```
src/
  components/
    sariroti/         # Sari Roti-specific components
      SariRotiDashboard.tsx  # karyawan_sariroti main dashboard
      CheckinModal.tsx       # Store check-in wizard (selfie + bread scan)
      VisitMonitorAdmin.tsx  # Admin monitoring panel
    settings/         # Settings-specific components
    AnnouncementManager.tsx  # Admin CRUD for announcements
    AnnouncementBoard.tsx    # Read-only announcement display
    Dashboard.tsx     # Main layout + view router
    Sidebar.tsx       # Role-aware navigation
    UserManager.tsx   # User CRUD (superadmin)
  contexts/           # React Context (AuthContext)
  lib/
    supabase.ts       # Custom API compatibility client
    permissions.ts    # RBAC — centralized feature permissions
  App.tsx             # Main entry component
server/
  index.js            # Express backend (port 8000) + multer upload
  uploads/            # Uploaded selfie photos (served as /uploads/*)
supabase/
  migrations/         # SQL schema reference
```

## Architecture

Two processes run simultaneously:
1. **Vite dev server** on port 5000 (frontend), proxies `/api` and `/uploads` to backend
2. **Express server** on port 8000 (backend API + JWT auth + static file serving)

## User Accounts

| Email | Password | Role |
|---|---|---|
| admin@admin.com | password | superadmin |
| user@user.com | password | karyawan |
| sariroti@test.com | password | karyawan_sariroti |

## Role-Based Access Control

5 roles enforced both frontend (permissions.ts) and backend (WRITE_ROLE_MAP):

| Role | Akses |
|---|---|
| `superadmin` | Full access — semua fitur |
| `admin_keuangan` | Dashboard, Gaji, Pinjaman, Kategori, Import/Export, Pengumuman, Monitor Kunjungan |
| `admin_sariroti` | Dashboard, Gaji, Pinjaman, Pengumuman, Monitor Kunjungan, Settings Sariroti |
| `karyawan` | Lihat slip gaji sendiri, lihat pinjaman sendiri, Pengumuman |
| `karyawan_sariroti` | Dashboard Kunjungan, Plan Kunjungan Harian, Check-in toko + scan roti |

## Database Tables

### Core
- `users` - Auth (email + password_hash)
- `user_profiles` - Role, identitas, employee_id link (roles: superadmin/admin_keuangan/admin_sariroti/karyawan/karyawan_sariroti)
- `categories` / `transactions` - Cashflow
- `employees` / `salary_payments` / `employee_loans` / `job_positions` - HR

### New (Sari Roti Module)
- `announcements` - title, content, target_roles[], priority, is_active
- `sariroti_settings` - Per-user: min_visits, max_visits, plan_deadline (time)
- `visit_plans` - Daily plan: user_id, plan_date, stores (JSONB), status
- `visit_checkins` - Check-in: selfie_url, visit_type, total_billing, has_expired_bread
- `bread_scans` - Per-scan: barcode, bread_name, quantity, scan_type (drop/tarik)

## Key API Endpoints

### Generic CRUD
- `GET /api/:table` - Query table (select, filter, order, limit)
- `POST /api/:table` - Insert
- `PUT /api/:table` - Update
- `DELETE /api/:table` - Delete

### Auth
- `POST /api/auth/login|register|logout|update-password`
- `POST /api/auth/create-user` (superadmin)
- `DELETE /api/auth/delete-user/:userId` (superadmin)

### Sari Roti Specific
- `POST /api/upload` - Upload selfie photo (returns /uploads/filename)
- `GET /api/sariroti-settings/:userProfileId` - Get user settings
- `PUT /api/sariroti-settings/:userProfileId` - Upsert user settings (admin only)
- `GET /api/visit-summary?date=YYYY-MM-DD` - Admin monitoring summary
- `GET /api/visit-detail/:planId` - Check-in details with bread scans

## Key Features

### All Users
- Announcement board (role-targeted)

### Admin Features
- Financial transaction tracking (income/expense) with categories
- Data visualization with charts
- Employee salary management and payslips
- Loan management + job position management
- User management with role assignment
- Announcement management (create/edit/delete, priority, target roles)
- **Monitor Kunjungan**: View daily visit plans, approve/reject, see check-in photos
- **Pengaturan Sariroti**: Set min/max visits and plan deadline per karyawan_sariroti

### Karyawan Sari Roti Features
- **Dashboard Kunjungan**: Daily plan progress bar, check-in status per store
- **Plan Kunjungan**: Fill list of stores to visit (cutoff at configurable time)
- **Check-in Wizard** (3 steps):
  1. Store name + selfie photo + visit type (drop roti / tagihan / drop & tagihan)
  2. Bread scanning (barcode input → auto-accumulate), billing input, expired bread scan
  3. Summary review + notes
- Deadline enforcement (can't create new plan after configured time)
- Minimum store visit enforcement

## Development

```bash
npm run dev       # Start both servers
npm run build     # Production build
```
