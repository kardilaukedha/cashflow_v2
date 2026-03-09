import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase, getAccessToken } from '../../lib/supabase';
import AnnouncementBoard from '../AnnouncementBoard';
import CheckinModal from './CheckinModal';
import SkuPickerModal from './SkuPickerModal';
import type { SkuItem, SkuWithQty } from '../../lib/skuList';
import {
  MapPin, Clock, CheckCircle2, Circle, Plus, Trash2,
  AlertCircle, Send, RefreshCw, Package, ClipboardList,
  TrendingUp, Navigation, Store, LogOut, Timer, ExternalLink, Calendar
} from 'lucide-react';

interface SariRotiSettings {
  min_visits: number;
  max_visits: number;
  plan_deadline: string;
}

interface PlannedStore {
  name: string;
  address: string;
  planned_skus?: SkuWithQty[];
}

interface VisitPlan {
  id: string;
  user_id: string;
  plan_date: string;
  stores: PlannedStore[];
  submitted_at: string | null;
  status: 'draft' | 'submitted' | 'approved' | 'rejected';
  notes: string;
}

interface CheckinSummary {
  id: string;
  store_name: string;
  checkin_time: string;
  checkout_time: string | null;
  duration_minutes: number | null;
  visit_type: string;
  total_billing: number;
  gps_lat: number | null;
  gps_lng: number | null;
}

interface RegisteredStore {
  id: number;
  nama_toko: string;
  nama_pemilik: string;
  alamat: string;
  nomor_hp: string;
  sharelok: string;
  status: string;
}

function todayStr() { return new Date().toISOString().split('T')[0]; }

function maxDateStr() {
  const d = new Date();
  d.setDate(d.getDate() + 3);
  return d.toISOString().split('T')[0];
}

const VISIT_TYPE_LABELS: Record<string, string> = {
  drop_roti: 'Drop Roti',
  tagihan: 'Tagihan',
  drop_dan_tagihan: 'Drop & Tagihan',
};

interface Props {
  onNavigate?: (view: string) => void;
}

