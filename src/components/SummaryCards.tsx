import type { TransactionWithCategory } from '../lib/supabase';
import { TrendingUp, TrendingDown, Wallet, Clock } from 'lucide-react';
import { formatCurrency, calculateRunway, getRunwayColor } from '../lib/utils';

interface SummaryCardsProps {
  transactions: TransactionWithCategory[];
}

export default function SummaryCards({ transactions }: SummaryCardsProps) {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const thisMonthTransactions = transactions.filter(t => {
    const tDate = new Date(t.date);
    return tDate.getMonth() === currentMonth && tDate.getFullYear() === currentYear;
  });

  const totalIncome = transactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const totalExpense = transactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const monthlyIncome = thisMonthTransactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const monthlyExpense = thisMonthTransactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const balance = totalIncome - totalExpense;

  const last30DaysExpense = transactions
    .filter(t => {
      const tDate = new Date(t.date);
      const diffDays = Math.floor((now.getTime() - tDate.getTime()) / (1000 * 60 * 60 * 24));
      return t.type === 'expense' && diffDays <= 30;
    })
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const avgDailyExpense = last30DaysExpense / 30;
  const runwayDays = calculateRunway(balance, avgDailyExpense);
  const runwayColor = getRunwayColor(runwayDays);

  return (
    <div className="space-y-4 mb-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4">
        <div className="bg-white rounded-xl p-3 md:p-6 border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-1 md:mb-2">
            <span className="text-xs md:text-sm font-medium text-gray-600">Saldo Kas</span>
            <Wallet className="w-4 h-4 md:w-5 md:h-5 text-slate-500" />
          </div>
          <p className="text-lg md:text-3xl font-bold text-slate-900 font-mono truncate">{formatCurrency(balance)}</p>
          <p className={`text-xs md:text-sm mt-1 ${balance >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
            {balance >= 0 ? 'Surplus' : 'Defisit'}
          </p>
        </div>

        <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl p-3 md:p-6 border border-emerald-200">
          <div className="flex items-center justify-between mb-1 md:mb-2">
            <span className="text-xs md:text-sm font-medium text-emerald-700">Pemasukan Bulan Ini</span>
            <TrendingUp className="w-4 h-4 md:w-5 md:h-5 text-emerald-600" />
          </div>
          <p className="text-lg md:text-2xl font-bold text-emerald-900 font-mono truncate">{formatCurrency(monthlyIncome)}</p>
          <p className="text-xs md:text-sm text-emerald-600 mt-1">
            {thisMonthTransactions.filter(t => t.type === 'income').length} transaksi
          </p>
        </div>

        <div className="bg-gradient-to-br from-rose-50 to-rose-100 rounded-xl p-3 md:p-6 border border-rose-200">
          <div className="flex items-center justify-between mb-1 md:mb-2">
            <span className="text-xs md:text-sm font-medium text-rose-700">Pengeluaran Bulan Ini</span>
            <TrendingDown className="w-4 h-4 md:w-5 md:h-5 text-rose-600" />
          </div>
          <p className="text-lg md:text-2xl font-bold text-rose-900 font-mono truncate">{formatCurrency(monthlyExpense)}</p>
          <p className="text-xs md:text-sm text-rose-600 mt-1">
            {thisMonthTransactions.filter(t => t.type === 'expense').length} transaksi
          </p>
        </div>

        <div className={`bg-gradient-to-br rounded-xl p-3 md:p-6 border ${runwayColor}`}>
          <div className="flex items-center justify-between mb-1 md:mb-2">
            <span className="text-xs md:text-sm font-medium">Runway</span>
            <Clock className="w-4 h-4 md:w-5 md:h-5" />
          </div>
          <p className="text-lg md:text-2xl font-bold font-mono">
            {runwayDays === Infinity ? '∞' : runwayDays} hari
          </p>
          <p className="text-xs md:text-sm mt-1">
            {runwayDays < 30 ? '⚠️ Kritis!' : runwayDays < 90 ? '⚡ Perlu Perhatian' : '✓ Aman'}
          </p>
        </div>
      </div>
    </div>
  );
}
