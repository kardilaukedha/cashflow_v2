import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import type { Category } from '../lib/supabase';
import {
  Wallet,
  LogOut,
  BarChart3,
  Download,
  Upload,
  Tag,
  Users,
  Briefcase,
  UserCircle,
  Settings,
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
  const { user, signOut, userProfile, isSuperAdmin } = useAuth();
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [showImportExport, setShowImportExport] = useState(false);

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
              {isSuperAdmin && (
                <span className="inline-block mt-1 px-2 py-0.5 bg-blue-600 text-white text-xs font-semibold rounded">
                  ADMIN
                </span>
              )}
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          <button
            onClick={() => onViewChange('dashboard')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
              currentView === 'dashboard'
                ? 'bg-blue-50 text-blue-600'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <BarChart3 className="w-5 h-5" />
            <span className="font-medium">Dashboard</span>
          </button>

          <button
            onClick={() => onViewChange('salary')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
              currentView === 'salary'
                ? 'bg-blue-50 text-blue-600'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <Users className="w-5 h-5" />
            <span className="font-medium">Gaji Karyawan</span>
          </button>

          <button
            onClick={() => onViewChange('loans')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
              currentView === 'loans'
                ? 'bg-blue-50 text-blue-600'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <Wallet className="w-5 h-5" />
            <span className="font-medium">Pinjaman Karyawan</span>
          </button>

          <button
            onClick={() => onViewChange('positions')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
              currentView === 'positions'
                ? 'bg-blue-50 text-blue-600'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <Briefcase className="w-5 h-5" />
            <span className="font-medium">Kelola Jabatan</span>
          </button>

          <button
            onClick={() => setShowCategoryManager(true)}
            className="w-full flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Tag className="w-5 h-5" />
            <span className="font-medium">Kelola Kategori</span>
          </button>

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

          <button
            onClick={() => onViewChange('users')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
              currentView === 'users'
                ? 'bg-blue-50 text-blue-600'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <UserCircle className="w-5 h-5" />
            <span className="font-medium">Kelola User</span>
          </button>

          <div className="my-2 border-t border-gray-200"></div>

          <button
            onClick={() => onViewChange('settings')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
              currentView === 'settings'
                ? 'bg-blue-50 text-blue-600'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <Settings className="w-5 h-5" />
            <span className="font-medium">Pengaturan</span>
          </button>
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
