import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Megaphone, Plus, Edit2, Trash2, X, Check, AlertTriangle, Info } from 'lucide-react';

interface Announcement {
  id: string;
  user_id: string;
  title: string;
  content: string;
  target_roles: string[];
  is_active: boolean;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  created_at: string;
}

const ROLE_OPTIONS = [
  { value: 'karyawan', label: 'Karyawan' },
  { value: 'karyawan_sariroti', label: 'Karyawan Sari Roti' },
  { value: 'admin_keuangan', label: 'Admin Keuangan' },
  { value: 'admin_sariroti', label: 'Admin Sariroti' },
  { value: 'superadmin', label: 'Super Admin' },
];

const PRIORITY_CONFIG = {
  low:    { label: 'Rendah',  color: 'bg-gray-100 text-gray-600',   icon: Info },
  normal: { label: 'Normal',  color: 'bg-blue-100 text-blue-700',   icon: Info },
  high:   { label: 'Tinggi',  color: 'bg-orange-100 text-orange-700', icon: AlertTriangle },
  urgent: { label: 'Mendesak', color: 'bg-red-100 text-red-700',    icon: AlertTriangle },
};

const EMPTY_FORM = {
  title: '',
  content: '',
  target_roles: ['karyawan', 'karyawan_sariroti'] as string[],
  is_active: true,
  priority: 'normal' as Announcement['priority'],
};

export default function AnnouncementManager() {
  const { user } = useAuth();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchAnnouncements(); }, []);

  const fetchAnnouncements = async () => {
    setLoading(true);
    const { data } = await supabase.from('announcements').select('*').order('created_at', { ascending: false });
    if (data) setAnnouncements(data as Announcement[]);
    setLoading(false);
  };

  const openNew = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setShowForm(true);
  };

  const openEdit = (a: Announcement) => {
    setForm({ title: a.title, content: a.content, target_roles: a.target_roles, is_active: a.is_active, priority: a.priority });
    setEditingId(a.id);
    setShowForm(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.content.trim()) return;
    setSaving(true);
    if (editingId) {
      await supabase.from('announcements').update({ ...form, updated_at: new Date().toISOString() }).eq('id', editingId);
    } else {
      await supabase.from('announcements').insert({ ...form, user_id: user?.id });
    }
    setSaving(false);
    setShowForm(false);
    fetchAnnouncements();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus pengumuman ini?')) return;
    await supabase.from('announcements').delete().eq('id', id);
    fetchAnnouncements();
  };

  const toggleActive = async (a: Announcement) => {
    await supabase.from('announcements').update({ is_active: !a.is_active, updated_at: new Date().toISOString() }).eq('id', a.id);
    fetchAnnouncements();
  };

  const toggleRole = (role: string) => {
    setForm(f => ({
      ...f,
      target_roles: f.target_roles.includes(role)
        ? f.target_roles.filter(r => r !== role)
        : [...f.target_roles, role],
    }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-yellow-100 rounded-xl flex items-center justify-center">
            <Megaphone className="w-5 h-5 text-yellow-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Manajemen Pengumuman</h2>
            <p className="text-sm text-gray-500">Buat dan kelola pengumuman untuk karyawan</p>
          </div>
        </div>
        <button onClick={openNew} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium">
          <Plus className="w-4 h-4" /> Buat Pengumuman
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-24 bg-gray-100 animate-pulse rounded-xl" />)}</div>
      ) : announcements.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Megaphone className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">Belum ada pengumuman</p>
          <p className="text-sm mt-1">Klik "Buat Pengumuman" untuk memulai</p>
        </div>
      ) : (
        <div className="space-y-3">
          {announcements.map(a => {
            const pc = PRIORITY_CONFIG[a.priority];
            const Icon = pc.icon;
            return (
              <div key={a.id} className={`bg-white rounded-xl border ${a.is_active ? 'border-gray-200' : 'border-gray-100 opacity-60'} p-4 flex gap-4`}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${pc.color}`}>
                      <Icon className="w-3 h-3" /> {pc.label}
                    </span>
                    {!a.is_active && <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">Nonaktif</span>}
                    <span className="text-xs text-gray-400">{new Date(a.created_at).toLocaleDateString('id-ID', { day:'2-digit', month:'short', year:'numeric' })}</span>
                  </div>
                  <h3 className="font-semibold text-gray-900 text-sm">{a.title}</h3>
                  <p className="text-sm text-gray-600 mt-1 line-clamp-2">{a.content}</p>
                  <div className="flex gap-1 mt-2 flex-wrap">
                    {a.target_roles.map(r => (
                      <span key={r} className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">
                        {ROLE_OPTIONS.find(o => o.value === r)?.label || r}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2 flex-shrink-0">
                  <button onClick={() => toggleActive(a)} title={a.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                    className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${a.is_active ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}>
                    <Check className="w-4 h-4" />
                  </button>
                  <button onClick={() => openEdit(a)} className="w-8 h-8 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center hover:bg-blue-100 transition-colors">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(a.id)} className="w-8 h-8 bg-red-50 text-red-600 rounded-lg flex items-center justify-center hover:bg-red-100 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-lg font-bold text-gray-900">{editingId ? 'Edit Pengumuman' : 'Buat Pengumuman Baru'}</h3>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Judul *</label>
                <input type="text" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" required placeholder="Judul pengumuman" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Isi Pengumuman *</label>
                <textarea value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
                  rows={4} required placeholder="Isi detail pengumuman di sini..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 resize-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Prioritas</label>
                <div className="flex gap-2 flex-wrap">
                  {(Object.entries(PRIORITY_CONFIG) as [Announcement['priority'], typeof PRIORITY_CONFIG.low][]).map(([key, cfg]) => (
                    <button key={key} type="button" onClick={() => setForm(f => ({ ...f, priority: key }))}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${form.priority === key ? `${cfg.color} border-current` : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
                      {cfg.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Target Penerima</label>
                <div className="flex flex-wrap gap-2">
                  {ROLE_OPTIONS.map(o => (
                    <label key={o.value} className="flex items-center gap-1.5 cursor-pointer">
                      <input type="checkbox" checked={form.target_roles.includes(o.value)} onChange={() => toggleRole(o.value)} className="rounded text-blue-600" />
                      <span className="text-sm text-gray-700">{o.label}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="is_active" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} className="rounded text-blue-600" />
                <label htmlFor="is_active" className="text-sm text-gray-700">Aktifkan sekarang</label>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={saving || !form.title.trim() || !form.content.trim() || form.target_roles.length === 0}
                  className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50 transition-colors">
                  {saving ? 'Menyimpan...' : editingId ? 'Simpan Perubahan' : 'Publikasikan'}
                </button>
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 bg-gray-100 text-gray-700 py-2.5 rounded-lg hover:bg-gray-200 font-medium transition-colors">
                  Batal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
