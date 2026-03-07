import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { can } from '../lib/permissions';
import {
  Plus, Edit2, Trash2, DollarSign, Calendar, User, Briefcase, X, Eye,
  Link, Wallet, TrendingDown, AlertCircle, CheckCircle,
} from 'lucide-react';
import { formatCurrency, formatDate } from '../lib/utils';
import SalarySlip from './SalarySlip';

interface JobPosition {
  id: string;
  name: string;
  base_salary: number;
}

interface UserProfileRef {
  id: string;
  full_name: string;
  email: string;
  role: string;
  employee_id: string | null;
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
  job_positions?: { name: string; base_salary: number };
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
  employee?: { name: string; employee_code: string };
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
  linked_user_profile_ids: string[];
}

interface PaymentFormData {
  employee_id: string;
  payment_date: string;
  period_month: number;
  period_year: number;
  bonus: number;
  notes: string;
}

const MONTHS = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];

export default function EmployeeSalary() {
  const { user, userRole, userProfile } = useAuth();
  const role = userRole || 'karyawan';
  const canManage = can(role, 'manage_salary');
  const myEmployeeId = userProfile?.employee_id;

  const [jobPositions, setJobPositions] = useState<JobPosition[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [payments, setPayments] = useState<SalaryPayment[]>([]);
  const [loans, setLoans] = useState<Record<string, EmployeeLoan[]>>({});
  const [userProfiles, setUserProfiles] = useState<UserProfileRef[]>([]);

  const [showEmployeeForm, setShowEmployeeForm] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [showSalarySlip, setShowSalarySlip] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<SalaryPayment | null>(null);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);

  const [myEmployee, setMyEmployee] = useState<Employee | null>(null);
  const [myPayments, setMyPayments] = useState<SalaryPayment[]>([]);
  const [myLoans, setMyLoans] = useState<EmployeeLoan[]>([]);
  const [myLoading, setMyLoading] = useState(true);

  const EMPTY_EMP_FORM: EmployeeFormData = {
    name: '', employee_code: '', job_position_id: '',
    basic_salary: 0, transport_allowance: 0, communication_allowance: 0,
    motorcycle_rental: 0, meal_allowance: 0, status: 'active', linked_user_profile_ids: [],
  };

  const [employeeForm, setEmployeeForm] = useState<EmployeeFormData>(EMPTY_EMP_FORM);
  const [paymentForm, setPaymentForm] = useState<PaymentFormData>({
    employee_id: '',
    payment_date: new Date().toISOString().split('T')[0],
    period_month: new Date().getMonth() + 1,
    period_year: new Date().getFullYear(),
    bonus: 0, notes: '',
  });

  useEffect(() => {
    if (!user) return;
    if (canManage) {
      loadData();
    } else {
      loadKaryawanData();
    }
  }, [user, canManage, myEmployeeId]);

  const loadData = async () => {
    setLoading(true);
    await Promise.all([loadJobPositions(), loadEmployees(), loadPayments(), loadLoans(), loadUserProfiles()]);
    setLoading(false);
  };

  const loadKaryawanData = async () => {
    setMyLoading(true);
    if (!myEmployeeId) { setMyLoading(false); return; }
    const [empRes, payRes, loanRes] = await Promise.all([
      supabase.from('employees').select('*, job_positions(name, base_salary)').eq('id', myEmployeeId).maybeSingle(),
      supabase.from('salary_payments').select('*').eq('employee_id', myEmployeeId).order('payment_date', { ascending: false }),
      supabase.from('employee_loans').select('*').eq('employee_id', myEmployeeId).eq('status', 'active'),
    ]);
    if (empRes.data) setMyEmployee(empRes.data as Employee);
    if (payRes.data) setMyPayments(payRes.data);
    if (loanRes.data) setMyLoans(loanRes.data);
    setMyLoading(false);
  };

  const loadJobPositions = async () => {
    const { data } = await supabase.from('job_positions').select('*').order('name');
    if (data) setJobPositions(data);
  };

  const loadEmployees = async () => {
    const { data } = await supabase.from('employees').select('*, job_positions(name, base_salary)').order('name');
    if (data) setEmployees(data);
  };

  const loadPayments = async () => {
    const { data } = await supabase
      .from('salary_payments').select('*, employee:employees(name, employee_code)')
      .order('payment_date', { ascending: false }).limit(50);
    if (data) setPayments(data);
  };

  const loadLoans = async () => {
    const { data } = await supabase.from('employee_loans').select('*').eq('status', 'active');
    if (data) {
      const byEmp = data.reduce((acc, l) => {
        acc[l.employee_id] = acc[l.employee_id] || [];
        acc[l.employee_id].push(l);
        return acc;
      }, {} as Record<string, EmployeeLoan[]>);
      setLoans(byEmp);
    }
  };

  const loadUserProfiles = async () => {
    const { data } = await supabase.from('user_profiles').select('id, full_name, email, role, employee_id').order('full_name');
    if (data) setUserProfiles(data);
  };

  const handleSaveEmployee = async () => {
    if (!user || !employeeForm.name || !employeeForm.employee_code) return;

    const employeeData = {
      name: employeeForm.name,
      employee_code: employeeForm.employee_code,
      job_position_id: employeeForm.job_position_id || null,
      basic_salary: employeeForm.basic_salary,
      transport_allowance: employeeForm.transport_allowance,
      communication_allowance: employeeForm.communication_allowance,
      motorcycle_rental: employeeForm.motorcycle_rental,
      meal_allowance: employeeForm.meal_allowance,
      status: employeeForm.status,
      user_id: user.id,
    };

    let savedEmployeeId = editingEmployee?.id;

    if (editingEmployee) {
      const { error } = await supabase.from('employees').update(employeeData).eq('id', editingEmployee.id);
      if (error) { alert('Error mengupdate karyawan: ' + error.message); return; }
    } else {
      const { data, error } = await supabase.from('employees').insert([employeeData]).select().single();
      if (error) { alert('Error membuat karyawan: ' + error.message); return; }
      savedEmployeeId = data.id;
    }

    if (savedEmployeeId) {
      await supabase.from('user_profiles').update({ employee_id: null }).eq('employee_id', savedEmployeeId);
      for (const profileId of employeeForm.linked_user_profile_ids) {
        await supabase.from('user_profiles').update({ employee_id: savedEmployeeId }).eq('id', profileId);
      }
    }

    resetEmployeeForm();
    await loadEmployees();
    await loadUserProfiles();
  };

  const handleDeleteEmployee = async (id: string) => {
    if (!confirm('Hapus data karyawan ini?')) return;
    const { error } = await supabase.from('employees').delete().eq('id', id);
    if (error) { alert('Error: ' + error.message); return; }
    await supabase.from('user_profiles').update({ employee_id: null }).eq('employee_id', id);
    loadEmployees();
    loadUserProfiles();
  };

  const handleSavePayment = async () => {
    if (!user || !paymentForm.employee_id) return;
    const employee = employees.find(e => e.id === paymentForm.employee_id);
    if (!employee) return;

    const totalSalary =
      employee.basic_salary + employee.transport_allowance +
      employee.communication_allowance + employee.motorcycle_rental +
      employee.meal_allowance + paymentForm.bonus;

    const { error } = await supabase.from('salary_payments').insert([{
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
    }]);

    if (error) { alert('Error bayar gaji: ' + error.message); return; }
    resetPaymentForm();
    loadPayments();
  };

  const resetEmployeeForm = () => {
    setEmployeeForm(EMPTY_EMP_FORM);
    setEditingEmployee(null);
    setShowEmployeeForm(false);
  };

  const resetPaymentForm = () => {
    setPaymentForm({
      employee_id: '',
      payment_date: new Date().toISOString().split('T')[0],
      period_month: new Date().getMonth() + 1,
      period_year: new Date().getFullYear(),
      bonus: 0, notes: '',
    });
    setShowPaymentForm(false);
  };

  const editEmployee = (employee: Employee) => {
    const linkedProfiles = userProfiles.filter(p => p.employee_id === employee.id);
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
      linked_user_profile_ids: linkedProfiles.map(p => p.id),
    });
    setEditingEmployee(employee);
    setShowEmployeeForm(true);
  };

  const totalAllowances = (emp: Employee) =>
    emp.transport_allowance + emp.communication_allowance + emp.motorcycle_rental + emp.meal_allowance;

  const totalGross = (emp: Employee) => emp.basic_salary + totalAllowances(emp);

  const calculateNet = (empId: string, empGross: number) => {
    const empLoans = loans[empId] || [];
    const loanDeduction = empLoans.reduce((s, l) => s + l.monthly_deduction, 0);
    return empGross - loanDeduction;
  };

  const paymentAllowance = (p: SalaryPayment) =>
    p.transport_allowance + p.communication_allowance + p.motorcycle_rental + p.meal_allowance;

  const paymentLoanDeduction = (empId: string) =>
    (loans[empId] || []).reduce((s, l) => s + l.monthly_deduction, 0);

  if (!canManage) {
    if (myLoading) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
        </div>
      );
    }

    if (!myEmployeeId || !myEmployee) {
      return (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 rounded-lg"><DollarSign className="w-6 h-6 text-blue-600" /></div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Gaji Saya</h2>
              <p className="text-sm text-gray-500">Informasi penggajian Anda</p>
            </div>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 flex items-start gap-4">
            <AlertCircle className="w-6 h-6 text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-amber-800">Akun belum terhubung ke data karyawan</p>
              <p className="text-sm text-amber-600 mt-1">
                Minta admin untuk menambahkan data karyawan Anda di menu <strong>Gaji Karyawan → Tambah Karyawan</strong>, lalu hubungkan ke akun ini melalui dropdown <em>"Hubungkan ke Akun User"</em>.
              </p>
            </div>
          </div>
        </div>
      );
    }

    const myLoanTotal = myLoans.reduce((s, l) => s + l.monthly_deduction, 0);
    const myGross = totalGross(myEmployee);
    const myNet = myGross - myLoanTotal;

    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-100 rounded-lg"><DollarSign className="w-6 h-6 text-blue-600" /></div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Gaji Saya</h2>
            <p className="text-sm text-gray-500">Informasi penggajian Anda</p>
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl p-6 text-white">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-14 h-14 bg-white bg-opacity-20 rounded-full flex items-center justify-center text-xl font-bold">
              {myEmployee.name.charAt(0)}
            </div>
            <div>
              <h3 className="text-xl font-bold">{myEmployee.name}</h3>
              <p className="text-blue-100 text-sm">{myEmployee.employee_code} · {myEmployee.job_positions?.name || '—'}</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mt-4">
            <div className="bg-white bg-opacity-10 rounded-lg p-3 text-center">
              <p className="text-blue-100 text-xs mb-1">Gaji Kotor</p>
              <p className="font-bold text-sm">{formatCurrency(myGross)}</p>
            </div>
            <div className="bg-white bg-opacity-10 rounded-lg p-3 text-center">
              <p className="text-blue-100 text-xs mb-1">Potongan Pinjaman</p>
              <p className="font-bold text-sm text-rose-200">{formatCurrency(myLoanTotal)}</p>
            </div>
            <div className="bg-white bg-opacity-20 rounded-lg p-3 text-center border border-white border-opacity-30">
              <p className="text-blue-100 text-xs mb-1">Estimasi Gaji Bersih</p>
              <p className="font-bold text-sm">{formatCurrency(myNet)}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="bg-gray-50 px-5 py-3 border-b border-gray-200">
              <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Komponen Gaji</h4>
            </div>
            <div className="p-5 space-y-3">
              {[
                { label: 'Gaji Pokok', val: myEmployee.basic_salary },
                { label: 'Tunjangan Transport', val: myEmployee.transport_allowance },
                { label: 'Tunjangan Komunikasi', val: myEmployee.communication_allowance },
                { label: 'Sewa Motor', val: myEmployee.motorcycle_rental },
                { label: 'Konsumsi', val: myEmployee.meal_allowance },
              ].map(({ label, val }) => (
                <div key={label} className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">{label}</span>
                  <span className="font-medium text-gray-900 font-mono">{formatCurrency(val)}</span>
                </div>
              ))}
              <div className="pt-3 border-t border-gray-200 flex justify-between items-center">
                <span className="font-semibold text-gray-800">Total Bruto</span>
                <span className="font-bold text-blue-600 font-mono">{formatCurrency(myGross)}</span>
              </div>
              {myLoans.length > 0 && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-rose-600 flex items-center gap-1"><TrendingDown className="w-3.5 h-3.5" /> Cicilan Pinjaman</span>
                  <span className="font-medium text-rose-600 font-mono">-{formatCurrency(myLoanTotal)}</span>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="bg-gray-50 px-5 py-3 border-b border-gray-200">
              <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Pinjaman Aktif</h4>
            </div>
            <div className="p-5">
              {myLoans.length === 0 ? (
                <div className="flex flex-col items-center py-4 text-gray-400">
                  <CheckCircle className="w-10 h-10 mb-2 text-emerald-400" />
                  <p className="text-sm">Tidak ada pinjaman aktif</p>
                </div>
              ) : myLoans.map(loan => {
                const progress = ((loan.amount - loan.remaining_amount) / loan.amount) * 100;
                return (
                  <div key={loan.id} className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Sisa Pinjaman</span>
                      <span className="font-mono font-medium text-rose-600">{formatCurrency(loan.remaining_amount)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Cicilan/Bulan</span>
                      <span className="font-mono font-medium">{formatCurrency(loan.monthly_deduction)}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                      <div className="bg-emerald-500 h-2 rounded-full" style={{ width: `${progress}%` }} />
                    </div>
                    <p className="text-xs text-gray-400 text-right">Lunas {progress.toFixed(0)}%</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="bg-gray-50 px-5 py-3 border-b border-gray-200">
            <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Riwayat Slip Gaji</h4>
          </div>
          {myPayments.length === 0 ? (
            <div className="text-center py-10 text-gray-400">
              <DollarSign className="w-12 h-12 mx-auto mb-3 text-gray-200" />
              <p>Belum ada riwayat pembayaran gaji</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {myPayments.map(payment => (
                <div key={payment.id} className="flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors">
                  <div>
                    <p className="font-medium text-gray-900">
                      {MONTHS[payment.period_month - 1]} {payment.period_year}
                    </p>
                    <p className="text-xs text-gray-400">{formatDate(payment.payment_date, 'short')}</p>
                    {payment.bonus > 0 && (
                      <p className="text-xs text-blue-500 mt-0.5">Bonus: {formatCurrency(payment.bonus)}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="font-bold text-emerald-600 font-mono">{formatCurrency(payment.total_salary)}</p>
                      <p className="text-xs text-gray-400">Total</p>
                    </div>
                    <button
                      onClick={() => { setSelectedPayment(payment); setShowSalarySlip(true); }}
                      className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700"
                    >
                      <Eye className="w-3.5 h-3.5" /> Slip
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {showSalarySlip && selectedPayment && (
          <SalarySlip
            employee={{ name: myEmployee.name, employee_code: myEmployee.employee_code, job_position: myEmployee.job_positions?.name }}
            payment={{
              base_salary: selectedPayment.basic_salary,
              allowance: paymentAllowance(selectedPayment),
              bonus: selectedPayment.bonus,
              attendance_days: 22,
              overtime_hours: 0,
              deduction: myLoanTotal,
              payment_date: selectedPayment.payment_date,
            }}
            onClose={() => { setShowSalarySlip(false); setSelectedPayment(null); }}
          />
        )}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  const availableProfiles = (currentEmpId?: string) =>
    userProfiles.filter(p => !p.employee_id || p.employee_id === currentEmpId);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Gaji Karyawan</h1>
        <div className="flex gap-2 sm:gap-3 w-full sm:w-auto">
          <button
            onClick={() => setShowEmployeeForm(true)}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
          >
            <Plus className="w-4 h-4" /> <span className="hidden sm:inline">Tambah</span> Karyawan
          </button>
          <button
            onClick={() => setShowPaymentForm(true)}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
          >
            <DollarSign className="w-4 h-4" /> Bayar Gaji
          </button>
        </div>
      </div>

      <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Data Karyawan</h2>
          </div>
          <div className="p-4 space-y-3">
            {employees.filter(e => e.status === 'active').map(employee => {
              const linkedProfiles = userProfiles.filter(p => p.employee_id === employee.id);
              const empLoans = loans[employee.id] || [];
              const gross = totalGross(employee);
              const net = calculateNet(employee.id, gross);

              return (
                <div key={employee.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <User className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{employee.name}</p>
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <span>{employee.employee_code}</span>
                          <span>·</span>
                          <span className="flex items-center gap-1">
                            <Briefcase className="w-3 h-3" />
                            {employee.job_positions?.name || '—'}
                          </span>
                        </div>
                        {linkedProfiles.length > 0 && (
                          <div className="flex flex-wrap items-center gap-1 mt-1">
                            {linkedProfiles.map(lp => (
                              <span key={lp.id} className="flex items-center gap-1 text-xs text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                                <Link className="w-3 h-3" />
                                {lp.full_name || lp.email}
                                {lp.role === 'karyawan_sariroti' && (
                                  <span className="ml-0.5 px-1 bg-orange-100 text-orange-600 rounded font-medium">SR</span>
                                )}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="mt-2 ml-13 text-sm pl-13">
                      <p className="font-semibold text-gray-700">{formatCurrency(gross)}</p>
                      {empLoans.length > 0 && (
                        <div className="mt-1 text-xs space-y-0.5">
                          <p className="text-orange-600">Pinjaman: -{formatCurrency(empLoans.reduce((s, l) => s + l.monthly_deduction, 0))}</p>
                          <p className="text-green-600 font-semibold">Est. Gaji Bersih: {formatCurrency(net)}</p>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => editEmployee(employee)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDeleteEmployee(employee.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
            {employees.filter(e => e.status === 'active').length === 0 && (
              <p className="text-center text-gray-500 py-8">Belum ada data karyawan aktif</p>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Riwayat Pembayaran</h2>
          </div>
          <div className="p-4">
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {payments.map(payment => (
                <div key={payment.id} className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors group">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900">{payment.employee?.name}</p>
                      <p className="text-sm text-gray-600">{payment.employee?.employee_code}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-emerald-600 font-mono">{formatCurrency(payment.total_salary)}</p>
                      <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                        <Calendar className="w-3 h-3" />
                        {MONTHS[payment.period_month - 1]} {payment.period_year}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      {payment.bonus > 0 && <p className="text-xs text-blue-600">Bonus: {formatCurrency(payment.bonus)}</p>}
                      {payment.notes && <p className="text-xs text-gray-500 mt-1">{payment.notes}</p>}
                    </div>
                    <button
                      onClick={() => { setSelectedPayment(payment); setShowSalarySlip(true); }}
                      className="sm:opacity-0 sm:group-hover:opacity-100 transition-opacity flex items-center gap-1 px-3 py-1 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700"
                    >
                      <Eye className="w-3 h-3" /> Lihat Slip
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
            <div className="p-6 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-white z-10">
              <h2 className="text-xl font-semibold text-gray-900">
                {editingEmployee ? 'Edit Karyawan' : 'Tambah Karyawan'}
              </h2>
              <button onClick={resetEmployeeForm} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nama Karyawan *</label>
                  <input type="text" value={employeeForm.name}
                    onChange={e => setEmployeeForm({ ...employeeForm, name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Nama lengkap" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Kode Karyawan *</label>
                  <input type="text" value={employeeForm.employee_code}
                    onChange={e => setEmployeeForm({ ...employeeForm, employee_code: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="KRY001" />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Jabatan</label>
                  <select value={employeeForm.job_position_id}
                    onChange={e => {
                      const pos = jobPositions.find(p => p.id === e.target.value);
                      setEmployeeForm({ ...employeeForm, job_position_id: e.target.value, basic_salary: pos?.base_salary || 0 });
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                    <option value="">Pilih Jabatan</option>
                    {jobPositions.map(pos => (
                      <option key={pos.id} value={pos.id}>{pos.name} (Rp {pos.base_salary.toLocaleString('id-ID')})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select value={employeeForm.status}
                    onChange={e => setEmployeeForm({ ...employeeForm, status: e.target.value as 'active' | 'inactive' })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                    <option value="active">Aktif</option>
                    <option value="inactive">Tidak Aktif</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Gaji Pokok</label>
                <input type="number" value={employeeForm.basic_salary}
                  onChange={e => setEmployeeForm({ ...employeeForm, basic_salary: Number(e.target.value) })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="0" />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tunjangan Transport</label>
                  <input type="number" value={employeeForm.transport_allowance}
                    onChange={e => setEmployeeForm({ ...employeeForm, transport_allowance: Number(e.target.value) })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="0" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tunjangan Komunikasi</label>
                  <input type="number" value={employeeForm.communication_allowance}
                    onChange={e => setEmployeeForm({ ...employeeForm, communication_allowance: Number(e.target.value) })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="0" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Sewa Motor</label>
                  <input type="number" value={employeeForm.motorcycle_rental}
                    onChange={e => setEmployeeForm({ ...employeeForm, motorcycle_rental: Number(e.target.value) })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="0" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Konsumsi</label>
                  <input type="number" value={employeeForm.meal_allowance}
                    onChange={e => setEmployeeForm({ ...employeeForm, meal_allowance: Number(e.target.value) })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="0" />
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <label className="block text-sm font-medium text-blue-800 mb-2 flex items-center gap-2">
                  <Link className="w-4 h-4" /> Hubungkan ke Akun User (Opsional)
                  {employeeForm.linked_user_profile_ids.length > 0 && (
                    <span className="ml-auto text-xs bg-blue-600 text-white px-2 py-0.5 rounded-full">
                      {employeeForm.linked_user_profile_ids.length} dipilih
                    </span>
                  )}
                </label>
                <div className="max-h-40 overflow-y-auto border border-blue-200 rounded-lg bg-white divide-y divide-gray-100">
                  {availableProfiles(editingEmployee?.id).length === 0 ? (
                    <p className="text-xs text-gray-400 p-3 text-center">Tidak ada akun yang tersedia</p>
                  ) : (
                    availableProfiles(editingEmployee?.id).map(p => {
                      const checked = employeeForm.linked_user_profile_ids.includes(p.id);
                      const roleLabel = p.role === 'karyawan_sariroti' ? 'Karyawan Sari Roti' : p.role === 'karyawan' ? 'Karyawan' : p.role;
                      const toggleProfile = () => {
                        const ids = employeeForm.linked_user_profile_ids;
                        setEmployeeForm(f => ({
                          ...f,
                          linked_user_profile_ids: checked
                            ? ids.filter(id => id !== p.id)
                            : [...ids, p.id],
                        }));
                      };
                      return (
                        <label key={p.id} className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-blue-50 transition-colors ${checked ? 'bg-blue-50' : ''}`}>
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={toggleProfile}
                            className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-800 truncate">{p.full_name || p.email}</p>
                            <p className="text-xs text-gray-500 truncate">{p.email}</p>
                          </div>
                          <span className={`text-xs px-1.5 py-0.5 rounded font-medium flex-shrink-0 ${
                            p.role === 'karyawan_sariroti' ? 'bg-orange-100 text-orange-600' : 'bg-gray-100 text-gray-600'
                          }`}>
                            {roleLabel}
                          </span>
                        </label>
                      );
                    })
                  )}
                </div>
                <p className="text-xs text-blue-600 mt-1.5">Pilih satu atau lebih akun agar dapat melihat gaji &amp; pinjaman sendiri</p>
              </div>

              <div className="pt-4 border-t border-gray-200 flex justify-between items-center">
                <p className="text-sm text-gray-600">Total Gaji:</p>
                <p className="text-lg font-bold text-gray-900">
                  {formatCurrency(
                    employeeForm.basic_salary + employeeForm.transport_allowance +
                    employeeForm.communication_allowance + employeeForm.motorcycle_rental +
                    employeeForm.meal_allowance
                  )}
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <button onClick={resetEmployeeForm}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">
                  Batal
                </button>
                <button onClick={handleSaveEmployee}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
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
              <button onClick={resetPaymentForm} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Karyawan *</label>
                <select value={paymentForm.employee_id}
                  onChange={e => setPaymentForm({ ...paymentForm, employee_id: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                  <option value="">Pilih Karyawan</option>
                  {employees.filter(e => e.status === 'active').map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.name} - {emp.employee_code}</option>
                  ))}
                </select>
              </div>

              {paymentForm.employee_id && (() => {
                const emp = employees.find(e => e.id === paymentForm.employee_id);
                if (!emp) return null;
                return (
                  <div className="p-4 bg-blue-50 rounded-lg text-sm space-y-2">
                    {[
                      ['Gaji Pokok', emp.basic_salary],
                      ['Transport', emp.transport_allowance],
                      ['Komunikasi', emp.communication_allowance],
                      ['Sewa Motor', emp.motorcycle_rental],
                      ['Konsumsi', emp.meal_allowance],
                    ].map(([l, v]) => (
                      <div key={l as string} className="flex justify-between">
                        <span className="text-gray-600">{l}</span>
                        <span className="font-semibold">{formatCurrency(v as number)}</span>
                      </div>
                    ))}
                  </div>
                );
              })()}

              <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Bulan</label>
                  <select value={paymentForm.period_month}
                    onChange={e => setPaymentForm({ ...paymentForm, period_month: Number(e.target.value) })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                    {MONTHS.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tahun</label>
                  <input type="number" value={paymentForm.period_year}
                    onChange={e => setPaymentForm({ ...paymentForm, period_year: Number(e.target.value) })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Pembayaran</label>
                <input type="date" value={paymentForm.payment_date}
                  onChange={e => setPaymentForm({ ...paymentForm, payment_date: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bonus / Insentif</label>
                <input type="number" value={paymentForm.bonus}
                  onChange={e => setPaymentForm({ ...paymentForm, bonus: Number(e.target.value) })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="0" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Catatan</label>
                <textarea value={paymentForm.notes}
                  onChange={e => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" rows={3}
                  placeholder="Catatan pembayaran (opsional)" />
              </div>

              {paymentForm.employee_id && (() => {
                const emp = employees.find(e => e.id === paymentForm.employee_id);
                if (!emp) return null;
                const total = totalGross(emp) + paymentForm.bonus;
                return (
                  <div className="pt-4 border-t border-gray-200 flex justify-between items-center">
                    <p className="text-sm text-gray-600">Total Yang Dibayarkan:</p>
                    <p className="text-xl font-bold text-green-600">{formatCurrency(total)}</p>
                  </div>
                );
              })()}

              <div className="flex gap-3 pt-4">
                <button onClick={resetPaymentForm}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">
                  Batal
                </button>
                <button onClick={handleSavePayment}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                  Bayar Gaji
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showSalarySlip && selectedPayment && (() => {
        const emp = employees.find(e => e.id === selectedPayment.employee_id);
        return (
          <SalarySlip
            employee={{
              name: selectedPayment.employee?.name || emp?.name || '',
              employee_code: selectedPayment.employee?.employee_code || emp?.employee_code || '',
              job_position: emp?.job_positions?.name,
            }}
            payment={{
              base_salary: selectedPayment.basic_salary,
              allowance: paymentAllowance(selectedPayment),
              bonus: selectedPayment.bonus,
              attendance_days: 22,
              overtime_hours: 0,
              deduction: paymentLoanDeduction(selectedPayment.employee_id),
              payment_date: selectedPayment.payment_date,
            }}
            onClose={() => { setShowSalarySlip(false); setSelectedPayment(null); }}
          />
        );
      })()}
    </div>
  );
}
