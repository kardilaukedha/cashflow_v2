import type { TransactionWithCategory, Category, Transaction } from '../lib/supabase';
import { Edit2, Trash2, TrendingUp, TrendingDown } from 'lucide-react';
import * as Icons from 'lucide-react';
import { formatCurrency, formatDate } from '../lib/utils';

interface TransactionListProps {
  transactions: TransactionWithCategory[];
  categories: Category[];
  onEdit: (transaction: Transaction) => void;
  onDelete: (id: string) => void;
}

export default function TransactionList({ transactions, onEdit, onDelete }: TransactionListProps) {

  const groupedTransactions = transactions.reduce((groups, transaction) => {
    const date = transaction.date;
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(transaction);
    return groups;
  }, {} as Record<string, TransactionWithCategory[]>);

  const sortedDates = Object.keys(groupedTransactions).sort((a, b) => b.localeCompare(a));

  if (transactions.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
        <p className="text-gray-500">Tidak ada transaksi yang sesuai dengan filter</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">Daftar Transaksi</h3>
        <p className="text-sm text-gray-600 mt-1">{transactions.length} transaksi</p>
      </div>

      <div className="divide-y divide-gray-200">
        {sortedDates.map(date => (
          <div key={date} className="p-6">
            <h4 className="text-sm font-semibold text-gray-700 mb-3">{formatDate(date)}</h4>
            <div className="space-y-2">
              {groupedTransactions[date].map(transaction => {
                const IconComponent = (Icons as any)[transaction.category.icon] || Icons.Circle;
                return (
                  <div
                    key={transaction.id}
                    className="flex items-center gap-4 p-3 rounded-lg hover:bg-gray-50 transition-colors group"
                  >
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: transaction.category.color + '20' }}
                    >
                      <IconComponent
                        className="w-5 h-5"
                        style={{ color: transaction.category.color }}
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">{transaction.description}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span
                          className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded"
                          style={{
                            backgroundColor: transaction.category.color + '20',
                            color: transaction.category.color,
                          }}
                        >
                          {transaction.category.name}
                        </span>
                        {transaction.type === 'income' ? (
                          <TrendingUp className="w-3 h-3 text-emerald-600" />
                        ) : (
                          <TrendingDown className="w-3 h-3 text-red-600" />
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <p
                        className={`text-lg font-semibold font-mono ${
                          transaction.type === 'income' ? 'text-emerald-600' : 'text-red-600'
                        }`}
                      >
                        {transaction.type === 'income' ? '+' : '-'}{formatCurrency(Number(transaction.amount))}
                      </p>

                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => onEdit(transaction)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onDelete(transaction.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Hapus"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
