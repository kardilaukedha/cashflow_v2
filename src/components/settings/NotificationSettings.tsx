import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Bell, Save, AlertTriangle, DollarSign, Calendar, Wallet } from 'lucide-react';
import { formatCurrency } from '../../lib/utils';

interface NotificationSettings {
  id?: string;
  runway_alert_enabled: boolean;
  runway_threshold_days: number;
  large_transaction_alert: boolean;
  large_transaction_threshold: number;
  salary_payment_reminder: boolean;
  loan_due_reminder: boolean;
  attendance_cutoff_reminder: boolean;
  weekly_summary_email: boolean;
}

export default function NotificationSettings() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<NotificationSettings>({
    runway_alert_enabled: true,
    runway_threshold_days: 30,
    large_transaction_alert: true,
    large_transaction_threshold: 5000000,
    salary_payment_reminder: true,
    loan_due_reminder: true,
    attendance_cutoff_reminder: true,
    weekly_summary_email: false,
  });

  useEffect(() => {
    loadSettings();
  }, [user]);

  const loadSettings = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('notification_settings')
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
        .from('notification_settings')
        .update(dataToSave)
        .eq('id', settings.id);
    } else {
      result = await supabase
        .from('notification_settings')
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
    return <div className="text-center py-8 dark:text-gray-400">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
          <Bell className="w-6 h-6 text-amber-600 dark:text-amber-400" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Notifikasi & Alert</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">Kelola notifikasi dan pengingat penting</p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-orange-600 dark:text-orange-400" />
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">Alert Runway Cashflow</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Peringatan saat runway di bawah threshold</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.runway_alert_enabled}
                onChange={(e) => setSettings({ ...settings, runway_alert_enabled: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 dark:bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
          {settings.runway_alert_enabled && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Threshold (hari)
              </label>
              <input
                type="number"
                min="1"
                value={settings.runway_threshold_days}
                onChange={(e) => setSettings({ ...settings, runway_threshold_days: parseInt(e.target.value) })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Alert saat runway kurang dari nilai ini</p>
            </div>
          )}
        </div>

        <div className="p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <DollarSign className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">Alert Transaksi Besar</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Notifikasi untuk transaksi di atas threshold</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.large_transaction_alert}
                onChange={(e) => setSettings({ ...settings, large_transaction_alert: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 dark:bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
          {settings.large_transaction_alert && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Threshold
              </label>
              <input
                type="number"
                step="100000"
                value={settings.large_transaction_threshold}
                onChange={(e) => setSettings({ ...settings, large_transaction_threshold: parseFloat(e.target.value) })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Alert untuk transaksi ≥ {formatCurrency(settings.large_transaction_threshold)}
              </p>
            </div>
          )}
        </div>

        <div className="p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">Reminder Pembayaran Gaji</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Pengingat H-3 sebelum tanggal gaji</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.salary_payment_reminder}
                onChange={(e) => setSettings({ ...settings, salary_payment_reminder: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 dark:bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </div>

        <div className="p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Wallet className="w-5 h-5 text-orange-600 dark:text-orange-400" />
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">Reminder Jatuh Tempo Pinjaman</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Notifikasi untuk cicilan pinjaman karyawan</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.loan_due_reminder}
                onChange={(e) => setSettings({ ...settings, loan_due_reminder: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 dark:bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </div>

        <div className="p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">Reminder Cut-off Absensi</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Pengingat H-2 sebelum cut-off absensi</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.attendance_cutoff_reminder}
                onChange={(e) => setSettings({ ...settings, attendance_cutoff_reminder: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 dark:bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </div>

        <div className="p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Bell className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">Weekly Summary Email</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Ringkasan cashflow mingguan via email</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.weekly_summary_email}
                onChange={(e) => setSettings({ ...settings, weekly_summary_email: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 dark:bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
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
