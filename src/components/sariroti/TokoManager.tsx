import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Store, Plus, X, Phone, MapPin, ExternalLink, ImageIcon, RefreshCw, CheckCircle } from 'lucide-react';

interface Toko {
  id: number;
  user_profile_id: string;
  nama_toko: string;
  nama_pemilik: string;
  alamat: string;
  nomor_hp: string;
  sharelok: string;
  foto_toko: string;
  status: string;
  created_at: string;
}

const EMPTY_FORM = {
  nama_toko: '',
  nama_pemilik: '',
  alamat: '',
  nomor_hp: '',
  sharelok: '',
};

export default function TokoManager() {
  const { } = useAuth();
  const [stores, setStores] = useState<Toko[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [fotoFile, setFotoFile] = useState<File | null>(null);
  const [fotoPreview, setFotoPreview] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [successId, setSuccessId] = useState<number | null>(null);

  const token = localStorage.getItem('sb_token');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/stores', { headers: { Authorization: `Bearer ${token}` } });
      const json = await res.json();
      if (json.data) setStores(json.data);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const handleFotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFotoFile(file);
    setFotoPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nama_toko.trim() || !form.nama_pemilik.trim()) {
      alert('Nama toko dan nama pemilik wajib diisi');
      return;
    }
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('nama_toko', form.nama_toko);
      fd.append('nama_pemilik', form.nama_pemilik);
      fd.append('alamat', form.alamat);
      fd.append('nomor_hp', form.nomor_hp);
      fd.append('sharelok', form.sharelok);
      if (fotoFile) fd.append('foto_toko', fotoFile);

      const res = await fetch('/api/stores', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const json = await res.json();
      if (json.error) { alert(json.error.message); return; }

      setSuccessId(json.data.id);
      setTimeout(() => setSuccessId(null), 3000);
      setForm(EMPTY_FORM);
      setFotoFile(null);
      setFotoPreview('');
      setShowForm(false);
      await load();
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setFotoFile(null);
    setFotoPreview('');
    setShowForm(false);
  };

  return (
    <div className="space-y-5 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Toko Saya</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Daftar toko yang telah Anda daftarkan</p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm"
          >
            <Plus className="w-4 h-4" /> Daftarkan Toko
          </button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2].map(i => <div key={i} className="h-28 bg-gray-100 dark:bg-gray-700 animate-pulse rounded-xl" />)}
        </div>
      ) : stores.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <Store className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="font-medium text-gray-500 dark:text-gray-400">Belum ada toko yang didaftarkan</p>
          <p className="text-sm text-gray-400 mt-1">Klik "Daftarkan Toko" untuk mulai</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {stores.map(toko => (
            <div key={toko.id} className={`bg-white dark:bg-gray-800 rounded-xl border overflow-hidden shadow-sm transition-all ${successId === toko.id ? 'border-green-400 ring-2 ring-green-200' : 'border-gray-200 dark:border-gray-700'}`}>
              <div className="flex flex-col sm:flex-row">
                {toko.foto_toko ? (
                  <div className="w-full h-40 sm:w-32 sm:h-32 flex-shrink-0">
                    <img src={toko.foto_toko} alt={toko.nama_toko} className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="w-full h-32 sm:w-32 sm:h-32 flex-shrink-0 bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                    <ImageIcon className="w-8 h-8 text-gray-300" />
                  </div>
                )}
                <div className="flex-1 p-4 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-gray-900 dark:text-white text-base truncate">{toko.nama_toko}</h3>
                        {successId === toko.id && <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />}
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Pemilik: {toko.nama_pemilik}</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${toko.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'}`}>
                      {toko.status === 'active' ? 'Aktif' : 'Nonaktif'}
                    </span>
                  </div>
                  <div className="mt-2 space-y-1">
                    {toko.alamat && (
                      <p className="flex items-start gap-1.5 text-xs text-gray-600 dark:text-gray-400">
                        <MapPin className="w-3.5 h-3.5 text-gray-400 mt-0.5 flex-shrink-0" />
                        <span className="line-clamp-2">{toko.alamat}</span>
                      </p>
                    )}
                    {toko.nomor_hp && (
                      <p className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400">
                        <Phone className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                        {toko.nomor_hp}
                      </p>
                    )}
                    {toko.sharelok && (
                      <a href={toko.sharelok} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-xs text-blue-600 hover:underline">
                        <ExternalLink className="w-3.5 h-3.5 flex-shrink-0" />
                        Lihat Lokasi
                      </a>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-2">
                    Didaftarkan: {new Date(toko.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Store className="w-5 h-5 text-blue-600" /> Daftarkan Toko Baru
              </h3>
              <button onClick={resetForm} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nama Toko <span className="text-red-500">*</span></label>
                <input
                  type="text" required value={form.nama_toko}
                  onChange={e => setForm(f => ({ ...f, nama_toko: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 dark:text-gray-100 focus:border-transparent"
                  placeholder="Contoh: Minimarket Sejahtera"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nama Pemilik <span className="text-red-500">*</span></label>
                <input
                  type="text" required value={form.nama_pemilik}
                  onChange={e => setForm(f => ({ ...f, nama_pemilik: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 dark:text-gray-100 focus:border-transparent"
                  placeholder="Nama lengkap pemilik toko"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Alamat</label>
                <textarea
                  rows={2} value={form.alamat}
                  onChange={e => setForm(f => ({ ...f, alamat: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 dark:text-gray-100 focus:border-transparent resize-none"
                  placeholder="Alamat lengkap toko"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nomor HP Pemilik</label>
                <input
                  type="tel" value={form.nomor_hp}
                  onChange={e => setForm(f => ({ ...f, nomor_hp: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 dark:text-gray-100 focus:border-transparent"
                  placeholder="08xxxxxxxxxx"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Sharelok / Link Peta</label>
                <input
                  type="url" value={form.sharelok}
                  onChange={e => setForm(f => ({ ...f, sharelok: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 dark:text-gray-100 focus:border-transparent"
                  placeholder="https://maps.google.com/..."
                />
                <p className="text-xs text-gray-400 mt-0.5">Tempel link Google Maps atau shareloc di sini</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Foto Toko</label>
                {fotoPreview ? (
                  <div className="relative">
                    <img src={fotoPreview} alt="preview" className="w-full h-40 object-cover rounded-lg border border-gray-200 dark:border-gray-700" />
                    <button
                      type="button"
                      onClick={() => { setFotoFile(null); setFotoPreview(''); }}
                      className="absolute top-2 right-2 bg-white dark:bg-gray-800 rounded-full p-1 shadow text-gray-500 dark:text-gray-400 hover:text-red-500"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg h-32 cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors">
                    <ImageIcon className="w-8 h-8 text-gray-300 mb-1" />
                    <p className="text-sm text-gray-400">Klik untuk pilih foto</p>
                    <p className="text-xs text-gray-300">JPG, PNG, maks 10MB</p>
                    <input type="file" accept="image/*" className="hidden" onChange={handleFotoChange} />
                  </label>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button" onClick={resetForm}
                  className="flex-1 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:bg-gray-900 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit" disabled={saving}
                  className="flex-1 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {saving ? 'Menyimpan...' : 'Daftarkan Toko'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
