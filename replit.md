# Cashflow & HR Management System

A comprehensive financial and human resources management system for businesses.

## Tech Stack

- **Frontend:** React 18 + TypeScript + Vite 5
- **Backend:** Express.js (Node.js) on port 8000
- **Database:** Replit PostgreSQL (via DATABASE_URL)
- **Auth:** JWT tokens (stored in localStorage as `sb_token`)
- **Styling:** Tailwind CSS
- **Charts:** Recharts
- **Icons:** Lucide React
- **File Uploads:** Multer (photos stored in `server/uploads/`)

## Project Structure

```
src/
  components/
    sariroti/
      SariRotiDashboard.tsx   # karyawan_sariroti main dashboard (plan + checkout + GPS alert)
      CheckinModal.tsx        # Store check-in wizard (GPS + server timestamp + dedup)
      VisitMonitorAdmin.tsx   # Admin monitoring panel (5 tabs)
      TokoManager.tsx         # Employee store registration
      TokoAdminView.tsx       # Admin store management
      LaporanKaryawan.tsx     # Laporan kunjungan + CSV export
      PerformaKaryawan.tsx    # Performance dashboard + ranking
    Dashboard.tsx             # Main layout + view router
    Sidebar.tsx               # Role-aware navigation
    UserManager.tsx           # User CRUD (superadmin)
  contexts/                   # React Context (AuthContext)
  lib/
    supabase.ts               # Custom API compatibility client
    permissions.ts            # RBAC — centralized feature permissions
  App.tsx
server/
  index.js                    # Express backend (port 8000)
  uploads/                    # Uploaded photos (served as /uploads/*)
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
| `superadmin` | Full access |
| `admin_keuangan` | Dashboard, Gaji, Pinjaman, Kategori, Import/Export, Pengumuman, Monitor Kunjungan |
| `admin_sariroti` | Dashboard, Gaji, Pinjaman, Pengumuman, Monitor Kunjungan, Settings Sariroti |
| `karyawan` | Lihat slip gaji sendiri, lihat pinjaman sendiri, Pengumuman |
| `karyawan_sariroti` | Dashboard Kunjungan, Plan Kunjungan, Check-in, Toko Saya |

## Database Tables

### Core
- `users` - Auth (email + password_hash)
- `user_profiles` - Role, identitas, employee_id link
- `categories` / `transactions` - Cashflow
- `employees` / `salary_payments` / `employee_loans` / `job_positions` - HR

### Sari Roti Module
- `announcements` - title, content, target_roles[], priority, is_active
- `sariroti_settings` - Per-user: min_visits, max_visits, plan_deadline (time)
- `visit_plans` - Daily plan: user_id, plan_date, stores (JSONB), status
- `visit_checkins` - Check-in: selfie_url, visit_type, total_billing, has_expired_bread, **gps_lat, gps_lng, gps_accuracy, checkout_time, duration_minutes**
- `bread_scans` - Per-scan: barcode, bread_name, quantity, scan_type (drop/tarik)
- `stores` - Store master: user_profile_id, nama_toko, nama_pemilik, alamat, nomor_hp, sharelok, foto_toko, status

## Key API Endpoints

### Generic CRUD
- `GET/POST/PUT/DELETE /api/:table`

### Auth
- `POST /api/auth/login|register|logout|update-password`
- `POST /api/auth/create-user` (superadmin)
- `DELETE /api/auth/delete-user/:userId` (superadmin)

### Sari Roti Specific
- `POST /api/checkin` — Check-in with server timestamp, GPS, duplicate prevention (multipart)
- `POST /api/checkout/:checkinId` — Record checkout + auto-calculate duration
- `GET /api/stores` — List stores (admin: all, karyawan: own)
- `POST /api/stores` — Register store (multipart foto)
- `PUT /api/stores/:id` — Edit store (admin)
- `PUT /api/stores/:id/transfer` — Transfer store owner (admin)
- `DELETE /api/stores/:id` — Delete store (admin)
- `GET /api/sariroti-settings/:userProfileId` — Get settings
- `PUT /api/sariroti-settings/:userProfileId` — Upsert settings (admin)
- `GET /api/visit-summary?date=` — Admin daily monitoring
- `GET /api/visit-detail/:planId` — Check-in details with bread scans + GPS
- `GET /api/laporan-karyawan?from=&to=&user_profile_id=` — Visit report
- `GET /api/laporan-karyawan/export` — CSV download
- `GET /api/performa-karyawan?bulan=&tahun=` — Monthly performance ranking
- `GET /api/store-visit-history/:storeId` — Visit history per store
- `GET /api/notifikasi-deadline` — Who hasn't submitted plan today
- `POST /api/upload` — General file upload

## Key Features

### Karyawan Sari Roti
- **Dashboard Kunjungan**: Daily plan progress, check-in status, checkout timer, GPS link
- **Alert Deadline**: Banner kuning/merah jika mendekati atau sudah lewat batas waktu plan
- **Plan Kunjungan**: Pilih toko dari daftar toko terdaftar (dropdown), tidak bisa input toko bebas
- **Check-in Wizard** (3 steps):
  1. Pilih toko + selfie + jenis kunjungan + GPS otomatis
  2. Scan roti drop/tarik + billing
  3. Ringkasan + catatan
- **Anti-manipulasi**: Timestamp dari server, GPS dari browser, cegah duplikasi check-in per toko per hari
- **Check-out**: Tombol checkout per check-in, hitung durasi otomatis

### Admin Sari Roti (VisitMonitorAdmin — 5 Tab)
- **Monitor**: Daily visit tracking, approve/reject plan, lihat selfie + GPS link + durasi
- **Notifikasi**: Badge merah — siapa yang belum submit plan hari ini
- **Laporan**: Tabel rekap per periode, summary cards, export CSV
- **Performa**: Ranking bulanan per karyawan, compliance bar, top performer badge
- **Pengaturan**: Set target per karyawan (min/max visits, deadline)

## Development

```bash
npm run dev       # Start both servers
npm run build     # Production build
```
