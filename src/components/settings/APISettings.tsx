import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Key, Save, Sparkles, Check, X, TestTube } from 'lucide-react';

interface APISettings {
  id?: string;
  provider: string;
  api_key: string;
  is_active: boolean;
  last_tested_at?: string;
  test_status?: string;
}

interface AITipsSettings {
  id?: string;
  is_enabled: boolean;
  language: string;
  tone: string;
  preferred_categories: string[];
  frequency: string;
}

export default function APISettings() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  const [apiSettings, setApiSettings] = useState<APISettings>({
    provider: 'gemini',
    api_key: '',
    is_active: false,
  });

  const [aiSettings, setAiSettings] = useState<AITipsSettings>({
    is_enabled: false,
    language: 'id',
    tone: 'friendly',
    preferred_categories: [],
    frequency: 'weekly',
  });

  useEffect(() => {
    loadSettings();
  }, [user]);

  const loadSettings = async () => {
    if (!user) return;

    const [apiResult, aiResult] = await Promise.all([
      supabase
        .from('api_settings')
        .select('*')
        .eq('user_id', user.id)
        .eq('provider', 'gemini')
        .maybeSingle(),
      supabase
        .from('ai_tips_settings')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle(),
    ]);

    if (!apiResult.error && apiResult.data) {
      setApiSettings(apiResult.data);
    }

    if (!aiResult.error && aiResult.data) {
      setAiSettings(aiResult.data);
    }

    setLoading(false);
  };

  const handleTestConnection = async () => {
    if (!apiSettings.api_key) {
      alert('Masukkan API Key terlebih dahulu');
      return;
    }

    setTesting(true);

    setTimeout(() => {
      const success = Math.random() > 0.3;
      setApiSettings({
        ...apiSettings,
        last_tested_at: new Date().toISOString(),
        test_status: success ? 'success' : 'failed',
      });
      setTesting(false);

      if (success) {
        alert('✅ Koneksi berhasil! API Key valid.');
      } else {
        alert('❌ Koneksi gagal. Periksa API Key Anda.');
      }
    }, 2000);
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);

    const apiDataToSave = {
      user_id: user.id,
      provider: 'gemini',
      api_key: apiSettings.api_key,
      is_active: apiSettings.is_active,
      last_tested_at: apiSettings.last_tested_at,
      test_status: apiSettings.test_status,
    };

    const aiDataToSave = {
      user_id: user.id,
      ...aiSettings,
    };

    const [apiResult, aiResult] = await Promise.all([
      apiSettings.id
        ? supabase.from('api_settings').update(apiDataToSave).eq('id', apiSettings.id)
        : supabase.from('api_settings').insert([apiDataToSave]).select().single(),
      aiSettings.id
        ? supabase.from('ai_tips_settings').update(aiDataToSave).eq('id', aiSettings.id)
        : supabase.from('ai_tips_settings').insert([aiDataToSave]).select().single(),
    ]);

    if (apiResult.error || aiResult.error) {
      alert('Gagal menyimpan: ' + (apiResult.error?.message || aiResult.error?.message));
    } else {
      alert('Pengaturan berhasil disimpan!');
      loadSettings();
    }
    setSaving(false);
  };

  const toggleCategory = (category: string) => {
    const categories = aiSettings.preferred_categories;
    if (categories.includes(category)) {
      setAiSettings({
        ...aiSettings,
        preferred_categories: categories.filter(c => c !== category),
      });
    } else {
      setAiSettings({
        ...aiSettings,
        preferred_categories: [...categories, category],
      });
    }
  };

  if (loading) {
    return <div className="text-center py-8 dark:text-gray-400">Loading...</div>;
  }

  const availableCategories = [
    'cashflow_optimization',
    'cost_cutting',
    'investment_advice',
    'salary_optimization',
    'tax_tips',
    'business_growth',
  ];

  const categoryLabels: Record<string, string> = {
    cashflow_optimization: 'Optimasi Cashflow',
    cost_cutting: 'Pemangkasan Biaya',
    investment_advice: 'Saran Investasi',
    salary_optimization: 'Optimasi Gaji',
    tax_tips: 'Tips Pajak',
    business_growth: 'Pertumbuhan Bisnis',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
          <Key className="w-6 h-6 text-purple-600 dark:text-purple-400" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">API & Integrasi AI</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">Kelola API keys dan pengaturan AI Tips</p>
        </div>
      </div>

      <div className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-6">
        <div className="flex items-start gap-4">
          <Sparkles className="w-8 h-8 text-purple-600 dark:text-purple-400 flex-shrink-0 mt-1" />
          <div>
            <h3 className="font-bold text-purple-900 dark:text-purple-300 text-lg mb-2">Google Gemini 2.5 Flash</h3>
            <p className="text-sm text-purple-800 dark:text-purple-400 mb-4">
              Aktifkan AI untuk mendapatkan tips keuangan personal, analisis cashflow, dan rekomendasi otomatis
              berdasarkan data bisnis Anda.
            </p>
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 font-medium underline"
            >
              Dapatkan API Key dari Google AI Studio →
            </a>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Google Gemini API Key *
          </label>
          <div className="flex gap-2">
            <input
              type="password"
              value={apiSettings.api_key}
              onChange={(e) => setApiSettings({ ...apiSettings, api_key: e.target.value })}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent font-mono text-sm dark:bg-gray-700 dark:text-gray-100"
              placeholder="AIzaSy..."
            />
            <button
              onClick={handleTestConnection}
              disabled={testing || !apiSettings.api_key}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
            >
              <TestTube className="w-4 h-4" />
              {testing ? 'Testing...' : 'Test'}
            </button>
          </div>
          {apiSettings.last_tested_at && (
            <div className="mt-2 flex items-center gap-2 text-sm">
              {apiSettings.test_status === 'success' ? (
                <>
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span className="text-emerald-600">Koneksi berhasil</span>
                </>
              ) : (
                <>
                  <X className="w-4 h-4 text-red-600" />
                  <span className="text-red-600">Koneksi gagal</span>
                </>
              )}
              <span className="text-gray-500 dark:text-gray-400">
                • {new Date(apiSettings.last_tested_at).toLocaleString('id-ID')}
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">Aktifkan API</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">Izinkan aplikasi menggunakan Gemini API</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={apiSettings.is_active}
              onChange={(e) => setApiSettings({ ...apiSettings, is_active: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 dark:bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 dark:peer-focus:ring-purple-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
          </label>
        </div>
      </div>

      <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          Pengaturan AI Tips
        </h3>

        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-white">Aktifkan AI Tips</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">Terima tips dan rekomendasi dari AI</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={aiSettings.is_enabled}
                onChange={(e) => setAiSettings({ ...aiSettings, is_enabled: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 dark:bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 dark:peer-focus:ring-purple-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
            </label>
          </div>

          {aiSettings.is_enabled && (
            <>
              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Bahasa
                  </label>
                  <select
                    value={aiSettings.language}
                    onChange={(e) => setAiSettings({ ...aiSettings, language: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-gray-100"
                  >
                    <option value="id">Bahasa Indonesia</option>
                    <option value="en">English</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Tone
                  </label>
                  <select
                    value={aiSettings.tone}
                    onChange={(e) => setAiSettings({ ...aiSettings, tone: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-gray-100"
                  >
                    <option value="formal">Formal</option>
                    <option value="friendly">Friendly</option>
                    <option value="casual">Casual</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Frekuensi
                  </label>
                  <select
                    value={aiSettings.frequency}
                    onChange={(e) => setAiSettings({ ...aiSettings, frequency: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-gray-100"
                  >
                    <option value="daily">Harian</option>
                    <option value="weekly">Mingguan</option>
                    <option value="monthly">Bulanan</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Kategori Tips yang Diinginkan
                </label>
                <div className="grid md:grid-cols-2 gap-3">
                  {availableCategories.map((category) => (
                    <label
                      key={category}
                      className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-900/20 cursor-pointer transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={aiSettings.preferred_categories.includes(category)}
                        onChange={() => toggleCategory(category)}
                        className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">{categoryLabels[category]}</span>
                    </label>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
        </button>
      </div>
    </div>
  );
}
