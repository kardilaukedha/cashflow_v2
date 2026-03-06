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
    return <div className="text-center py-8">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-emerald-100 rounded-lg">
            <DollarSign className="w-6 h-6 text-emerald-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Komponen Gaji</h2>
            <p className="text-sm text-gray-600">Atur komponen pendapatan dan potongan gaji</p>
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
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">
                {editingComponent ? 'Edit Komponen' : 'Tambah Komponen'}
              </h3>
              <button onClick={resetForm} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nama Komponen *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  placeholder="Contoh: Tunjangan Transport"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tipe *
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as 'income' | 'deduction' })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="income">Pendapatan</option>
                    <option value="deduction">Potongan</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Perhitungan *
                  </label>
                  <select
                    value={formData.calculation_type}
                    onChange={(e) => setFormData({ ...formData, calculation_type: e.target.value as 'fixed' | 'percentage' })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="fixed">Nilai Tetap</option>
                    <option value="percentage">Persentase</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Formula
                </label>
                <input
                  type="text"
                  value={formData.formula}
                  onChange={(e) => setFormData({ ...formData, formula: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  placeholder="Contoh: 5 atau base_salary * 0.1"
                />
                <p className="text-xs text-gray-500 mt-1">
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
                  <span className="text-sm text-gray-700">Kena Pajak</span>
                </label>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                  />
                  <span className="text-sm text-gray-700">Aktif</span>
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
        {components.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
            <DollarSign className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">Belum ada komponen gaji</p>
            <button
              onClick={() => setShowForm(true)}
              className="mt-4 text-emerald-600 hover:text-emerald-700 font-medium"
            >
              Tambah komponen pertama
            </button>
          </div>
        ) : (
          <>
            <div className="mb-2">
              <h3 className="text-sm font-semibold text-emerald-700 uppercase">Pendapatan</h3>
            </div>
            {components.filter(c => c.type === 'income').map((component) => (
              <div key={component.id} className="p-4 bg-emerald-50 rounded-lg border border-emerald-200 flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-gray-900">{component.name}</h4>
                  <div className="flex items-center gap-4 mt-1">
                    <span className="text-xs text-gray-600">
                      {component.calculation_type === 'fixed' ? 'Nilai Tetap' : 'Persentase'}
                    </span>
                    {component.formula && (
                      <span className="text-xs text-gray-600">Formula: {component.formula}</span>
                    )}
                    {component.is_taxable && (
                      <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded">Kena Pajak</span>
                    )}
                    {!component.is_active && (
                      <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded">Nonaktif</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleEdit(component)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(component.id!)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}

            <div className="mt-6 mb-2">
              <h3 className="text-sm font-semibold text-rose-700 uppercase">Potongan</h3>
            </div>
            {components.filter(c => c.type === 'deduction').map((component) => (
              <div key={component.id} className="p-4 bg-rose-50 rounded-lg border border-rose-200 flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-gray-900">{component.name}</h4>
                  <div className="flex items-center gap-4 mt-1">
                    <span className="text-xs text-gray-600">
                      {component.calculation_type === 'fixed' ? 'Nilai Tetap' : 'Persentase'}
                    </span>
                    {component.formula && (
                      <span className="text-xs text-gray-600">Formula: {component.formula}</span>
                    )}
                    {!component.is_active && (
                      <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded">Nonaktif</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleEdit(component)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(component.id!)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
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
