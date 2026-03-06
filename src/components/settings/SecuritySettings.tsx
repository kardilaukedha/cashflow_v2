import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Shield, Key, History, Lock, Save } from 'lucide-react';

interface LoginHistory {
  id: string;
  ip_address: string;
  device_info: string;
  status: string;
  logged_in_at: string;
}

export default function SecuritySettings() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [changing, setChanging] = useState(false);
  const [loginHistory, setLoginHistory] = useState<LoginHistory[]>([]);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  useEffect(() => {
    loadLoginHistory();
  }, [user]);

  const loadLoginHistory = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('login_history')
      .select('*')
      .eq('user_id', user.id)
      .order('logged_in_at', { ascending: false })
      .limit(10);

    if (!error && data) {
      setLoginHistory(data);
    }
    setLoading(false);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      alert('Password baru tidak cocok!');
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      alert('Password minimal 6 karakter!');
      return;
    }

    setChanging(true);

    const { error } = await supabase.auth.updateUser({
      password: passwordForm.newPassword,
    });

    if (error) {
      alert('Gagal mengubah password: ' + error.message);
    } else {
      alert('Password berhasil diubah!');
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      setShowChangePassword(false);
    }
    setChanging(false);
  };

  if (loading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-red-100 rounded-lg">
          <Shield className="w-6 h-6 text-red-600" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900">Keamanan</h2>
          <p className="text-sm text-gray-600">Kelola pengaturan keamanan akun Anda</p>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Key className="w-5 h-5 text-gray-600" />
            <div>
              <h3 className="font-semibold text-gray-900">Ubah Password</h3>
              <p className="text-sm text-gray-600">Update password Anda secara berkala</p>
            </div>
          </div>
          <button
            onClick={() => setShowChangePassword(!showChangePassword)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            {showChangePassword ? 'Batal' : 'Ubah Password'}
          </button>
        </div>

        {showChangePassword && (
          <form onSubmit={handleChangePassword} className="mt-4 space-y-4 border-t border-gray-200 pt-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password Saat Ini
              </label>
              <input
                type="password"
                value={passwordForm.currentPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password Baru
              </label>
              <input
                type="password"
                value={passwordForm.newPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                minLength={6}
                required
              />
              <p className="text-xs text-gray-500 mt-1">Minimal 6 karakter</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Konfirmasi Password Baru
              </label>
              <input
                type="password"
                value={passwordForm.confirmPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                minLength={6}
                required
              />
            </div>

            <button
              type="submit"
              disabled={changing}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {changing ? 'Mengubah...' : 'Simpan Password Baru'}
            </button>
          </form>
        )}
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center gap-3 mb-4">
          <History className="w-5 h-5 text-gray-600" />
          <div>
            <h3 className="font-semibold text-gray-900">Riwayat Login</h3>
            <p className="text-sm text-gray-600">10 aktivitas login terakhir</p>
          </div>
        </div>

        {loginHistory.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <History className="w-12 h-12 text-gray-300 mx-auto mb-2" />
            <p>Belum ada riwayat login</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {loginHistory.map((record) => (
              <div
                key={record.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${
                    record.status === 'success' ? 'bg-emerald-500' : 'bg-red-500'
                  }`} />
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {record.ip_address || 'Unknown IP'}
                    </p>
                    <p className="text-xs text-gray-600">
                      {record.device_info || 'Unknown Device'}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-600">
                    {new Date(record.logged_in_at).toLocaleDateString('id-ID', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </p>
                  <p className="text-xs text-gray-500">
                    {new Date(record.logged_in_at).toLocaleTimeString('id-ID', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Lock className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold text-amber-900 mb-1">Tips Keamanan</h4>
            <ul className="text-sm text-amber-800 space-y-1">
              <li>• Gunakan password yang kuat dan unik</li>
              <li>• Jangan bagikan password Anda kepada siapapun</li>
              <li>• Ubah password secara berkala (minimal 3 bulan sekali)</li>
              <li>• Logout dari device yang tidak digunakan</li>
              <li>• Periksa riwayat login secara berkala untuk deteksi aktivitas mencurigakan</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
