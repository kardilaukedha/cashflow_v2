import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { Category } from '../lib/supabase';
import { X, Upload, Download, FileSpreadsheet, AlertCircle, CheckCircle } from 'lucide-react';

interface ImportExportProps {
  categories: Category[];
  onClose: () => void;
  onImported: () => void;
}

interface ParsedRow {
  date: string;
  description: string;
  amount: number;
  category: string;
  type: 'income' | 'expense';
}

export default function ImportExport({ categories, onClose, onImported }: ImportExportProps) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'import' | 'export'>('import');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [parsedData, setParsedData] = useState<ParsedRow[]>([]);
  const [showPreview, setShowPreview] = useState(false);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError('');
    setSuccess('');

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const lines = text.split('\n').filter(line => line.trim());

        if (lines.length < 2) {
          setError('File CSV kosong atau tidak valid');
          return;
        }

        const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
        const rows: ParsedRow[] = [];

        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(',').map(v => v.trim());

          const dateIdx = headers.findIndex(h => h.includes('tanggal') || h.includes('date'));
          const descIdx = headers.findIndex(h => h.includes('deskripsi') || h.includes('description') || h.includes('keterangan'));
          const amountIdx = headers.findIndex(h => h.includes('jumlah') || h.includes('amount') || h.includes('nominal'));
          const categoryIdx = headers.findIndex(h => h.includes('kategori') || h.includes('category'));
          const typeIdx = headers.findIndex(h => h.includes('tipe') || h.includes('type') || h.includes('jenis'));

          if (dateIdx === -1 || descIdx === -1 || amountIdx === -1) {
            continue;
          }

          const dateStr = values[dateIdx];
          const date = parseDate(dateStr);
          if (!date) continue;

          const amount = parseFloat(values[amountIdx].replace(/[^0-9.-]/g, ''));
          if (isNaN(amount) || amount <= 0) continue;

          let type: 'income' | 'expense' = 'expense';
          if (typeIdx !== -1) {
            const typeValue = values[typeIdx].toLowerCase();
            if (typeValue.includes('income') || typeValue.includes('masuk') || typeValue.includes('pemasukan')) {
              type = 'income';
            }
          }

          let categoryName = categoryIdx !== -1 ? values[categoryIdx] : '';
          if (!categoryName) {
            categoryName = type === 'income' ? 'Lainnya' : 'Lainnya';
          }

          rows.push({
            date,
            description: values[descIdx],
            amount,
            category: categoryName,
            type,
          });
        }

        if (rows.length === 0) {
          setError('Tidak ada data valid yang ditemukan dalam file');
          return;
        }

        setParsedData(rows);
        setShowPreview(true);
        setSuccess(`Berhasil membaca ${rows.length} baris data`);
      } catch (err) {
        setError('Gagal membaca file. Pastikan format CSV valid.');
      }
    };

    reader.readAsText(file);
  };

  const parseDate = (dateStr: string): string | null => {
    const formats = [
      /(\d{4})-(\d{1,2})-(\d{1,2})/,
      /(\d{1,2})\/(\d{1,2})\/(\d{4})/,
      /(\d{1,2})-(\d{1,2})-(\d{4})/,
    ];

    for (const format of formats) {
      const match = dateStr.match(format);
      if (match) {
        let year, month, day;
        if (format === formats[0]) {
          [, year, month, day] = match;
        } else {
          [, day, month, year] = match;
        }
        const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        if (!isNaN(date.getTime())) {
          return date.toISOString().split('T')[0];
        }
      }
    }
    return null;
  };

  const handleImport = async () => {
    setLoading(true);
    setError('');

    try {
      const transactions = parsedData.map(row => {
        let category = categories.find(c =>
          c.name.toLowerCase() === row.category.toLowerCase() && c.type === row.type
        );

        if (!category) {
          category = categories.find(c => c.name === 'Lainnya' && c.type === row.type);
        }

        return {
          user_id: user!.id,
          date: row.date,
          description: row.description,
          amount: row.amount,
          category_id: category!.id,
          type: row.type,
        };
      });

      const { error } = await supabase
        .from('transactions')
        .insert(transactions);

      if (error) throw error;

      setSuccess(`Berhasil mengimport ${transactions.length} transaksi!`);
      setParsedData([]);
      setShowPreview(false);
      setTimeout(() => {
        onImported();
        onClose();
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Gagal mengimport data');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    setLoading(true);
    setError('');

    try {
      const { data: transactions, error } = await supabase
        .from('transactions')
        .select(`
          *,
          category:categories(name, type)
        `)
        .order('date', { ascending: false });

      if (error) throw error;

      const csvContent = [
        'Tanggal,Deskripsi,Nominal,Kategori,Tipe',
        ...transactions.map((t: any) =>
          `${t.date},"${t.description}",${t.amount},"${t.category.name}",${t.type}`
        ),
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `cashflow_export_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setSuccess('Data berhasil diexport!');
    } catch (err: any) {
      setError(err.message || 'Gagal export data');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">Import & Export Data</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          <div className="flex gap-2 mb-6 border-b border-gray-200">
            <button
              onClick={() => setActiveTab('import')}
              className={`px-4 py-2 font-medium transition-colors border-b-2 ${
                activeTab === 'import'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <Upload className="w-5 h-5 inline mr-2" />
              Import
            </button>
            <button
              onClick={() => setActiveTab('export')}
              className={`px-4 py-2 font-medium transition-colors border-b-2 ${
                activeTab === 'export'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <Download className="w-5 h-5 inline mr-2" />
              Export
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {success && (
            <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-start gap-2">
              <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-emerald-600">{success}</p>
            </div>
          )}

          {activeTab === 'import' ? (
            <div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <h3 className="font-semibold text-blue-900 mb-2">Format CSV yang Dibutuhkan:</h3>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Kolom wajib: <strong>Tanggal, Deskripsi, Nominal</strong></li>
                  <li>• Kolom opsional: <strong>Kategori, Tipe</strong></li>
                  <li>• Format tanggal: YYYY-MM-DD atau DD/MM/YYYY</li>
                  <li>• Tipe: "income"/"pemasukan" atau "expense"/"pengeluaran"</li>
                </ul>
              </div>

              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <FileSpreadsheet className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <label className="cursor-pointer">
                  <span className="text-blue-600 hover:text-blue-700 font-medium">
                    Pilih file CSV
                  </span>
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
                <p className="text-sm text-gray-500 mt-2">atau drag & drop file di sini</p>
              </div>

              {showPreview && parsedData.length > 0 && (
                <div className="mt-6">
                  <h3 className="font-semibold text-gray-900 mb-3">
                    Preview Data ({parsedData.length} transaksi)
                  </h3>
                  <div className="border border-gray-200 rounded-lg overflow-hidden max-h-96 overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="px-4 py-2 text-left font-medium text-gray-700">Tanggal</th>
                          <th className="px-4 py-2 text-left font-medium text-gray-700">Deskripsi</th>
                          <th className="px-4 py-2 text-right font-medium text-gray-700">Nominal</th>
                          <th className="px-4 py-2 text-left font-medium text-gray-700">Kategori</th>
                          <th className="px-4 py-2 text-left font-medium text-gray-700">Tipe</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {parsedData.slice(0, 10).map((row, idx) => (
                          <tr key={idx} className="hover:bg-gray-50">
                            <td className="px-4 py-2">{row.date}</td>
                            <td className="px-4 py-2">{row.description}</td>
                            <td className="px-4 py-2 text-right">{row.amount.toLocaleString('id-ID')}</td>
                            <td className="px-4 py-2">{row.category}</td>
                            <td className="px-4 py-2">
                              <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                row.type === 'income' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                              }`}>
                                {row.type === 'income' ? 'Pemasukan' : 'Pengeluaran'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {parsedData.length > 10 && (
                    <p className="text-sm text-gray-500 mt-2">... dan {parsedData.length - 10} baris lainnya</p>
                  )}
                  <button
                    onClick={handleImport}
                    disabled={loading}
                    className="w-full mt-4 bg-gradient-to-r from-emerald-500 to-blue-600 text-white px-4 py-3 rounded-lg font-medium hover:from-emerald-600 hover:to-blue-700 disabled:opacity-50"
                  >
                    {loading ? 'Mengimport...' : `Import ${parsedData.length} Transaksi`}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div>
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 mb-6">
                <h3 className="font-semibold text-emerald-900 mb-2">Export Data Anda</h3>
                <p className="text-sm text-emerald-800">
                  Download semua transaksi Anda dalam format CSV untuk backup atau analisis lebih lanjut.
                </p>
              </div>

              <button
                onClick={handleExport}
                disabled={loading}
                className="w-full bg-gradient-to-r from-emerald-500 to-blue-600 text-white px-4 py-3 rounded-lg font-medium hover:from-emerald-600 hover:to-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Download className="w-5 h-5" />
                {loading ? 'Mengexport...' : 'Export ke CSV'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
