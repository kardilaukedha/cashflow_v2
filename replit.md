# Cashflow & HR Management System

A comprehensive financial and human resources management system for businesses.

## Tech Stack

- **Frontend:** React 18 + TypeScript
- **Build Tool:** Vite 5
- **Styling:** Tailwind CSS
- **Charts:** Recharts
- **Icons:** Lucide React
- **Backend/Database:** Supabase (PostgreSQL + Auth)

## Project Structure

```
src/
  components/       # UI components (Dashboard, Auth, Salary, Transactions, etc.)
    settings/       # Settings-specific components
  contexts/         # React Context (AuthContext)
  lib/              # Supabase client and type definitions
  App.tsx           # Main router/entry component
  main.tsx          # App mount point
supabase/
  migrations/       # SQL schema migrations
```

## Environment Variables

- `VITE_SUPABASE_URL` - Supabase project URL (secret)
- `VITE_SUPABASE_ANON_KEY` - Supabase anonymous key (secret)

## Development

```bash
npm run dev       # Start dev server on port 5000
npm run build     # Production build
npm run typecheck # TypeScript type checking
```

## Deployment

Configured as a static site deployment:
- Build command: `npm run build`
- Public directory: `dist`

## Key Features

- Financial transaction tracking (income/expense)
- Data visualization with charts
- Employee salary management and payslips
- Loan management
- Job position management
- Role-based access control (superadmin / karyawan)
- User invitation system
- Company profile and payroll settings
