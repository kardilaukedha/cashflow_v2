import { useState, useMemo } from 'react';
import { SKU_LIST, SKU_CATEGORIES, type SkuItem } from '../../lib/skuList';
import { Search, X, Check, ChevronDown, ChevronUp } from 'lucide-react';

interface Props {
  storeName: string;
  selected: SkuItem[];
  onConfirm: (skus: SkuItem[]) => void;
  onClose: () => void;
}

export default function SkuPickerModal({ storeName, selected, onConfirm, onClose }: Props) {
  const [search, setSearch] = useState('');
  const [picks, setPicks] = useState<Set<string>>(new Set(selected.map(s => s.kode)));
  const [expandedCat, setExpandedCat] = useState<Set<string>>(new Set(SKU_CATEGORIES));

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return SKU_LIST;
    return SKU_LIST.filter(s =>
      s.nama.toLowerCase().includes(q) || s.kode.toLowerCase().includes(q) || s.kategori.toLowerCase().includes(q)
    );
  }, [search]);

  const grouped = useMemo(() => {
    const map: Record<string, SkuItem[]> = {};
    for (const s of filtered) {
      if (!map[s.kategori]) map[s.kategori] = [];
      map[s.kategori].push(s);
    }
    return map;
  }, [filtered]);

  const toggle = (kode: string) => {
    setPicks(prev => {
      const next = new Set(prev);
      if (next.has(kode)) next.delete(kode);
      else next.add(kode);
      return next;
    });
  };

  const toggleCat = (cat: string) => {
    setExpandedCat(prev => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  const selectAllInCat = (cat: string) => {
    const items = grouped[cat] || [];
    const allSelected = items.every(s => picks.has(s.kode));
    setPicks(prev => {
      const next = new Set(prev);
      if (allSelected) {
        items.forEach(s => next.delete(s.kode));
      } else {
        items.forEach(s => next.add(s.kode));
      }
      return next;
    });
  };

  const handleConfirm = () => {
    const result = SKU_LIST.filter(s => picks.has(s.kode));
    onConfirm(result);
  };

  const categories = search ? Object.keys(grouped) : SKU_CATEGORIES.filter(c => grouped[c]);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col shadow-2xl">
        <div className="px-5 py-4 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center justify-between mb-1">
            <h2 className="font-bold text-gray-900 text-base">Pilih SKU Drop</h2>
            <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
          <p className="text-xs text-gray-500 mb-3">Toko: <span className="font-medium text-gray-700">{storeName}</span></p>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Cari nama atau kode SKU..."
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              autoFocus
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                <X className="w-3.5 h-3.5 text-gray-400" />
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-2">
          {categories.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">Tidak ada SKU yang cocok</div>
          ) : (
            categories.map(cat => {
              const items = grouped[cat] || [];
              if (items.length === 0) return null;
              const isExpanded = expandedCat.has(cat);
              const allInCatSelected = items.every(s => picks.has(s.kode));
              const someInCatSelected = items.some(s => picks.has(s.kode));

              return (
                <div key={cat} className="mb-1">
                  <div
                    className="flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-gray-50 cursor-pointer select-none"
                    onClick={() => toggleCat(cat)}
                  >
                    <button
                      onClick={e => { e.stopPropagation(); selectAllInCat(cat); }}
                      className={`w-4 h-4 flex-shrink-0 rounded border-2 flex items-center justify-center transition-colors ${
                        allInCatSelected
                          ? 'bg-blue-600 border-blue-600'
                          : someInCatSelected
                          ? 'bg-blue-100 border-blue-400'
                          : 'border-gray-300'
                      }`}
                    >
                      {(allInCatSelected || someInCatSelected) && (
                        <Check className={`w-2.5 h-2.5 ${allInCatSelected ? 'text-white' : 'text-blue-600'}`} />
                      )}
                    </button>
                    <span className="flex-1 text-xs font-semibold text-gray-600 uppercase tracking-wider">{cat}</span>
                    <span className="text-xs text-gray-400">{items.filter(s => picks.has(s.kode)).length}/{items.length}</span>
                    {isExpanded ? <ChevronUp className="w-3.5 h-3.5 text-gray-400" /> : <ChevronDown className="w-3.5 h-3.5 text-gray-400" />}
                  </div>

                  {isExpanded && (
                    <div className="ml-2 space-y-0.5 mb-1">
                      {items.map(s => {
                        const checked = picks.has(s.kode);
                        return (
                          <label
                            key={s.kode}
                            className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                              checked ? 'bg-blue-50' : 'hover:bg-gray-50'
                            }`}
                          >
                            <div
                              className={`w-4 h-4 flex-shrink-0 rounded border-2 flex items-center justify-center transition-colors ${
                                checked ? 'bg-blue-600 border-blue-600' : 'border-gray-300'
                              }`}
                              onClick={() => toggle(s.kode)}
                            >
                              {checked && <Check className="w-2.5 h-2.5 text-white" />}
                            </div>
                            <div className="flex-1 min-w-0" onClick={() => toggle(s.kode)}>
                              <p className="text-sm text-gray-800 truncate">{s.nama}</p>
                            </div>
                            <span className={`text-xs font-mono font-medium flex-shrink-0 ${checked ? 'text-blue-600' : 'text-gray-400'}`}>
                              {s.kode}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        <div className="px-5 py-4 border-t border-gray-100 flex-shrink-0 flex items-center gap-3">
          <div className="flex-1 text-sm text-gray-600">
            {picks.size === 0
              ? <span className="text-orange-500">Belum ada SKU dipilih</span>
              : <span><strong className="text-blue-600">{picks.size}</strong> SKU dipilih</span>
            }
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Batal
          </button>
          <button
            onClick={handleConfirm}
            disabled={picks.size === 0}
            className="px-5 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Konfirmasi
          </button>
        </div>
      </div>
    </div>
  );
}
