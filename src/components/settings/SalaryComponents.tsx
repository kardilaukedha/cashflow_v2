import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { DollarSign, Plus, Edit2, Trash2, X } from 'lucide-react';
import { formatCurrency } from '../../lib/utils';

interface SalaryComponent {
  id?: string;
  user_id?: string;
  name: string;
  type: 'income' | 'deduction';
  is_taxable: boolean;
  calculation_type: 'fixed' | 'percentage';
  formula: string;
  is_active: boolean;
  display_order: number;
}

export default function SalaryComponents() {
  const { user } = useAuth();
  const [components, setComponents] = useState<SalaryComponent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingComponent, setEditingComponent] = useState<SalaryComponent | null>(null);
  const [formData, setFormData] = useState<SalaryComponent>({
    name: '',
    type: 'income',
    is_taxable: false,
    calculation_type: 'fixed',
    formula: '',
    is_active: true,
    display_order: 0,
  });

  useEffect(() => {
    loadComponents();
  }, [user]);

  const loadComponents = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('salary_components')
      .select('*')
      .eq('user_id', user.id)
      .order('display_order');

    if (!error && data) {
      setComponents(data);
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const dataToSave = {
      ...formData,
      user_id: user.id,
    };

    let result;
    if (editingComponent?.id) {
      result = await supabase
        .from('salary_components')
        .update(dataToSave)
        .eq('id', editingComponent.id);
    } else {
      result = await supabase
        .from('salary_components')
        .insert([dataToSave]);
    }

    if (result.error) {
      alert('Gagal menyimpan: ' + result.error.message);
    } else {
      resetForm();
      loadComponents();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Yakin ingin menghapus komponen ini?')) return;

    const { error } = await supabase
      .from('salary_components')
      .delete()
      .eq('id', id);

    if (error) {
      alert('Gagal menghapus: ' + error.message);
    } else {
      loadComponents();
    }
  };

  const handleEdit = (component: SalaryComponent) => {
    setEditingComponent(component);
    setFormData(component);
    setShowForm(true);
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingComponent(null);
    setFormData({
      name: '',
      type: 'income',
      is_taxable: false,
      calculation_type: 'fixed',
      formula: '',
      is_active: true,
      display_order: 0,
    });
  };

  if (loading) {
    return <div className="text-center py-8 dark:text-gray-400">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
            <DollarSign className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Komponen Gaji</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">Atur komponen pendapatan dan potongan gaji</p>
          </div>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Tambah Komponen
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-lg w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                {editingComponent ? 'Edit Komponen' : 'Tambah Komponen'}
              </h3>
              <button onClick={resetForm} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Nama Komponen *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 dark:bg-gray-700 dark:text-gray-100"
                  placeholder="Contoh: Tunjangan Transport"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Tipe *
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as 'income' | 'deduction' })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 dark:bg-gray-700 dark:text-gray-100"
                  >
                    <option value="income">Pendapatan</option>
                    <option value="deduction">Potongan</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Perhitungan *
                  </label>
                  <select
                    value={formData.calculation_type}
                    onChange={(e) => setFormData({ ...formData, calculation_type: e.target.value as 'fixed' | 'percentage' })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 dark:bg-gray-700 dark:text-gray-100"
                  >
                    <option value="fixed">Nilai Tetap</option>
                    <option value="percentage">Persentase</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Formula
                </label>
                <input
                  type="text"
                  value={formData.formula}
                  onChange={(e) => setFormData({ ...formData, formula: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 dark:bg-gray-700 dark:text-gray-100"
                  placeholder="Contoh: 5 atau base_salary * 0.1"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Kosongkan jika manual input setiap bulan
                </p>
              </div>

              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.is_taxable}
                    onChange={(e) => setFormData({ ...formData, is_taxable: e.target.checked })}
                    className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Kena Pajak</span>
                </label>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Aktif</span>
                </label>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-emerald-600 text-white py-2 rounded-lg hover:bg-emerald-700 transition-colors font-medium"
                >
                  {editingComponent ? 'Update' : 'Simpan'}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 py-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors font-medium"
                >
                  Batal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="grid gap-4">
        {components.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
            <DollarSign className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400">Belum ada komponen gaji</p>
            <button
              onClick={() => setShowForm(true)}
              className="mt-4 text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 font-medium"
            >
              Tambah komponen pertama
            </button>
          </div>
        ) : (
          <>
            <div className="mb-2">
              <h3 className="text-sm font-semibold text-emerald-700 dark:text-emerald-400 uppercase">Pendapatan</h3>
            </div>
            {components.filter(c => c.type === 'income').map((component) => (
              <div key={component.id} className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-200 dark:border-emerald-800 flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white">{component.name}</h4>
                  <div className="flex items-center gap-4 mt-1">
                    <span className="text-xs text-gray-600 dark:text-gray-400">
                      {component.calculation_type === 'fixed' ? 'Nilai Tetap' : 'Persentase'}
                    </span>
                    {component.formula && (
                      <span className="text-xs text-gray-600 dark:text-gray-400">Formula: {component.formula}</span>
                    )}
                    {component.is_taxable && (
                      <span className="text-xs bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 px-2 py-0.5 rounded">Kena Pajak</span>
                    )}
                    {!component.is_active && (
                      <span className="text-xs bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 px-2 py-0.5 rounded">Nonaktif</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleEdit(component)}
                    className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(component.id!)}
                    className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}

            <div className="mt-6 mb-2">
              <h3 className="text-sm font-semibold text-rose-700 dark:text-rose-400 uppercase">Potongan</h3>
            </div>
            {components.filter(c => c.type === 'deduction').map((component) => (
              <div key={component.id} className="p-4 bg-rose-50 dark:bg-rose-900/20 rounded-lg border border-rose-200 dark:border-rose-800 flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white">{component.name}</h4>
                  <div className="flex items-center gap-4 mt-1">
                    <span className="text-xs text-gray-600 dark:text-gray-400">
                      {component.calculation_type === 'fixed' ? 'Nilai Tetap' : 'Persentase'}
                    </span>
                    {component.formula && (
                      <span className="text-xs text-gray-600 dark:text-gray-400">Formula: {component.formula}</span>
                    )}
                    {!component.is_active && (
                      <span className="text-xs bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 px-2 py-0.5 rounded">Nonaktif</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleEdit(component)}
                    className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(component.id!)}
                    className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
