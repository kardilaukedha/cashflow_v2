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

## Project Structure

```
src/
  components/       # UI components (Dashboard, Auth, Salary, Transactions, etc.)
    settings/       # Settings-specific components
  contexts/         # React Context (AuthContext - exports user, userRole, isSuperAdmin)
  lib/
    supabase.ts     # Custom API compatibility client (calls backend at /api)
  App.tsx           # Main router/entry component
  main.tsx          # App mount point
server/
  index.js          # Express backend server (port 8000)
  package.json      # { "type": "commonjs" } override
supabase/
  migrations/       # Original SQL schema reference (not used, DB is Replit PostgreSQL)
```

## Architecture

The app runs two processes:
1. **Vite dev server** on port 5000 (frontend, proxies /api to backend)
2. **Express server** on port 8000 (backend API + JWT auth)

The `src/lib/supabase.ts` file exports a Supabase-compatible API client that makes
HTTP requests to the backend instead of calling Supabase directly.

## User Accounts

| Email | Password | Role |
|---|---|---|
| admin@admin.com | password | superadmin |
| user@user.com | password | karyawan |

## Development

```bash
npm run dev       # Start both servers (backend on 8000, frontend on 5000)
npm run build     # Production build
```

## API Endpoints

- `POST /api/auth/login` - Login with email/password
- `GET /api/auth/me` - Get current user (requires JWT)
- `POST /api/auth/logout` - Logout
- `POST /api/auth/register` - Register new user
- `POST /api/auth/update-password` - Change password
- `GET /api/:table` - Query table (supports select, filter, order, limit, single)
- `POST /api/:table` - Insert row
- `PUT /api/:table` - Update rows (with filter)
- `DELETE /api/:table` - Delete rows (with filter)

## Key Features

- Financial transaction tracking (income/expense) with categories
- Data visualization with charts
- Employee salary management and payslips
- Loan management
- Job position management
- Role-based access control (superadmin / karyawan)
- User invitation system
- Company profile and payroll settings
