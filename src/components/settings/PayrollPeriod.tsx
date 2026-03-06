import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Calendar, Save, Clock } from 'lucide-react';

interface PayrollPeriod {
  id?: string;
  attendance_start_day: number;
  attendance_end_day: number;
  payment_day: number;
  working_hours_per_day: number;
  overtime_multiplier: number;
}

export default function PayrollPeriod() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<PayrollPeriod>({
    attendance_start_day: 21,
    attendance_end_day: 20,
    payment_day: 25,
    working_hours_per_day: 8,
    overtime_multiplier: 1.5,
  });

  useEffect(() => {
    loadSettings();
  }, [user]);

  const loadSettings = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('payroll_periods')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!error && data) {
      setSettings(data);
    }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);

    const dataToSave = {
      user_id: user.id,
      ...settings,
    };

    let result;
    if (settings.id) {
      result = await supabase
        .from('payroll_periods')
        .update(dataToSave)
        .eq('id', settings.id);
    } else {
      result = await supabase
        .from('payroll_periods')
        .insert([dataToSave])
        .select()
        .single();
    }

    if (result.error) {
      alert('Gagal menyimpan: ' + result.error.message);
    } else {
      alert('Pengaturan berhasil disimpan!');
      if (result.data) {
        setSettings(result.data);
      }
    }
    setSaving(false);
  };

  if (loading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-blue-100 rounded-lg">
          <Calendar className="w-6 h-6 text-blue-600" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900">Periode Gaji</h2>
          <p className="text-sm text-gray-600">Atur periode penggajian dan jam kerja</p>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 mb-2">Periode Absensi</h3>
        <p className="text-sm text-blue-700">
          Tanggal {settings.attendance_start_day} bulan lalu s/d tanggal {settings.attendance_end_day} bulan ini
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Mulai Absensi (Tgl)
          </label>
          <input
            type="number"
            min="1"
            max="31"
            value={settings.attendance_start_day}
            onChange={(e) => setSettings({ ...settings, attendance_start_day: parseInt(e.target.value) })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-gray-500 mt-1">Biasanya tgl 21 bulan lalu</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Akhir Absensi (Tgl)
          </label>
          <input
            type="number"
            min="1"
            max="31"
            value={settings.attendance_end_day}
            onChange={(e) => setSettings({ ...settings, attendance_end_day: parseInt(e.target.value) })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-gray-500 mt-1">Biasanya tgl 20 bulan ini</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Tanggal Pembayaran
          </label>
          <input
            type="number"
            min="1"
            max="31"
            value={settings.payment_day}
            onChange={(e) => setSettings({ ...settings, payment_day: parseInt(e.target.value) })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-gray-500 mt-1">Biasanya tgl 25 atau akhir bulan</p>
        </div>
      </div>

      <div className="border-t border-gray-200 pt-6">
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5" />
          Jam Kerja & Lembur
        </h3>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Jam Kerja Normal per Hari
            </label>
            <input
              type="number"
              step="0.5"
              min="1"
              max="24"
              value={settings.working_hours_per_day}
              onChange={(e) => setSettings({ ...settings, working_hours_per_day: parseFloat(e.target.value) })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">Standar: 8 jam</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Multiplier Lembur
            </label>
            <input
              type="number"
              step="0.1"
              min="1"
              max="3"
              value={settings.overtime_multiplier}
              onChange={(e) => setSettings({ ...settings, overtime_multiplier: parseFloat(e.target.value) })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">Standar: 1.5x upah normal</p>
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-4 border-t border-gray-200">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
        </button>
      </div>
    </div>
  );
}
