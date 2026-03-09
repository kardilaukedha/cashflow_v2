import { useState, useMemo, useEffect } from 'react';
import { getApiUrl, getApiHeaders } from '../../lib/supabase';
import type { SkuItem, SkuWithQty } from '../../lib/skuList';
import { Search, X, Check, ChevronDown, ChevronUp } from 'lucide-react';

interface Props {
  storeName: string;
  selected: SkuWithQty[];
  onConfirm: (skus: SkuWithQty[]) => void;
  onClose: () => void;
}

export default function SkuPickerModal({ storeName, selected, onConfirm, onClose }: Props) {
  const [search, setSearch] = useState('');
  const [picks, setPicks] = useState<Map<string, number>>(
    new Map(selected.map(s => [s.kode, s.qty || 1]))
  );
  const [skuList, setSkuList] = useState<SkuItem[]>([]);
  const [skuCategories, setSkuCategories] = useState<string[]>([]);
  const [expandedCat, setExpandedCat] = useState<Set<string>>(new Set());
  const [loadingSkus, setLoadingSkus] = useState(true);

  useEffect(() => {
    const loadSkus = async () => {
      try {
        const res = await fetch(getApiUrl('/sku-items?active_only=true'), {
          headers: getApiHeaders(),
        });
        const json = await res.json();
        if (json.data) {
          setSkuList(json.data);
          const cats = [...new Set(json.data.map((s: SkuItem) => s.kategori))] as string[];
          setSkuCategories(cats);
          setExpandedCat(new Set(cats));
        }
      } catch {
        const { SKU_LIST, SKU_CATEGORIES } = await import('../../lib/skuList');
        setSkuList(SKU_LIST);
        setSkuCategories(SKU_CATEGORIES);
        setExpandedCat(new Set(SKU_CATEGORIES));
      }
      setLoadingSkus(false);
    };
    loadSkus();
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return skuList;
    return skuList.filter(s =>
      s.nama.toLowerCase().includes(q) || s.kode.toLowerCase().includes(q) || s.kategori.toLowerCase().includes(q)
    );
  }, [search, skuList]);

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
      const next = new Map(prev);
      if (next.has(kode)) next.delete(kode);
      else next.set(kode, 1);
      return next;
    });
  };

  const setQty = (kode: string, qty: number) => {
    setPicks(prev => {
      const next = new Map(prev);
      if (qty <= 0) next.delete(kode);
      else next.set(kode, qty);
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
      const next = new Map(prev);
      if (allSelected) {
        items.forEach(s => next.delete(s.kode));
      } else {
        items.forEach(s => { if (!next.has(s.kode)) next.set(s.kode, 1); });
      }
      return next;
    });
  };

  const handleConfirm = () => {
    const result: SkuWithQty[] = skuList
      .filter(s => picks.has(s.kode))
      .map(s => ({ ...s, qty: picks.get(s.kode) || 1 }));
    onConfirm(result);
  };

  const categories = search ? Object.keys(grouped) : skuCategories.filter(c => grouped[c]);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col shadow-2xl">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700 flex-shrink-0">
          <div className="flex items-center justify-between mb-1">
            <h2 className="font-bold text-gray-900 dark:text-white text-base">Pilih SKU Drop</h2>
            <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">Toko: <span className="font-medium text-gray-700 dark:text-gray-300">{storeName}</span></p>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Cari nama atau kode SKU..."
              className="w-full pl-9 pr-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 dark:text-gray-100 focus:border-transparent"
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
          {loadingSkus ? (
            <div className="text-center py-8 text-gray-400 text-sm">Memuat data SKU...</div>
          ) : categories.length === 0 ? (
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
                    className="flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-gray-50 dark:bg-gray-900 cursor-pointer select-none"
                    onClick={() => toggleCat(cat)}
                  >
                    <button
                      onClick={e => { e.stopPropagation(); selectAllInCat(cat); }}
                      className={`w-4 h-4 flex-shrink-0 rounded border-2 flex items-center justify-center transition-colors ${
                        allInCatSelected
                          ? 'bg-blue-600 border-blue-600'
                          : someInCatSelected
                          ? 'bg-blue-100 border-blue-400'
                          : 'border-gray-300 dark:border-gray-600'
                      }`}
                    >
                      {(allInCatSelected || someInCatSelected) && (
                        <Check className={`w-2.5 h-2.5 ${allInCatSelected ? 'text-white' : 'text-blue-600'}`} />
                      )}
                    </button>
                    <span className="flex-1 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">{cat}</span>
                    <span className="text-xs text-gray-400">{items.filter(s => picks.has(s.kode)).length}/{items.length}</span>
                    {isExpanded ? <ChevronUp className="w-3.5 h-3.5 text-gray-400" /> : <ChevronDown className="w-3.5 h-3.5 text-gray-400" />}
                  </div>

                  {isExpanded && (
                    <div className="ml-2 space-y-0.5 mb-1">
                      {items.map(s => {
                        const checked = picks.has(s.kode);
                        const qty = picks.get(s.kode) || 0;
                        return (
                          <div
                            key={s.kode}
                            className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                              checked ? 'bg-blue-50' : 'hover:bg-gray-50 dark:bg-gray-900'
                            }`}
                          >
                            <div
                              className={`w-4 h-4 flex-shrink-0 rounded border-2 flex items-center justify-center transition-colors cursor-pointer ${
                                checked ? 'bg-blue-600 border-blue-600' : 'border-gray-300 dark:border-gray-600'
                              }`}
                              onClick={() => toggle(s.kode)}
                            >
                              {checked && <Check className="w-2.5 h-2.5 text-white" />}
                            </div>
                            <div className="flex-1 min-w-0 cursor-pointer" onClick={() => toggle(s.kode)}>
                              <p className="text-sm text-gray-800 dark:text-gray-200 truncate">{s.nama}</p>
                            </div>
                            <span className={`text-xs font-mono font-medium flex-shrink-0 ${checked ? 'text-blue-600' : 'text-gray-400'}`}>
                              {s.kode}
                            </span>
                            {checked && (
                              <div className="flex items-center gap-1 flex-shrink-0 ml-1">
                                <button onClick={() => setQty(s.kode, qty - 1)}
                                  className="w-6 h-6 bg-white dark:bg-gray-800 rounded border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 text-xs hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-center">-</button>
                                <input
                                  type="number"
                                  value={qty}
                                  onChange={e => {
                                    const v = parseInt(e.target.value);
                                    if (!isNaN(v) && v > 0) setQty(s.kode, v);
                                  }}
                                  className="w-12 text-center text-sm font-semibold border border-gray-300 dark:border-gray-600 rounded py-0.5"
                                  min="1"
                                />
                                <button onClick={() => setQty(s.kode, qty + 1)}
                                  className="w-6 h-6 bg-white dark:bg-gray-800 rounded border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 text-xs hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-center">+</button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        <div className="px-5 py-4 border-t border-gray-100 dark:border-gray-700 flex-shrink-0 flex items-center gap-3">
          <div className="flex-1 text-sm text-gray-600 dark:text-gray-400">
            {picks.size === 0
              ? <span className="text-orange-500">Belum ada SKU dipilih</span>
              : <span><strong className="text-blue-600">{picks.size}</strong> SKU dipilih, total <strong className="text-blue-600">{Array.from(picks.values()).reduce((a, b) => a + b, 0)}</strong> qty</span>
            }
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
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
