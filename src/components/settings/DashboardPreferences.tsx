import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Layout, Save, Eye, EyeOff } from 'lucide-react';

interface DashboardPreferences {
  id?: string;
  visible_widgets: string[];
  default_date_range: string;
  chart_colors: Record<string, string>;
}

export default function DashboardPreferences() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [preferences, setPreferences] = useState<DashboardPreferences>({
    visible_widgets: ['balance', 'income', 'expense', 'runway', 'trend_chart', 'category_chart', 'transactions'],
    default_date_range: '30_days',
    chart_colors: {},
  });

  const widgets = [
    { id: 'balance', name: 'Saldo Kas', description: 'Menampilkan saldo kas saat ini' },
    { id: 'income', name: 'Pemasukan Bulan Ini', description: 'Total pemasukan bulan berjalan' },
    { id: 'expense', name: 'Pengeluaran Bulan Ini', description: 'Total pengeluaran bulan berjalan' },
    { id: 'runway', name: 'Runway', description: 'Estimasi berapa lama kas bertahan' },
    { id: 'trend_chart', name: 'Chart Tren 6 Bulan', description: 'Grafik tren cashflow' },
    { id: 'category_chart', name: 'Chart Kategori', description: 'Grafik breakdown per kategori' },
    { id: 'transactions', name: 'Transaksi Terkini', description: 'List transaksi terbaru' },
  ];

  const dateRanges = [
    { value: '7_days', label: '7 Hari' },
    { value: '30_days', label: '30 Hari' },
    { value: '90_days', label: '90 Hari' },
    { value: '6_months', label: '6 Bulan' },
    { value: '1_year', label: '1 Tahun' },
  ];

  useEffect(() => {
    loadPreferences();
  }, [user]);

  const loadPreferences = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('admin_dashboard_preferences')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!error && data) {
      setPreferences({
        id: data.id,
        visible_widgets: data.visible_widgets || [],
        default_date_range: data.default_date_range || '30_days',
        chart_colors: data.chart_colors || {},
      });
    }
    setLoading(false);
  };

  const toggleWidget = (widgetId: string) => {
    const visible = preferences.visible_widgets;
    if (visible.includes(widgetId)) {
      setPreferences({
        ...preferences,
        visible_widgets: visible.filter(id => id !== widgetId),
      });
    } else {
      setPreferences({
        ...preferences,
        visible_widgets: [...visible, widgetId],
      });
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);

    const dataToSave = {
      user_id: user.id,
      visible_widgets: preferences.visible_widgets,
      default_date_range: preferences.default_date_range,
      chart_colors: preferences.chart_colors,
    };

    let result;
    if (preferences.id) {
      result = await supabase
        .from('admin_dashboard_preferences')
        .update(dataToSave)
        .eq('id', preferences.id);
    } else {
      result = await supabase
        .from('admin_dashboard_preferences')
        .insert([dataToSave])
        .select()
        .single();
    }

    if (result.error) {
      alert('Gagal menyimpan: ' + result.error.message);
    } else {
      alert('Preferensi berhasil disimpan! Refresh halaman untuk melihat perubahan.');
      if (result.data) {
        setPreferences({ ...preferences, id: result.data.id });
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
        <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
          <Layout className="w-6 h-6 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Preferensi Dashboard</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">Kustomisasi tampilan dashboard Anda</p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Widget Visibility</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Pilih widget mana yang ingin ditampilkan di dashboard
        </p>

        <div className="space-y-3">
          {widgets.map((widget) => (
            <div
              key={widget.id}
              className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
            >
              <div className="flex items-center gap-3">
                {preferences.visible_widgets.includes(widget.id) ? (
                  <Eye className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                ) : (
                  <EyeOff className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                )}
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white">{widget.name}</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{widget.description}</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={preferences.visible_widgets.includes(widget.id)}
                  onChange={() => toggleWidget(widget.id)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 dark:bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Default Date Range</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Pilih rentang tanggal default untuk chart dan laporan
        </p>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {dateRanges.map((range) => (
            <label
              key={range.value}
              className={`flex items-center justify-center p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                preferences.default_date_range === range.value
                  ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                  : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:border-blue-300 dark:hover:border-blue-700'
              }`}
            >
              <input
                type="radio"
                name="date_range"
                value={range.value}
                checked={preferences.default_date_range === range.value}
                onChange={(e) => setPreferences({ ...preferences, default_date_range: e.target.value })}
                className="sr-only"
              />
              <span className="font-medium">{range.label}</span>
            </label>
          ))}
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
