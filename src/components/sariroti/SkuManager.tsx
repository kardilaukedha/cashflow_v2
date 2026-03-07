import { useState, useEffect, useMemo } from 'react';
import { Search, Plus, Edit2, Trash2, X, Save, Package, ToggleLeft, ToggleRight } from 'lucide-react';

interface SkuItem {
  id: number;
  kode: string;
  nama: string;
  kategori: string;
  cbp: number;
  is_active: boolean;
}

export default function SkuManager() {
  const [items, setItems] = useState<SkuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterKategori, setFilterKategori] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<SkuItem | null>(null);
  const [formData, setFormData] = useState({ kode: '', nama: '', kategori: '', cbp: 0 });
  const [saving, setSaving] = useState(false);

  const token = localStorage.getItem('sb_token');

  const loadItems = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/sku-items', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.data) setItems(json.data);
    } catch (err) {
      console.error('Failed to load SKU items', err);
    }
    setLoading(false);
  };

  useEffect(() => { loadItems(); }, []);

  const categories = useMemo(() => [...new Set(items.map(s => s.kategori))].sort(), [items]);

  const filtered = useMemo(() => {
    let result = items;
    if (filterKategori) result = result.filter(s => s.kategori === filterKategori);
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(s =>
        s.nama.toLowerCase().includes(q) || s.kode.toLowerCase().includes(q)
      );
    }
    return result;
  }, [items, search, filterKategori]);

  const openCreate = () => {
    setEditing(null);
    setFormData({ kode: '', nama: '', kategori: '', cbp: 0 });
    setShowForm(true);
  };

  const openEdit = (item: SkuItem) => {
    setEditing(item);
    setFormData({ kode: item.kode, nama: item.nama, kategori: item.kategori, cbp: item.cbp });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!formData.kode.trim() || !formData.nama.trim() || !formData.kategori.trim()) {
      alert('Kode, nama, dan kategori wajib diisi');
      return;
    }
    setSaving(true);
    try {
      const url = editing ? `/api/sku-items/${editing.id}` : '/api/sku-items';
      const method = editing ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(formData),
      });
      const json = await res.json();
      if (json.error) {
        alert(json.error.message);
      } else {
        setShowForm(false);
        loadItems();
      }
    } catch (err: any) {
      alert('Gagal menyimpan: ' + err.message);
    }
    setSaving(false);
  };

  const handleDelete = async (item: SkuItem) => {
    if (!confirm(`Hapus SKU "${item.kode} - ${item.nama}"?`)) return;
    try {
      const res = await fetch(`/api/sku-items/${item.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.error) alert(json.error.message);
      else loadItems();
    } catch (err: any) {
      alert('Gagal menghapus: ' + err.message);
    }
  };

  const toggleActive = async (item: SkuItem) => {
    try {
      await fetch(`/api/sku-items/${item.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ is_active: !item.is_active }),
      });
      loadItems();
    } catch (err) {
      console.error(err);
    }
  };

  const formatRupiah = (n: number) => 'Rp ' + n.toLocaleString('id-ID');

  if (loading) {
    return (
      <div className="space-y-4 max-w-4xl mx-auto">
        {[1, 2, 3].map(i => <div key={i} className="h-16 bg-gray-100 animate-pulse rounded-xl" />)}
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Kelola SKU</h1>
          <p className="text-xs sm:text-sm text-gray-500">{items.length} SKU terdaftar ({items.filter(s => s.is_active).length} aktif)</p>
        </div>
        <button onClick={openCreate}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm">
          <Plus className="w-4 h-4" /> Tambah SKU
        </button>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Cari kode atau nama SKU..."
            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
        </div>
        <select value={filterKategori} onChange={e => setFilterKategori(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 bg-white">
          <option value="">Semua Kategori</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Kode</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Nama</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Kategori</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600">CBP</th>
                <th className="text-center px-4 py-3 font-semibold text-gray-600">Status</th>
                <th className="text-center px-4 py-3 font-semibold text-gray-600">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-8 text-gray-400">Tidak ada SKU ditemukan</td></tr>
              ) : filtered.map(item => (
                <tr key={item.id} className={`border-b border-gray-100 hover:bg-gray-50 ${!item.is_active ? 'opacity-50' : ''}`}>
                  <td className="px-4 py-3 font-mono font-medium text-blue-600">{item.kode}</td>
                  <td className="px-4 py-3 text-gray-800">{item.nama}</td>
                  <td className="px-4 py-3">
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">{item.kategori}</span>
                  </td>
                  <td className="px-4 py-3 text-right text-gray-700">{formatRupiah(item.cbp)}</td>
                  <td className="px-4 py-3 text-center">
                    <button onClick={() => toggleActive(item)} title={item.is_active ? 'Nonaktifkan' : 'Aktifkan'}>
                      {item.is_active
                        ? <ToggleRight className="w-6 h-6 text-emerald-500 inline" />
                        : <ToggleLeft className="w-6 h-6 text-gray-400 inline" />}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => openEdit(item)} className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(item)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-bold text-gray-900">{editing ? 'Edit SKU' : 'Tambah SKU Baru'}</h2>
              <button onClick={() => setShowForm(false)} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Kode SKU *</label>
                <input type="text" value={formData.kode} onChange={e => setFormData({ ...formData, kode: e.target.value })}
                  placeholder="Contoh: RTKL" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nama Produk *</label>
                <input type="text" value={formData.nama} onChange={e => setFormData({ ...formData, nama: e.target.value })}
                  placeholder="Contoh: Roti Tawar Klasik" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Kategori *</label>
                <input type="text" value={formData.kategori} onChange={e => setFormData({ ...formData, kategori: e.target.value })}
                  list="sku-categories" placeholder="Contoh: Roti Tawar"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
                <datalist id="sku-categories">
                  {categories.map(c => <option key={c} value={c} />)}
                </datalist>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">CBP (Harga)</label>
                <input type="number" value={formData.cbp} onChange={e => setFormData({ ...formData, cbp: parseInt(e.target.value) || 0 })}
                  min="0" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
            <div className="px-5 py-4 border-t border-gray-100 flex gap-3 justify-end">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Batal</button>
              <button onClick={handleSave} disabled={saving}
                className="flex items-center gap-2 px-5 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium">
                <Save className="w-4 h-4" /> {saving ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
