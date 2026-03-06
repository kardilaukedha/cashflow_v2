import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import {
  History, ChevronDown, ChevronUp, CheckCircle2, Circle,
  Clock, MapPin, Package, TrendingUp, RefreshCw, Calendar,
  Timer, ExternalLink, AlertCircle, Filter
} from 'lucide-react';

interface PlannedStore { name: string; address: string; planned_skus?: { kode: string; nama: string }[]; }

interface VisitPlan {
  id: string;
  plan_date: string;
  stores: PlannedStore[];
  status: 'draft' | 'submitted' | 'approved' | 'rejected';
  submitted_at: string | null;
  notes: string | null;
}

interface Checkin {
  id: string;
  store_name: string;
  checkin_time: string;
  checkout_time: string | null;
  duration_minutes: number | null;
  visit_type: string;
  total_billing: number;
  has_expired_bread: boolean;
  notes: string | null;
  gps_lat: number | null;
  gps_lng: number | null;
}

interface PlanWithCheckins extends VisitPlan {
  checkins: Checkin[];
  totalBilling: number;
  checkinCount: number;
}

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  draft:     { label: 'Draft',     bg: 'bg-gray-100',    text: 'text-gray-600',    dot: 'bg-gray-400'    },
  submitted: { label: 'Terkirim',  bg: 'bg-blue-100',    text: 'text-blue-700',    dot: 'bg-blue-500'    },
  approved:  { label: 'Disetujui', bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  rejected:  { label: 'Ditolak',   bg: 'bg-red-100',     text: 'text-red-700',     dot: 'bg-red-500'     },
};

const VISIT_TYPE_LABELS: Record<string, string> = {
  drop_roti:       'Drop Roti',
  tagihan:         'Tagihan',
  drop_dan_tagihan:'Drop & Tagihan',
};

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('id-ID', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
}
function formatTime(d: string) {
  return new Date(d).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
}
function formatRupiah(n: number) {
  return 'Rp ' + Number(n).toLocaleString('id-ID');
}

type FilterStatus = 'all' | 'draft' | 'submitted' | 'approved' | 'rejected';

