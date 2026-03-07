import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { can } from '../lib/permissions';
import { Wallet, Plus, Edit2, Trash2, X, Check, TrendingDown } from 'lucide-react';
import { formatCurrency, formatDate } from '../lib/utils';

interface Employee {
  id: string;
  name: string;
}

interface EmployeeLoan {
  id: string;
  employee_id: string;
  employees: {
    name: string;
  };
  amount: number;
  remaining_amount: number;
  monthly_deduction: number;
  start_date: string;
  status: string;
  notes: string;
  created_at: string;
}

export default function EmployeeLoanManager() {
  const { user, userRole, userProfile } = useAuth();
  const [loans, setLoans] = useState<EmployeeLoan[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingLoan, setEditingLoan] = useState<EmployeeLoan | null>(null);
  const [formData, setFormData] = useState({
    employee_id: '',
    amount: '',
    monthly_deduction: '',
    start_date: new Date().toISOString().split('T')[0],
    notes: '',
  });

  const role = userRole || 'karyawan';
  const canManage = can(role, 'manage_loans');
  const myEmployeeId = userProfile?.employee_id;

  useEffect(() => {
    fetchLoans();
    if (canManage) {
      fetchEmployees();
    }
  }, [canManage, myEmployeeId]);

  const fetchLoans = async () => {
    try {
      let query = supabase
        .from('employee_loans')
        .select('*, employees(name)')
        .order('created_at', { ascending: false });

      if (!canManage) {
        if (!myEmployeeId) {
          setLoans([]);
          setLoading(false);
          return;
        }
        query = query.eq('employee_id', myEmployeeId);
      }

      const { data, error } = await query;
      if (error) throw error;
      setLoans(data || []);
    } catch (error) {
      console.error('Error fetching loans:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('id, name')
        .order('name');

      if (error) throw error;
      setEmployees(data || []);
    } catch (error) {
      console.error('Error fetching employees:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      const amount = parseFloat(formData.amount);
      const monthlyDeduction = parseFloat(formData.monthly_deduction);

      if (editingLoan) {
        const { error } = await supabase
          .from('employee_loans')
          .update({
            employee_id: formData.employee_id,
            amount,
            monthly_deduction: monthlyDeduction,
            start_date: formData.start_date,
            notes: formData.notes,
          })
          .eq('id', editingLoan.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('employee_loans')
          .insert([{
            user_id: user.id,
            employee_id: formData.employee_id,
            amount,
            remaining_amount: amount,
            monthly_deduction: monthlyDeduction,
            start_date: formData.start_date,
            status: 'active',
            notes: formData.notes,
          }]);

        if (error) throw error;
      }

      setFormData({
        employee_id: '',
        amount: '',
        monthly_deduction: '',
        start_date: new Date().toISOString().split('T')[0],
        notes: '',
      });
      setShowForm(false);
      setEditingLoan(null);
      fetchLoans();
    } catch (error) {
      console.error('Error saving loan:', error);
      alert('Gagal menyimpan pinjaman');
    }
  };

  const handleEdit = (loan: EmployeeLoan) => {
    setEditingLoan(loan);
    setFormData({
      employee_id: loan.employee_id,
      amount: loan.amount.toString(),
      monthly_deduction: loan.monthly_deduction.toString(),
      start_date: loan.start_date,
      notes: loan.notes || '',
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Yakin ingin menghapus pinjaman ini?')) return;

    try {
      const { error } = await supabase
        .from('employee_loans')
        .delete()
        .eq('id', id);

      if (error) throw error;
      fetchLoans();
    } catch (error) {
      console.error('Error deleting loan:', error);
      alert('Gagal menghapus pinjaman');
    }
  };

  const markAsPaidOff = async (id: string) => {
    try {
      const { error } = await supabase
        .from('employee_loans')
        .update({
          status: 'paid_off',
          remaining_amount: 0,
        })
        .eq('id', id);

      if (error) throw error;
      fetchLoans();
    } catch (error) {
      console.error('Error updating loan:', error);
      alert('Gagal mengupdate pinjaman');
    }
  };

  const cancelForm = () => {
    setShowForm(false);
    setEditingLoan(null);
    setFormData({
      employee_id: '',
      amount: '',
      monthly_deduction: '',
      start_date: new Date().toISOString().split('T')[0],
      notes: '',
    });
  };

  if (loading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 sm:p-3 bg-orange-100 rounded-lg">
            <Wallet className="w-5 h-5 sm:w-6 sm:h-6 text-orange-600" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Pinjaman Karyawan</h2>
            <p className="text-xs sm:text-sm text-gray-600">
              {!canManage ? 'Lihat pinjaman Anda' : 'Kelola pinjaman karyawan'}
            </p>
          </div>
        </div>
        {canManage && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm w-full sm:w-auto justify-center"
          >
            <Plus className="w-5 h-5" />
            Tambah Pinjaman
          </button>
        )}
      </div>

      {!canManage && !myEmployeeId && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 flex items-start gap-3">
          <Wallet className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-amber-800">Akun belum terhubung ke data karyawan</p>
            <p className="text-sm text-amber-600 mt-1">
              Minta admin untuk menambahkan data karyawan Anda di menu <strong>Gaji Karyawan → Tambah Karyawan</strong>, lalu hubungkan ke akun ini melalui dropdown <em>"Hubungkan ke Akun User"</em>.
            </p>
          </div>
        </div>
      )}

      {showForm && canManage && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">
                {editingLoan ? 'Edit Pinjaman' : 'Tambah Pinjaman'}
              </h3>
              <button onClick={cancelForm} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Karyawan
                </label>
                <select
                  value={formData.employee_id}
                  onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  required
                >
                  <option value="">Pilih Karyawan</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Jumlah Pinjaman (Rp)
                </label>
                <input
                  type="number"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  required
                  min="0"
                  step="1000"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Potongan per Bulan (Rp)
                </label>
                <input
                  type="number"
                  value={formData.monthly_deduction}
                  onChange={(e) => setFormData({ ...formData, monthly_deduction: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  required
                  min="0"
                  step="1000"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tanggal Mulai
                </label>
                <input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Catatan
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  rows={3}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-orange-600 text-white py-2 rounded-lg hover:bg-orange-700 transition-colors font-medium"
                >
                  {editingLoan ? 'Update' : 'Simpan'}
                </button>
                <button
                  type="button"
                  onClick={cancelForm}
                  className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                >
                  Batal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loans.length === 0 ? (
          <div className="text-center py-12">
            <Wallet className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">
              {!canManage ? 'Tidak ada pinjaman' : 'Belum ada pinjaman'}
            </p>
            {canManage && (
              <button
                onClick={() => setShowForm(true)}
                className="mt-4 text-orange-600 hover:text-orange-700 font-medium"
              >
                Tambah pinjaman pertama
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px]">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Karyawan
                  </th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Jumlah
                  </th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Sisa
                  </th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Potongan/Bulan
                  </th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  {canManage && (
                    <th className="px-4 sm:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Aksi
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {loans.map((loan) => {
                  const progress = ((loan.amount - loan.remaining_amount) / loan.amount) * 100;
                  return (
                    <tr key={loan.id} className="hover:bg-gray-50">
                      <td className="px-4 sm:px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">
                          {loan.employees.name}
                        </div>
                        {loan.notes && (
                          <div className="text-xs text-gray-500">{loan.notes}</div>
                        )}
                        <div className="text-xs text-gray-400 mt-1">
                          Mulai: {formatDate(loan.start_date, 'short')}
                        </div>
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-semibold text-gray-900 font-mono">
                          {formatCurrency(loan.amount)}
                        </div>
                      </td>
                      <td className="px-4 sm:px-6 py-4">
                        <div className="text-sm font-semibold text-rose-600 font-mono mb-2">
                          {formatCurrency(loan.remaining_amount)}
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-gradient-to-r from-emerald-500 to-emerald-600 h-2 rounded-full transition-all"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          Lunas {progress.toFixed(0)}%
                        </p>
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-mono text-gray-900">
                          {formatCurrency(loan.monthly_deduction)}
                        </div>
                        <div className="text-xs text-gray-500">per bulan</div>
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          loan.status === 'active'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {loan.status === 'active' ? 'Aktif' : 'Lunas'}
                        </span>
                      </td>
                      {canManage && (
                        <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          {loan.status === 'active' && (
                            <>
                              <button
                                onClick={() => markAsPaidOff(loan.id)}
                                className="text-emerald-600 hover:text-emerald-900 mr-4"
                                title="Tandai Lunas"
                              >
                                <Check className="w-4 h-4 inline" />
                              </button>
                              <button
                                onClick={() => handleEdit(loan)}
                                className="text-blue-600 hover:text-blue-900 mr-4"
                              >
                                <Edit2 className="w-4 h-4 inline" />
                              </button>
                              <button
                                onClick={() => handleDelete(loan.id)}
                                className="text-red-600 hover:text-red-900"
                              >
                                <Trash2 className="w-4 h-4 inline" />
                              </button>
                            </>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
