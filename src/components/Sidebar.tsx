import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import type { Category } from '../lib/supabase';
import { can, ROLE_LABELS, ROLE_BADGE_COLORS } from '../lib/permissions';
import {
  Wallet, LogOut, BarChart3, Download, Upload, Tag, Users,
  Briefcase, UserCircle, Settings, Megaphone, MapPin, Eye, Store, History, Package, X,
} from 'lucide-react';
import CategoryManager from './CategoryManager';
import ImportExport from './ImportExport';

interface SidebarProps {
  categories: Category[];
  onCategoryUpdated: () => void;
  currentView: string;
  onViewChange: (view: string) => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
}

export default function Sidebar({ categories, onCategoryUpdated, currentView, onViewChange, mobileOpen, onMobileClose }: SidebarProps) {
  const { user, signOut, userProfile, userRole } = useAuth();
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [showImportExport, setShowImportExport] = useState(false);

  const role = userRole || 'karyawan';
  const roleLabel = ROLE_LABELS[role] || role;
  const badgeColor = ROLE_BADGE_COLORS[role] || 'bg-gray-400 text-white';

  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  const handleNav = (view: string) => {
    onViewChange(view);
    onMobileClose();
  };

  const navBtn = (view: string, Icon: React.ElementType, label: string) => (
    <button
      key={view}
      onClick={() => handleNav(view)}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
        currentView === view ? 'bg-blue-50 text-blue-600' : 'text-gray-700 hover:bg-gray-100 active:bg-gray-200'
      }`}
    >
      <Icon className="w-5 h-5 flex-shrink-0" />
      <span className="font-medium text-sm">{label}</span>
    </button>
  );

  const sidebarContent = (
    <div className="flex flex-col h-full">
      <div className="p-5 border-b border-gray-200 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-blue-600 rounded-xl flex items-center justify-center flex-shrink-0">
              <Wallet className="w-6 h-6 text-white" />
            </div>
            <div className="min-w-0">
              <h2 className="font-bold text-gray-900 text-sm">Cashflow App</h2>
              <p className="text-xs text-gray-600 truncate">{userProfile?.full_name || 'User'}</p>
              <p className="text-xs text-gray-500 truncate">{user?.email}</p>
              <span className={`inline-block mt-1 px-2 py-0.5 text-xs font-semibold rounded ${badgeColor}`}>
                {roleLabel}
              </span>
            </div>
          </div>
          <button
            onClick={onMobileClose}
            className="lg:hidden p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg -mr-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto overscroll-contain">
        {can(role, 'view_dashboard') && navBtn('dashboard', BarChart3, 'Dashboard')}

        {role === 'karyawan_sariroti' && navBtn('sariroti_home', BarChart3, 'Dashboard')}
        {role === 'karyawan_sariroti' && navBtn('sariroti', MapPin, 'Kunjungan Harian')}
        {role === 'karyawan_sariroti' && navBtn('history_kunjungan', History, 'History Kunjungan')}
        {can(role, 'register_store') && navBtn('toko', Store, 'Toko Saya')}
        {can(role, 'manage_stores') && navBtn('toko_admin', Store, 'Monitor Toko')}

        {can(role, 'manage_sku') && navBtn('sku_manager', Package, 'Kelola SKU')}

        {can(role, 'view_own_salary') && navBtn('salary', Users, 'Gaji Karyawan')}

        {can(role, 'view_own_loans') && navBtn('loans', Wallet, 'Pinjaman Karyawan')}

        {can(role, 'manage_positions') && navBtn('positions', Briefcase, 'Kelola Jabatan')}

        {can(role, 'monitor_visits') && navBtn('visit_monitor', Eye, 'Monitor Kunjungan')}

        {can(role, 'manage_announcements') && navBtn('announcements', Megaphone, 'Pengumuman')}

        {can(role, 'manage_categories') && (
          <button
            onClick={() => { setShowCategoryManager(true); onMobileClose(); }}
            className="w-full flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-100 active:bg-gray-200 rounded-lg transition-colors"
          >
            <Tag className="w-5 h-5 flex-shrink-0" />
            <span className="font-medium text-sm">Kelola Kategori</span>
          </button>
        )}

        {can(role, 'import_export') && (
          <>
            <button
              onClick={() => { setShowImportExport(true); onMobileClose(); }}
              className="w-full flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-100 active:bg-gray-200 rounded-lg transition-colors"
            >
              <Upload className="w-5 h-5 flex-shrink-0" />
              <span className="font-medium text-sm">Import Data</span>
            </button>
            <button
              onClick={() => { setShowImportExport(true); onMobileClose(); }}
              className="w-full flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-100 active:bg-gray-200 rounded-lg transition-colors"
            >
              <Download className="w-5 h-5 flex-shrink-0" />
              <span className="font-medium text-sm">Export Data</span>
            </button>
          </>
        )}

        {can(role, 'manage_users') && navBtn('users', UserCircle, 'Kelola User')}

        <div className="my-2 border-t border-gray-200"></div>

        {navBtn('settings', Settings, 'Pengaturan')}
      </nav>

      <div className="p-3 border-t border-gray-200 flex-shrink-0">
        <button
          onClick={() => { signOut(); onMobileClose(); }}
          className="w-full flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 active:bg-red-100 rounded-lg transition-colors"
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          <span className="font-medium text-sm">Logout</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      <div className="hidden lg:flex lg:w-64 lg:flex-shrink-0 bg-white border-r border-gray-200 flex-col h-full">
        {sidebarContent}
      </div>

      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/50" onClick={onMobileClose} />
          <div className="absolute left-0 top-0 bottom-0 w-72 max-w-[85vw] bg-white shadow-2xl animate-slide-in">
            {sidebarContent}
          </div>
        </div>
      )}

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