export default function HistoryKunjungan() {
  const { user } = useAuth();
  const [plans, setPlans] = useState<PlanWithCheckins[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [filterMonth, setFilterMonth] = useState<string>('');

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    let query = supabase
      .from('visit_plans')
      .select('*')
      .eq('user_id', user.id)
      .order('plan_date', { ascending: false })
      .limit(60);

    if (filterStatus !== 'all') {
      query = query.eq('status', filterStatus);
    }
    if (filterMonth) {
      query = query.gte('plan_date', filterMonth + '-01')
                   .lte('plan_date', filterMonth + '-31');
    }

    const { data: planData } = await query;
    if (!planData) { setLoading(false); return; }

    const planIds = (planData as VisitPlan[]).map(p => p.id);
    let checkinData: Checkin[] = [];
    if (planIds.length > 0) {
      const { data } = await supabase
        .from('visit_checkins')
        .select('id, visit_plan_id, store_name, checkin_time, checkout_time, duration_minutes, visit_type, total_billing, has_expired_bread, notes, gps_lat, gps_lng')
        .in('visit_plan_id', planIds)
        .order('checkin_time');
      checkinData = (data || []) as Checkin[];
    }

    const checkinsByPlan: Record<string, Checkin[]> = {};
    for (const c of checkinData) {
      const pid = (c as Checkin & { visit_plan_id: string }).visit_plan_id;
      if (!checkinsByPlan[pid]) checkinsByPlan[pid] = [];
      checkinsByPlan[pid].push(c);
    }

    const result: PlanWithCheckins[] = (planData as VisitPlan[]).map(p => {
      const cs = checkinsByPlan[p.id] || [];
      return {
        ...p,
        checkins: cs,
        checkinCount: cs.length,
        totalBilling: cs.reduce((sum, c) => sum + Number(c.total_billing || 0), 0),
      };
    });

    setPlans(result);
    setLoading(false);
  }, [user, filterStatus, filterMonth]);

  useEffect(() => { load(); }, [load]);

  const totalPlans = plans.length;
  const totalCheckins = plans.reduce((s, p) => s + p.checkinCount, 0);
  const totalBilling = plans.reduce((s, p) => s + p.totalBilling, 0);
  const approvedPlans = plans.filter(p => p.status === 'approved').length;

  const monthOptions: string[] = [];
  const now = new Date();
  for (let i = 0; i < 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    monthOptions.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">History Kunjungan</h1>
          <p className="text-sm text-gray-500">Riwayat kunjungan dan check-in Anda</p>
        </div>
        <button onClick={load} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Plan',    value: totalPlans,               icon: Calendar,   color: 'text-blue-600',    bg: 'bg-blue-50'    },
          { label: 'Total Check-in', value: totalCheckins,           icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Disetujui',     value: approvedPlans,            icon: TrendingUp, color: 'text-purple-600',  bg: 'bg-purple-50'  },
          { label: 'Total Billing', value: formatRupiah(totalBilling), icon: Package,  color: 'text-orange-600',  bg: 'bg-orange-50'  },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-200 p-4">
            <div className={`w-8 h-8 ${bg} rounded-lg flex items-center justify-center mb-2`}>
              <Icon className={`w-4 h-4 ${color}`} />
            </div>
            <p className="text-xs text-gray-500 mb-0.5">{label}</p>
            <p className="font-bold text-gray-900 text-sm">{value}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 items-center bg-white rounded-xl border border-gray-200 p-3">
        <Filter className="w-4 h-4 text-gray-400 flex-shrink-0" />
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value as FilterStatus)}
          className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-blue-500 bg-white"
        >
          <option value="all">Semua Status</option>
          <option value="draft">Draft</option>
          <option value="submitted">Terkirim</option>
          <option value="approved">Disetujui</option>
          <option value="rejected">Ditolak</option>
        </select>
        <select
          value={filterMonth}
          onChange={e => setFilterMonth(e.target.value)}
          className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-blue-500 bg-white"
        >
          <option value="">Semua Bulan</option>
          {monthOptions.map(m => {
            const [y, mo] = m.split('-');
            const label = new Date(parseInt(y), parseInt(mo) - 1, 1).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
            return <option key={m} value={m}>{label}</option>;
          })}
        </select>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="h-24 bg-gray-100 animate-pulse rounded-xl" />)}
        </div>
      ) : plans.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
          <History className="w-12 h-12 mx-auto mb-3 text-gray-200" />
          <p className="font-medium text-gray-500">Belum ada riwayat kunjungan</p>
          <p className="text-sm text-gray-400 mt-1">Riwayat plan kunjungan akan muncul di sini</p>
        </div>
      ) : (
        <div className="space-y-3">
          {plans.map(plan => {
            const cfg = STATUS_CONFIG[plan.status] || STATUS_CONFIG.draft;
            const isOpen = expanded === plan.id;
            const pct = plan.stores.length > 0
              ? Math.round((plan.checkinCount / plan.stores.length) * 100) : 0;

            return (
              <div key={plan.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <button
                  className="w-full text-left px-4 py-4 hover:bg-gray-50 transition-colors"
                  onClick={() => setExpanded(isOpen ? null : plan.id)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1.5">
                        <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.text}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                          {cfg.label}
                        </span>
                        <span className="text-xs text-gray-400">{formatDate(plan.plan_date)}</span>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-gray-600">
                        <span className="flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                          {plan.checkinCount}/{plan.stores.length} check-in
                        </span>
                        {plan.totalBilling > 0 && (
                          <span className="flex items-center gap-1 text-emerald-700 font-medium">
                            <Package className="w-3.5 h-3.5" />
                            {formatRupiah(plan.totalBilling)}
                          </span>
                        )}
                        {plan.submitted_at && (
                          <span className="flex items-center gap-1 text-gray-400">
                            <Clock className="w-3.5 h-3.5" />
                            Dikirim {formatTime(plan.submitted_at)}
                          </span>
                        )}
                      </div>
                      <div className="mt-2">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                            <div
                              className={`h-1.5 rounded-full transition-all ${pct === 100 ? 'bg-emerald-500' : 'bg-blue-500'}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className={`text-xs font-medium ${pct === 100 ? 'text-emerald-600' : 'text-gray-500'}`}>
                            {pct}%
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex-shrink-0 text-gray-400 mt-1">
                      {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </div>
                </button>

                {isOpen && (
                  <div className="border-t border-gray-100 px-4 pb-4 pt-3 space-y-3">
                    {plan.checkins.length > 0 ? (
                      <div className="space-y-2">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Check-in Dilakukan</p>
                        {plan.checkins.map(c => (
                          <div key={c.id} className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 space-y-2">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                                <span className="font-medium text-gray-900 text-sm">{c.store_name}</span>
                              </div>
                              <span className="text-xs text-gray-500">{formatTime(c.checkin_time)}</span>
                            </div>
                            <div className="flex flex-wrap items-center gap-3 pl-6 text-xs">
                              <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                                {VISIT_TYPE_LABELS[c.visit_type] || c.visit_type}
                              </span>
                              {c.duration_minutes && (
                                <span className="flex items-center gap-1 text-gray-600">
                                  <Timer className="w-3 h-3" />{Math.round(c.duration_minutes)} mnt
                                </span>
                              )}
                              {c.total_billing > 0 && (
                                <span className="text-emerald-700 font-medium">{formatRupiah(c.total_billing)}</span>
                              )}
                              {c.has_expired_bread && (
                                <span className="flex items-center gap-1 text-orange-600">
                                  <AlertCircle className="w-3 h-3" />Ada roti expired
                                </span>
                              )}
                              {c.gps_lat && c.gps_lng && (
                                <a
                                  href={`https://www.google.com/maps?q=${c.gps_lat},${c.gps_lng}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-1 text-blue-500 hover:text-blue-600"
                                  onClick={e => e.stopPropagation()}
                                >
                                  <ExternalLink className="w-3 h-3" />GPS
                                </a>
                              )}
                            </div>
                            {c.notes && (
                              <p className="text-xs text-gray-500 pl-6 italic">"{c.notes}"</p>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-4 text-gray-400">
                        <Circle className="w-8 h-8 mx-auto mb-1 text-gray-200" />
                        <p className="text-sm">Belum ada check-in pada plan ini</p>
                      </div>
                    )}

                    {plan.stores.length > 0 && (
                      <div className="space-y-1.5">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Toko Direncanakan</p>
                        {plan.stores.map((s, i) => {
                          const done = plan.checkins.some(c => c.store_name.toLowerCase() === s.name.toLowerCase());
                          return (
                            <div key={i} className={`px-3 py-2 rounded-lg text-sm ${done ? 'bg-emerald-50 text-gray-700' : 'bg-gray-50 text-gray-500'}`}>
                              <div className="flex items-center gap-2">
                                {done
                                  ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                                  : <Circle className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" />}
                                <span className="flex-1 truncate font-medium">{s.name}</span>
                                {s.address && (
                                  <span className="flex items-center gap-1 text-xs text-gray-400">
                                    <MapPin className="w-3 h-3" />{s.address}
                                  </span>
                                )}
                              </div>
                              {s.planned_skus && s.planned_skus.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-1.5 ml-5">
                                  {s.planned_skus.slice(0, 6).map(sk => (
                                    <span key={sk.kode} className="text-xs bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded font-mono">{sk.kode}</span>
                                  ))}
                                  {s.planned_skus.length > 6 && (
                                    <span className="text-xs text-gray-400">+{s.planned_skus.length - 6} SKU</span>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {plan.notes && (
                      <div className="bg-yellow-50 border border-yellow-100 rounded-lg px-3 py-2 text-xs text-yellow-800">
                        <span className="font-medium">Catatan Admin: </span>{plan.notes}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
