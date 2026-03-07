import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import type { Category, Transaction, TransactionWithCategory } from '../lib/supabase';
import Sidebar from './Sidebar';
import SummaryCards from './SummaryCards';
import TransactionForm from './TransactionForm';
import TransactionList from './TransactionList';
import Charts from './Charts';
import FilterPanel from './FilterPanel';
import EmployeeSalary from './EmployeeSalary';
import JobPositionManager from './JobPositionManager';
import EmployeeLoanManager from './EmployeeLoanManager';
import UserManager from './UserManager';
import Settings from './Settings';
import AnnouncementManager from './AnnouncementManager';
import AnnouncementBoard from './AnnouncementBoard';
import SariRotiDashboard from './sariroti/SariRotiDashboard';
import SariRotiHomeDashboard from './sariroti/SariRotiHomeDashboard';
import HistoryKunjungan from './sariroti/HistoryKunjungan';
import VisitMonitorAdmin from './sariroti/VisitMonitorAdmin';
import TokoManager from './sariroti/TokoManager';
import TokoAdminView from './sariroti/TokoAdminView';
import SkuManager from './sariroti/SkuManager';
import { Plus, Lock, Menu, Wallet, Sun, Moon } from 'lucide-react';
import { can, DEFAULT_VIEW_BY_ROLE, ROLE_LABELS, ROLE_BADGE_COLORS } from '../lib/permissions';
import { useTheme } from '../contexts/ThemeContext';

export interface FilterOptions {
  categoryIds: string[];
  type: 'all' | 'income' | 'expense';
  dateFrom: string;
  dateTo: string;
  amountMin: string;
  amountMax: string;
  search: string;
}

interface UserProfile {
  user_id: string;
  full_name: string;
  email: string;
  role: string;
}

function AccessDenied() {
  return (
    <div className="flex flex-col items-center justify-center h-64 text-center px-4">
      <Lock className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-4" />
      <h2 className="text-lg font-semibold text-gray-600 dark:text-gray-400">Akses Ditolak</h2>
      <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Role Anda tidak memiliki izin untuk mengakses halaman ini.</p>
    </div>
  );
}

