import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Plus, Edit2, Trash2, DollarSign, Calendar, User, Briefcase, X, Eye } from 'lucide-react';
import { formatCurrency, formatDate } from '../lib/utils';
import SalarySlip from './SalarySlip';

interface JobPosition {
  id: string;
  name: string;
  base_salary: number;
}

interface EmployeeLoan {
  id: string;
  remaining_amount: number;
  monthly_deduction: number;
  status: string;
}

interface Employee {
  id: string;
  name: string;
  employee_code: string;
  job_position_id: string | null;
  basic_salary: number;
  transport_allowance: number;
  communication_allowance: number;
  motorcycle_rental: number;
  meal_allowance: number;
  status: 'active' | 'inactive';
  job_positions?: {
    name: string;
    base_salary: number;
  };
}

interface SalaryPayment {
  id: string;
  employee_id: string;
  payment_date: string;
  period_month: number;
  period_year: number;
  basic_salary: number;
  transport_allowance: number;
  communication_allowance: number;
  motorcycle_rental: number;
  meal_allowance: number;
  bonus: number;
  total_salary: number;
  notes: string;
  employee?: {
    name: string;
    employee_code: string;
  };
}

interface EmployeeFormData {
  name: string;
  employee_code: string;
  job_position_id: string;
  basic_salary: number;
  transport_allowance: number;
  communication_allowance: number;
  motorcycle_rental: number;
  meal_allowance: number;
  status: 'active' | 'inactive';
}

interface PaymentFormData {
  employee_id: string;
  payment_date: string;
  period_month: number;
  period_year: number;
  bonus: number;
  notes: string;
}

