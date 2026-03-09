import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { getAccessToken } from '../../lib/supabase';
import { FileText, Download, RefreshCw, Calendar, User, TrendingUp, DollarSign, MapPin } from 'lucide-react';

interface LaporanRow {
  plan_date: string;
  user_profile_id: string;
  full_name: string;
  email: string;
  total_checkins: number;
  total_billing: number;
  avg_duration_minutes: number | null;
  plan_status: string;
  plan_id: string;
  planned_stores: number;
  plan_completed: boolean;
}

interface KaryawanOption {
  id: string;
  full_name: string;
  email: string;
}

const VISIT_TYPE_LABELS: Record<string, string> = {
  drop_roti: 'Drop Roti',
  tagihan: 'Tagihan',
  drop_dan_tagihan: 'Drop & Tagihan',
};

const STATUS_COLOR: Record<string, string> = {
  draft: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400',
  submitted: 'bg-blue-100 text-blue-700',
  approved: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-red-100 text-red-700',
};

function todayStr() { return new Date().toISOString().split('T')[0]; }
function firstDayOfMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

export default function LaporanKaryawan() {
  const { userProfile } = useAuth();
  const isAdmin = ['superadmin', 'admin_sariroti', 'admin_keuangan'].includes(userProfile?.role || '');

  const [from, setFrom] = useState(firstDayOfMonth());
  const [to, setTo] = useState(todayStr());
  const [selectedUser, setSelectedUser] = useState('');
  const [karyawanList, setKaryawanList] = useState<KaryawanOption[]>([]);
  const [rows, setRows] = useState<LaporanRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (isAdmin) {
      (async () => {
        const token = await getAccessToken();
        fetch('/api/user_profiles?filter=role:karyawan_sariroti&select=id,full_name,email', {
          headers: { Authorization: `Bearer ${token}` },
        }).then(r => r.json()).then(j => { if (j.data) setKaryawanList(j.data); });
      })();
    }
  }, [isAdmin]);

  const load = async () => {
    setLoading(true);
    const token = await getAccessToken();
    let url = `/api/laporan-karyawan?from=${from}&to=${to}`;
    if (isAdmin && selectedUser) url += `&user_profile_id=${selectedUser}`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    const json = await res.json();
    if (json.data) setRows(json.data);
    setLoading(false);
  };

  useEffect(() => { load(); }, [from, to, selectedUser]);

  const handleExport = async () => {
    setExporting(true);
    const token = await getAccessToken();
    let url = `/api/laporan-karyawan/export?from=${from}&to=${to}`;
    if (isAdmin && selectedUser) url += `&user_profile_id=${selectedUser}`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    const blob = await res.blob();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `laporan-kunjungan-${from}-${to}.csv`;
    a.click();
    setExporting(false);
  };

  const totalCheckins = rows.reduce((s, r) => s + Number(r.total_checkins), 0);
  const totalBilling = rows.reduce((s, r) => s + Number(r.total_billing), 0);
  const complianceCount = rows.filter(r => r.plan_status === 'submitted' || r.plan_status === 'approved').length;
  const compliancePct = rows.length > 0 ? Math.round((complianceCount / rows.length) * 100) : 0;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Laporan Kunjungan</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">Rekap data kunjungan toko per periode</p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-lg text-sm hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
          <button onClick={handleExport} disabled={exporting || rows.length === 0}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 transition-colors">
            <Download className="w-4 h-4" /> {exporting ? 'Mengunduh...' : 'Export CSV'}
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-gray-400" />
          <label className="text-sm text-gray-600 dark:text-gray-400">Dari:</label>
          <input type="date" value={from} onChange={e => setFrom(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 dark:text-gray-100" />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600 dark:text-gray-400">Sampai:</label>
          <input type="date" value={to} onChange={e => setTo(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 dark:text-gray-100" />
        </div>
        {isAdmin && (
          <select value={selectedUser} onChange={e => setSelectedUser(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 dark:text-gray-100 bg-white dark:bg-gray-800">
            <option value="">Semua Karyawan</option>
            {karyawanList.map(k => (
              <option key={k.id} value={k.id}>{k.full_name || k.email}</option>
            ))}
          </select>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
          <div className="flex items-center gap-2 mb-1">
            <MapPin className="w-4 h-4 text-blue-600" />
            <span className="text-xs text-blue-600 font-medium">Total Kunjungan</span>
          </div>
          <p className="text-2xl font-bold text-blue-900">{totalCheckins}</p>
        </div>
        <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign className="w-4 h-4 text-emerald-600" />
            <span className="text-xs text-emerald-600 font-medium">Total Tagihan</span>
          </div>
          <p className="text-xl font-bold text-emerald-900">Rp {totalBilling.toLocaleString('id-ID')}</p>
        </div>
        <div className="bg-purple-50 rounded-xl p-4 border border-purple-100">
          <div className="flex items-center gap-2 mb-1">
            <FileText className="w-4 h-4 text-purple-600" />
            <span className="text-xs text-purple-600 font-medium">Total Plan</span>
          </div>
          <p className="text-2xl font-bold text-purple-900">{rows.length}</p>
        </div>
        <div className="bg-orange-50 rounded-xl p-4 border border-orange-100">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-orange-600" />
            <span className="text-xs text-orange-600 font-medium">Compliance Plan</span>
          </div>
          <p className="text-2xl font-bold text-orange-900">{compliancePct}%</p>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-14 bg-gray-100 dark:bg-gray-700 animate-pulse rounded-xl" />)}</div>
      ) : rows.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400">Tidak ada data untuk periode ini</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">Tanggal</th>
                  {isAdmin && <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">Karyawan</th>}
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 dark:text-gray-400">Plan</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 dark:text-gray-400">Kunjungan</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 dark:text-gray-400">Total Tagihan</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 dark:text-gray-400">Rata-rata Durasi</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 dark:text-gray-400">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {rows.map((row, i) => (
                  <tr key={i} className="hover:bg-gray-50 dark:bg-gray-900 transition-colors">
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-300 whitespace-nowrap">
                      {new Date(row.plan_date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    {isAdmin && (
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-800 dark:text-gray-200">{row.full_name}</p>
                        <p className="text-xs text-gray-400">{row.email}</p>
                      </td>
                    )}
                    <td className="px-4 py-3 text-center text-gray-600 dark:text-gray-400">
                      <span className="font-medium">{row.total_checkins}</span>
                      <span className="text-gray-400">/{row.planned_stores}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${row.plan_completed ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'}`}>
                        {row.plan_completed ? '✓ Selesai' : `${row.total_checkins}/${row.planned_stores}`}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-gray-800 dark:text-gray-200">
                      {Number(row.total_billing) > 0 ? `Rp ${Number(row.total_billing).toLocaleString('id-ID')}` : '—'}
                    </td>
                    <td className="px-4 py-3 text-center text-gray-500 dark:text-gray-400">
                      {row.avg_duration_minutes ? `${Math.round(Number(row.avg_duration_minutes))} mnt` : '—'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLOR[row.plan_status] || STATUS_COLOR.draft}`}>
                        {row.plan_status === 'draft' ? 'Draft' : row.plan_status === 'submitted' ? 'Terkirim' :
                         row.plan_status === 'approved' ? 'Disetujui' : 'Ditolak'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
