import { useState, useEffect } from 'react';
import { getApiUrl, getApiHeaders } from '../../lib/supabase';
import { TrendingUp, Award, Star, Calendar, RefreshCw, Users, DollarSign, MapPin, Clock } from 'lucide-react';

interface PerformaRow {
  user_profile_id: string;
  full_name: string;
  email: string;
  total_plans: number;
  submitted_plans: number;
  total_checkins: number;
  total_billing: number;
  avg_duration_minutes: number | null;
  compliance_pct: number;
}

export default function PerformaKaryawan() {
  const MONTHS = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
  const now = new Date();
  const [bulan, setBulan] = useState(String(now.getMonth() + 1));
  const [tahun, setTahun] = useState(String(now.getFullYear()));
  const [rows, setRows] = useState<PerformaRow[]>([]);
  const [loading, setLoading] = useState(false);
  const token = localStorage.getItem('sb_token');

  const load = async () => {
    setLoading(true);
    const res = await fetch(getApiUrl(`/performa-karyawan?bulan=${bulan}&tahun=${tahun}`), {
      headers: getApiHeaders(),
    });
    const json = await res.json();
    if (json.data) setRows(json.data);
    setLoading(false);
  };

  useEffect(() => { load(); }, [bulan, tahun]);

  const topBilling = rows.length > 0 ? rows[0] : null;
  const topCompliance = rows.length > 0 ? [...rows].sort((a, b) => b.compliance_pct - a.compliance_pct)[0] : null;

  const years = Array.from({ length: 3 }, (_, i) => String(now.getFullYear() - i));

  const complianceColor = (pct: number) => {
    if (pct >= 90) return 'text-emerald-600 bg-emerald-50';
    if (pct >= 70) return 'text-blue-600 bg-blue-50';
    if (pct >= 50) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Performa Karyawan</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">Analisis kinerja karyawan Sari Roti per bulan</p>
        </div>
        <button onClick={load} className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-lg text-sm hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-gray-400" />
          <select value={bulan} onChange={e => setBulan(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 dark:text-gray-100 bg-white dark:bg-gray-800">
            {MONTHS.map((m, i) => <option key={i + 1} value={String(i + 1)}>{m}</option>)}
          </select>
          <select value={tahun} onChange={e => setTahun(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 dark:text-gray-100 bg-white dark:bg-gray-800">
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <span className="text-sm text-gray-500 dark:text-gray-400">{rows.length} karyawan aktif</span>
      </div>

      {rows.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {topBilling && (
            <div className="bg-gradient-to-r from-yellow-400 to-orange-400 rounded-xl p-4 text-white">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="w-5 h-5" />
                <span className="font-semibold text-sm">Top Tagihan Bulan Ini</span>
              </div>
              <p className="text-xl font-bold">{topBilling.full_name}</p>
              <p className="text-sm opacity-90">Rp {Number(topBilling.total_billing).toLocaleString('id-ID')}</p>
              <div className="mt-2 flex items-center gap-1"><Star className="w-4 h-4" /><Star className="w-4 h-4" /><Star className="w-4 h-4" /></div>
            </div>
          )}
          {topCompliance && (
            <div className="bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl p-4 text-white">
              <div className="flex items-center gap-2 mb-2">
                <Award className="w-5 h-5" />
                <span className="font-semibold text-sm">Top Disiplin Bulan Ini</span>
              </div>
              <p className="text-xl font-bold">{topCompliance.full_name}</p>
              <p className="text-sm opacity-90">Compliance: {topCompliance.compliance_pct}%</p>
              <div className="mt-2 flex items-center gap-1"><Star className="w-4 h-4" /><Star className="w-4 h-4" /><Star className="w-4 h-4" /></div>
            </div>
          )}
        </div>
      )}

      {loading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-24 bg-gray-100 dark:bg-gray-700 animate-pulse rounded-xl" />)}</div>
      ) : rows.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400">Tidak ada data untuk periode ini</p>
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((row, i) => {
            const isTopBilling = topBilling?.user_profile_id === row.user_profile_id;
            const isTopCompliance = topCompliance?.user_profile_id === row.user_profile_id && topCompliance.compliance_pct >= 90;
            return (
              <div key={row.user_profile_id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0 ${
                      i === 0 ? 'bg-yellow-500' : i === 1 ? 'bg-gray-400' : i === 2 ? 'bg-orange-400' : 'bg-blue-500'
                    }`}>
                      {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i+1}`}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-gray-900 dark:text-white">{row.full_name}</p>
                        {isTopBilling && <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-medium">Top Tagihan</span>}
                        {isTopCompliance && <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium">Top Disiplin</span>}
                      </div>
                      <p className="text-xs text-gray-400">{row.email}</p>
                    </div>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-sm font-bold ${complianceColor(Number(row.compliance_pct))}`}>
                    {row.compliance_pct ?? 0}% compliance
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-2.5">
                    <div className="flex items-center gap-1 mb-0.5">
                      <MapPin className="w-3 h-3 text-blue-500" />
                      <span className="text-xs text-gray-500 dark:text-gray-400">Total Kunjungan</span>
                    </div>
                    <p className="font-bold text-gray-800 dark:text-gray-200">{row.total_checkins}</p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-2.5">
                    <div className="flex items-center gap-1 mb-0.5">
                      <DollarSign className="w-3 h-3 text-emerald-500" />
                      <span className="text-xs text-gray-500 dark:text-gray-400">Total Tagihan</span>
                    </div>
                    <p className="font-bold text-gray-800 dark:text-gray-200 text-sm">Rp {Number(row.total_billing).toLocaleString('id-ID')}</p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-2.5">
                    <div className="flex items-center gap-1 mb-0.5">
                      <TrendingUp className="w-3 h-3 text-purple-500" />
                      <span className="text-xs text-gray-500 dark:text-gray-400">Hari Plan Dibuat</span>
                    </div>
                    <p className="font-bold text-gray-800 dark:text-gray-200">{row.total_plans} hari</p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-2.5">
                    <div className="flex items-center gap-1 mb-0.5">
                      <Clock className="w-3 h-3 text-orange-500" />
                      <span className="text-xs text-gray-500 dark:text-gray-400">Rata-rata Durasi</span>
                    </div>
                    <p className="font-bold text-gray-800 dark:text-gray-200">
                      {row.avg_duration_minutes ? `${Math.round(Number(row.avg_duration_minutes))} mnt` : '—'}
                    </p>
                  </div>
                </div>

                <div className="mt-3">
                  <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                    <span>Compliance plan ({row.submitted_plans}/{row.total_plans} submit)</span>
                    <span>{row.compliance_pct ?? 0}%</span>
                  </div>
                  <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2">
                    <div className={`h-2 rounded-full transition-all ${
                      Number(row.compliance_pct) >= 90 ? 'bg-emerald-500' :
                      Number(row.compliance_pct) >= 70 ? 'bg-blue-500' :
                      Number(row.compliance_pct) >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                    }`} style={{ width: `${Math.min(row.compliance_pct ?? 0, 100)}%` }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
