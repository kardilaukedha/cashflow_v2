export type AppRole = 'superadmin' | 'admin_keuangan' | 'admin_sariroti' | 'karyawan';

export type AppFeature =
  | 'view_dashboard'
  | 'manage_transactions'
  | 'manage_salary'
  | 'view_own_salary'
  | 'manage_loans'
  | 'view_own_loans'
  | 'manage_positions'
  | 'manage_categories'
  | 'import_export'
  | 'manage_users'
  | 'settings_company'
  | 'settings_dashboard_pref'
  | 'settings_salary_components'
  | 'settings_payroll'
  | 'settings_budget'
  | 'settings_employee_policy'
  | 'settings_bulk'
  | 'settings_api';

const PERMISSIONS: Record<AppFeature, AppRole[]> = {
  view_dashboard:            ['superadmin', 'admin_keuangan', 'admin_sariroti'],
  manage_transactions:       ['superadmin', 'admin_keuangan', 'admin_sariroti'],
  manage_salary:             ['superadmin', 'admin_keuangan', 'admin_sariroti'],
  view_own_salary:           ['superadmin', 'admin_keuangan', 'admin_sariroti', 'karyawan'],
  manage_loans:              ['superadmin', 'admin_keuangan', 'admin_sariroti'],
  view_own_loans:            ['superadmin', 'admin_keuangan', 'admin_sariroti', 'karyawan'],
  manage_positions:          ['superadmin'],
  manage_categories:         ['superadmin', 'admin_keuangan'],
  import_export:             ['superadmin', 'admin_keuangan'],
  manage_users:              ['superadmin'],
  settings_company:          ['superadmin'],
  settings_dashboard_pref:   ['superadmin', 'admin_keuangan'],
  settings_salary_components:['superadmin', 'admin_keuangan'],
  settings_payroll:          ['superadmin', 'admin_keuangan'],
  settings_budget:           ['superadmin', 'admin_keuangan'],
  settings_employee_policy:  ['superadmin'],
  settings_bulk:             ['superadmin'],
  settings_api:              ['superadmin'],
};

export function can(role: string, feature: AppFeature): boolean {
  const allowed = PERMISSIONS[feature];
  if (!allowed) return false;
  return allowed.includes(role as AppRole);
}

export const ROLE_LABELS: Record<string, string> = {
  superadmin:      'Super Admin',
  admin_keuangan:  'Admin Keuangan',
  admin_sariroti:  'Admin Sariroti',
  karyawan:        'Karyawan',
};

export const ROLE_BADGE_COLORS: Record<string, string> = {
  superadmin:      'bg-blue-600 text-white',
  admin_keuangan:  'bg-emerald-600 text-white',
  admin_sariroti:  'bg-purple-600 text-white',
  karyawan:        'bg-gray-400 text-white',
};

export const DEFAULT_VIEW_BY_ROLE: Record<string, string> = {
  superadmin:     'dashboard',
  admin_keuangan: 'dashboard',
  admin_sariroti: 'dashboard',
  karyawan:       'loans',
};
