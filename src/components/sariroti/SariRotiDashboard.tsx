import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import AnnouncementBoard from '../AnnouncementBoard';
import CheckinModal from './CheckinModal';
import {
  MapPin, Clock, CheckCircle2, Circle, Plus, Trash2,
  AlertCircle, Send, RefreshCw, Package, ClipboardList,
  TrendingUp, ChevronRight, Navigation
} from 'lucide-react';

interface SariRotiSettings {
  min_visits: number;
  max_visits: number;
  plan_deadline: string;
}

interface PlannedStore {
  name: string;
  address: string;
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
  visit_type: string;
  total_billing: number;
}

function todayStr() { return new Date().toISOString().split('T')[0]; }
function timeStr(t: string) { return t.substring(0, 5); }

const VISIT_TYPE_LABELS: Record<string, string> = {
  drop_roti: 'Drop Roti',
  tagihan: 'Tagihan',
  drop_dan_tagihan: 'Drop & Tagihan',
};

export default function SariRotiDashboard() {
  const { user, userProfile } = useAuth();
  const [settings, setSettings] = useState<SariRotiSettings>({ min_visits: 5, max_visits: 20, plan_deadline: '10:00' });
  const [todayPlan, setTodayPlan] = useState<VisitPlan | null>(null);
  const [checkins, setCheckins] = useState<CheckinSummary[]>([]);
  const [storeInputs, setStoreInputs] = useState<PlannedStore[]>([{ name: '', address: '' }]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [checkinTarget, setCheckinTarget] = useState<PlannedStore | null>(null);
  const [showCheckin, setShowCheckin] = useState(false);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    await Promise.all([loadSettings(), loadTodayPlan()]);
    setLoading(false);
  }, [user, userProfile]);

  useEffect(() => { load(); }, [load]);

  const loadSettings = async () => {
    if (!userProfile?.id) return;
    const res = await fetch(`/api/sariroti-settings/${userProfile.id}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` },
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
      .eq('user_id', user.id).eq('plan_date', todayStr()).limit(1);
    if (data && data.length > 0) {
      const plan = data[0] as VisitPlan;
      setTodayPlan(plan);
      setStoreInputs(plan.stores?.length > 0 ? plan.stores : [{ name: '', address: '' }]);
      loadCheckins(plan.id);
    }
  };

  const loadCheckins = async (planId: string) => {
    const { data } = await supabase.from('visit_checkins').select('id, store_name, checkin_time, visit_type, total_billing')
      .eq('visit_plan_id', planId).order('checkin_time');
    if (data) setCheckins(data as CheckinSummary[]);
  };

  const isPastDeadline = () => {
    const [h, m] = settings.plan_deadline.split(':').map(Number);
    return now.getHours() > h || (now.getHours() === h && now.getMinutes() >= m);
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

  const updateStore = (i: number, field: keyof PlannedStore, val: string) => {
    setStoreInputs(prev => prev.map((s, idx) => idx === i ? { ...s, [field]: val } : s));
  };

  const savePlan = async () => {
    const validStores = storeInputs.filter(s => s.name.trim());
    if (validStores.length < settings.min_visits) {
      alert(`Minimal ${settings.min_visits} toko harus direncanakan`);
      return;
    }
    if (isPastDeadline() && !todayPlan) {
      alert(`Sudah melewati batas waktu pengisian plan (${settings.plan_deadline})`);
      return;
    }
    setSaving(true);
    if (todayPlan) {
      await supabase.from('visit_plans').update({ stores: validStores, updated_at: new Date().toISOString() }).eq('id', todayPlan.id);
    } else {
      await supabase.from('visit_plans').insert({ user_id: user?.id, plan_date: todayStr(), stores: validStores, status: 'draft' });
    }
    setSaving(false);
    await loadTodayPlan();
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

  if (loading) {
    return (
      <div className="space-y-4 max-w-2xl mx-auto">
        {[1,2,3].map(i => <div key={i} className="h-32 bg-gray-100 animate-pulse rounded-xl" />)}
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard Kunjungan</h1>
          <p className="text-sm text-gray-500">{new Date().toLocaleDateString('id-ID', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}</p>
        </div>
        <button onClick={load} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      <AnnouncementBoard />

      {todayPlan && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-600" />
              <span className="font-semibold text-gray-900 text-sm">Progress Hari Ini</span>
            </div>
            <span className="text-xs text-gray-500">{checkinCount} / {todayPlan.stores.length} toko</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2.5 mb-2">
            <div className="bg-blue-600 h-2.5 rounded-full transition-all duration-300" style={{ width: `${progressPct}%` }} />
          </div>
          <div className="flex justify-between text-xs text-gray-500">
            <span>Min: {settings.min_visits} toko</span>
            <span className={progressPct === 100 ? 'text-emerald-600 font-medium' : ''}>{progressPct}% selesai</span>
            <span>Max: {settings.max_visits} toko</span>
          </div>
          {checkins.length > 0 && (
            <div className="mt-3 space-y-1.5">
              {checkins.map(c => (
                <div key={c.id} className="flex items-center gap-2 text-xs bg-emerald-50 rounded-lg px-3 py-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                  <span className="font-medium text-gray-800 flex-1">{c.store_name}</span>
                  <span className="text-gray-400">{VISIT_TYPE_LABELS[c.visit_type] || c.visit_type}</span>
                  <span className="text-gray-400">{new Date(c.checkin_time).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-blue-600" />
            <span className="font-semibold text-gray-900 text-sm">Plan Kunjungan Hari Ini</span>
          </div>
          <div className="flex items-center gap-2">
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
                'bg-gray-100 text-gray-600'
              }`}>
                {todayPlan.status === 'draft' ? 'Draft' : todayPlan.status === 'submitted' ? 'Terkirim' :
                 todayPlan.status === 'approved' ? 'Disetujui' : 'Ditolak'}
              </span>
            )}
          </div>
        </div>

        <div className="p-4 space-y-3">
          {canEditPlan() && (
            <>
              {storeInputs.map((store, i) => (
                <div key={i} className="flex gap-2 items-start">
                  <div className="flex-1 space-y-1.5">
                    <input type="text" placeholder={`Nama Toko ${i + 1} *`} value={store.name}
                      onChange={e => updateStore(i, 'name', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
                    <input type="text" placeholder="Alamat toko (opsional)" value={store.address}
                      onChange={e => updateStore(i, 'address', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <button onClick={() => removeStore(i)} disabled={storeInputs.length <= 1}
                    className="mt-2 p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-30">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              <div className="flex gap-2">
                <button onClick={addStore} disabled={storeInputs.length >= settings.max_visits}
                  className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 px-3 py-2 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors disabled:opacity-40">
                  <Plus className="w-4 h-4" /> Tambah Toko
                </button>
                <span className="text-xs text-gray-400 self-center">{validStoreCount}/{settings.max_visits} toko (min {settings.min_visits})</span>
              </div>
              <div className="flex gap-2 pt-1">
                <button onClick={savePlan} disabled={saving || validStoreCount < settings.min_visits}
                  className="flex-1 bg-gray-100 text-gray-700 py-2.5 rounded-lg hover:bg-gray-200 font-medium text-sm disabled:opacity-50 transition-colors">
                  {saving ? 'Menyimpan...' : 'Simpan Draft'}
                </button>
                {todayPlan && (
                  <button onClick={submitPlan} disabled={submitting || validStoreCount < settings.min_visits}
                    className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg hover:bg-blue-700 font-medium text-sm disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
                    <Send className="w-4 h-4" /> {submitting ? 'Mengirim...' : 'Kirim Plan'}
                  </button>
                )}
                {!todayPlan && (
                  <button onClick={savePlan} disabled={saving || validStoreCount < settings.min_visits || (isPastDeadline())}
                    className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg hover:bg-blue-700 font-medium text-sm disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
                    <Send className="w-4 h-4" /> Buat Plan
                  </button>
                )}
              </div>
            </>
          )}

          {todayPlan && todayPlan.status !== 'draft' && (
            <div className="space-y-2">
              {todayPlan.stores.map((store, i) => {
                const checkedIn = isStoreCheckedIn(store.name);
                return (
                  <div key={i} className={`flex items-center gap-3 p-3 rounded-xl border ${checkedIn ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-gray-200'}`}>
                    <div className={`flex-shrink-0 ${checkedIn ? 'text-emerald-500' : 'text-gray-300'}`}>
                      {checkedIn ? <CheckCircle2 className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 text-sm">{store.name}</p>
                      {store.address && <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5"><MapPin className="w-3 h-3" />{store.address}</p>}
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
                className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-gray-200 text-gray-400 py-3 rounded-xl hover:border-blue-300 hover:text-blue-500 transition-colors text-sm">
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

          {!todayPlan && !isPastDeadline() && (
            <div className="text-center py-4 text-gray-400">
              <Package className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Isi rencana kunjungan toko hari ini</p>
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
              <li>• Setiap kunjungan wajib check-in dengan foto selfie</li>
            </ul>
          </div>
        </div>
      </div>

      {showCheckin && todayPlan && (
        <CheckinModal
          visitPlanId={todayPlan.id}
          defaultStore={checkinTarget}
          onClose={() => { setShowCheckin(false); setCheckinTarget(null); }}
          onSuccess={() => { setShowCheckin(false); setCheckinTarget(null); loadCheckins(todayPlan.id); }}
        />
      )}
    </div>
  );
}
