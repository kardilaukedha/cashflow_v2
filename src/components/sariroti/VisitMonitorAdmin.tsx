import { useState, useEffect, useCallback } from 'react';
import { supabase, getApiUrl, getApiHeaders } from '../../lib/supabase';
import {
  Users, MapPin, Calendar, RefreshCw, ChevronDown, ChevronRight,
  CheckCircle2, Clock, AlertTriangle, Package, Receipt, Image,
  Settings as SettingsIcon, Save, X, ExternalLink, Timer,
  Bell, FileText, TrendingUp
} from 'lucide-react';
import LaporanKaryawan from './LaporanKaryawan';
import PerformaKaryawan from './PerformaKaryawan';

interface VisitSummaryRow {
  id: string;
  plan_date: string;
  status: string;
  submitted_at: string | null;
  stores: { name: string; address: string }[];
  full_name: string;
  email: string;
  user_profile_id: string;
  checkin_count: number;
  total_billing: number;
}

interface CheckinDetail {
  id: string;
  store_name: string;
  store_address: string;
  checkin_time: string;
  checkout_time: string | null;
  duration_minutes: number | null;
  selfie_url: string;
  visit_type: string;
  total_billing: number;
  has_expired_bread: boolean;
  notes: string;
  gps_lat: number | null;
  gps_lng: number | null;
  gps_accuracy: number | null;
  bread_scans: BreadScan[] | null;
}

interface BreadScan {
  id: string;
  barcode: string;
  bread_name: string;
  quantity: number;
  scan_type: 'drop' | 'tarik';
}

interface SariRotiUser {
  id: string;
  full_name: string;
  email: string;
  user_id: string;
}

interface NotifRow {
  user_profile_id: string;
  full_name: string;
  email: string;
  plan_status: string;
  plan_deadline: string | null;
  status: string;
}

const VISIT_TYPE_LABELS: Record<string, string> = {
  drop_roti: 'Drop Roti',
  tagihan: 'Tagihan',
  drop_dan_tagihan: 'Drop & Tagihan',
};

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  draft:     { label: 'Draft',     color: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400' },
  submitted: { label: 'Terkirim',  color: 'bg-blue-100 text-blue-700' },
  approved:  { label: 'Disetujui', color: 'bg-emerald-100 text-emerald-700' },
  rejected:  { label: 'Ditolak',   color: 'bg-red-100 text-red-700' },
};

type Tab = 'monitor' | 'notifikasi' | 'laporan' | 'performa' | 'settings';

