import { useState, useRef, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { X, Camera, Scan, Trash2, Package, Receipt, CheckSquare, Upload, AlertTriangle, MapPin, CheckCircle2, Loader2 } from 'lucide-react';

interface RegisteredStore {
  id: number;
  nama_toko: string;
  nama_pemilik: string;
  alamat: string;
  nomor_hp: string;
  sharelok: string;
  status: string;
}

interface Props {
  visitPlanId: string;
  defaultStore: { name: string; address: string } | null;
  registeredStores?: RegisteredStore[];
  onClose: () => void;
  onSuccess: () => void;
}

interface BreadScan {
  barcode: string;
  bread_name: string;
  quantity: number;
  scan_type: 'drop' | 'tarik';
}

type VisitType = 'drop_roti' | 'tagihan' | 'drop_dan_tagihan';

const STEP_COUNT = 3;

type GpsStatus = 'idle' | 'loading' | 'ok' | 'error';

export default function CheckinModal({ visitPlanId, defaultStore, registeredStores = [], onClose, onSuccess }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState(1);
  const [storeName, setStoreName] = useState(defaultStore?.name || '');
  const [storeAddress, setStoreAddress] = useState(defaultStore?.address || '');
  const [selfieFile, setSelfieFile] = useState<File | null>(null);
  const [selfiePreview, setSelfiePreview] = useState('');
  const [visitType, setVisitType] = useState<VisitType | ''>('');
  const [totalBilling, setTotalBilling] = useState('');
  const [hasExpiredBread, setHasExpiredBread] = useState(false);
  const [notes, setNotes] = useState('');
  const [dropScans, setDropScans] = useState<BreadScan[]>([]);
  const [tarikaScans, setTarikScans] = useState<BreadScan[]>([]);
  const [barcodeInput, setBarcodeInput] = useState('');
  const [tarikBarcodeInput, setTarikBarcodeInput] = useState('');
  const [saving, setSaving] = useState(false);

  const [gpsStatus, setGpsStatus] = useState<GpsStatus>('idle');
  const [gpsLat, setGpsLat] = useState<number | null>(null);
  const [gpsLng, setGpsLng] = useState<number | null>(null);
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);

  const barcodeRef = useRef<HTMLInputElement>(null);
  const tarikRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setGpsStatus('loading');
    if (!navigator.geolocation) {
      setGpsStatus('error');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      pos => {
        setGpsLat(pos.coords.latitude);
        setGpsLng(pos.coords.longitude);
        setGpsAccuracy(pos.coords.accuracy);
        setGpsStatus('ok');
      },
      () => setGpsStatus('error'),
      { timeout: 10000, enableHighAccuracy: true }
    );
  }, []);

  const handleSelfie = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelfieFile(file);
    setSelfiePreview(URL.createObjectURL(file));
  };

  const addDropScan = () => {
    const code = barcodeInput.trim();
    if (!code) return;
    setDropScans(prev => {
      const existing = prev.find(s => s.barcode === code);
      if (existing) return prev.map(s => s.barcode === code ? { ...s, quantity: s.quantity + 1 } : s);
      return [...prev, { barcode: code, bread_name: code, quantity: 1, scan_type: 'drop' }];
    });
    setBarcodeInput('');
    barcodeRef.current?.focus();
  };

  const addTarikScan = () => {
    const code = tarikBarcodeInput.trim();
    if (!code) return;
    setTarikScans(prev => {
      const existing = prev.find(s => s.barcode === code);
      if (existing) return prev.map(s => s.barcode === code ? { ...s, quantity: s.quantity + 1 } : s);
      return [...prev, { barcode: code, bread_name: code, quantity: 1, scan_type: 'tarik' }];
    });
    setTarikBarcodeInput('');
    tarikRef.current?.focus();
  };

  const updateScanQty = (arr: BreadScan[], setArr: React.Dispatch<React.SetStateAction<BreadScan[]>>, barcode: string, delta: number) => {
    setArr(arr.map(s => s.barcode === barcode ? { ...s, quantity: Math.max(1, s.quantity + delta) } : s));
  };

  const removeScan = (arr: BreadScan[], setArr: React.Dispatch<React.SetStateAction<BreadScan[]>>, barcode: string) => {
    setArr(arr.filter(s => s.barcode !== barcode));
  };

  const handleSubmit = async () => {
    if (!storeName.trim()) { alert('Nama toko wajib diisi'); return; }
    if (!selfieFile) { alert('Foto selfie wajib dilampirkan'); return; }
    if (!visitType) { alert('Pilih jenis kunjungan'); return; }
    if ((visitType === 'tagihan' || visitType === 'drop_dan_tagihan') && !totalBilling) {
      alert('Input total penagihan'); return;
    }
    if ((visitType === 'drop_roti' || visitType === 'drop_dan_tagihan') && dropScans.length === 0) {
      alert('Scan minimal 1 roti yang di-drop'); return;
    }

    setSaving(true);
    try {
      const token = localStorage.getItem('sb_token');

      const fd = new FormData();
      fd.append('visit_plan_id', visitPlanId);
      fd.append('store_name', storeName.trim());
      fd.append('store_address', storeAddress.trim());
      fd.append('visit_type', visitType);
      fd.append('total_billing', totalBilling || '0');
      fd.append('has_expired_bread', String(hasExpiredBread));
      fd.append('notes', notes.trim());
      if (gpsLat !== null) fd.append('gps_lat', String(gpsLat));
      if (gpsLng !== null) fd.append('gps_lng', String(gpsLng));
      if (gpsAccuracy !== null) fd.append('gps_accuracy', String(gpsAccuracy));
      if (selfieFile) fd.append('selfie', selfieFile);

      const res = await fetch('/api/checkin', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const json = await res.json();

      if (res.status === 409) {
        alert(json.error?.message || 'Toko ini sudah di-check-in hari ini.');
        setSaving(false);
        return;
      }
      if (!res.ok || json.error) {
        throw new Error(json.error?.message || 'Gagal menyimpan check-in');
      }

      const checkin = json.data;

      const allScans = [
        ...dropScans.map(s => ({ ...s, checkin_id: checkin.id, user_id: checkin.user_id })),
        ...tarikaScans.map(s => ({ ...s, checkin_id: checkin.id, user_id: checkin.user_id })),
      ];
      if (allScans.length > 0) {
        await supabase.from('bread_scans').insert(allScans);
      }

      onSuccess();
    } catch (err: any) {
      alert('Gagal menyimpan check-in: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const needsDrop = visitType === 'drop_roti' || visitType === 'drop_dan_tagihan';
  const needsBilling = visitType === 'tagihan' || visitType === 'drop_dan_tagihan';

  const stepValid = () => {
    if (step === 1) return storeName.trim().length > 0 && !!selfieFile && !!visitType;
    if (step === 2) {
      if (needsDrop && dropScans.length === 0) return false;
      if (needsBilling && !totalBilling) return false;
      return true;
    }
    return true;
  };

  const GpsIndicator = () => {
    if (gpsStatus === 'loading') return (
      <span className="flex items-center gap-1 text-xs text-blue-500">
        <Loader2 className="w-3 h-3 animate-spin" /> Mengambil lokasi GPS...
      </span>
    );
    if (gpsStatus === 'ok') return (
      <span className="flex items-center gap-1 text-xs text-emerald-600">
        <CheckCircle2 className="w-3 h-3" /> Lokasi didapat (±{Math.round(gpsAccuracy || 0)}m)
      </span>
    );
    if (gpsStatus === 'error') return (
      <span className="flex items-center gap-1 text-xs text-orange-500">
        <AlertTriangle className="w-3 h-3" /> GPS tidak tersedia — check-in tetap bisa dilakukan
      </span>
    );
    return null;
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50">
      <div className="bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl shadow-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b flex-shrink-0">
          <div>
            <h3 className="text-base font-bold text-gray-900">Check-in Toko</h3>
            <div className="flex gap-1 mt-1 items-center">
              {Array.from({ length: STEP_COUNT }, (_, i) => (
                <div key={i} className={`h-1 w-8 rounded-full transition-colors ${i + 1 <= step ? 'bg-blue-600' : 'bg-gray-200'}`} />
              ))}
              <span className="text-xs text-gray-400 ml-1 self-center">{step}/{STEP_COUNT}</span>
              <span className="ml-2"><GpsIndicator /></span>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1"><X className="w-5 h-5" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {step === 1 && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nama Toko *</label>
                {defaultStore?.name ? (
                  <div className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-800 font-medium">
                    {storeName}
                  </div>
                ) : registeredStores.length > 0 ? (
                  <select
                    value={registeredStores.find(s => s.nama_toko === storeName) ? String(registeredStores.find(s => s.nama_toko === storeName)!.id) : ''}
                    onChange={e => {
                      const found = registeredStores.find(s => String(s.id) === e.target.value);
                      if (found) { setStoreName(found.nama_toko); setStoreAddress(found.alamat || ''); }
                      else { setStoreName(''); setStoreAddress(''); }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option value="">-- Pilih Toko --</option>
                    {registeredStores.map(s => (
                      <option key={s.id} value={String(s.id)}>{s.nama_toko}</option>
                    ))}
                  </select>
                ) : (
                  <input type="text" value={storeName} onChange={e => setStoreName(e.target.value)}
                    placeholder="Nama toko yang dikunjungi"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Alamat Toko</label>
                <input type="text" value={storeAddress} onChange={e => setStoreAddress(e.target.value)}
                  placeholder="Alamat (opsional)"
                  readOnly={!!defaultStore?.name || (registeredStores.length > 0 && !!storeName)}
                  className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 ${
                    (!!defaultStore?.name || (registeredStores.length > 0 && !!storeName)) ? 'bg-gray-50 border-gray-200 text-gray-500' : 'border-gray-300'
                  }`} />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Foto Selfie *</label>
                <input type="file" accept="image/*" capture="user" ref={fileRef} onChange={handleSelfie} className="hidden" />
                {selfiePreview ? (
                  <div className="relative">
                    <img src={selfiePreview} alt="Selfie" className="w-full h-48 object-cover rounded-xl border border-gray-200" />
                    <button onClick={() => { setSelfieFile(null); setSelfiePreview(''); }}
                      className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-7 h-7 flex items-center justify-center text-xs hover:bg-red-600">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <button onClick={() => fileRef.current?.click()}
                    className="w-full h-36 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center gap-2 text-gray-400 hover:border-blue-400 hover:text-blue-500 transition-colors">
                    <Camera className="w-8 h-8" />
                    <span className="text-sm font-medium">Ambil Foto Selfie</span>
                    <span className="text-xs">Tap untuk membuka kamera</span>
                  </button>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Jenis Kunjungan *</label>
                <div className="grid grid-cols-3 gap-2">
                  {([
                    { v: 'drop_roti', label: 'Drop Roti', Icon: Package },
                    { v: 'tagihan', label: 'Tagihan', Icon: Receipt },
                    { v: 'drop_dan_tagihan', label: 'Drop & Tagihan', Icon: CheckSquare },
                  ] as const).map(({ v, label, Icon }) => (
                    <button key={v} type="button" onClick={() => setVisitType(v)}
                      className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all text-center ${visitType === v ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600 hover:border-blue-200'}`}>
                      <Icon className="w-5 h-5" />
                      <span className="text-xs font-medium leading-tight">{label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              {needsDrop && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Package className="w-4 h-4 text-blue-600" />
                    <h4 className="font-semibold text-gray-900 text-sm">Scan Roti Drop</h4>
                    <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full">{dropScans.reduce((s, c) => s + c.quantity, 0)} item</span>
                  </div>
                  <div className="flex gap-2 mb-3">
                    <input ref={barcodeRef} type="text" value={barcodeInput} onChange={e => setBarcodeInput(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && addDropScan()}
                      placeholder="Scan / ketik barcode roti lalu Enter"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
                    <button onClick={addDropScan} className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                      <Scan className="w-4 h-4" />
                    </button>
                  </div>
                  {dropScans.length === 0 && (
                    <p className="text-xs text-gray-400 text-center py-2">Belum ada roti di-scan</p>
                  )}
                  <div className="space-y-2 max-h-36 overflow-y-auto">
                    {dropScans.map(s => (
                      <div key={s.barcode} className="flex items-center gap-2 bg-blue-50 rounded-lg px-3 py-2">
                        <Package className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                        <span className="text-sm font-medium text-gray-800 flex-1">{s.barcode}</span>
                        <div className="flex items-center gap-1">
                          <button onClick={() => updateScanQty(dropScans, setDropScans, s.barcode, -1)} className="w-6 h-6 bg-white rounded text-gray-600 border text-xs hover:bg-gray-100">-</button>
                          <span className="w-8 text-center text-sm font-semibold">{s.quantity}</span>
                          <button onClick={() => updateScanQty(dropScans, setDropScans, s.barcode, 1)} className="w-6 h-6 bg-white rounded text-gray-600 border text-xs hover:bg-gray-100">+</button>
                        </div>
                        <button onClick={() => removeScan(dropScans, setDropScans, s.barcode)} className="text-red-400 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {needsBilling && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Total Penagihan (Rp) *</label>
                  <input type="number" value={totalBilling} onChange={e => setTotalBilling(e.target.value)}
                    placeholder="0" min="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
                </div>
              )}

              <div>
                <div className="flex items-center gap-2 mb-3">
                  <input type="checkbox" id="expired" checked={hasExpiredBread} onChange={e => setHasExpiredBread(e.target.checked)}
                    className="w-4 h-4 rounded text-orange-500" />
                  <label htmlFor="expired" className="text-sm font-medium text-gray-700 flex items-center gap-1.5 cursor-pointer">
                    <AlertTriangle className="w-4 h-4 text-orange-500" /> Ada roti kadaluarsa / ditarik
                  </label>
                </div>
                {hasExpiredBread && (
                  <div className="bg-orange-50 rounded-xl p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-medium text-orange-700">Scan roti yang ditarik / kadaluarsa:</p>
                      <span className="text-xs bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full">{tarikaScans.reduce((s, c) => s + c.quantity, 0)} item</span>
                    </div>
                    <div className="flex gap-2">
                      <input ref={tarikRef} type="text" value={tarikBarcodeInput} onChange={e => setTarikBarcodeInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && addTarikScan()}
                        placeholder="Barcode roti tarik / kadaluarsa"
                        className="flex-1 px-3 py-2 border border-orange-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-400 bg-white" />
                      <button onClick={addTarikScan} className="px-3 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors">
                        <Scan className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="space-y-1.5 max-h-28 overflow-y-auto">
                      {tarikaScans.map(s => (
                        <div key={s.barcode} className="flex items-center gap-2 bg-white rounded-lg px-3 py-1.5">
                          <AlertTriangle className="w-3.5 h-3.5 text-orange-400 flex-shrink-0" />
                          <span className="text-sm flex-1">{s.barcode}</span>
                          <div className="flex items-center gap-1">
                            <button onClick={() => updateScanQty(tarikaScans, setTarikScans, s.barcode, -1)} className="w-6 h-6 bg-gray-100 rounded text-gray-600 text-xs hover:bg-gray-200">-</button>
                            <span className="w-8 text-center text-sm font-semibold">{s.quantity}</span>
                            <button onClick={() => updateScanQty(tarikaScans, setTarikScans, s.barcode, 1)} className="w-6 h-6 bg-gray-100 rounded text-gray-600 text-xs hover:bg-gray-200">+</button>
                          </div>
                          <button onClick={() => removeScan(tarikaScans, setTarikScans, s.barcode)} className="text-red-400 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                <h4 className="font-semibold text-gray-900 text-sm">Ringkasan Check-in</h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><p className="text-xs text-gray-400">Toko</p><p className="font-medium">{storeName}</p></div>
                  <div><p className="text-xs text-gray-400">Jenis Kunjungan</p><p className="font-medium capitalize">{visitType.replace(/_/g,' ')}</p></div>
                  {selfiePreview && <div className="col-span-2"><p className="text-xs text-gray-400 mb-1">Selfie</p><img src={selfiePreview} className="h-24 w-24 object-cover rounded-lg" /></div>}
                  {needsDrop && <div><p className="text-xs text-gray-400">Drop Roti</p><p className="font-medium">{dropScans.reduce((s,c)=>s+c.quantity,0)} item ({dropScans.length} SKU)</p></div>}
                  {needsBilling && <div><p className="text-xs text-gray-400">Total Tagihan</p><p className="font-medium">Rp {Number(totalBilling||0).toLocaleString('id-ID')}</p></div>}
                  {hasExpiredBread && <div><p className="text-xs text-gray-400">Roti Tarik</p><p className="font-medium text-orange-600">{tarikaScans.reduce((s,c)=>s+c.quantity,0)} item</p></div>}
                  <div className="col-span-2">
                    <p className="text-xs text-gray-400 mb-1 flex items-center gap-1"><MapPin className="w-3 h-3" />GPS</p>
                    {gpsStatus === 'ok' ? (
                      <a href={`https://www.google.com/maps?q=${gpsLat},${gpsLng}`} target="_blank" rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:underline">
                        {gpsLat?.toFixed(6)}, {gpsLng?.toFixed(6)} (±{Math.round(gpsAccuracy||0)}m)
                      </a>
                    ) : (
                      <p className="text-xs text-gray-400">{gpsStatus === 'loading' ? 'Mengambil lokasi...' : 'GPS tidak tersedia'}</p>
                    )}
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Catatan (opsional)</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
                  placeholder="Catatan tambahan..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 resize-none" />
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-2 p-5 border-t flex-shrink-0">
          {step > 1 && (
            <button onClick={() => setStep(step - 1)} className="flex-1 bg-gray-100 text-gray-700 py-2.5 rounded-xl font-medium text-sm hover:bg-gray-200 transition-colors">
              Kembali
            </button>
          )}
          {step < STEP_COUNT && (
            <button onClick={() => setStep(step + 1)} disabled={!stepValid()}
              className="flex-1 bg-blue-600 text-white py-2.5 rounded-xl font-medium text-sm hover:bg-blue-700 disabled:opacity-50 transition-colors">
              Lanjut
            </button>
          )}
          {step === STEP_COUNT && (
            <button onClick={handleSubmit} disabled={saving}
              className="flex-1 bg-emerald-600 text-white py-2.5 rounded-xl font-medium text-sm hover:bg-emerald-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
              <Upload className="w-4 h-4" /> {saving ? 'Menyimpan...' : 'Simpan Check-in'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