export default function EmployeeSalary() {
  const { user, userRole } = useAuth();
  const [jobPositions, setJobPositions] = useState<JobPosition[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [payments, setPayments] = useState<SalaryPayment[]>([]);
  const [loans, setLoans] = useState<Record<string, EmployeeLoan[]>>({});
  const [showEmployeeForm, setShowEmployeeForm] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [showSalarySlip, setShowSalarySlip] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<SalaryPayment | null>(null);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);

  const [employeeForm, setEmployeeForm] = useState<EmployeeFormData>({
    name: '',
    employee_code: '',
    job_position_id: '',
    basic_salary: 0,
    transport_allowance: 0,
    communication_allowance: 0,
    motorcycle_rental: 0,
    meal_allowance: 0,
    status: 'active',
  });

  const [paymentForm, setPaymentForm] = useState<PaymentFormData>({
    employee_id: '',
    payment_date: new Date().toISOString().split('T')[0],
    period_month: new Date().getMonth() + 1,
    period_year: new Date().getFullYear(),
    bonus: 0,
    notes: '',
  });

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    setLoading(true);
    await Promise.all([loadJobPositions(), loadEmployees(), loadPayments(), loadLoans()]);
    setLoading(false);
  };

  const loadJobPositions = async () => {
    const { data, error } = await supabase
      .from('job_positions')
      .select('*')
      .order('name');

    if (error) {
      console.error('Error loading job positions:', error);
    }
    if (data) {
      console.log('Loaded job positions:', data);
      setJobPositions(data);
    }
  };

  const loadEmployees = async () => {
    const { data, error } = await supabase
      .from('employees')
      .select(`
        *,
        job_positions(name, base_salary)
      `)
      .order('name');

    if (error) {
      console.error('Error loading employees:', error);
    }
    if (data) {
      console.log('Loaded employees:', data);
      setEmployees(data);
    }
  };

  const loadPayments = async () => {
    const { data, error } = await supabase
      .from('salary_payments')
      .select(`
        *,
        employee:employees(name, employee_code)
      `)
      .order('payment_date', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Error loading payments:', error);
    }
    if (data) setPayments(data);
  };

  const loadLoans = async () => {
    const { data } = await supabase
      .from('employee_loans')
      .select('*')
      .eq('status', 'active');

    if (data) {
      const loansByEmployee = data.reduce((acc, loan) => {
        if (!acc[loan.employee_id]) {
          acc[loan.employee_id] = [];
        }
        acc[loan.employee_id].push(loan);
        return acc;
      }, {} as Record<string, EmployeeLoan[]>);
      setLoans(loansByEmployee);
    }
  };

  const handleSaveEmployee = async () => {
    if (!user || !employeeForm.name || !employeeForm.employee_code) return;

    const employeeData = {
      ...employeeForm,
      user_id: user.id,
    };

    if (editingEmployee) {
      const { error } = await supabase
        .from('employees')
        .update(employeeData)
        .eq('id', editingEmployee.id);

      if (error) {
        alert('Error updating employee: ' + error.message);
        return;
      }
    } else {
      const { error } = await supabase
        .from('employees')
        .insert([employeeData]);

      if (error) {
        alert('Error creating employee: ' + error.message);
        return;
      }
    }

    resetEmployeeForm();
    loadEmployees();
  };

  const handleDeleteEmployee = async (id: string) => {
    if (!confirm('Hapus data karyawan ini?')) return;

    const { error } = await supabase
      .from('employees')
      .delete()
      .eq('id', id);

    if (error) {
      alert('Error deleting employee: ' + error.message);
      return;
    }

    loadEmployees();
  };

  const handleSavePayment = async () => {
    if (!user || !paymentForm.employee_id) return;

    const employee = employees.find(e => e.id === paymentForm.employee_id);
    if (!employee) return;

    const totalSalary =
      employee.basic_salary +
      employee.transport_allowance +
      employee.communication_allowance +
      employee.motorcycle_rental +
      employee.meal_allowance +
      paymentForm.bonus;

    const paymentData = {
      user_id: user.id,
      employee_id: paymentForm.employee_id,
      payment_date: paymentForm.payment_date,
      period_month: paymentForm.period_month,
      period_year: paymentForm.period_year,
      basic_salary: employee.basic_salary,
      transport_allowance: employee.transport_allowance,
      communication_allowance: employee.communication_allowance,
      motorcycle_rental: employee.motorcycle_rental,
      meal_allowance: employee.meal_allowance,
      bonus: paymentForm.bonus,
      total_salary: totalSalary,
      notes: paymentForm.notes,
    };

    const { error } = await supabase
      .from('salary_payments')
      .insert([paymentData]);

    if (error) {
      alert('Error creating payment: ' + error.message);
      return;
    }

    resetPaymentForm();
    loadPayments();
  };

  const resetEmployeeForm = () => {
    setEmployeeForm({
      name: '',
      employee_code: '',
      job_position_id: '',
      basic_salary: 0,
      transport_allowance: 0,
      communication_allowance: 0,
      motorcycle_rental: 0,
      meal_allowance: 0,
      status: 'active',
    });
    setEditingEmployee(null);
    setShowEmployeeForm(false);
  };

  const resetPaymentForm = () => {
    setPaymentForm({
      employee_id: '',
      payment_date: new Date().toISOString().split('T')[0],
      period_month: new Date().getMonth() + 1,
      period_year: new Date().getFullYear(),
      bonus: 0,
      notes: '',
    });
    setShowPaymentForm(false);
  };

  const editEmployee = (employee: Employee) => {
    setEmployeeForm({
      name: employee.name,
      employee_code: employee.employee_code,
      job_position_id: employee.job_position_id || '',
      basic_salary: employee.basic_salary,
      transport_allowance: employee.transport_allowance,
      communication_allowance: employee.communication_allowance,
      motorcycle_rental: employee.motorcycle_rental,
      meal_allowance: employee.meal_allowance,
      status: employee.status,
    });
    setEditingEmployee(employee);
    setShowEmployeeForm(true);
  };

  const calculateNextMonthSalary = (employeeId: string) => {
    const employee = employees.find(e => e.id === employeeId);
    if (!employee) return 0;

    const baseSalary = employee.basic_salary +
      employee.transport_allowance +
      employee.communication_allowance +
      employee.motorcycle_rental +
      employee.meal_allowance;

    const employeeLoans = loans[employeeId] || [];
    const totalLoanDeduction = employeeLoans.reduce((sum, loan) => sum + loan.monthly_deduction, 0);

    return baseSalary - totalLoanDeduction;
  };

  const getMonthName = (month: number) => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Oct', 'Nov', 'Des'];
    return months[month - 1];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Gaji Karyawan</h1>
        <div className="flex gap-3">
          <button
            onClick={() => setShowEmployeeForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Tambah Karyawan
          </button>
          <button
            onClick={() => setShowPaymentForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <DollarSign className="w-4 h-4" />
            Bayar Gaji
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Data Karyawan</h2>
          </div>
          <div className="p-6">
            <div className="space-y-3">
              {employees.filter(e => e.status === 'active').map((employee) => (
                <div
                  key={employee.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <User className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{employee.name}</p>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <span>{employee.employee_code}</span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Briefcase className="w-3 h-3" />
                            {employee.job_positions?.name || '-'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="mt-2 ml-13 text-sm">
                      <p className="font-semibold text-gray-700">{formatCurrency(
                        employee.basic_salary +
                        employee.transport_allowance +
                        employee.communication_allowance +
                        employee.motorcycle_rental +
                        employee.meal_allowance
                      )}</p>
                      {loans[employee.id] && loans[employee.id].length > 0 && (
                        <div className="mt-1 text-xs space-y-0.5">
                          <p className="text-orange-600">
                            Pinjaman: -{formatCurrency(loans[employee.id].reduce((sum, loan) => sum + loan.monthly_deduction, 0))}
                          </p>
                          <p className="text-green-600 font-semibold">
                            Estimasi Gaji Bulan Depan: {formatCurrency(calculateNextMonthSalary(employee.id))}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => editEmployee(employee)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteEmployee(employee.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
              {employees.filter(e => e.status === 'active').length === 0 && (
                <p className="text-center text-gray-500 py-8">Belum ada data karyawan</p>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Riwayat Pembayaran</h2>
          </div>
          <div className="p-6">
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {payments.map((payment) => (
                <div
                  key={payment.id}
                  className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors group"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900">{payment.employee?.name}</p>
                      <p className="text-sm text-gray-600">{payment.employee?.employee_code}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-emerald-600 font-mono">{formatCurrency(payment.total_salary)}</p>
                      <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                        <Calendar className="w-3 h-3" />
                        {getMonthName(payment.period_month)} {payment.period_year}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      {payment.bonus > 0 && (
                        <p className="text-xs text-blue-600">Bonus: {formatCurrency(payment.bonus)}</p>
                      )}
                      {payment.notes && (
                        <p className="text-xs text-gray-500 mt-1">{payment.notes}</p>
                      )}
                    </div>
                    <button
                      onClick={() => {
                        setSelectedPayment(payment);
                        setShowSalarySlip(true);
                      }}
                      className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 px-3 py-1 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700"
                    >
                      <Eye className="w-3 h-3" />
                      Lihat Slip
                    </button>
                  </div>
                </div>
              ))}
              {payments.length === 0 && (
                <p className="text-center text-gray-500 py-8">Belum ada riwayat pembayaran</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {showEmployeeForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-white">
              <h2 className="text-xl font-semibold text-gray-900">
                {editingEmployee ? 'Edit Karyawan' : 'Tambah Karyawan'}
              </h2>
              <button
                onClick={resetEmployeeForm}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nama Karyawan *
                  </label>
                  <input
                    type="text"
                    value={employeeForm.name}
                    onChange={(e) => setEmployeeForm({ ...employeeForm, name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Nama lengkap"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Kode Karyawan *
                  </label>
                  <input
                    type="text"
                    value={employeeForm.employee_code}
                    onChange={(e) => setEmployeeForm({ ...employeeForm, employee_code: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="KRY001"
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Jabatan
                  </label>
                  <select
                    value={employeeForm.job_position_id}
                    onChange={(e) => {
                      const selectedPosition = jobPositions.find(p => p.id === e.target.value);
                      setEmployeeForm({
                        ...employeeForm,
                        job_position_id: e.target.value,
                        basic_salary: selectedPosition?.base_salary || 0,
                      });
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Pilih Jabatan</option>
                    {jobPositions.map((pos) => (
                      <option key={pos.id} value={pos.id}>{pos.name} (Rp {pos.base_salary.toLocaleString('id-ID')})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    value={employeeForm.status}
                    onChange={(e) => setEmployeeForm({ ...employeeForm, status: e.target.value as 'active' | 'inactive' })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="active">Aktif</option>
                    <option value="inactive">Tidak Aktif</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Gaji Pokok
                </label>
                <input
                  type="number"
                  value={employeeForm.basic_salary}
                  onChange={(e) => setEmployeeForm({ ...employeeForm, basic_salary: Number(e.target.value) })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="0"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tunjangan Transport
                  </label>
                  <input
                    type="number"
                    value={employeeForm.transport_allowance}
                    onChange={(e) => setEmployeeForm({ ...employeeForm, transport_allowance: Number(e.target.value) })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tunjangan Komunikasi
                  </label>
                  <input
                    type="number"
                    value={employeeForm.communication_allowance}
                    onChange={(e) => setEmployeeForm({ ...employeeForm, communication_allowance: Number(e.target.value) })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Sewa Motor
                  </label>
                  <input
                    type="number"
                    value={employeeForm.motorcycle_rental}
                    onChange={(e) => setEmployeeForm({ ...employeeForm, motorcycle_rental: Number(e.target.value) })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Konsumsi
                  </label>
                  <input
                    type="number"
                    value={employeeForm.meal_allowance}
                    onChange={(e) => setEmployeeForm({ ...employeeForm, meal_allowance: Number(e.target.value) })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-gray-200">
                <div className="flex justify-between items-center">
                  <p className="text-sm text-gray-600">Total Gaji:</p>
                  <p className="text-lg font-bold text-gray-900">
                    {formatCurrency(
                      employeeForm.basic_salary +
                      employeeForm.transport_allowance +
                      employeeForm.communication_allowance +
                      employeeForm.motorcycle_rental +
                      employeeForm.meal_allowance
                    )}
                  </p>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={resetEmployeeForm}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Batal
                </button>
                <button
                  onClick={handleSaveEmployee}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Simpan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showPaymentForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-lg w-full">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900">Bayar Gaji</h2>
              <button
                onClick={resetPaymentForm}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Karyawan *
                </label>
                <select
                  value={paymentForm.employee_id}
                  onChange={(e) => setPaymentForm({ ...paymentForm, employee_id: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Pilih Karyawan</option>
                  {employees.filter(e => e.status === 'active').map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} - {emp.employee_code}
                    </option>
                  ))}
                </select>
              </div>

              {paymentForm.employee_id && (
                <div className="p-4 bg-blue-50 rounded-lg">
                  {(() => {
                    const emp = employees.find(e => e.id === paymentForm.employee_id);
                    if (!emp) return null;
                    return (
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Gaji Pokok:</span>
                          <span className="font-semibold">{formatCurrency(emp.basic_salary)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Transport:</span>
                          <span className="font-semibold">{formatCurrency(emp.transport_allowance)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Komunikasi:</span>
                          <span className="font-semibold">{formatCurrency(emp.communication_allowance)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Sewa Motor:</span>
                          <span className="font-semibold">{formatCurrency(emp.motorcycle_rental)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Konsumsi:</span>
                          <span className="font-semibold">{formatCurrency(emp.meal_allowance)}</span>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              <div className="grid gap-4 grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Bulan
                  </label>
                  <select
                    value={paymentForm.period_month}
                    onChange={(e) => setPaymentForm({ ...paymentForm, period_month: Number(e.target.value) })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {[...Array(12)].map((_, i) => (
                      <option key={i + 1} value={i + 1}>{getMonthName(i + 1)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tahun
                  </label>
                  <input
                    type="number"
                    value={paymentForm.period_year}
                    onChange={(e) => setPaymentForm({ ...paymentForm, period_year: Number(e.target.value) })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tanggal Pembayaran
                </label>
                <input
                  type="date"
                  value={paymentForm.payment_date}
                  onChange={(e) => setPaymentForm({ ...paymentForm, payment_date: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Bonus / Insentif
                </label>
                <input
                  type="number"
                  value={paymentForm.bonus}
                  onChange={(e) => setPaymentForm({ ...paymentForm, bonus: Number(e.target.value) })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Catatan
                </label>
                <textarea
                  value={paymentForm.notes}
                  onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                  placeholder="Catatan pembayaran (opsional)"
                />
              </div>

              {paymentForm.employee_id && (
                <div className="pt-4 border-t border-gray-200">
                  <div className="flex justify-between items-center">
                    <p className="text-sm text-gray-600">Total Yang Dibayarkan:</p>
                    <p className="text-xl font-bold text-green-600">
                      {(() => {
                        const emp = employees.find(e => e.id === paymentForm.employee_id);
                        if (!emp) return formatCurrency(0);
                        return formatCurrency(
                          emp.basic_salary +
                          emp.transport_allowance +
                          emp.communication_allowance +
                          emp.motorcycle_rental +
                          emp.meal_allowance +
                          paymentForm.bonus
                        );
                      })()}
                    </p>
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  onClick={resetPaymentForm}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Batal
                </button>
                <button
                  onClick={handleSavePayment}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  Bayar Gaji
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showSalarySlip && selectedPayment && (
        <SalarySlip
          employee={{
            name: selectedPayment.employee?.name || '',
            employee_code: selectedPayment.employee?.employee_code || '',
          }}
          payment={{
            base_salary: selectedPayment.base_salary,
            allowance: selectedPayment.allowance,
            bonus: selectedPayment.bonus,
            attendance_days: 22,
            overtime_hours: 0,
            deduction: selectedPayment.deduction,
            payment_date: selectedPayment.payment_date,
          }}
          onClose={() => {
            setShowSalarySlip(false);
            setSelectedPayment(null);
          }}
        />
      )}
    </div>
  );
}
