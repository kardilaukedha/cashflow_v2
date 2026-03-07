import { useState } from 'react';
import { Eye, EyeOff, Download, X } from 'lucide-react';
import { formatCurrency, formatDate, calculateBPJS, calculatePPh21 } from '../lib/utils';

interface SalarySlipProps {
  employee: {
    name: string;
    employee_code: string;
    job_position?: string;
  };
  payment: {
    base_salary: number;
    allowance: number;
    bonus: number;
    attendance_days: number;
    overtime_hours: number;
    deduction: number;
    payment_date: string;
  };
  onClose: () => void;
}

export default function SalarySlip({ employee, payment, onClose }: SalarySlipProps) {
  const [isVisible, setIsVisible] = useState(false);

  const dailyRate = payment.base_salary / 22;
  const overtimeRate = (payment.base_salary / 173) * 1.5;
  const attendanceIncome = dailyRate * payment.attendance_days;
  const overtimeIncome = overtimeRate * payment.overtime_hours;

  const grossIncome = payment.base_salary + payment.allowance + payment.bonus + overtimeIncome;

  const bpjs = calculateBPJS(payment.base_salary);
  const pph21 = calculatePPh21(grossIncome);

  const totalDeductions = bpjs.kesehatan + bpjs.jht + bpjs.jp + pph21 + payment.deduction;
  const takeHomePay = grossIncome - totalDeductions;

  const DeductionRow = ({ label, amount }: { label: string; amount: number }) => (
    <div className="flex justify-between items-center py-2 text-sm">
      <span className="text-gray-600 dark:text-gray-400">{label}</span>
      <span className="text-rose-600 dark:text-rose-400 font-medium font-mono">-{formatCurrency(amount)}</span>
    </div>
  );

  const IncomeRow = ({ label, amount, detail }: { label: string; amount: number; detail?: string }) => (
    <div className="flex justify-between items-center py-2 text-sm">
      <div>
        <span className="text-gray-600 dark:text-gray-400">{label}</span>
        {detail && <p className="text-xs text-gray-400 dark:text-gray-500">{detail}</p>}
      </div>
      <span className="text-emerald-600 dark:text-emerald-400 font-medium font-mono">+{formatCurrency(amount)}</span>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-auto">
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Slip Gaji</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">{formatDate(payment.payment_date, 'long')}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsVisible(!isVisible)}
              className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              title={isVisible ? 'Sembunyikan' : 'Tampilkan'}
            >
              {isVisible ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
            <button
              className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              title="Download"
            >
              <Download className="w-5 h-5" />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-4 border border-slate-200 dark:border-slate-600">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-600 dark:text-gray-400">Nama Karyawan</p>
                <p className="font-semibold text-gray-900 dark:text-white">{employee.name}</p>
              </div>
              <div>
                <p className="text-gray-600 dark:text-gray-400">Kode Karyawan</p>
                <p className="font-semibold text-gray-900 dark:text-white">{employee.employee_code}</p>
              </div>
              {employee.job_position && (
                <div className="col-span-2">
                  <p className="text-gray-600 dark:text-gray-400">Jabatan</p>
                  <p className="font-semibold text-gray-900 dark:text-white">{employee.job_position}</p>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-gradient-to-r from-emerald-50 to-emerald-100 dark:from-emerald-900/30 dark:to-emerald-800/30 rounded-lg p-4 border border-emerald-200 dark:border-emerald-700">
              <h3 className="font-semibold text-emerald-900 dark:text-emerald-300 mb-3 flex items-center justify-between">
                <span>Pendapatan</span>
                <span className="text-xs font-normal text-emerald-700 dark:text-emerald-400">Total Bruto</span>
              </h3>
              <div className="space-y-1">
                <IncomeRow label="Gaji Pokok" amount={payment.base_salary} />
                <IncomeRow label="Tunjangan Tetap" amount={payment.allowance} />
                {payment.attendance_days > 0 && (
                  <IncomeRow
                    label="Tunjangan Kehadiran"
                    amount={attendanceIncome}
                    detail={`${payment.attendance_days} hari × ${formatCurrency(dailyRate)}`}
                  />
                )}
                {payment.overtime_hours > 0 && (
                  <IncomeRow
                    label="Lembur"
                    amount={overtimeIncome}
                    detail={`${payment.overtime_hours} jam × ${formatCurrency(overtimeRate)}`}
                  />
                )}
                {payment.bonus > 0 && <IncomeRow label="Bonus" amount={payment.bonus} />}
              </div>
              <div className="mt-3 pt-3 border-t border-emerald-300 dark:border-emerald-600">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-emerald-900 dark:text-emerald-300">Total Pendapatan</span>
                  <span className="text-lg font-bold text-emerald-900 dark:text-emerald-300 font-mono">
                    {isVisible ? formatCurrency(grossIncome) : 'Rp ********'}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-rose-50 to-rose-100 dark:from-rose-900/30 dark:to-rose-800/30 rounded-lg p-4 border border-rose-200 dark:border-rose-700">
              <h3 className="font-semibold text-rose-900 dark:text-rose-300 mb-3 flex items-center justify-between">
                <span>Potongan</span>
                <span className="text-xs font-normal text-rose-700 dark:text-rose-400">Total Deductions</span>
              </h3>
              <div className="space-y-1">
                <DeductionRow label="BPJS Kesehatan (1%)" amount={bpjs.kesehatan} />
                <DeductionRow label="BPJS JHT (2%)" amount={bpjs.jht} />
                <DeductionRow label="BPJS JP (1%)" amount={bpjs.jp} />
                <DeductionRow label="PPh 21 (Estimasi)" amount={pph21} />
                {payment.deduction > 0 && <DeductionRow label="Kasbon/Pinjaman" amount={payment.deduction} />}
              </div>
              <div className="mt-3 pt-3 border-t border-rose-300 dark:border-rose-600">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-rose-900 dark:text-rose-300">Total Potongan</span>
                  <span className="text-lg font-bold text-rose-900 dark:text-rose-300 font-mono">
                    {isVisible ? formatCurrency(totalDeductions) : 'Rp ********'}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg p-6 border-2 border-blue-800 shadow-lg">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-blue-100 text-sm mb-1">Take Home Pay (THP)</p>
                  <p className="text-3xl font-bold text-white font-mono">
                    {isVisible ? formatCurrency(takeHomePay) : 'Rp ********'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-blue-100 text-xs">Gaji Bersih</p>
                  <p className="text-blue-100 text-xs">Periode {formatDate(payment.payment_date, 'short')}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 rounded-lg p-4">
            <p className="text-xs text-amber-800 dark:text-amber-300">
              <strong>Catatan:</strong> Slip gaji ini adalah dokumen resmi. Perhitungan BPJS dan PPh 21 adalah estimasi.
              Untuk informasi lebih detail, hubungi bagian HRD/Keuangan.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
