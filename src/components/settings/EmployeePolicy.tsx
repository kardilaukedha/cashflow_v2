import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Users, Save, TrendingUp, Wallet, Clock, AlertCircle } from 'lucide-react';

interface EmployeePolicy {
  id?: string;
  auto_salary_increment_enabled: boolean;
  auto_salary_increment_percentage: number;
  auto_salary_increment_months: number;
  prorate_salary_enabled: boolean;
  thr_calculation_formula: string;
  max_loan_percentage: number;
  max_loan_tenure_months: number;
  loan_interest_rate: number;
  allow_multiple_loans: boolean;
  late_deduction_amount: number;
  overtime_multiplier: number;
}

export default function EmployeePolicy() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [policy, setPolicy] = useState<EmployeePolicy>({
    auto_salary_increment_enabled: false,
    auto_salary_increment_percentage: 5,
    auto_salary_increment_months: 12,
    prorate_salary_enabled: true,
    thr_calculation_formula: 'one_month_salary',
    max_loan_percentage: 50,
    max_loan_tenure_months: 12,
    loan_interest_rate: 0,
    allow_multiple_loans: false,
    late_deduction_amount: 50000,
    overtime_multiplier: 1.5,
  });

  useEffect(() => {
    loadPolicy();
  }, [user]);

  const loadPolicy = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('employee_policies')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!error && data) {
      setPolicy(data);
    }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);

    const dataToSave = {
      user_id: user.id,
      ...policy,
    };

    let result;
    if (policy.id) {
      result = await supabase
        .from('employee_policies')
        .update(dataToSave)
        .eq('id', policy.id);
    } else {
      result = await supabase
        .from('employee_policies')
        .insert([dataToSave])
        .select()
        .single();
    }

    if (result.error) {
      alert('Gagal menyimpan: ' + result.error.message);
    } else {
      alert('Kebijakan berhasil disimpan!');
      if (result.data) {
        setPolicy(result.data);
      }
    }
    setSaving(false);
  };

  if (loading) {
    return <div className="text-center py-8 dark:text-gray-400">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
          <Users className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Kebijakan Karyawan</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">Atur policy otomatis untuk pengelolaan karyawan</p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          Auto Salary Increment
        </h3>

        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white">Aktifkan Auto-Increment</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">Naikkan gaji otomatis setiap periode tertentu</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={policy.auto_salary_increment_enabled}
                onChange={(e) => setPolicy({ ...policy, auto_salary_increment_enabled: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 dark:bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-300 dark:peer-focus:ring-emerald-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
            </label>
          </div>

          {policy.auto_salary_increment_enabled && (
            <div className="grid md:grid-cols-2 gap-4 pl-4 border-l-4 border-emerald-200 dark:border-emerald-800">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Persentase Kenaikan
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="0.5"
                    value={policy.auto_salary_increment_percentage}
                    onChange={(e) => setPolicy({ ...policy, auto_salary_increment_percentage: parseFloat(e.target.value) })}
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 dark:bg-gray-700 dark:text-gray-100"
                  />
                  <span className="text-gray-700 dark:text-gray-300 font-medium">%</span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Setiap (bulan)
                </label>
                <input
                  type="number"
                  value={policy.auto_salary_increment_months}
                  onChange={(e) => setPolicy({ ...policy, auto_salary_increment_months: parseInt(e.target.value) })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 dark:bg-gray-700 dark:text-gray-100"
                />
              </div>
            </div>
          )}
        </div>

        <div className="mt-4 space-y-4">
          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white">Prorate Salary</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">Hitung gaji proporsional untuk karyawan baru</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={policy.prorate_salary_enabled}
                onChange={(e) => setPolicy({ ...policy, prorate_salary_enabled: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 dark:bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-300 dark:peer-focus:ring-emerald-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Formula THR
            </label>
            <select
              value={policy.thr_calculation_formula}
              onChange={(e) => setPolicy({ ...policy, thr_calculation_formula: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 dark:bg-gray-700 dark:text-gray-100"
            >
              <option value="one_month_salary">1 Bulan Gaji</option>
              <option value="basic_salary_only">Gaji Pokok Saja</option>
              <option value="proportional">Proporsional (sesuai masa kerja)</option>
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Wallet className="w-5 h-5 text-orange-600 dark:text-orange-400" />
          Kebijakan Pinjaman
        </h3>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Max Pinjaman (% dari gaji)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={policy.max_loan_percentage}
                onChange={(e) => setPolicy({ ...policy, max_loan_percentage: parseFloat(e.target.value) })}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 dark:bg-gray-700 dark:text-gray-100"
              />
              <span className="text-gray-700 dark:text-gray-300 font-medium">%</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Max Tenor (bulan)
            </label>
            <input
              type="number"
              value={policy.max_loan_tenure_months}
              onChange={(e) => setPolicy({ ...policy, max_loan_tenure_months: parseInt(e.target.value) })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 dark:bg-gray-700 dark:text-gray-100"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Bunga (% per tahun)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                step="0.1"
                value={policy.loan_interest_rate}
                onChange={(e) => setPolicy({ ...policy, loan_interest_rate: parseFloat(e.target.value) })}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 dark:bg-gray-700 dark:text-gray-100"
              />
              <span className="text-gray-700 dark:text-gray-300 font-medium">%</span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">0 untuk tanpa bunga</p>
          </div>

          <div className="flex items-center p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={policy.allow_multiple_loans}
                onChange={(e) => setPolicy({ ...policy, allow_multiple_loans: e.target.checked })}
                className="w-4 h-4 text-orange-600 rounded focus:ring-orange-500"
              />
              <div>
                <span className="font-medium text-gray-900 dark:text-white">Izinkan Multiple Loans</span>
                <p className="text-xs text-gray-600 dark:text-gray-400">Karyawan bisa punya lebih dari 1 pinjaman aktif</p>
              </div>
            </label>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          Kehadiran & Lembur
        </h3>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Potongan Keterlambatan (Rp)
            </label>
            <input
              type="number"
              step="1000"
              value={policy.late_deduction_amount}
              onChange={(e) => setPolicy({ ...policy, late_deduction_amount: parseFloat(e.target.value) })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Per hari keterlambatan</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Multiplier Lembur
            </label>
            <input
              type="number"
              step="0.1"
              value={policy.overtime_multiplier}
              onChange={(e) => setPolicy({ ...policy, overtime_multiplier: parseFloat(e.target.value) })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">1.5 = 1.5x upah normal per jam</p>
          </div>
        </div>
      </div>

      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold text-amber-900 dark:text-amber-300 mb-1">Catatan Penting</h4>
            <ul className="text-sm text-amber-800 dark:text-amber-400 space-y-1">
              <li>• Perubahan policy hanya berlaku untuk transaksi baru</li>
              <li>• Auto-increment gaji akan dicek setiap bulan secara otomatis</li>
              <li>• Pinjaman yang melebihi limit tidak bisa diproses</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 bg-emerald-600 text-white px-6 py-2 rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
        </button>
      </div>
    </div>
  );
}
