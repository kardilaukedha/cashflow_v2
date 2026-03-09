import { useState, useEffect, useCallback } from 'react';
import { getAccessToken } from '../../lib/supabase';
import { Store, CreditCard as Edit2, ArrowRightLeft, Trash2, X, Phone, MapPin, ExternalLink, Image as ImageIcon, RefreshCw, Search, User } from 'lucide-react';

interface Toko {
  id: number;
  user_profile_id: string;
  karyawan_name: string;
  karyawan_email: string;
  nama_toko: string;
  nama_pemilik: string;
  alamat: string;
  nomor_hp: string;
  sharelok: string;
  foto_toko: string;
  status: string;
  created_at: string;
  updated_at: string;
}

interface KaryawanSR {
  id: string;
  full_name: string;
  email: string;
}

const EMPTY_EDIT = {
  nama_toko: '',
  nama_pemilik: '',
  alamat: '',
  nomor_hp: '',
  sharelok: '',
  status: 'active',
};

export default function TokoAdminView() {
  const [stores, setStores] = useState<Toko[]>([]);
  const [karyawanList, setKaryawanList] = useState<KaryawanSR[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterKaryawan, setFilterKaryawan] = useState('');

  const [editingStore, setEditingStore] = useState<Toko | null>(null);
  const [editForm, setEditForm] = useState(EMPTY_EDIT);
  const [editFotoFile, setEditFotoFile] = useState<File | null>(null);
  const [editFotoPreview, setEditFotoPreview] = useState<string>('');
  const [saving, setSaving] = useState(false);

  const [transferStore, setTransferStore] = useState<Toko | null>(null);
  const [transferTarget, setTransferTarget] = useState('');
  const [transferring, setTransferring] = useState(false);

  const [fotoModal, setFotoModal] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const token = await getAccessToken();
      const [storesRes, karRes] = await Promise.all([
        fetch('/api/stores', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/user_profiles?filter=role:karyawan_sariroti&select=id,full_name,email', { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      const storesJson = await storesRes.json();
      const karJson = await karRes.json();
      if (storesJson.data) setStores(storesJson.data);
      if (karJson.data) setKaryawanList(karJson.data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openEdit = (store: Toko) => {
    setEditingStore(store);
    setEditForm({
      nama_toko: store.nama_toko,
      nama_pemilik: store.nama_pemilik,
      alamat: store.alamat,
      nomor_hp: store.nomor_hp,
      sharelok: store.sharelok,
      status: store.status,
    });
    setEditFotoFile(null);
    setEditFotoPreview(store.foto_toko || '');
  };

  const handleEditFoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setEditFotoFile(file);
    setEditFotoPreview(URL.createObjectURL(file));
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStore) return;
    setSaving(true);
    try {
      const token = await getAccessToken();
      const fd = new FormData();
      fd.append('nama_toko', editForm.nama_toko);
      fd.append('nama_pemilik', editForm.nama_pemilik);
      fd.append('alamat', editForm.alamat);
      fd.append('nomor_hp', editForm.nomor_hp);
      fd.append('sharelok', editForm.sharelok);
      fd.append('status', editForm.status);
      if (editFotoFile) fd.append('foto_toko', editFotoFile);

      const res = await fetch(`/api/stores/${editingStore.id}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const json = await res.json();
      if (json.error) { alert(json.error.message); return; }
      setEditingStore(null);
      await load();
    } finally {
      setSaving(false);
    }
  };

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferStore || !transferTarget) return;
    setTransferring(true);
    try {
      const token = await getAccessToken();
      const res = await fetch(`/api/stores/${transferStore.id}/transfer`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ new_user_profile_id: transferTarget }),
      });
      const json = await res.json();
      if (json.error) { alert(json.error.message); return; }
      setTransferStore(null);
      setTransferTarget('');
      await load();
    } finally {
      setTransferring(false);
    }
  };

  const handleDelete = async (store: Toko) => {
    if (!confirm(`Hapus toko "${store.nama_toko}"? Tindakan ini tidak bisa dibatalkan.`)) return;
    const token = await getAccessToken();
    await fetch(`/api/stores/${store.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    await load();
  };

  const filtered = stores.filter(s => {
    const q = search.toLowerCase();
    const matchSearch = !q || s.nama_toko.toLowerCase().includes(q) || s.nama_pemilik.toLowerCase().includes(q) || (s.karyawan_name || '').toLowerCase().includes(q);
    const matchKar = !filterKaryawan || s.user_profile_id === filterKaryawan;
    return matchSearch && matchKar;
  });

  const uniqueKaryawan = Array.from(new Map(stores.map(s => [s.user_profile_id, { id: s.user_profile_id, name: s.karyawan_name, email: s.karyawan_email }])).values());

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Monitor Toko</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">{stores.length} toko terdaftar dari {uniqueKaryawan.length} karyawan</p>
        </div>
        <button onClick={load} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Cari nama toko / pemilik / karyawan..."
            className="w-full pl-9 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 dark:text-gray-100"
          />
        </div>
        <select
          value={filterKaryawan} onChange={e => setFilterKaryawan(e.target.value)}
          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 dark:text-gray-100 bg-white dark:bg-gray-800"
        >
          <option value="">Semua Karyawan</option>
          {uniqueKaryawan.map(k => (
            <option key={k.id} value={k.id}>{k.name || k.email}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-28 bg-gray-100 dark:bg-gray-700 animate-pulse rounded-xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <Store className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="font-medium text-gray-500 dark:text-gray-400">{search || filterKaryawan ? 'Tidak ada toko yang cocok' : 'Belum ada toko terdaftar'}</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filtered.map(toko => (
            <div key={toko.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
              <div className="flex">
                <div
                  className="w-28 flex-shrink-0 cursor-pointer"
                  onClick={() => toko.foto_toko && setFotoModal(toko.foto_toko)}
                >
                  {toko.foto_toko ? (
                    <img src={toko.foto_toko} alt={toko.nama_toko} className="w-full h-full object-cover min-h-[7rem] hover:opacity-90 transition-opacity" />
                  ) : (
                    <div className="w-full min-h-[7rem] h-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                      <ImageIcon className="w-7 h-7 text-gray-300" />
                    </div>
                  )}
                </div>
                <div className="flex-1 p-4 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-gray-900 dark:text-white truncate">{toko.nama_toko}</h3>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${toko.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'}`}>
                          {toko.status === 'active' ? 'Aktif' : 'Nonaktif'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Pemilik: {toko.nama_pemilik}</p>
                    </div>
                    <div className="flex gap-1.5 flex-shrink-0">
                      <button onClick={() => openEdit(toko)} title="Edit"
                        className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => { setTransferStore(toko); setTransferTarget(''); }} title="Transfer"
                        className="p-1.5 text-purple-500 hover:bg-purple-50 rounded-lg transition-colors">
                        <ArrowRightLeft className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(toko)} title="Hapus"
                        className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="mt-2 space-y-0.5">
                    <p className="flex items-center gap-1.5 text-xs text-orange-600">
                      <User className="w-3.5 h-3.5 flex-shrink-0" />
                      {toko.karyawan_name || toko.karyawan_email || '—'}
                    </p>
                    {toko.alamat && (
                      <p className="flex items-start gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                        <MapPin className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                        <span className="line-clamp-1">{toko.alamat}</span>
                      </p>
                    )}
                    {toko.nomor_hp && (
                      <p className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                        <Phone className="w-3.5 h-3.5 flex-shrink-0" />{toko.nomor_hp}
                      </p>
                    )}
                    {toko.sharelok && (
                      <a href={toko.sharelok} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-xs text-blue-600 hover:underline">
                        <ExternalLink className="w-3.5 h-3.5 flex-shrink-0" /> Lihat Lokasi
                      </a>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-1.5">
                    {new Date(toko.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {editingStore && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Edit Toko</h3>
              <button onClick={() => setEditingStore(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveEdit} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nama Toko <span className="text-red-500">*</span></label>
                <input required type="text" value={editForm.nama_toko}
                  onChange={e => setEditForm(f => ({ ...f, nama_toko: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 dark:text-gray-100" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nama Pemilik <span className="text-red-500">*</span></label>
                <input required type="text" value={editForm.nama_pemilik}
                  onChange={e => setEditForm(f => ({ ...f, nama_pemilik: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 dark:text-gray-100" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Alamat</label>
                <textarea rows={2} value={editForm.alamat}
                  onChange={e => setEditForm(f => ({ ...f, alamat: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 dark:text-gray-100 resize-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nomor HP</label>
                <input type="tel" value={editForm.nomor_hp}
                  onChange={e => setEditForm(f => ({ ...f, nomor_hp: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 dark:text-gray-100" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Sharelok / Link Peta</label>
                <input type="url" value={editForm.sharelok}
                  onChange={e => setEditForm(f => ({ ...f, sharelok: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 dark:text-gray-100" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
                <select value={editForm.status} onChange={e => setEditForm(f => ({ ...f, status: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 dark:text-gray-100 bg-white dark:bg-gray-800">
                  <option value="active">Aktif</option>
                  <option value="inactive">Nonaktif</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Foto Toko</label>
                {editFotoPreview ? (
                  <div className="relative">
                    <img src={editFotoPreview} alt="preview" className="w-full h-40 object-cover rounded-lg border" />
                    <label className="absolute bottom-2 right-2 bg-white dark:bg-gray-800 text-xs px-2 py-1 rounded-lg shadow cursor-pointer text-blue-600 hover:bg-blue-50 border border-blue-200">
                      Ganti Foto
                      <input type="file" accept="image/*" className="hidden" onChange={handleEditFoto} />
                    </label>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg h-28 cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors">
                    <ImageIcon className="w-7 h-7 text-gray-300 mb-1" />
                    <p className="text-sm text-gray-400">Pilih foto</p>
                    <input type="file" accept="image/*" className="hidden" onChange={handleEditFoto} />
                  </label>
                )}
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setEditingStore(null)}
                  className="flex-1 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50 dark:bg-gray-900">Batal</button>
                <button type="submit" disabled={saving}
                  className="flex-1 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                  {saving ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {transferStore && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <ArrowRightLeft className="w-5 h-5 text-purple-600" /> Transfer Toko
              </h3>
              <button onClick={() => setTransferStore(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleTransfer} className="p-5 space-y-4">
              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 text-sm">
                <p className="font-medium text-gray-800 dark:text-gray-200">{transferStore.nama_toko}</p>
                <p className="text-gray-500 dark:text-gray-400 text-xs mt-0.5">Karyawan saat ini: {transferStore.karyawan_name || transferStore.karyawan_email || '—'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Transfer ke Karyawan</label>
                <select required value={transferTarget} onChange={e => setTransferTarget(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 dark:text-gray-100 bg-white dark:bg-gray-800">
                  <option value="">— Pilih karyawan tujuan —</option>
                  {karyawanList
                    .filter(k => k.id !== transferStore.user_profile_id)
                    .map(k => (
                      <option key={k.id} value={k.id}>{k.full_name || k.email}</option>
                    ))}
                </select>
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setTransferStore(null)}
                  className="flex-1 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50 dark:bg-gray-900">Batal</button>
                <button type="submit" disabled={transferring || !transferTarget}
                  className="flex-1 py-2.5 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50">
                  {transferring ? 'Memindahkan...' : 'Transfer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {fotoModal && (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4" onClick={() => setFotoModal(null)}>
          <div className="relative max-w-2xl w-full">
            <img src={fotoModal} alt="foto toko" className="w-full max-h-[80vh] object-contain rounded-xl" />
            <button onClick={() => setFotoModal(null)} className="absolute top-3 right-3 bg-white dark:bg-gray-800 rounded-full p-1.5 shadow text-gray-700 dark:text-gray-300 hover:text-red-500">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