export default function VisitMonitorAdmin() {
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);
  const [summaries, setSummaries] = useState<VisitSummaryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedPlan, setExpandedPlan] = useState<string | null>(null);
  const [planDetails, setPlanDetails] = useState<Record<string, CheckinDetail[]>>({});
  const [loadingDetail, setLoadingDetail] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('monitor');
  const [sariUsers, setSariUsers] = useState<SariRotiUser[]>([]);
  const [settingsMap, setSettingsMap] = useState<Record<string, { min_visits: number; max_visits: number; plan_deadline: string }>>({});
  const [savingSettings, setSavingSettings] = useState<string | null>(null);
  const [selfieModal, setSelfieModal] = useState<string | null>(null);
  const [notifRows, setNotifRows] = useState<NotifRow[]>([]);
  const [notifLoading, setNotifLoading] = useState(false);

  const token = localStorage.getItem('sb_token');

  const loadSummary = useCallback(async () => {
    setLoading(true);
    const url = filterDate ? getApiUrl(`/visit-summary?date=${filterDate}`) : getApiUrl('/visit-summary');
    const res = await fetch(url, { headers: getApiHeaders() });
    const json = await res.json();
    if (json.data) setSummaries(json.data);
    setLoading(false);
  }, [filterDate, token]);

  useEffect(() => { loadSummary(); }, [loadSummary]);

  useEffect(() => {
    if (tab === 'settings') loadSariUsers();
    if (tab === 'notifikasi') loadNotifikasi();
  }, [tab]);

  const loadSariUsers = async () => {
    const { data } = await supabase.from('user_profiles').select('id, full_name, email, user_id').eq('role', 'karyawan_sariroti').order('full_name');
    if (data) {
      setSariUsers(data as SariRotiUser[]);
      data.forEach(u => loadUserSettings(u.id));
    }
  };

  const loadNotifikasi = async () => {
    setNotifLoading(true);
    const res = await fetch(getApiUrl('/notifikasi-deadline'), { headers: getApiHeaders() });
    const json = await res.json();
    if (json.data) setNotifRows(json.data);
    setNotifLoading(false);
  };

  const loadUserSettings = async (userProfileId: string) => {
    const res = await fetch(getApiUrl(`/sariroti-settings/${userProfileId}`), { headers: getApiHeaders() });
    const json = await res.json();
    if (json.data) {
      setSettingsMap(prev => ({ ...prev, [userProfileId]: { min_visits: json.data.min_visits, max_visits: json.data.max_visits, plan_deadline: json.data.plan_deadline?.substring(0,5) || '10:00' } }));
    } else {
      setSettingsMap(prev => ({ ...prev, [userProfileId]: { min_visits: 5, max_visits: 20, plan_deadline: '10:00' } }));
    }
  };

  const saveSettings = async (userProfileId: string) => {
    const s = settingsMap[userProfileId];
    if (!s) return;
    setSavingSettings(userProfileId);
    await fetch(getApiUrl(`/sariroti-settings/${userProfileId}`), {
      method: 'PUT',
      headers: getApiHeaders(),
      body: JSON.stringify(s),
    });
    setSavingSettings(null);
    alert('Pengaturan disimpan');
  };

  const togglePlan = async (planId: string) => {
    if (expandedPlan === planId) { setExpandedPlan(null); return; }
    setExpandedPlan(planId);
    if (planDetails[planId]) return;
    setLoadingDetail(planId);
    const res = await fetch(getApiUrl(`/visit-detail/${planId}`), { headers: getApiHeaders() });
    const json = await res.json();
    if (json.data) setPlanDetails(prev => ({ ...prev, [planId]: json.data }));
    setLoadingDetail(null);
  };

  const updateStatus = async (planId: string, status: string) => {
    await supabase.from('visit_plans').update({ status, updated_at: new Date().toISOString() }).eq('id', planId);
    loadSummary();
  };

  const updateSetting = (uid: string, field: string, val: string | number) => {
    setSettingsMap(prev => ({ ...prev, [uid]: { ...prev[uid], [field]: val } }));
  };

  const tabs: { key: Tab; label: string; Icon: typeof Users; badge?: number }[] = [
    { key: 'monitor', label: 'Monitor', Icon: Users },
    { key: 'notifikasi', label: 'Notifikasi', Icon: Bell, badge: notifRows.length > 0 ? notifRows.length : undefined },
    { key: 'laporan', label: 'Laporan', Icon: FileText },
    { key: 'performa', label: 'Performa', Icon: TrendingUp },
    { key: 'settings', label: 'Pengaturan', Icon: SettingsIcon },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
            <MapPin className="w-5 h-5 text-orange-600" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">Monitor Kunjungan Sari Roti</h2>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">Pantau aktivitas kunjungan toko karyawan</p>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
        <div className="flex gap-2 min-w-max sm:min-w-0 sm:flex-wrap">
          {tabs.map(({ key, label, Icon, badge }) => (
            <button key={key} onClick={() => setTab(key)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors relative whitespace-nowrap ${tab === key ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'}`}>
              <Icon className="w-4 h-4" />
              {label}
              {badge !== undefined && (
                <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                  {badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {tab === 'monitor' && (
        <>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-400" />
              <input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 dark:text-gray-100" />
            </div>
            <button onClick={loadSummary} className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-lg text-sm hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
              <RefreshCw className="w-4 h-4" /> Refresh
            </button>
            <div className="text-sm text-gray-500 dark:text-gray-400">{summaries.length} plan ditemukan</div>
          </div>

          {loading ? (
            <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-20 bg-gray-100 dark:bg-gray-700 animate-pulse rounded-xl" />)}</div>
          ) : summaries.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <MapPin className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p>Tidak ada data kunjungan untuk tanggal ini</p>
            </div>
          ) : (
            <div className="space-y-3">
              {summaries.map(row => {
                const sc = STATUS_CONFIG[row.status] || STATUS_CONFIG.draft;
                const isExpanded = expandedPlan === row.id;
                const details = planDetails[row.id];
                const progressPct = row.stores?.length ? Math.round((row.checkin_count / row.stores.length) * 100) : 0;

                return (
                  <div key={row.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 dark:bg-gray-900 transition-colors" onClick={() => togglePlan(row.id)}>
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-orange-700 text-xs font-bold">{row.full_name?.charAt(0)?.toUpperCase()}</span>
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-gray-900 dark:text-white text-sm">{row.full_name}</p>
                          <p className="text-xs text-gray-400">{row.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <div className="text-right hidden sm:block">
                          <p className="text-xs text-gray-500 dark:text-gray-400">{row.checkin_count}/{row.stores?.length || 0} toko</p>
                          <div className="w-20 bg-gray-100 dark:bg-gray-700 rounded-full h-1.5 mt-1">
                            <div className="bg-blue-600 h-1.5 rounded-full" style={{ width: `${progressPct}%` }} />
                          </div>
                        </div>
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${sc.color}`}>{sc.label}</span>
                        {isExpanded ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="border-t border-gray-100 dark:border-gray-700 p-4 space-y-4 bg-gray-50 dark:bg-gray-900">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div className="flex items-center gap-4 text-sm flex-wrap">
                            <span className="flex items-center gap-1 text-gray-600 dark:text-gray-400"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />{row.checkin_count} check-in</span>
                            {row.total_billing > 0 && <span className="flex items-center gap-1 text-gray-600 dark:text-gray-400"><Receipt className="w-3.5 h-3.5 text-blue-500" />Rp {Number(row.total_billing).toLocaleString('id-ID')}</span>}
                            {row.submitted_at && <span className="flex items-center gap-1 text-gray-500 dark:text-gray-400 text-xs"><Clock className="w-3 h-3" />{new Date(row.submitted_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>}
                          </div>
                          <div className="flex gap-2">
                            {row.status === 'submitted' && (
                              <>
                                <button onClick={() => updateStatus(row.id, 'approved')} className="px-3 py-1 bg-emerald-600 text-white text-xs rounded-lg hover:bg-emerald-700 transition-colors">Setujui</button>
                                <button onClick={() => updateStatus(row.id, 'rejected')} className="px-3 py-1 bg-red-500 text-white text-xs rounded-lg hover:bg-red-600 transition-colors">Tolak</button>
                              </>
                            )}
                          </div>
                        </div>

                        {row.stores?.length > 0 && (
                          <div>
                            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">PLAN KUNJUNGAN ({row.stores.length} toko)</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                              {row.stores.map((s, i) => (
                                <div key={i} className="bg-white dark:bg-gray-800 rounded-lg px-3 py-2 text-xs border border-gray-200 dark:border-gray-700">
                                  <p className="font-medium text-gray-800 dark:text-gray-200">{s.name}</p>
                                  {s.address && <p className="text-gray-400 mt-0.5">{s.address}</p>}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {loadingDetail === row.id && <div className="h-16 bg-gray-200 animate-pulse rounded-lg" />}

                        {details && details.length > 0 && (
                          <div>
                            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">HASIL CHECK-IN ({details.length})</p>
                            <div className="space-y-2">
                              {details.map(d => (
                                <div key={d.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-3 space-y-2">
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0">
                                      <p className="font-semibold text-gray-900 dark:text-white text-sm">{d.store_name}</p>
                                      {d.store_address && <p className="text-xs text-gray-400 flex items-center gap-1"><MapPin className="w-3 h-3" />{d.store_address}</p>}
                                    </div>
                                    <div className="flex items-center gap-1.5 flex-shrink-0 flex-wrap justify-end">
                                      {d.selfie_url && (
                                        <button onClick={() => setSelfieModal(d.selfie_url)} className="flex items-center gap-1 text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded-lg hover:bg-blue-100 transition-colors">
                                          <Image className="w-3 h-3" />Selfie
                                        </button>
                                      )}
                                      {d.gps_lat && d.gps_lng && (
                                        <a href={`https://www.google.com/maps?q=${d.gps_lat},${d.gps_lng}`} target="_blank" rel="noopener noreferrer"
                                          className="flex items-center gap-1 text-xs bg-emerald-50 text-emerald-600 px-2 py-1 rounded-lg hover:bg-emerald-100 transition-colors">
                                          <ExternalLink className="w-3 h-3" />GPS
                                          {d.gps_accuracy ? ` ±${Math.round(d.gps_accuracy)}m` : ''}
                                        </a>
                                      )}
                                      <span className="text-xs text-gray-400">{new Date(d.checkin_time).toLocaleTimeString('id-ID', { hour:'2-digit', minute:'2-digit' })}</span>
                                    </div>
                                  </div>
                                  {(d.checkout_time || d.duration_minutes) && (
                                    <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400 pl-0.5">
                                      {d.checkout_time && (
                                        <span className="flex items-center gap-1">
                                          <Clock className="w-3 h-3 text-blue-400" />
                                          Checkout: {new Date(d.checkout_time).toLocaleTimeString('id-ID', { hour:'2-digit', minute:'2-digit' })}
                                        </span>
                                      )}
                                      {d.duration_minutes && (
                                        <span className="flex items-center gap-1">
                                          <Timer className="w-3 h-3 text-purple-400" />
                                          Durasi: {Math.round(d.duration_minutes)} mnt
                                        </span>
                                      )}
                                    </div>
                                  )}
                                  <div className="flex flex-wrap gap-2 text-xs">
                                    <span className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">{VISIT_TYPE_LABELS[d.visit_type] || d.visit_type}</span>
                                    {d.total_billing > 0 && <span className="bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full">Tagihan: Rp {Number(d.total_billing).toLocaleString('id-ID')}</span>}
                                    {d.has_expired_bread && <span className="bg-orange-50 text-orange-600 px-2 py-0.5 rounded-full flex items-center gap-1"><AlertTriangle className="w-3 h-3" />Ada Roti Tarik</span>}
                                  </div>
                                  {d.bread_scans && d.bread_scans.length > 0 && (
                                    <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-2 space-y-1">
                                      {d.bread_scans.map(bs => (
                                        <div key={bs.id} className="flex items-center gap-2 text-xs">
                                          {bs.scan_type === 'drop' ? <Package className="w-3 h-3 text-blue-400" /> : <AlertTriangle className="w-3 h-3 text-orange-400" />}
                                          <span className="font-medium">{bs.barcode}</span>
                                          <span className="text-gray-400">×{bs.quantity}</span>
                                          <span className={`px-1.5 rounded ${bs.scan_type === 'drop' ? 'text-blue-600 bg-blue-50' : 'text-orange-600 bg-orange-50'}`}>
                                            {bs.scan_type === 'drop' ? 'Drop' : 'Tarik'}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                  {d.notes && <p className="text-xs text-gray-500 dark:text-gray-400 italic">{d.notes}</p>}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {details && details.length === 0 && (
                          <p className="text-xs text-gray-400 text-center py-3">Belum ada check-in untuk plan ini</p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {tab === 'notifikasi' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600 dark:text-gray-400">Karyawan yang belum submit plan hari ini ({new Date().toLocaleDateString('id-ID')})</p>
            <button onClick={loadNotifikasi} className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-lg text-sm hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
              <RefreshCw className="w-4 h-4" /> Refresh
            </button>
          </div>
          {notifLoading ? (
            <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-16 bg-gray-100 dark:bg-gray-700 animate-pulse rounded-xl" />)}</div>
          ) : notifRows.length === 0 ? (
            <div className="text-center py-12 bg-emerald-50 rounded-xl border border-emerald-100">
              <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-emerald-400" />
              <p className="font-medium text-emerald-700">Semua karyawan sudah submit plan hari ini</p>
            </div>
          ) : (
            <div className="space-y-3">
              {notifRows.map(r => (
                <div key={r.user_profile_id} className="bg-white dark:bg-gray-800 rounded-xl border border-red-200 p-4 flex items-center gap-3">
                  <div className="w-9 h-9 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <AlertTriangle className="w-4 h-4 text-red-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 dark:text-white">{r.full_name}</p>
                    <p className="text-xs text-gray-400">{r.email}</p>
                  </div>
                  <div className="flex-shrink-0">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                      r.status === 'no_plan' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {r.status === 'no_plan' ? 'Belum buat plan' : 'Masih Draft'}
                    </span>
                    {r.plan_deadline && (
                      <p className="text-xs text-gray-400 mt-1 text-right">Deadline: {r.plan_deadline}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'laporan' && <LaporanKaryawan />}

      {tab === 'performa' && <PerformaKaryawan />}

      {tab === 'settings' && (
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">Atur target kunjungan untuk setiap karyawan Sari Roti</p>
          {sariUsers.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <Users className="w-10 h-10 mx-auto mb-2 opacity-20" />
              <p>Belum ada karyawan dengan role Karyawan Sari Roti</p>
              <p className="text-xs mt-1">Buat akun dengan role "Karyawan Sari Roti" di menu Kelola User</p>
            </div>
          ) : (
            sariUsers.map(u => {
              const s = settingsMap[u.id] || { min_visits: 5, max_visits: 20, plan_deadline: '10:00' };
              return (
                <div key={u.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white">{u.full_name}</p>
                      <p className="text-xs text-gray-400">{u.email}</p>
                    </div>
                    <button onClick={() => saveSettings(u.id)} disabled={savingSettings === u.id}
                      className="flex items-center gap-1.5 bg-blue-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors">
                      <Save className="w-4 h-4" /> {savingSettings === u.id ? 'Menyimpan...' : 'Simpan'}
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Min Kunjungan/Hari</label>
                      <input type="number" min="1" max="50" value={s.min_visits}
                        onChange={e => updateSetting(u.id, 'min_visits', parseInt(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 dark:text-gray-100" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Max Kunjungan/Hari</label>
                      <input type="number" min="1" max="100" value={s.max_visits}
                        onChange={e => updateSetting(u.id, 'max_visits', parseInt(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 dark:text-gray-100" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Batas Input Plan</label>
                      <input type="time" value={s.plan_deadline}
                        onChange={e => updateSetting(u.id, 'plan_deadline', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 dark:text-gray-100" />
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {selfieModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setSelfieModal(null)}>
          <div className="relative max-w-lg w-full">
            <button onClick={() => setSelfieModal(null)} className="absolute -top-10 right-0 text-white hover:text-gray-300 p-2">
              <X className="w-6 h-6" />
            </button>
            <img src={selfieModal} alt="Selfie check-in" className="w-full rounded-2xl shadow-2xl" />
          </div>
        </div>
      )}
    </div>
  );
}