export default function Dashboard() {
  const { user, userRole, userProfile } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const [categories, setCategories] = useState<Category[]>([]);
  const [transactions, setTransactions] = useState<TransactionWithCategory[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<TransactionWithCategory[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [showTransactionForm, setShowTransactionForm] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [currentView, setCurrentView] = useState(DEFAULT_VIEW_BY_ROLE[userRole || 'karyawan'] || 'loans');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [filters, setFilters] = useState<FilterOptions>({
    categoryIds: [],
    type: 'all',
    dateFrom: '',
    dateTo: '',
    amountMin: '',
    amountMax: '',
    search: '',
  });

  const isSuperAdmin = userRole === 'superadmin';
  const role = userRole || 'karyawan';
  const badgeColor = ROLE_BADGE_COLORS[role] || 'bg-gray-400 text-white';

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  useEffect(() => {
    applyFilters();
  }, [transactions, filters, selectedUserId]);

  const loadData = async () => {
    setLoading(true);
    await Promise.all([loadCategories(), loadTransactions(), loadUsers()]);
    setLoading(false);
  };

  const loadUsers = async () => {
    if (!isSuperAdmin) return;

    const { data, error } = await supabase
      .from('user_profiles')
      .select('user_id, full_name, email, role')
      .order('full_name');

    if (!error && data) {
      setUsers(data);
    }
  };

  const loadCategories = async () => {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('name');

    if (!error && data) {
      setCategories(data);
    }
  };

  const loadTransactions = async () => {
    const { data, error } = await supabase
      .from('transactions')
      .select(`
        *,
        category:categories(*)
      `)
      .order('date', { ascending: false });

    if (!error && data) {
      setTransactions(data as TransactionWithCategory[]);
    }
  };

  const applyFilters = () => {
    let filtered = [...transactions];

    if (selectedUserId !== 'all') {
      filtered = filtered.filter(t => t.user_id === selectedUserId);
    }

    if (filters.categoryIds.length > 0) {
      filtered = filtered.filter(t => filters.categoryIds.includes(t.category_id));
    }

    if (filters.type !== 'all') {
      filtered = filtered.filter(t => t.type === filters.type);
    }

    if (filters.dateFrom) {
      filtered = filtered.filter(t => t.date >= filters.dateFrom);
    }

    if (filters.dateTo) {
      filtered = filtered.filter(t => t.date <= filters.dateTo);
    }

    if (filters.amountMin) {
      filtered = filtered.filter(t => t.amount >= parseFloat(filters.amountMin));
    }

    if (filters.amountMax) {
      filtered = filtered.filter(t => t.amount <= parseFloat(filters.amountMax));
    }

    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(t =>
        t.description.toLowerCase().includes(searchLower) ||
        t.category.name.toLowerCase().includes(searchLower)
      );
    }

    setFilteredTransactions(filtered);
  };

  const handleTransactionSaved = () => {
    loadTransactions();
    setShowTransactionForm(false);
    setEditingTransaction(null);
  };

  const handleEdit = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setShowTransactionForm(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Yakin ingin menghapus transaksi ini?')) {
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', id);

      if (!error) {
        loadTransactions();
      }
    }
  };

  const handleCategoryUpdated = () => {
    loadCategories();
    loadTransactions();
  };

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      <Sidebar
        categories={categories}
        onCategoryUpdated={handleCategoryUpdated}
        currentView={currentView}
        onViewChange={setCurrentView}
        mobileOpen={mobileMenuOpen}
        onMobileClose={() => setMobileMenuOpen(false)}
      />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="lg:hidden bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center gap-3 flex-shrink-0 safe-top">
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="p-2 -ml-1 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 active:bg-gray-200 rounded-lg transition-colors"
          >
            <Menu className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <Wallet className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-gray-900 dark:text-white text-sm truncate">Cashflow App</span>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={toggleTheme}
              className="p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            <span className={`px-2 py-0.5 text-xs font-semibold rounded ${badgeColor}`}>
              {ROLE_LABELS[role] || role}
            </span>
          </div>
        </header>

        <div className="flex-1 overflow-auto">
          <div className="p-4 lg:p-6 max-w-7xl mx-auto">
            {currentView === 'dashboard' ? (
              <>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 lg:mb-6 gap-3">
                  <div className="flex-1">
                    <h1 className="text-xl lg:text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Kelola cashflow Anda dengan mudah</p>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {isSuperAdmin && users.length > 0 && (
                      <select
                        value={selectedUserId}
                        onChange={(e) => setSelectedUserId(e.target.value)}
                        className="px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm flex-1 sm:flex-none"
                      >
                        <option value="all">Semua User</option>
                        {users.map((u) => (
                          <option key={u.user_id} value={u.user_id}>
                            {u.full_name} ({u.role})
                          </option>
                        ))}
                      </select>
                    )}
                    {can(role, 'manage_transactions') && (
                      <button
                        onClick={() => {
                          setEditingTransaction(null);
                          setShowTransactionForm(true);
                        }}
                        className="bg-gradient-to-r from-emerald-500 to-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:from-emerald-600 hover:to-blue-700 transition-all flex items-center gap-2 text-sm whitespace-nowrap"
                      >
                        <Plus className="w-4 h-4" />
                        <span className="hidden sm:inline">Tambah Transaksi</span>
                        <span className="sm:hidden">Tambah</span>
                      </button>
                    )}
                  </div>
                </div>

                {loading ? (
                  <div className="space-y-4 lg:space-y-6">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 lg:gap-4">
                      {[1, 2, 3].map(i => (
                        <div key={i} className="h-20 lg:h-24 bg-gray-200 dark:bg-gray-700 animate-pulse rounded-xl" />
                      ))}
                    </div>
                    <div className="h-64 lg:h-96 bg-gray-200 dark:bg-gray-700 animate-pulse rounded-xl" />
                  </div>
                ) : (
                  <>
                    {isSuperAdmin && selectedUserId !== 'all' && (
                      <div className="mb-4 p-3 lg:p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                        <p className="text-sm text-blue-800 dark:text-blue-300">
                          <strong>Menampilkan cashflow dari:</strong>{' '}
                          {users.find(u => u.user_id === selectedUserId)?.full_name || 'User'}
                        </p>
                      </div>
                    )}

                    <AnnouncementBoard />

                    <SummaryCards transactions={filteredTransactions} />

                    <FilterPanel
                      filters={filters}
                      setFilters={setFilters}
                      categories={categories}
                    />

                    <Charts
                      transactions={filteredTransactions}
                      categories={categories}
                    />

                    <TransactionList
                      transactions={filteredTransactions}
                      categories={categories}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                    />
                  </>
                )}
              </>
            ) : currentView === 'salary' ? (
              <EmployeeSalary />
            ) : currentView === 'positions' ? (
              can(role, 'manage_positions') ? <JobPositionManager /> : <AccessDenied />
            ) : currentView === 'loans' ? (
              <EmployeeLoanManager />
            ) : currentView === 'users' ? (
              can(role, 'manage_users') ? <UserManager /> : <AccessDenied />
            ) : currentView === 'announcements' ? (
              can(role, 'manage_announcements') ? <AnnouncementManager /> : <AccessDenied />
            ) : currentView === 'visit_monitor' ? (
              can(role, 'monitor_visits') ? <VisitMonitorAdmin /> : <AccessDenied />
            ) : currentView === 'sariroti_home' ? (
              <SariRotiHomeDashboard onNavigate={setCurrentView} />
            ) : currentView === 'sariroti' ? (
              <SariRotiDashboard onNavigate={setCurrentView} />
            ) : currentView === 'history_kunjungan' ? (
              <HistoryKunjungan />
            ) : currentView === 'toko' ? (
              <TokoManager />
            ) : currentView === 'toko_admin' ? (
              can(role, 'manage_stores') ? <TokoAdminView /> : <AccessDenied />
            ) : currentView === 'sku_manager' ? (
              can(role, 'manage_sku') ? <SkuManager /> : <AccessDenied />
            ) : currentView === 'settings' ? (
              <Settings />
            ) : null}
          </div>
        </div>
      </div>

      {showTransactionForm && (
        <TransactionForm
          categories={categories}
          transaction={editingTransaction}
          onClose={() => {
            setShowTransactionForm(false);
            setEditingTransaction(null);
          }}
          onSaved={handleTransactionSaved}
        />
      )}
    </div>
  );
}
