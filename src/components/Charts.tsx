import { useState } from 'react';
import type { TransactionWithCategory, Category } from '../lib/supabase';
import { LineChart, Line, PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { TrendingUp } from 'lucide-react';

interface ChartsProps {
  transactions: TransactionWithCategory[];
  categories: Category[];
}

export default function Charts({ transactions, categories }: ChartsProps) {
  const [showForecast, setShowForecast] = useState(false);
  const expensesByCategory = categories
    .filter(c => c.type === 'expense')
    .map(category => {
      const total = transactions
        .filter(t => t.category_id === category.id && t.type === 'expense')
        .reduce((sum, t) => sum + Number(t.amount), 0);
      return {
        name: category.name,
        value: total,
        color: category.color,
      };
    })
    .filter(item => item.value > 0);

  const incomeByCategory = categories
    .filter(c => c.type === 'income')
    .map(category => {
      const total = transactions
        .filter(t => t.category_id === category.id && t.type === 'income')
        .reduce((sum, t) => sum + Number(t.amount), 0);
      return {
        name: category.name,
        value: total,
        color: category.color,
      };
    })
    .filter(item => item.value > 0);

  const monthlyData = (() => {
    const months: { [key: string]: { month: string; income: number; expense: number; cashflow: number } } = {};

    transactions.forEach(t => {
      const date = new Date(t.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const monthName = date.toLocaleDateString('id-ID', { month: 'short', year: 'numeric' });

      if (!months[monthKey]) {
        months[monthKey] = { month: monthName, income: 0, expense: 0, cashflow: 0 };
      }

      if (t.type === 'income') {
        months[monthKey].income += Number(t.amount);
      } else {
        months[monthKey].expense += Number(t.amount);
      }
    });

    const result = Object.values(months).sort((a, b) => a.month.localeCompare(b.month)).slice(-6);

    result.forEach(m => {
      m.cashflow = m.income - m.expense;
    });

    return result;
  })();

  const forecastData = (() => {
    if (!showForecast || monthlyData.length === 0) return [];

    const avgIncome = monthlyData.reduce((sum, m) => sum + m.income, 0) / monthlyData.length;
    const avgExpense = monthlyData.reduce((sum, m) => sum + m.expense, 0) / monthlyData.length;

    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const monthName = nextMonth.toLocaleDateString('id-ID', { month: 'short', year: 'numeric' });

    return [{
      month: monthName,
      income: avgIncome,
      expense: avgExpense,
      cashflow: avgIncome - avgExpense,
      isForecast: true
    }];
  })();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatShortCurrency = (value: number) => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}Jt`;
    }
    if (value >= 1000) {
      return `${(value / 1000).toFixed(0)}Rb`;
    }
    return value.toString();
  };

  if (transactions.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 mb-6 text-center">
        <p className="text-gray-500">Belum ada data untuk ditampilkan. Tambahkan transaksi pertama Anda!</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 mb-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {expensesByCategory.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-6">
            <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-3 md:mb-4">Pengeluaran per Kategori</h3>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={expensesByCategory}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {expensesByCategory.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatCurrency(Number(value))} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {incomeByCategory.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-6">
            <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-3 md:mb-4">Pemasukan per Kategori</h3>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={incomeByCategory}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {incomeByCategory.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatCurrency(Number(value))} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {monthlyData.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3 md:mb-4">
            <h3 className="text-base md:text-lg font-semibold text-gray-900">Tren Arus Kas (6 Bulan Terakhir)</h3>
            <button
              onClick={() => setShowForecast(!showForecast)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs md:text-sm font-medium transition-colors self-start ${
                showForecast
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <TrendingUp className="w-4 h-4" />
              {showForecast ? 'Sembunyikan' : 'Tampilkan'} Forecast
            </button>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={[...monthlyData, ...forecastData]}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" style={{ fontSize: '12px' }} />
              <YAxis tickFormatter={formatShortCurrency} style={{ fontSize: '12px' }} />
              <Tooltip formatter={(value) => formatCurrency(Number(value))} />
              <Legend />
              <Line
                type="monotone"
                dataKey="income"
                name="Pemasukan"
                stroke="#10b981"
                strokeWidth={2}
                dot={{ fill: '#10b981' }}
              />
              <Line
                type="monotone"
                dataKey="expense"
                name="Pengeluaran"
                stroke="#ef4444"
                strokeWidth={2}
                dot={{ fill: '#ef4444' }}
              />
              <Line
                type="monotone"
                dataKey="cashflow"
                name="Cashflow"
                stroke="#3b82f6"
                strokeWidth={2}
                strokeDasharray={showForecast && forecastData.length > 0 ? undefined : undefined}
                dot={{ fill: '#3b82f6' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
