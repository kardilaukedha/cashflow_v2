import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { Category } from '../lib/supabase';
import { X, Plus, Edit2, Trash2, Save } from 'lucide-react';
import * as Icons from 'lucide-react';

interface CategoryManagerProps {
  categories: Category[];
  onClose: () => void;
  onUpdated: () => void;
}

const AVAILABLE_COLORS = [
  '#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6',
  '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1',
  '#14b8a6', '#a855f7', '#f43f5e', '#eab308', '#22c55e',
];

const AVAILABLE_ICONS = [
  'UtensilsCrossed', 'Car', 'Receipt', 'ShoppingBag', 'Music',
  'Heart', 'BookOpen', 'Home', 'Plane', 'Coffee',
  'Gift', 'Gamepad2', 'Smartphone', 'Shirt', 'Dumbbell',
  'Wallet', 'TrendingUp', 'Briefcase', 'Award', 'DollarSign',
  'PiggyBank', 'CreditCard', 'Landmark', 'BadgeDollarSign', 'Coins',
];

export default function CategoryManager({ categories, onClose, onUpdated }: CategoryManagerProps) {
  const { user } = useAuth();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    type: 'expense' as 'income' | 'expense',
    color: AVAILABLE_COLORS[0],
    icon: AVAILABLE_ICONS[0],
  });

  const handleEdit = (category: Category) => {
    setEditingId(category.id);
    setFormData({
      name: category.name,
      type: category.type,
      color: category.color,
      icon: category.icon,
    });
    setIsAdding(false);
  };

  const handleAdd = () => {
    setIsAdding(true);
    setEditingId(null);
    setFormData({
      name: '',
      type: 'expense',
      color: AVAILABLE_COLORS[0],
      icon: AVAILABLE_ICONS[0],
    });
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      setError('Nama kategori tidak boleh kosong');
      return;
    }

    setLoading(true);
    setError('');

    const data = {
      user_id: user!.id,
      name: formData.name,
      type: formData.type,
      color: formData.color,
      icon: formData.icon,
      is_default: false,
    };

    let result;
    if (editingId) {
      result = await supabase
        .from('categories')
        .update(data)
        .eq('id', editingId);
    } else {
      result = await supabase
        .from('categories')
        .insert([data]);
    }

    if (result.error) {
      setError(result.error.message);
    } else {
      setIsAdding(false);
      setEditingId(null);
      onUpdated();
    }

    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Yakin ingin menghapus kategori ini?')) return;

    setLoading(true);
    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', id);

    if (error) {
      setError(error.message);
    } else {
      onUpdated();
    }
    setLoading(false);
  };

  const handleCancel = () => {
    setIsAdding(false);
    setEditingId(null);
    setError('');
  };

  const expenseCategories = categories.filter(c => c.type === 'expense');
  const incomeCategories = categories.filter(c => c.type === 'income');

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">Kelola Kategori</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {(isAdding || editingId) && (
            <div className="mb-6 p-4 bg-gray-50 rounded-lg border-2 border-blue-200">
              <h3 className="font-semibold text-gray-900 mb-4">
                {editingId ? 'Edit Kategori' : 'Tambah Kategori Baru'}
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Nama Kategori</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Contoh: Transportasi"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Tipe</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, type: 'expense' })}
                      className={`px-4 py-2 rounded-lg font-medium transition-all ${
                        formData.type === 'expense'
                          ? 'bg-red-500 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      Pengeluaran
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, type: 'income' })}
                      className={`px-4 py-2 rounded-lg font-medium transition-all ${
                        formData.type === 'income'
                          ? 'bg-emerald-500 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      Pemasukan
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Warna</label>
                  <div className="flex flex-wrap gap-2">
                    {AVAILABLE_COLORS.map(color => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setFormData({ ...formData, color })}
                        className={`w-10 h-10 rounded-lg transition-all ${
                          formData.color === color ? 'ring-2 ring-offset-2 ring-blue-500 scale-110' : ''
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Icon</label>
                  <div className="grid grid-cols-8 gap-2 max-h-48 overflow-y-auto p-2 bg-white rounded-lg border border-gray-200">
                    {AVAILABLE_ICONS.map(iconName => {
                      const IconComponent = (Icons as any)[iconName];
                      return (
                        <button
                          key={iconName}
                          type="button"
                          onClick={() => setFormData({ ...formData, icon: iconName })}
                          className={`p-2 rounded-lg transition-all hover:bg-gray-100 ${
                            formData.icon === iconName ? 'bg-blue-100 ring-2 ring-blue-500' : ''
                          }`}
                        >
                          <IconComponent className="w-6 h-6" style={{ color: formData.color }} />
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={loading}
                    className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    {loading ? 'Menyimpan...' : 'Simpan'}
                  </button>
                </div>
              </div>
            </div>
          )}

          <button
            onClick={handleAdd}
            className="w-full mb-6 px-4 py-3 bg-gradient-to-r from-emerald-500 to-blue-600 text-white rounded-lg font-medium hover:from-emerald-600 hover:to-blue-700 transition-all flex items-center justify-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Tambah Kategori
          </button>

          <div className="space-y-6">
            <div>
              <h3 className="font-semibold text-gray-900 mb-3">Kategori Pengeluaran</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {expenseCategories.map(category => {
                  const IconComponent = (Icons as any)[category.icon] || Icons.Circle;
                  return (
                    <div
                      key={category.id}
                      className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 group"
                    >
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: category.color }}
                      >
                        <IconComponent className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900">{category.name}</p>
                        {category.is_default && (
                          <p className="text-xs text-gray-500">Default</p>
                        )}
                      </div>
                      {!category.is_default && (
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleEdit(category)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(category.id)}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-3">Kategori Pemasukan</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {incomeCategories.map(category => {
                  const IconComponent = (Icons as any)[category.icon] || Icons.Circle;
                  return (
                    <div
                      key={category.id}
                      className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 group"
                    >
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: category.color }}
                      >
                        <IconComponent className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900">{category.name}</p>
                        {category.is_default && (
                          <p className="text-xs text-gray-500">Default</p>
                        )}
                      </div>
                      {!category.is_default && (
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleEdit(category)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(category.id)}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
