import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { PieChart, Plus, Edit2, Trash2, X, TrendingUp, AlertTriangle } from 'lucide-react';
import { formatCurrency } from '../../lib/utils';
import type { Category } from '../../lib/supabase';

interface BudgetPlan {
  id?: string;
  category_id: string;
  budget_period: string;
  amount: number;
  start_date: string;
  end_date: string | null;
  alert_threshold_percentage: number;
  rollover_enabled: boolean;
  is_active: boolean;
  categories?: {
    name: string;
    type: string;
    color: string;
  };
}

export default function BudgetPlanning() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [budgets, setBudgets] = useState<BudgetPlan[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingBudget, setEditingBudget] = useState<BudgetPlan | null>(null);
  const [formData, setFormData] = useState<Partial<BudgetPlan>>({
    category_id: '',
    budget_period: 'monthly',
    amount: 0,
    start_date: new Date().toISOString().split('T')[0],
    end_date: null,
    alert_threshold_percentage: 80,
    rollover_enabled: false,
    is_active: true,
  });

  useEffect(() => {
    loadBudgets();
    loadCategories();
  }, [user]);

  const loadBudgets = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('budget_plans')
      .select(`
        *,
        categories (
          name,
          type,
          color
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setBudgets(data);
    }
    setLoading(false);
  };

  const loadCategories = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('user_id', user.id)
      .order('name');

    if (!error && data) {
      setCategories(data);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const dataToSave = {
      ...formData,
      user_id: user.id,
    };

    let result;
    if (editingBudget?.id) {
      result = await supabase
        .from('budget_plans')
        .update(dataToSave)
        .eq('id', editingBudget.id);
    } else {
      result = await supabase
        .from('budget_plans')
        .insert([dataToSave]);
    }

    if (result.error) {
      alert('Gagal menyimpan: ' + result.error.message);
    } else {
      resetForm();
      loadBudgets();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Yakin ingin menghapus budget plan ini?')) return;

    const { error } = await supabase
      .from('budget_plans')
      .delete()
      .eq('id', id);

    if (error) {
      alert('Gagal menghapus: ' + error.message);
    } else {
      loadBudgets();
    }
  };

  const handleEdit = (budget: BudgetPlan) => {
    setEditingBudget(budget);
    setFormData(budget);
    setShowForm(true);
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingBudget(null);
    setFormData({
      category_id: '',
      budget_period: 'monthly',
      amount: 0,
      start_date: new Date().toISOString().split('T')[0],
      end_date: null,
      alert_threshold_percentage: 80,
      rollover_enabled: false,
      is_active: true,
    });
  };

  if (loading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-indigo-100 rounded-lg">
            <PieChart className="w-6 h-6 text-indigo-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Anggaran & Forecast</h2>
            <p className="text-sm text-gray-600">Atur budget per kategori dan monitor spending</p>
          </div>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Tambah Budget
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">
                {editingBudget ? 'Edit Budget Plan' : 'Tambah Budget Plan'}
              </h3>
              <button onClick={resetForm} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Kategori *
                </label>
                <select
                  value={formData.category_id}
                  onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  required
                >
                  <option value="">Pilih Kategori</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name} ({cat.type === 'income' ? 'Pemasukan' : 'Pengeluaran'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Periode *
                  </label>
                  <select
                    value={formData.budget_period}
                    onChange={(e) => setFormData({ ...formData, budget_period: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="monthly">Bulanan</option>
                    <option value="quarterly">Kuartalan</option>
                    <option value="yearly">Tahunan</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Jumlah Budget *
                  </label>
                  <input
                    type="number"
                    step="1000"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tanggal Mulai *
                  </label>
                  <input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tanggal Selesai
                  </label>
                  <input
                    type="date"
                    value={formData.end_date || ''}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value || null })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Kosongkan untuk tidak ada batas</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Alert Threshold ({formData.alert_threshold_percentage}%)
                </label>
                <input
                  type="range"
                  min="50"
                  max="100"
                  value={formData.alert_threshold_percentage}
                  onChange={(e) => setFormData({ ...formData, alert_threshold_percentage: parseInt(e.target.value) })}
                  className="w-full"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Alert saat spending mencapai {formData.alert_threshold_percentage}% dari budget
                </p>
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.rollover_enabled}
                    onChange={(e) => setFormData({ ...formData, rollover_enabled: e.target.checked })}
                    className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                  />
                  <span className="text-sm text-gray-700">Rollover sisa budget ke periode berikutnya</span>
                </label>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                  />
                  <span className="text-sm text-gray-700">Aktif</span>
                </label>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 transition-colors font-medium"
                >
                  {editingBudget ? 'Update' : 'Simpan'}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                >
                  Batal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="grid gap-4">
        {budgets.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
            <PieChart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">Belum ada budget plan</p>
            <button
              onClick={() => setShowForm(true)}
              className="mt-4 text-indigo-600 hover:text-indigo-700 font-medium"
            >
              Buat budget pertama
            </button>
          </div>
        ) : (
          budgets.map((budget) => {
            const thresholdAmount = budget.amount * (budget.alert_threshold_percentage / 100);

            return (
              <div
                key={budget.id}
                className={`p-6 rounded-lg border-2 transition-colors ${
                  budget.is_active
                    ? 'bg-white border-indigo-200 hover:border-indigo-300'
                    : 'bg-gray-50 border-gray-200'
                }`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <div
                        className="w-4 h-4 rounded"
                        style={{ backgroundColor: budget.categories?.color || '#6366f1' }}
                      />
                      <h3 className="font-bold text-gray-900">{budget.categories?.name}</h3>
                      {!budget.is_active && (
                        <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded">
                          Nonaktif
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <span className="capitalize">{budget.budget_period}</span>
                      <span>•</span>
                      <span>Mulai: {new Date(budget.start_date).toLocaleDateString('id-ID')}</span>
                      {budget.end_date && (
                        <>
                          <span>•</span>
                          <span>Selesai: {new Date(budget.end_date).toLocaleDateString('id-ID')}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleEdit(budget)}
                      className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(budget.id!)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Target Budget:</span>
                    <span className="font-semibold text-gray-900">{formatCurrency(budget.amount)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Alert Threshold ({budget.alert_threshold_percentage}%):</span>
                    <span className="font-semibold text-orange-600">{formatCurrency(thresholdAmount)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-600 mt-2">
                    {budget.rollover_enabled && (
                      <span className="flex items-center gap-1 bg-emerald-50 text-emerald-700 px-2 py-1 rounded">
                        <TrendingUp className="w-3 h-3" />
                        Rollover Enabled
                      </span>
                    )}
                    {budget.alert_threshold_percentage < 100 && (
                      <span className="flex items-center gap-1 bg-orange-50 text-orange-700 px-2 py-1 rounded">
                        <AlertTriangle className="w-3 h-3" />
                        Alert at {budget.alert_threshold_percentage}%
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
