import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import AnnouncementBoard from '../AnnouncementBoard';
import {
  TrendingUp, CheckCircle2, Store, Plus, RefreshCw,
  Clock, AlertCircle, Timer, ExternalLink, LogOut, Navigation
} from 'lucide-react';

interface SariRotiSettings {
  min_visits: number;
  max_visits: number;
  plan_deadline: string;
}

interface VisitPlan {
  id: string;
  stores: { name: string; address: string }[];
  status: 'draft' | 'submitted' | 'approved' | 'rejected';
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
  status: string;
}

function todayStr() { return new Date().toISOString().split('T')[0]; }

const VISIT_TYPE_LABELS: Record<string, string> = {
  drop_roti: 'Drop Roti',
  tagihan: 'Tagihan',
  drop_dan_tagihan: 'Drop & Tagihan',
};

const STATUS_BADGE: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600',
  submitted: 'bg-blue-100 text-blue-700',
  approved: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-red-100 text-red-700',
};
const STATUS_LABEL: Record<string, string> = {
  draft: 'Draft', submitted: 'Terkirim', approved: 'Disetujui', rejected: 'Ditolak',
};

interface Props {
  onNavigate: (view: string) => void;
}

export default function SariRotiHomeDashboard({ onNavigate }: Props) {
  const { user, userProfile } = useAuth();
  const [settings, setSettings] = useState<SariRotiSettings>({ min_visits: 5, max_visits: 20, plan_deadline: '10:00' });
  const [todayPlan, setTodayPlan] = useState<VisitPlan | null>(null);
  const [checkins, setCheckins] = useState<CheckinSummary[]>([]);
  const [registeredStores, setRegisteredStores] = useState<RegisteredStore[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkingOut, setCheckingOut] = useState<string | null>(null);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    await Promise.all([loadSettings(), loadTodayPlan(), loadRegisteredStores()]);
    setLoading(false);
  }, [user, userProfile]);

  useEffect(() => { load(); }, [load]);

  const loadSettings = async () => {
    if (!userProfile?.id) return;
    const res = await fetch(`/api/sariroti-settings/${userProfile.id}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('sb_token')}` },
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

  const loadRegisteredStores = async () => {
    const res = await fetch('/api/stores', {
      headers: { Authorization: `Bearer ${localStorage.getItem('sb_token')}` },
    });
    const json = await res.json();
    if (json.data) {
      setRegisteredStores((json.data as RegisteredStore[]).filter(s => s.status === 'active' || !s.status));
    }
  };

  const loadTodayPlan = async () => {
    if (!user) return;
    const { data } = await supabase.from('visit_plans').select('*')
      .eq('user_id', user.id).eq('plan_date', todayStr()).limit(1);
    if (data && data.length > 0) {
      const plan = data[0] as VisitPlan;
      setTodayPlan(plan);
      await loadCheckins(plan.id);
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
    const res = await fetch(`/api/checkout/${checkinId}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${localStorage.getItem('sb_token')}` },
    });
    const json = await res.json();
    if (json.error) alert(json.error.message);
    else if (todayPlan) await loadCheckins(todayPlan.id);
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

  const checkinCount = checkins.length;
  const totalStores = todayPlan?.stores.length || 0;
  const progressPct = totalStores > 0 ? Math.round((checkinCount / totalStores) * 100) : 0;
  const showDeadlineAlert = !todayPlan || todayPlan.status === 'draft';

  if (loading) {
    return (
      <div className="space-y-4 max-w-2xl mx-auto">
        {[1, 2, 3].map(i => <div key={i} className="h-28 bg-gray-100 animate-pulse rounded-xl" />)}
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500">{new Date().toLocaleDateString('id-ID', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}</p>
        </div>
        <button onClick={load} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
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
              {todayPlan ? 'Plan Anda masih berstatus Draft. Segera kirim.' : `Plan belum dibuat. Batas ${settings.plan_deadline} sudah terlewat.`}
            </p>
          </div>
        </div>
      )}

      <AnnouncementBoard />

      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-blue-600" />
            <span className="font-semibold text-gray-900 text-sm">Progress Kunjungan Hari Ini</span>
          </div>
          <div className="flex items-center gap-2">
            {todayPlan && (
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_BADGE[todayPlan.status]}`}>
                {STATUS_LABEL[todayPlan.status]}
              </span>
            )}
            <span className="text-xs text-gray-500">{checkinCount} / {totalStores} toko</span>
          </div>
        </div>

        {todayPlan ? (
          <>
            <div className="w-full bg-gray-100 rounded-full h-2.5 mb-2">
              <div
                className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-gray-500 mb-3">
              <span>Min: {settings.min_visits} toko</span>
              <span className={progressPct === 100 ? 'text-emerald-600 font-medium' : ''}>{progressPct}% selesai</span>
              <span>Max: {settings.max_visits} toko</span>
            </div>

            {checkins.length > 0 ? (
              <div className="space-y-2">
                {checkins.map(c => (
                  <div key={c.id} className="bg-emerald-50 rounded-xl px-3 py-2.5 space-y-1.5">
                    <div className="flex items-center gap-2 text-xs">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                      <span className="font-medium text-gray-800 flex-1">{c.store_name}</span>
                      <span className="text-gray-400">{VISIT_TYPE_LABELS[c.visit_type] || c.visit_type}</span>
                      <span className="text-gray-400">{new Date(c.checkin_time).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs pl-5">
                      {c.duration_minutes ? (
                        <span className="flex items-center gap-1 text-blue-600">
                          <Timer className="w-3 h-3" />{Math.round(c.duration_minutes)} mnt
                        </span>
                      ) : !c.checkout_time ? (
                        <button
                          onClick={() => handleCheckout(c.id)}
                          disabled={checkingOut === c.id}
                          className="flex items-center gap-1 text-orange-600 hover:text-orange-700 font-medium disabled:opacity-50"
                        >
                          <LogOut className="w-3 h-3" />
                          {checkingOut === c.id ? 'Check-out...' : 'Check-out'}
                        </button>
                      ) : null}
                      {c.gps_lat && c.gps_lng && (
                        <a
                          href={`https://www.google.com/maps?q=${c.gps_lat},${c.gps_lng}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-blue-500 hover:text-blue-600"
                        >
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
            ) : (
              <div className="text-center py-4">
                <Navigation className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                <p className="text-sm text-gray-400">Belum ada check-in hari ini</p>
                <button
                  onClick={() => onNavigate('sariroti')}
                  className="mt-2 text-xs text-blue-600 hover:underline"
                >
                  Mulai kunjungan →
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-6">
            <AlertCircle className="w-10 h-10 mx-auto mb-2 text-gray-300" />
            <p className="text-sm text-gray-500 font-medium">Belum ada plan kunjungan hari ini</p>
            <button
              onClick={() => onNavigate('sariroti')}
              className="mt-2 inline-flex items-center gap-1.5 text-sm text-blue-600 hover:underline"
            >
              Buat plan sekarang →
            </button>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Store className="w-4 h-4 text-orange-500" />
            <span className="font-semibold text-gray-900 text-sm">Toko Saya</span>
          </div>
          <span className="text-xs text-gray-400">{registeredStores.length} toko terdaftar</span>
        </div>

        {registeredStores.length > 0 ? (
          <div className="space-y-1.5 mb-3">
            {registeredStores.slice(0, 3).map(s => (
              <div key={s.id} className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg">
                <Store className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                <span className="text-sm text-gray-700 truncate">{s.nama_toko}</span>
              </div>
            ))}
            {registeredStores.length > 3 && (
              <p className="text-xs text-gray-400 text-center">+{registeredStores.length - 3} toko lainnya</p>
            )}
          </div>
        ) : (
          <p className="text-sm text-gray-400 mb-3">Belum ada toko yang didaftarkan.</p>
        )}

        <button
          onClick={() => onNavigate('toko')}
          className="w-full flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium py-2.5 rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          {registeredStores.length === 0 ? 'Daftarkan Toko Pertama' : 'Kelola Toko'}
        </button>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <Clock className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm">
            <p className="font-medium text-amber-800">Ketentuan Hari Ini</p>
            <ul className="text-amber-700 mt-1 space-y-0.5 text-xs">
              <li>• Batas input plan: <strong>{settings.plan_deadline}</strong></li>
              <li>• Target kunjungan: <strong>{settings.min_visits}–{settings.max_visits}</strong> toko</li>
              <li>• Setiap kunjungan wajib selfie + GPS</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