export default function SariRotiDashboard({ onNavigate }: Props) {
  const { user, userProfile } = useAuth();
  const [settings, setSettings] = useState<SariRotiSettings>({ min_visits: 5, max_visits: 20, plan_deadline: '10:00' });
  const [todayPlan, setTodayPlan] = useState<VisitPlan | null>(null);
  const [checkins, setCheckins] = useState<CheckinSummary[]>([]);
  const [storeInputs, setStoreInputs] = useState<PlannedStore[]>([{ name: '', address: '' }]);
  const [registeredStores, setRegisteredStores] = useState<RegisteredStore[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [checkinTarget, setCheckinTarget] = useState<PlannedStore | null>(null);
  const [showCheckin, setShowCheckin] = useState(false);
  const [checkingOut, setCheckingOut] = useState<string | null>(null);
  const [now, setNow] = useState(new Date());
  const [skuPickerIdx, setSkuPickerIdx] = useState<number | null>(null);
  const [planDate, setPlanDate] = useState(todayStr());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    await Promise.all([loadSettings(), loadTodayPlan(), loadRegisteredStores()]);
    setLoading(false);
  }, [user, userProfile, planDate]);

  useEffect(() => { load(); }, [load]);

  const loadRegisteredStores = async () => {
    const token = await getAccessToken();
    const res = await fetch('/api/stores', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const json = await res.json();
    if (json.data) {
      setRegisteredStores((json.data as RegisteredStore[]).filter(s => s.status === 'active' || !s.status));
    }
  };

  const loadSettings = async () => {
    if (!userProfile?.id) return;
    const token = await getAccessToken();
    const res = await fetch(`/api/sariroti-settings/${userProfile.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const json = await res.json();
    if (json.data) {
      setSettings({
        min_visits: json.data.min_visits,
        max_visits: json.data.max_visits,
        plan_deadline: json.data.plan_deadline?.substring(0, 5) || '10:00',
      });
    }
  };

  const loadTodayPlan = async () => {
    if (!user) return;
    const { data } = await supabase.from('visit_plans').select('*')
      .eq('user_id', user.id).eq('plan_date', planDate).limit(1);
    if (data && data.length > 0) {
      const plan = data[0] as VisitPlan;
      setTodayPlan(plan);
      setStoreInputs(plan.stores?.length > 0 ? plan.stores : [{ name: '', address: '' }]);
      loadCheckins(plan.id);
    } else {
      setTodayPlan(null);
      setStoreInputs([{ name: '', address: '' }]);
      setCheckins([]);
    }
  };

  const loadCheckins = async (planId: string) => {
    const { data } = await supabase.from('visit_checkins')
      .select('id, store_name, checkin_time, checkout_time, duration_minutes, visit_type, total_billing, gps_lat, gps_lng')
      .eq('visit_plan_id', planId).order('checkin_time');
    if (data) setCheckins(data as CheckinSummary[]);
  };

  const handleCheckout = async (checkinId: string) => {
    setCheckingOut(checkinId);
    const token = await getAccessToken();
    const res = await fetch(`/api/checkout/${checkinId}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    const json = await res.json();
    if (json.error) alert(json.error.message);
    else if (todayPlan) loadCheckins(todayPlan.id);
    setCheckingOut(null);
  };

  const isPastDeadline = () => {
    const [h, m] = settings.plan_deadline.split(':').map(Number);
    return now.getHours() > h || (now.getHours() === h && now.getMinutes() >= m);
  };

  const isNearDeadline = () => {
    const [h, m] = settings.plan_deadline.split(':').map(Number);
    const deadlineMinutes = h * 60 + m;
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    return deadlineMinutes - nowMinutes <= 30 && deadlineMinutes - nowMinutes > 0;
  };

  const canEditPlan = () => !todayPlan || todayPlan.status === 'draft';

  const addStore = () => {
    if (storeInputs.length >= settings.max_visits) return;
    setStoreInputs([...storeInputs, { name: '', address: '' }]);
  };

  const removeStore = (i: number) => {
    if (storeInputs.length <= 1) return;
    setStoreInputs(storeInputs.filter((_, idx) => idx !== i));
  };

  const selectStore = (i: number, storeId: string) => {
    if (!storeId) {
      setStoreInputs(prev => prev.map((s, idx) => idx === i ? { name: '', address: '', planned_skus: [] } : s));
      return;
    }
    const found = registeredStores.find(s => String(s.id) === storeId);
    if (found) {
      setStoreInputs(prev => prev.map((s, idx) => idx === i
        ? { name: found.nama_toko, address: found.alamat || '', planned_skus: s.planned_skus || [] }
        : s
      ));
    }
  };

  const handleSkuConfirm = (skus: SkuWithQty[]) => {
    if (skuPickerIdx === null) return;
    setStoreInputs(prev => prev.map((s, idx) => idx === skuPickerIdx ? { ...s, planned_skus: skus } : s));
    setSkuPickerIdx(null);
  };

  const savePlan = async () => {
    const validStores = storeInputs.filter(s => s.name.trim());
    if (validStores.length < settings.min_visits) {
      alert(`Minimal ${settings.min_visits} toko harus direncanakan`);
      return;
    }
    const missingSkus = validStores.filter(s => !s.planned_skus || s.planned_skus.length === 0);
    if (missingSkus.length > 0) {
      alert(`Setiap toko wajib memiliki minimal 1 SKU yang dipilih.\nToko belum ada SKU: ${missingSkus.map(s => s.name).join(', ')}`);
      return;
    }
    if (isPastDeadline() && !todayPlan) {
      alert(`Sudah melewati batas waktu pengisian plan (${settings.plan_deadline})`);
      return;
    }
    setSaving(true);
    const isNewPlan = !todayPlan;
    let saveError = null;
    if (todayPlan) {
      const { error } = await supabase.from('visit_plans').update({ stores: validStores, updated_at: new Date().toISOString() }).eq('id', todayPlan.id);
      saveError = error;
    } else {
      const { error } = await supabase.from('visit_plans').insert({ user_id: user?.id, plan_date: planDate, stores: validStores, status: 'draft' });
      saveError = error;
    }
    setSaving(false);
    if (saveError) {
      alert('Gagal menyimpan plan: ' + saveError.message);
      return;
    }
    await loadTodayPlan();
    if (isNewPlan && onNavigate) {
      onNavigate('sariroti_home');
    }
  };

  const submitPlan = async () => {
    if (!todayPlan) return;
    const validStores = storeInputs.filter(s => s.name.trim());
    if (validStores.length < settings.min_visits) {
      alert(`Minimal ${settings.min_visits} toko harus direncanakan`);
      return;
    }
    setSubmitting(true);
    await supabase.from('visit_plans').update({
      stores: validStores, status: 'submitted', submitted_at: new Date().toISOString(), updated_at: new Date().toISOString()
    }).eq('id', todayPlan.id);
    setSubmitting(false);
    await loadTodayPlan();
    if (onNavigate) onNavigate('sariroti_home');
  };

  const startCheckin = (store: PlannedStore) => {
    setCheckinTarget(store);
    setShowCheckin(true);
  };

  const isStoreCheckedIn = (storeName: string) =>
    checkins.some(c => c.store_name.toLowerCase() === storeName.toLowerCase());

  const validStoreCount = storeInputs.filter(s => s.name.trim()).length;
  const checkinCount = checkins.length;
  const progressPct = todayPlan ? Math.round((checkinCount / Math.max(todayPlan.stores.length, 1)) * 100) : 0;

  const getSelectedStoreId = (storeName: string) => {
    const found = registeredStores.find(s => s.nama_toko === storeName);
    return found ? String(found.id) : '';
  };

  const showDeadlineAlert = !todayPlan || todayPlan.status === 'draft';

  if (loading) {
    return (
      <div className="space-y-4 max-w-2xl mx-auto">
        {[1,2,3].map(i => <div key={i} className="h-32 bg-gray-100 dark:bg-gray-700 animate-pulse rounded-xl" />)}
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard Kunjungan</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">{new Date().toLocaleDateString('id-ID', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}</p>
        </div>
        <button onClick={load} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {showDeadlineAlert && isNearDeadline() && (
        <div className="bg-yellow-50 border border-yellow-300 rounded-xl p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0" />
          <div>
            <p className="font-semibold text-yellow-800 text-sm">Segera kirim plan kunjungan!</p>
            <p className="text-xs text-yellow-700 mt-0.5">Batas waktu {settings.plan_deadline} — kurang dari 30 menit lagi</p>
          </div>
        </div>
      )}

      {showDeadlineAlert && isPastDeadline() && (
        <div className="bg-red-50 border border-red-300 rounded-xl p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
          <div>
            <p className="font-semibold text-red-800 text-sm">Batas waktu pengiriman plan telah lewat!</p>
            <p className="text-xs text-red-700 mt-0.5">
              {todayPlan ? 'Plan Anda masih berstatus Draft. Kirim sekarang.' : `Plan belum dibuat. Batas ${settings.plan_deadline} sudah terlewat.`}
            </p>
          </div>
        </div>
      )}

      <AnnouncementBoard />

      {todayPlan && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-600" />
              <span className="font-semibold text-gray-900 dark:text-white text-sm">Progress Hari Ini</span>
            </div>
            <span className="text-xs text-gray-500 dark:text-gray-400">{checkinCount} / {todayPlan.stores.length} toko</span>
          </div>
          <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2.5 mb-2">
            <div className="bg-blue-600 h-2.5 rounded-full transition-all duration-300" style={{ width: `${progressPct}%` }} />
          </div>
          <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
            <span>Min: {settings.min_visits} toko</span>
            <span className={progressPct === 100 ? 'text-emerald-600 font-medium' : ''}>{progressPct}% selesai</span>
            <span>Max: {settings.max_visits} toko</span>
          </div>
          {checkins.length > 0 && (
            <div className="mt-3 space-y-2">
              {checkins.map(c => (
                <div key={c.id} className="bg-emerald-50 rounded-xl px-3 py-2.5 space-y-1.5">
                  <div className="flex items-center gap-2 text-xs">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                    <span className="font-medium text-gray-800 dark:text-gray-200 flex-1">{c.store_name}</span>
                    <span className="text-gray-400">{VISIT_TYPE_LABELS[c.visit_type] || c.visit_type}</span>
                    <span className="text-gray-400">{new Date(c.checkin_time).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs pl-5">
                    {c.duration_minutes ? (
                      <span className="flex items-center gap-1 text-blue-600">
                        <Timer className="w-3 h-3" />{Math.round(c.duration_minutes)} mnt
                      </span>
                    ) : !c.checkout_time ? (
                      <button onClick={() => handleCheckout(c.id)} disabled={checkingOut === c.id}
                        className="flex items-center gap-1 text-orange-600 hover:text-orange-700 font-medium disabled:opacity-50">
                        <LogOut className="w-3 h-3" />
                        {checkingOut === c.id ? 'Check-out...' : 'Check-out'}
                      </button>
                    ) : null}
                    {c.gps_lat && c.gps_lng && (
                      <a href={`https://www.google.com/maps?q=${c.gps_lat},${c.gps_lng}`} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1 text-blue-500 hover:text-blue-600">
                        <ExternalLink className="w-3 h-3" />GPS
                      </a>
                    )}
                    {c.total_billing > 0 && (
                      <span className="text-emerald-700">Rp {Number(c.total_billing).toLocaleString('id-ID')}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 space-y-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-blue-600" />
              <span className="font-semibold text-gray-900 dark:text-white text-sm">Plan Kunjungan</span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {isPastDeadline() && !todayPlan && (
                <span className="flex items-center gap-1 text-xs text-red-500 bg-red-50 px-2 py-1 rounded-full">
                  <AlertCircle className="w-3 h-3" /> Terlambat input
                </span>
              )}
              {!isPastDeadline() && (
                <span className="flex items-center gap-1 text-xs text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
                  <Clock className="w-3 h-3" /> Batas: {settings.plan_deadline}
                </span>
              )}
              {todayPlan && (
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                  todayPlan.status === 'submitted' ? 'bg-blue-100 text-blue-700' :
                  todayPlan.status === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                  todayPlan.status === 'rejected' ? 'bg-red-100 text-red-700' :
                  'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                }`}>
                  {todayPlan.status === 'draft' ? 'Draft' : todayPlan.status === 'submitted' ? 'Terkirim' :
                   todayPlan.status === 'approved' ? 'Disetujui' : 'Ditolak'}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-gray-400" />
            <input
              type="date"
              value={planDate}
              min={todayStr()}
              max={maxDateStr()}
              onChange={e => setPlanDate(e.target.value)}
              className="text-xs border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1 focus:ring-2 focus:ring-blue-500 dark:text-gray-100 focus:border-transparent"
            />
          </div>
        </div>

        <div className="p-4 space-y-3">
          {canEditPlan() && (
            <>
              {registeredStores.length === 0 ? (
                <div className="text-center py-6">
                  <Store className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Belum ada toko terdaftar</p>
                  <p className="text-xs text-gray-400 mt-1">Daftarkan toko di menu "Toko Saya" terlebih dahulu</p>
                </div>
              ) : (
                <>
                  {storeInputs.map((store, i) => {
                    const selectedId = getSelectedStoreId(store.name);
                    const selectedStoreData = registeredStores.find(s => s.nama_toko === store.name);
                    const skuCount = store.planned_skus?.length || 0;
                    const hasStore = !!store.name;
                    return (
                      <div key={i} className="border border-gray-200 dark:border-gray-700 rounded-xl p-3 space-y-2 bg-white dark:bg-gray-800">
                        <div className="flex gap-2 items-start">
                          <div className="flex-1">
                            <select
                              value={selectedId}
                              onChange={e => selectStore(i, e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 dark:text-gray-100 bg-white dark:bg-gray-800"
                            >
                              <option value="">-- Pilih Toko {i + 1} --</option>
                              {registeredStores.map(s => (
                                <option key={s.id} value={String(s.id)}>{s.nama_toko}</option>
                              ))}
                            </select>
                            {selectedStoreData && (
                              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 dark:bg-gray-900 rounded-lg mt-1.5">
                                <MapPin className="w-3 h-3 text-gray-400 flex-shrink-0" />
                                <span className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                  {selectedStoreData.alamat || 'Alamat belum diisi'}
                                </span>
                              </div>
                            )}
                          </div>
                          <button onClick={() => removeStore(i)} disabled={storeInputs.length <= 1}
                            className="mt-1 p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-30">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        {hasStore && (
                          <div>
                            <button
                              onClick={() => setSkuPickerIdx(i)}
                              className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                                skuCount === 0
                                  ? 'border-orange-300 bg-orange-50 text-orange-600 hover:bg-orange-100'
                                  : 'border-blue-300 bg-blue-50 text-blue-600 hover:bg-blue-100'
                              }`}
                            >
                              <Package className="w-4 h-4 flex-shrink-0" />
                              <span className="flex-1 text-left">
                                {skuCount === 0 ? 'Pilih SKU Drop (wajib)' : `${skuCount} SKU dipilih`}
                              </span>
                              {skuCount === 0 && (
                                <span className="text-xs bg-orange-200 text-orange-700 px-1.5 py-0.5 rounded font-semibold">Wajib</span>
                              )}
                            </button>
                            {skuCount > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1.5 px-1">
                                {store.planned_skus!.slice(0, 5).map(s => (
                                  <span key={s.kode} className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-mono">
                                    {s.kode} {('qty' in s && (s as SkuWithQty).qty) ? (s as SkuWithQty).qty : ''}
                                  </span>
                                ))}
                                {skuCount > 5 && (
                                  <span className="text-xs text-gray-400 self-center">+{skuCount - 5} lagi</span>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  <div className="flex gap-2">
                    <button onClick={addStore} disabled={storeInputs.length >= settings.max_visits}
                      className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 px-3 py-2 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors disabled:opacity-40">
                      <Plus className="w-4 h-4" /> Tambah Toko
                    </button>
                    <span className="text-xs text-gray-400 self-center">{validStoreCount}/{settings.max_visits} toko (min {settings.min_visits})</span>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button onClick={savePlan} disabled={saving || validStoreCount < settings.min_visits}
                      className="flex-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 py-2.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 font-medium text-sm disabled:opacity-50 transition-colors">
                      {saving ? 'Menyimpan...' : 'Simpan Draft'}
                    </button>
                    {todayPlan && (
                      <button onClick={submitPlan} disabled={submitting || validStoreCount < settings.min_visits}
                        className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg hover:bg-blue-700 font-medium text-sm disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
                        <Send className="w-4 h-4" /> {submitting ? 'Mengirim...' : 'Kirim Plan'}
                      </button>
                    )}
                    {!todayPlan && (
                      <button onClick={savePlan} disabled={saving || validStoreCount < settings.min_visits || isPastDeadline()}
                        className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg hover:bg-blue-700 font-medium text-sm disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
                        <Send className="w-4 h-4" /> Buat Plan
                      </button>
                    )}
                  </div>
                </>
              )}
            </>
          )}

          {todayPlan && todayPlan.status !== 'draft' && (
            <div className="space-y-2">
              {todayPlan.stores.map((store, i) => {
                const checkedIn = isStoreCheckedIn(store.name);
                return (
                  <div key={i} className={`flex items-center gap-3 p-3 rounded-xl border ${checkedIn ? 'bg-emerald-50 border-emerald-200' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'}`}>
                    <div className={`flex-shrink-0 ${checkedIn ? 'text-emerald-500' : 'text-gray-300'}`}>
                      {checkedIn ? <CheckCircle2 className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 dark:text-white text-sm">{store.name}</p>
                      {store.address && <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-0.5"><MapPin className="w-3 h-3" />{store.address}</p>}
                    </div>
                    {!checkedIn && (
                      <button onClick={() => startCheckin(store)}
                        className="flex items-center gap-1.5 bg-blue-600 text-white text-xs px-3 py-1.5 rounded-lg hover:bg-blue-700 transition-colors font-medium flex-shrink-0">
                        <Navigation className="w-3 h-3" /> Check-in
                      </button>
                    )}
                    {checkedIn && (
                      <span className="text-xs text-emerald-600 font-medium flex-shrink-0">Selesai</span>
                    )}
                  </div>
                );
              })}

              <button onClick={() => startCheckin({ name: '', address: '' })}
                className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-gray-200 dark:border-gray-700 text-gray-400 py-3 rounded-xl hover:border-blue-300 hover:text-blue-500 transition-colors text-sm">
                <Plus className="w-4 h-4" /> Check-in Toko Tambahan
              </button>
            </div>
          )}

          {!todayPlan && isPastDeadline() && (
            <div className="text-center py-6 text-gray-400">
              <AlertCircle className="w-10 h-10 mx-auto mb-2 text-red-300" />
              <p className="font-medium text-red-600 text-sm">Batas waktu input plan telah lewat</p>
              <p className="text-xs mt-1">Plan kunjungan harus diisi sebelum pukul {settings.plan_deadline}</p>
            </div>
          )}

          {!todayPlan && !isPastDeadline() && registeredStores.length > 0 && (
            <div className="text-center py-4 text-gray-400">
              <Package className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Pilih toko yang akan dikunjungi hari ini</p>
            </div>
          )}
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm">
            <p className="font-medium text-amber-800">Ketentuan Plan Kunjungan</p>
            <ul className="text-amber-700 mt-1 space-y-0.5 text-xs">
              <li>• Plan harus diisi sebelum pukul <strong>{settings.plan_deadline}</strong></li>
              <li>• Minimal <strong>{settings.min_visits}</strong> toko per hari</li>
              <li>• Maksimal <strong>{settings.max_visits}</strong> toko per hari</li>
              <li>• Setiap kunjungan wajib check-in dengan foto selfie dan GPS</li>
              <li>• Setiap toko hanya bisa di-check-in 1 kali per hari</li>
            </ul>
          </div>
        </div>
      </div>

      {showCheckin && todayPlan && (
        <CheckinModal
          visitPlanId={todayPlan.id}
          defaultStore={checkinTarget}
          registeredStores={registeredStores}
          onClose={() => { setShowCheckin(false); setCheckinTarget(null); }}
          onSuccess={() => { setShowCheckin(false); setCheckinTarget(null); loadCheckins(todayPlan.id); }}
        />
      )}

      {skuPickerIdx !== null && storeInputs[skuPickerIdx] && (
        <SkuPickerModal
          storeName={storeInputs[skuPickerIdx].name || `Toko ${skuPickerIdx + 1}`}
          selected={(storeInputs[skuPickerIdx].planned_skus || []).map(s => ({ ...s, qty: ('qty' in s ? (s as SkuWithQty).qty : 1) }))}
          onConfirm={handleSkuConfirm}
          onClose={() => setSkuPickerIdx(null)}
        />
      )}
    </div>
  );
}
