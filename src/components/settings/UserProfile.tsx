import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { User, Save, Mail } from 'lucide-react';

interface UserProfileData {
  full_name: string;
  email: string;
}

export default function UserProfile() {
  const { user, userProfile, refreshProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<UserProfileData>({
    full_name: '',
    email: '',
  });

  useEffect(() => {
    loadProfile();
  }, [user]);

  const loadProfile = async () => {
    if (!user) return;

    setLoading(true);

    const { data, error } = await supabase
      .from('user_profiles')
      .select('full_name, email')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!error && data) {
      setProfile({
        full_name: data.full_name || '',
        email: data.email || user.email || '',
      });
    } else if (userProfile) {
      setProfile({
        full_name: userProfile.full_name || '',
        email: userProfile.email || user.email || '',
      });
    }

    setLoading(false);
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);

    const { error } = await supabase
      .from('user_profiles')
      .update({
        full_name: profile.full_name,
        email: profile.email,
      })
      .eq('user_id', user.id);

    if (error) {
      alert('Gagal menyimpan: ' + error.message);
    } else {
      alert('Profil berhasil diperbarui!');
      await refreshProfile();
      await loadProfile();
    }
    setSaving(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-blue-100 rounded-lg">
          <User className="w-6 h-6 text-blue-600" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900">Profil Saya</h2>
          <p className="text-sm text-gray-600">Kelola informasi profil Anda</p>
        </div>
      </div>

      <div className="bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200 rounded-lg p-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
            {profile.full_name.charAt(0).toUpperCase() || 'U'}
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">{profile.full_name || 'User'}</h3>
            <p className="text-sm text-gray-600">{profile.email}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Nama Lengkap *
          </label>
          <input
            type="text"
            value={profile.full_name}
            onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Nama Anda"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <Mail className="w-4 h-4 inline mr-1" />
            Email
          </label>
          <input
            type="email"
            value={profile.email}
            onChange={(e) => setProfile({ ...profile, email: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="email@example.com"
          />
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
