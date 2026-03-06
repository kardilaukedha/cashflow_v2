import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import {
  User, Save, Mail, Phone, MapPin, Building2, Briefcase,
  Calendar, Hash, BadgeCheck, Edit2, X, ShieldCheck,
} from 'lucide-react';

interface ProfileData {
  full_name: string;
  email: string;
  role: string;
  status: string;
  nik: string;
  gender: string;
  date_of_birth: string;
  phone: string;
  address: string;
  department: string;
  job_title: string;
  hire_date: string;
  created_at: string;
}

const EMPTY: ProfileData = {
  full_name: '', email: '', role: 'karyawan', status: 'active',
  nik: '', gender: '', date_of_birth: '', phone: '', address: '',
  department: '', job_title: '', hire_date: '', created_at: '',
};

const ROLE_LABELS: Record<string, string> = {
  superadmin: 'Super Admin',
  admin_keuangan: 'Admin Keuangan',
  admin_sariroti: 'Admin Sariroti',
  karyawan: 'Karyawan',
};

const ROLE_COLORS: Record<string, string> = {
  superadmin: 'bg-red-100 text-red-700 border-red-200',
  admin_keuangan: 'bg-blue-100 text-blue-700 border-blue-200',
  admin_sariroti: 'bg-green-100 text-green-700 border-green-200',
  karyawan: 'bg-gray-100 text-gray-700 border-gray-200',
};

const AVATAR_COLORS: Record<string, string> = {
  superadmin: 'from-red-500 to-red-600',
  admin_keuangan: 'from-blue-500 to-blue-600',
  admin_sariroti: 'from-green-500 to-green-600',
  karyawan: 'from-gray-500 to-gray-600',
};

function formatDate(val: string | null | undefined) {
  if (!val) return '—';
  const d = new Date(val);
  return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
}

function getInitials(name: string) {
  return name
    ? name.trim().split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase()
    : '?';
}

