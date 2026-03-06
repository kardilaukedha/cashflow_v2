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
import VisitMonitorAdmin from './sariroti/VisitMonitorAdmin';
import TokoManager from './sariroti/TokoManager';
import TokoAdminView from './sariroti/TokoAdminView';
import { Plus, Lock } from 'lucide-react';
import { can, DEFAULT_VIEW_BY_ROLE } from '../lib/permissions';

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
    <div className="flex flex-col items-center justify-center h-64 text-center">
      <Lock className="w-12 h-12 text-gray-300 mb-4" />
      <h2 className="text-lg font-semibold text-gray-600">Akses Ditolak</h2>
      <p className="text-sm text-gray-400 mt-1">Role Anda tidak memiliki izin untuk mengakses halaman ini.</p>
    </div>
  );
}

export default function Dashboard() {
  const { user, userRole } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [transactions, setTransactions] = useState<TransactionWithCategory[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<TransactionWithCategory[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [showTransactionForm, setShowTransactionForm] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [currentView, setCurrentView] = useState(DEFAULT_VIEW_BY_ROLE[userRole || 'karyawan'] || 'loans');
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
    <div className="flex h-screen bg-gray-50">
      <Sidebar
        categories={categories}
        onCategoryUpdated={handleCategoryUpdated}
        currentView={currentView}
        onViewChange={setCurrentView}
      />

      <div className="flex-1 overflow-auto">
        <div className="p-6 max-w-7xl mx-auto">
          {currentView === 'dashboard' ? (
            <>
              <div className="flex items-center justify-between mb-6">
                <div className="flex-1">
                  <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
                  <p className="text-gray-600">Kelola cashflow Anda dengan mudah</p>
                </div>
                {isSuperAdmin && users.length > 0 && (
                  <div className="mr-4">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Filter User</label>
                    <select
                      value={selectedUserId}
                      onChange={(e) => setSelectedUserId(e.target.value)}
                      className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    >
                      <option value="all">Semua User</option>
                      {users.map((u) => (
                        <option key={u.user_id} value={u.user_id}>
                          {u.full_name} ({u.role})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                {can(role, 'manage_transactions') && (
                  <button
                    onClick={() => {
                      setEditingTransaction(null);
                      setShowTransactionForm(true);
                    }}
                    className="bg-gradient-to-r from-emerald-500 to-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:from-emerald-600 hover:to-blue-700 transition-all flex items-center gap-2"
                  >
                    <Plus className="w-5 h-5" />
                    Tambah Transaksi
                  </button>
                )}
              </div>

              {loading ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="h-24 bg-gray-200 animate-pulse rounded-xl" />
                    ))}
                  </div>
                  <div className="h-96 bg-gray-200 animate-pulse rounded-xl" />
                </div>
              ) : (
                <>
                  {isSuperAdmin && selectedUserId !== 'all' && (
                    <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-sm text-blue-800">
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
          ) : currentView === 'sariroti' ? (
            <SariRotiDashboard />
          ) : currentView === 'toko' ? (
            <TokoManager />
          ) : currentView === 'toko_admin' ? (
            can(role, 'manage_stores') ? <TokoAdminView /> : <AccessDenied />
          ) : currentView === 'settings' ? (
            <Settings />
          ) : null}
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
