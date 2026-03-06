import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import type { Category } from '../lib/supabase';
import { can, ROLE_LABELS, ROLE_BADGE_COLORS } from '../lib/permissions';
import {
  Wallet, LogOut, BarChart3, Download, Upload, Tag, Users,
  Briefcase, UserCircle, Settings, Megaphone, MapPin, Eye, Store, History,
} from 'lucide-react';
import CategoryManager from './CategoryManager';
import ImportExport from './ImportExport';

interface SidebarProps {
  categories: Category[];
  onCategoryUpdated: () => void;
  currentView: string;
  onViewChange: (view: string) => void;
}

export default function Sidebar({ categories, onCategoryUpdated, currentView, onViewChange }: SidebarProps) {
  const { user, signOut, userProfile, userRole } = useAuth();
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [showImportExport, setShowImportExport] = useState(false);

  const role = userRole || 'karyawan';
  const roleLabel = ROLE_LABELS[role] || role;
  const badgeColor = ROLE_BADGE_COLORS[role] || 'bg-gray-400 text-white';

  const navBtn = (view: string, Icon: React.ElementType, label: string) => (
    <button
      key={view}
      onClick={() => onViewChange(view)}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
        currentView === view ? 'bg-blue-50 text-blue-600' : 'text-gray-700 hover:bg-gray-100'
      }`}
    >
      <Icon className="w-5 h-5" />
      <span className="font-medium">{label}</span>
    </button>
  );

  return (
    <>
      <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-blue-600 rounded-xl flex items-center justify-center">
              <Wallet className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="font-bold text-gray-900">Cashflow App</h2>
              <p className="text-xs text-gray-600">{userProfile?.full_name || 'User'}</p>
              <p className="text-xs text-gray-500">{user?.email}</p>
              <span className={`inline-block mt-1 px-2 py-0.5 text-xs font-semibold rounded ${badgeColor}`}>
                {roleLabel}
              </span>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {can(role, 'view_dashboard') && navBtn('dashboard', BarChart3, 'Dashboard')}

          {role === 'karyawan_sariroti' && navBtn('sariroti_home', BarChart3, 'Dashboard')}
          {role === 'karyawan_sariroti' && navBtn('sariroti', MapPin, 'Kunjungan Harian')}
          {role === 'karyawan_sariroti' && navBtn('history_kunjungan', History, 'History Kunjungan')}
          {can(role, 'register_store') && navBtn('toko', Store, 'Toko Saya')}
          {can(role, 'manage_stores') && navBtn('toko_admin', Store, 'Monitor Toko')}

          {can(role, 'view_own_salary') && navBtn('salary', Users, 'Gaji Karyawan')}

          {can(role, 'view_own_loans') && navBtn('loans', Wallet, 'Pinjaman Karyawan')}

          {can(role, 'manage_positions') && navBtn('positions', Briefcase, 'Kelola Jabatan')}

          {can(role, 'monitor_visits') && navBtn('visit_monitor', Eye, 'Monitor Kunjungan')}

          {can(role, 'manage_announcements') && navBtn('announcements', Megaphone, 'Pengumuman')}

          {can(role, 'manage_categories') && (
            <button
              onClick={() => setShowCategoryManager(true)}
              className="w-full flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Tag className="w-5 h-5" />
              <span className="font-medium">Kelola Kategori</span>
            </button>
          )}

          {can(role, 'import_export') && (
            <>
              <button
                onClick={() => setShowImportExport(true)}
                className="w-full flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Upload className="w-5 h-5" />
                <span className="font-medium">Import Data</span>
              </button>
              <button
                onClick={() => setShowImportExport(true)}
                className="w-full flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Download className="w-5 h-5" />
                <span className="font-medium">Export Data</span>
              </button>
            </>
          )}

          {can(role, 'manage_users') && navBtn('users', UserCircle, 'Kelola User')}

          <div className="my-2 border-t border-gray-200"></div>

          {navBtn('settings', Settings, 'Pengaturan')}
        </nav>

        <div className="p-4 border-t border-gray-200">
          <button
            onClick={signOut}
            className="w-full flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium">Logout</span>
          </button>
        </div>
      </div>

      {showCategoryManager && (
        <CategoryManager
          categories={categories}
          onClose={() => setShowCategoryManager(false)}
          onUpdated={onCategoryUpdated}
        />
      )}

      {showImportExport && (
        <ImportExport
          categories={categories}
          onClose={() => setShowImportExport(false)}
          onImported={onCategoryUpdated}
        />
      )}
    </>
  );
}