export default function UserProfile() {
  const { user, refreshProfile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<ProfileData>(EMPTY);
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState({ full_name: '', phone: '', address: '' });

  useEffect(() => { loadProfile(); }, [user]);

  const loadProfile = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!error && data) {
      setProfile({
        full_name: data.full_name || '',
        email: data.email || '',
        role: data.role || 'karyawan',
        status: data.status || 'active',
        nik: data.nik || '',
        gender: data.gender || '',
        date_of_birth: data.date_of_birth || '',
        phone: data.phone || '',
        address: data.address || '',
        department: data.department || '',
        job_title: data.job_title || '',
        hire_date: data.hire_date || '',
        created_at: data.created_at || '',
      });
    }
    setLoading(false);
  };

  const openEdit = () => {
    setEditData({ full_name: profile.full_name, phone: profile.phone, address: profile.address });
    setEditMode(true);
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from('user_profiles')
      .update({ full_name: editData.full_name, phone: editData.phone, address: editData.address })
      .eq('user_id', user.id);

    if (error) {
      alert('Gagal menyimpan: ' + error.message);
    } else {
      setProfile({ ...profile, ...editData });
      setEditMode(false);
      await refreshProfile();
    }
    setSaving(false);
  };

  if (loading) {
    return <div className="text-center py-12 text-gray-400">Memuat profil...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-100 rounded-lg">
            <User className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Profil Saya</h2>
            <p className="text-sm text-gray-500">Informasi akun dan data karyawan Anda</p>
          </div>
        </div>
        {!editMode && (
          <button onClick={openEdit}
            className="flex items-center gap-2 bg-blue-50 text-blue-600 border border-blue-200 px-4 py-2 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium">
            <Edit2 className="w-4 h-4" /> Edit Profil
          </button>
        )}
      </div>

      <div className={`rounded-xl p-6 bg-gradient-to-br ${AVATAR_COLORS[profile.role] || AVATAR_COLORS.karyawan} text-white`}>
        <div className="flex items-center gap-5">
          <div className="w-20 h-20 bg-white bg-opacity-20 rounded-full flex items-center justify-center text-white text-2xl font-bold flex-shrink-0 border-2 border-white border-opacity-40">
            {getInitials(profile.full_name)}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-xl font-bold">{profile.full_name || '—'}</h3>
            <p className="text-white text-opacity-80 text-sm mt-0.5">{profile.email}</p>
            <div className="flex items-center gap-2 mt-3 flex-wrap">
              <span className="flex items-center gap-1 bg-white bg-opacity-20 text-white text-xs font-medium px-2.5 py-1 rounded-full border border-white border-opacity-30">
                <ShieldCheck className="w-3.5 h-3.5" />
                {ROLE_LABELS[profile.role] || profile.role}
              </span>
              <span className={`flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full border ${
                profile.status === 'inactive'
                  ? 'bg-red-100 text-red-700 border-red-200'
                  : 'bg-emerald-100 text-emerald-700 border-emerald-200'
              }`}>
                <BadgeCheck className="w-3.5 h-3.5" />
                {profile.status === 'inactive' ? 'Non-Aktif' : 'Aktif'}
              </span>
              {profile.nik && (
                <span className="flex items-center gap-1 bg-white bg-opacity-20 text-white text-xs font-medium px-2.5 py-1 rounded-full border border-white border-opacity-30">
                  <Hash className="w-3.5 h-3.5" />
                  {profile.nik}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {editMode && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-blue-900">Edit Informasi Pribadi</h4>
            <button onClick={() => setEditMode(false)} className="text-blue-400 hover:text-blue-600">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nama Lengkap *</label>
              <input type="text" value={editData.full_name}
                onChange={e => setEditData({ ...editData, full_name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nomor Telepon</label>
              <input type="tel" value={editData.phone}
                onChange={e => setEditData({ ...editData, phone: e.target.value })}
                placeholder="08xx-xxxx-xxxx"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Alamat</label>
              <textarea value={editData.address}
                onChange={e => setEditData({ ...editData, address: e.target.value })}
                rows={2} placeholder="Alamat lengkap"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 resize-none" />
            </div>
          </div>
          <div className="flex gap-3 pt-1">
            <button onClick={handleSave} disabled={saving}
              className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium disabled:opacity-50">
              <Save className="w-4 h-4" />
              {saving ? 'Menyimpan...' : 'Simpan'}
            </button>
            <button onClick={() => setEditMode(false)}
              className="bg-gray-100 text-gray-700 px-5 py-2 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium">
              Batal
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="bg-gray-50 px-5 py-3 border-b border-gray-200">
            <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Identitas Pribadi</h4>
          </div>
          <div className="p-5 space-y-4">
            <InfoRow icon={<Mail className="w-4 h-4 text-gray-400" />} label="Email" value={profile.email} />
            <InfoRow icon={<Hash className="w-4 h-4 text-gray-400" />} label="NIK" value={profile.nik} mono />
            <InfoRow icon={<User className="w-4 h-4 text-gray-400" />} label="Jenis Kelamin" value={profile.gender} />
            <InfoRow icon={<Calendar className="w-4 h-4 text-gray-400" />} label="Tanggal Lahir" value={formatDate(profile.date_of_birth)} />
            <InfoRow icon={<Phone className="w-4 h-4 text-gray-400" />} label="Nomor Telepon" value={profile.phone} editable onClick={openEdit} />
            <InfoRow icon={<MapPin className="w-4 h-4 text-gray-400" />} label="Alamat" value={profile.address} editable onClick={openEdit} />
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="bg-gray-50 px-5 py-3 border-b border-gray-200">
              <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Informasi Pekerjaan</h4>
            </div>
            <div className="p-5 space-y-4">
              <InfoRow icon={<Building2 className="w-4 h-4 text-gray-400" />} label="Departemen" value={profile.department} />
              <InfoRow icon={<Briefcase className="w-4 h-4 text-gray-400" />} label="Jabatan" value={profile.job_title} />
              <InfoRow icon={<Calendar className="w-4 h-4 text-gray-400" />} label="Tanggal Bergabung" value={formatDate(profile.hire_date)} />
              <InfoRow icon={<ShieldCheck className="w-4 h-4 text-gray-400" />} label="Role Sistem" value={ROLE_LABELS[profile.role] || profile.role} badge roleKey={profile.role} />
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="bg-gray-50 px-5 py-3 border-b border-gray-200">
              <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Status Akun</h4>
            </div>
            <div className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <BadgeCheck className={`w-5 h-5 ${profile.status === 'inactive' ? 'text-red-500' : 'text-emerald-500'}`} />
                  <div>
                    <p className="text-xs text-gray-500">Status Karyawan</p>
                    <p className="text-sm font-semibold text-gray-900">
                      {profile.status === 'inactive' ? 'Non-Aktif' : 'Aktif'}
                    </p>
                  </div>
                </div>
                <span className={`px-3 py-1 text-xs font-medium rounded-full border ${
                  profile.status === 'inactive'
                    ? 'bg-red-50 text-red-700 border-red-200'
                    : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                }`}>
                  {profile.status === 'inactive' ? 'Non-Aktif' : 'Aktif'}
                </span>
              </div>
              <div className="flex items-center gap-3 pt-1 border-t border-gray-100">
                <Calendar className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500">Terdaftar Sejak</p>
                  <p className="text-sm font-semibold text-gray-900">{formatDate(profile.created_at)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <p className="text-xs text-gray-400 text-center">
        Informasi departemen, jabatan, dan tanggal bergabung hanya dapat diubah oleh admin.
        Hubungi admin jika ada perubahan data pekerjaan.
      </p>
    </div>
  );
}

function InfoRow({
  icon, label, value, mono = false, editable = false, onClick, badge = false, roleKey = '',
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  mono?: boolean;
  editable?: boolean;
  onClick?: () => void;
  badge?: boolean;
  roleKey?: string;
}) {
  const ROLE_COLORS: Record<string, string> = {
    superadmin: 'bg-red-100 text-red-700 border-red-200',
    admin_keuangan: 'bg-blue-100 text-blue-700 border-blue-200',
    admin_sariroti: 'bg-green-100 text-green-700 border-green-200',
    karyawan: 'bg-gray-100 text-gray-700 border-gray-200',
  };

  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 flex-shrink-0">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-400">{label}</p>
        {badge ? (
          <span className={`inline-flex items-center gap-1 mt-0.5 px-2.5 py-0.5 text-xs font-medium rounded-full border ${ROLE_COLORS[roleKey] || ROLE_COLORS.karyawan}`}>
            {value || '—'}
          </span>
        ) : (
          <p className={`text-sm font-medium text-gray-900 break-words ${mono ? 'font-mono' : ''}`}>
            {value || '—'}
          </p>
        )}
      </div>
      {editable && onClick && (
        <button onClick={onClick} className="text-gray-300 hover:text-blue-500 transition-colors flex-shrink-0" title="Edit">
          <Edit2 className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}
