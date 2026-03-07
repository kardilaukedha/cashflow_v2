import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Zap, Users, DollarSign, FileText, Upload, Check, X, Eye, Download } from 'lucide-react';
import { formatCurrency, formatDate } from '../../lib/utils';

interface Employee {
  id: string;
  name: string;
  employee_code: string;
  basic_salary: number;
  transport_allowance: number;
  communication_allowance: number;
  motorcycle_rental: number;
  meal_allowance: number;
  status: string;
}

interface EmployeeLoan {
  employee_id: string;
  monthly_deduction: number;
}

interface BatchPayment {
  id: string;
  batch_name: string;
  period_month: number;
  period_year: number;
  total_employees: number;
  total_amount: number;
  payment_date: string;
  status: string;
  notes: string;
  created_at: string;
}

interface SalaryDetail {
  employee: Employee;
  loan_deduction: number;
  gross_salary: number;
  net_salary: number;
}

export default function BulkOperations() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [salaryDetails, setSalaryDetails] = useState<SalaryDetail[]>([]);
  const [showBatchForm, setShowBatchForm] = useState(false);
  const [showProofUpload, setShowProofUpload] = useState(false);
  const [currentBatchId, setCurrentBatchId] = useState<string | null>(null);
  const [batches, setBatches] = useState<BatchPayment[]>([]);

  const [batchForm, setBatchForm] = useState({
    period_month: new Date().getMonth() + 1,
    period_year: new Date().getFullYear(),
    payment_date: new Date().toISOString().split('T')[0],
    notes: '',
  });

  const [proofForm, setProofForm] = useState({
    proof_type: 'transfer',
    proof_number: '',
    proof_url: '',
    notes: '',
  });

  useEffect(() => {
    loadEmployees();
    loadBatches();
  }, [user]);

  const loadEmployees = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .order('name');

    if (!error && data) {
      setEmployees(data);
    }
  };

  const loadBatches = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('batch_salary_payments')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10);

    if (!error && data) {
      setBatches(data);
    }
  };

  const handleSelectAll = () => {
    if (selectedEmployees.length === employees.length) {
      setSelectedEmployees([]);
    } else {
      setSelectedEmployees(employees.map(e => e.id));
    }
  };

  const toggleEmployee = (employeeId: string) => {
    if (selectedEmployees.includes(employeeId)) {
      setSelectedEmployees(selectedEmployees.filter(id => id !== employeeId));
    } else {
      setSelectedEmployees([...selectedEmployees, employeeId]);
    }
  };

  const calculateSalaries = async () => {
    if (selectedEmployees.length === 0) {
      alert('Pilih minimal 1 karyawan');
      return;
    }

    setLoading(true);

    const { data: loans, error: loanError } = await supabase
      .from('employee_loans')
      .select('employee_id, monthly_deduction')
      .in('employee_id', selectedEmployees)
      .eq('status', 'active');

    const loanMap = new Map<string, number>();
    if (!loanError && loans) {
      loans.forEach(loan => {
        const current = loanMap.get(loan.employee_id) || 0;
        loanMap.set(loan.employee_id, current + loan.monthly_deduction);
      });
    }

    const details: SalaryDetail[] = employees
      .filter(emp => selectedEmployees.includes(emp.id))
      .map(emp => {
        const gross = emp.basic_salary + emp.transport_allowance +
                     emp.communication_allowance + emp.motorcycle_rental +
                     emp.meal_allowance;
        const loanDeduction = loanMap.get(emp.id) || 0;
        const net = gross - loanDeduction;

        return {
          employee: emp,
          loan_deduction: loanDeduction,
          gross_salary: gross,
          net_salary: net,
        };
      });

    setSalaryDetails(details);
    setShowBatchForm(true);
    setLoading(false);
  };

  const processBatchPayment = async () => {
    if (!user || salaryDetails.length === 0) return;

    setLoading(true);

    const totalAmount = salaryDetails.reduce((sum, detail) => sum + detail.net_salary, 0);

    const batchData = {
      user_id: user.id,
      batch_name: `Gaji ${getMonthName(batchForm.period_month)} ${batchForm.period_year}`,
      period_month: batchForm.period_month,
      period_year: batchForm.period_year,
      total_employees: salaryDetails.length,
      total_amount: totalAmount,
      payment_date: batchForm.payment_date,
      status: 'processing',
      notes: batchForm.notes,
    };

    const { data: batch, error: batchError } = await supabase
      .from('batch_salary_payments')
      .insert([batchData])
      .select()
      .single();

    if (batchError) {
      alert('Gagal membuat batch: ' + batchError.message);
      setLoading(false);
      return;
    }

    let successCount = 0;
    let failedCount = 0;

    for (const detail of salaryDetails) {
      const paymentData = {
        user_id: user.id,
        employee_id: detail.employee.id,
        payment_date: batchForm.payment_date,
        period_month: batchForm.period_month,
        period_year: batchForm.period_year,
        basic_salary: detail.employee.basic_salary,
        transport_allowance: detail.employee.transport_allowance,
        communication_allowance: detail.employee.communication_allowance,
        motorcycle_rental: detail.employee.motorcycle_rental,
        meal_allowance: detail.employee.meal_allowance,
        bonus: 0,
        loan_deduction: detail.loan_deduction,
        total_salary: detail.net_salary,
        notes: `Batch: ${batch.id}`,
      };

      const { error } = await supabase
        .from('salary_payments')
        .insert([paymentData]);

      if (error) {
        failedCount++;
      } else {
        successCount++;
      }
    }

    await supabase
      .from('bulk_operation_logs')
      .insert([{
        user_id: user.id,
        operation_type: 'batch_salary_payment',
        target_count: salaryDetails.length,
        success_count: successCount,
        failed_count: failedCount,
        details: { batch_id: batch.id },
      }]);

    setLoading(false);
    setCurrentBatchId(batch.id);
    setShowBatchForm(false);
    setShowProofUpload(true);
    alert(`Batch pembayaran berhasil! ${successCount} berhasil, ${failedCount} gagal`);
    loadBatches();
  };

  const uploadProof = async () => {
    if (!currentBatchId) return;

    setLoading(true);

    const { data: payments } = await supabase
      .from('salary_payments')
      .select('id')
      .eq('notes', `Batch: ${currentBatchId}`);

    if (payments) {
      for (const payment of payments) {
        await supabase
          .from('salary_payment_proofs')
          .insert([{
            batch_payment_id: currentBatchId,
            salary_payment_id: payment.id,
            proof_type: proofForm.proof_type,
            proof_url: proofForm.proof_url,
            proof_number: proofForm.proof_number,
            uploaded_by: user!.id,
            notes: proofForm.notes,
          }]);
      }
    }

    await supabase
      .from('batch_salary_payments')
      .update({ status: 'completed' })
      .eq('id', currentBatchId);

    alert('Bukti pembayaran berhasil diupload!');
    setShowProofUpload(false);
    setCurrentBatchId(null);
    setSelectedEmployees([]);
    setSalaryDetails([]);
    setProofForm({
      proof_type: 'transfer',
      proof_number: '',
      proof_url: '',
      notes: '',
    });
    setLoading(false);
    loadBatches();
  };

  const getMonthName = (month: number) => {
    const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
                   'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    return months[month - 1];
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      draft: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
      processing: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
      completed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
      cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    };
    return styles[status] || styles.draft;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-violet-100 dark:bg-violet-900/30 rounded-lg">
          <Zap className="w-6 h-6 text-violet-600 dark:text-violet-400" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Operasi Massal</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">Proses pembayaran gaji batch & operasi bulk lainnya</p>
        </div>
      </div>

      <div className="bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/20 border border-violet-200 dark:border-violet-800 rounded-lg p-6">
        <h3 className="font-bold text-violet-900 dark:text-violet-300 mb-2 flex items-center gap-2">
          <DollarSign className="w-5 h-5" />
          Pembayaran Gaji Massal
        </h3>
        <p className="text-sm text-violet-800 dark:text-violet-400 mb-4">
          Proses pembayaran gaji untuk multiple karyawan sekaligus dengan upload bukti transfer
        </p>

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-violet-200 dark:border-violet-800 p-4 mb-4">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Users className="w-5 h-5" />
              Pilih Karyawan ({selectedEmployees.length}/{employees.length})
            </h4>
            <button
              onClick={handleSelectAll}
              className="text-sm text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300 font-medium"
            >
              {selectedEmployees.length === employees.length ? 'Deselect All' : 'Select All'}
            </button>
          </div>

          <div className="max-h-96 overflow-y-auto space-y-2">
            {employees.map((employee) => (
              <label
                key={employee.id}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg hover:bg-violet-50 dark:hover:bg-violet-900/20 cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={selectedEmployees.includes(employee.id)}
                    onChange={() => toggleEmployee(employee.id)}
                    className="w-4 h-4 text-violet-600 rounded focus:ring-violet-500"
                  />
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">{employee.name}</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">{employee.employee_code}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    {formatCurrency(employee.basic_salary + employee.transport_allowance +
                                  employee.communication_allowance + employee.motorcycle_rental +
                                  employee.meal_allowance)}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Gaji Kotor</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        <button
          onClick={calculateSalaries}
          disabled={loading || selectedEmployees.length === 0}
          className="w-full flex items-center justify-center gap-2 bg-violet-600 text-white px-6 py-3 rounded-lg hover:bg-violet-700 transition-colors disabled:opacity-50 font-medium"
        >
          <DollarSign className="w-5 h-5" />
          {loading ? 'Menghitung...' : `Proses Gaji (${selectedEmployees.length} Karyawan)`}
        </button>
      </div>

      {showBatchForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Review Pembayaran Gaji Batch</h3>
              <button onClick={() => setShowBatchForm(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="mb-6 p-4 bg-violet-50 dark:bg-violet-900/20 rounded-lg border border-violet-200 dark:border-violet-800">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Periode</label>
                  <select
                    value={batchForm.period_month}
                    onChange={(e) => setBatchForm({ ...batchForm, period_month: parseInt(e.target.value) })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-violet-500 dark:bg-gray-700 dark:text-gray-100"
                  >
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                      <option key={month} value={month}>{getMonthName(month)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Tahun</label>
                  <input
                    type="number"
                    value={batchForm.period_year}
                    onChange={(e) => setBatchForm({ ...batchForm, period_year: parseInt(e.target.value) })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-violet-500 dark:bg-gray-700 dark:text-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Tanggal Pembayaran</label>
                  <input
                    type="date"
                    value={batchForm.payment_date}
                    onChange={(e) => setBatchForm({ ...batchForm, payment_date: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-violet-500 dark:bg-gray-700 dark:text-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Catatan</label>
                  <input
                    type="text"
                    value={batchForm.notes}
                    onChange={(e) => setBatchForm({ ...batchForm, notes: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-violet-500 dark:bg-gray-700 dark:text-gray-100"
                    placeholder="Optional"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2 mb-6">
              <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Detail Pembayaran:</h4>
              {salaryDetails.map((detail, index) => (
                <div key={index} className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white">{detail.employee.name}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{detail.employee.employee_code}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Gaji Kotor: {formatCurrency(detail.gross_salary)}
                      </p>
                      {detail.loan_deduction > 0 && (
                        <p className="text-sm text-red-600 dark:text-red-400">
                          Potongan Pinjaman: -{formatCurrency(detail.loan_deduction)}
                        </p>
                      )}
                      <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                        Nett: {formatCurrency(detail.net_salary)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mb-6">
              <div className="flex justify-between items-center text-lg font-bold">
                <span className="text-gray-900 dark:text-white">Total Pembayaran:</span>
                <span className="text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(salaryDetails.reduce((sum, d) => sum + d.net_salary, 0))}
                </span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {salaryDetails.length} karyawan
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={processBatchPayment}
                disabled={loading}
                className="flex-1 flex items-center justify-center gap-2 bg-violet-600 text-white py-3 rounded-lg hover:bg-violet-700 transition-colors disabled:opacity-50 font-medium"
              >
                <Check className="w-5 h-5" />
                {loading ? 'Memproses...' : 'Konfirmasi & Proses'}
              </button>
              <button
                onClick={() => setShowBatchForm(false)}
                className="flex-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 py-3 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors font-medium"
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}

      {showProofUpload && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-lg w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Upload Bukti Pembayaran</h3>
              <button onClick={() => setShowProofUpload(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Tipe Pembayaran
                </label>
                <select
                  value={proofForm.proof_type}
                  onChange={(e) => setProofForm({ ...proofForm, proof_type: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-violet-500 dark:bg-gray-700 dark:text-gray-100"
                >
                  <option value="transfer">Transfer Bank</option>
                  <option value="cash">Tunai</option>
                  <option value="check">Cek</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Nomor Bukti (No. Ref/No. Cek)
                </label>
                <input
                  type="text"
                  value={proofForm.proof_number}
                  onChange={(e) => setProofForm({ ...proofForm, proof_number: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-violet-500 dark:bg-gray-700 dark:text-gray-100"
                  placeholder="Contoh: TRF20241201001"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  URL Bukti (Link foto/file)
                </label>
                <input
                  type="url"
                  value={proofForm.proof_url}
                  onChange={(e) => setProofForm({ ...proofForm, proof_url: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-violet-500 dark:bg-gray-700 dark:text-gray-100"
                  placeholder="https://drive.google.com/..."
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Upload bukti ke Google Drive/cloud storage, lalu paste link di sini
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Catatan
                </label>
                <textarea
                  value={proofForm.notes}
                  onChange={(e) => setProofForm({ ...proofForm, notes: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-violet-500 dark:bg-gray-700 dark:text-gray-100"
                  rows={3}
                  placeholder="Catatan tambahan (optional)"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={uploadProof}
                disabled={loading}
                className="flex-1 flex items-center justify-center gap-2 bg-violet-600 text-white py-3 rounded-lg hover:bg-violet-700 transition-colors disabled:opacity-50 font-medium"
              >
                <Upload className="w-5 h-5" />
                {loading ? 'Mengupload...' : 'Upload Bukti'}
              </button>
              <button
                onClick={() => setShowProofUpload(false)}
                className="flex-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 py-3 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors font-medium"
              >
                Skip
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
        <h3 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Riwayat Batch Pembayaran
        </h3>

        {batches.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <FileText className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
            <p>Belum ada batch pembayaran</p>
          </div>
        ) : (
          <div className="space-y-3">
            {batches.map((batch) => (
              <div key={batch.id} className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white">{batch.batch_name}</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {batch.total_employees} karyawan • {formatDate(batch.payment_date)}
                    </p>
                    {batch.notes && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{batch.notes}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(batch.total_amount)}
                    </p>
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${getStatusBadge(batch.status)}`}>
                      {batch.status === 'completed' ? 'Selesai' :
                       batch.status === 'processing' ? 'Proses' :
                       batch.status === 'cancelled' ? 'Batal' : 'Draft'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
