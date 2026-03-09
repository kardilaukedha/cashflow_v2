import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { CircleUser as UserCircle, CreditCard as Edit2, X, Link as LinkIcon, Copy, Check, Users, UserPlus, Trash2, Phone, Building2, Briefcase, Calendar, Hash, ChevronDown, ChevronUp, Eye, EyeOff } from 'lucide-react';

interface UserProfile {
  id: string;
  user_id: string;
  role: 'superadmin' | 'admin_keuangan' | 'admin_sariroti' | 'karyawan' | 'karyawan_sariroti';
  full_name: string;
  email: string;
  employee_id: string | null;
  created_at: string;
  phone: string;
  department: string;
  job_title: string;
  hire_date: string | null;
  nik: string;
  gender: string;
  date_of_birth: string | null;
  address: string;
  status: 'active' | 'inactive';
}

interface Employee {
  id: string;
  name: string;
  employee_code: string;
}

type FormData = {
  email: string;
  password: string;
  full_name: string;
  role: UserProfile['role'];
  nik: string;
  gender: string;
  date_of_birth: string;
  address: string;
  department: string;
  job_title: string;
  hire_date: string;
  phone: string;
  status: 'active' | 'inactive';
  employee_id: string;
};

interface UserFormProps {
  isEdit: boolean;
  formData: FormData;
  setFormData: React.Dispatch<React.SetStateAction<FormData>>;
  showPassword: boolean;
  setShowPassword: (v: boolean) => void;
  saving: boolean;
  employees: Employee[];
  users: UserProfile[];
  editingUser: UserProfile | null;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
}

function UserForm({ isEdit, formData, setFormData, showPassword, setShowPassword, saving, employees, users, editingUser, onSubmit, onCancel }: UserFormProps) {
  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="grid grid-cols-1 gap-6">
        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 space-y-4">
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">Akun</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email *</label>
              <input type="email" value={formData.email} disabled={isEdit}
                onChange={e => setFormData(f => ({ ...f, email: e.target.value }))}
                required={!isEdit}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-500 dark:disabled:bg-gray-600 dark:disabled:text-gray-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
            </div>
            {!isEdit && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Password *</label>
                <div className="relative">
                  <input type={showPassword ? 'text' : 'password'} value={formData.password}
                    onChange={e => setFormData(f => ({ ...f, password: e.target.value }))}
                    required minLength={6}
                    className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Role *</label>
              <select value={formData.role} onChange={e => setFormData(f => ({ ...f, role: e.target.value as UserProfile['role'] }))}
                required className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                <option value="karyawan">Karyawan</option>
                <option value="karyawan_sariroti">Karyawan Sari Roti</option>
                <option value="admin_sariroti">Admin Sariroti</option>
                <option value="admin_keuangan">Admin Keuangan</option>
                <option value="superadmin">Super Admin</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
              <select value={formData.status} onChange={e => setFormData(f => ({ ...f, status: e.target.value as 'active' | 'inactive' }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                <option value="active">Aktif</option>
                <option value="inactive">Non-Aktif</option>
              </select>
            </div>
          </div>
        </div>

        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 space-y-4">
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">Identitas Pribadi</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nama Lengkap *</label>
              <input type="text" value={formData.full_name}
                onChange={e => setFormData(f => ({ ...f, full_name: e.target.value }))}
                required placeholder="Nama sesuai KTP"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">NIK (No. Induk Karyawan)</label>
              <input type="text" value={formData.nik}
                onChange={e => setFormData(f => ({ ...f, nik: e.target.value }))}
                placeholder="Contoh: EMP-001"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Jenis Kelamin</label>
              <select value={formData.gender} onChange={e => setFormData(f => ({ ...f, gender: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                <option value="">Pilih</option>
                <option value="Laki-laki">Laki-laki</option>
                <option value="Perempuan">Perempuan</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tanggal Lahir</label>
              <input type="date" value={formData.date_of_birth}
                onChange={e => setFormData(f => ({ ...f, date_of_birth: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nomor Telepon</label>
              <input type="tel" value={formData.phone}
                onChange={e => setFormData(f => ({ ...f, phone: e.target.value }))}
                placeholder="08xx-xxxx-xxxx"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Alamat</label>
              <textarea value={formData.address}
                onChange={e => setFormData(f => ({ ...f, address: e.target.value }))}
                rows={2} placeholder="Alamat lengkap sesuai KTP"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 resize-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500" />
            </div>
          </div>
        </div>

        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 space-y-4">
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">Informasi Pekerjaan</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Departemen</label>
              <input type="text" value={formData.department}
                onChange={e => setFormData(f => ({ ...f, department: e.target.value }))}
                placeholder="Contoh: Finance, HRD, Operasional"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Jabatan</label>
              <input type="text" value={formData.job_title}
                onChange={e => setFormData(f => ({ ...f, job_title: e.target.value }))}
                placeholder="Contoh: Staff Keuangan"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tanggal Bergabung</label>
              <input type="date" value={formData.hire_date}
                onChange={e => setFormData(f => ({ ...f, hire_date: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
            </div>
            {isEdit && (
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-blue-700 dark:text-blue-400 mb-1 flex items-center gap-1">
                  <LinkIcon className="w-4 h-4" /> Hubungkan ke Data Karyawan (Opsional)
                </label>
                <select value={formData.employee_id}
                  onChange={e => setFormData(f => ({ ...f, employee_id: e.target.value }))}
                  className="w-full px-3 py-2 border border-blue-300 dark:border-blue-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 bg-blue-50 dark:bg-blue-900/30 text-gray-900 dark:text-white">
                  <option value="">— Tidak dihubungkan —</option>
                  {employees.filter(emp =>
                    !users.some(u => u.employee_id === emp.id && u.id !== editingUser?.id)
                  ).map(emp => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} ({emp.employee_code})
                    </option>
                  ))}
                </select>
                <p className="text-xs text-blue-500 dark:text-blue-400 mt-1">Agar user bisa melihat data gaji dan pinjaman mereka sendiri</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <button type="submit" disabled={saving}
          className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50">
          {saving ? 'Menyimpan...' : isEdit ? 'Simpan Perubahan' : 'Tambah User'}
        </button>
        <button type="button" onClick={onCancel}
          className="flex-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 py-2.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors font-medium">
          Batal
        </button>
      </div>
    </form>
  );
}

interface InviteLink {
  id: string;
  invite_token: string;
  role: string;
  max_uses: number;
  current_uses: number;
  is_active: boolean;
  created_at: string;
}

const EMPTY_FORM = {
  email: '',
  password: '',
  full_name: '',
  role: 'karyawan' as UserProfile['role'],
  nik: '',
  gender: '',
  date_of_birth: '',
  address: '',
  department: '',
  job_title: '',
  hire_date: '',
  phone: '',
  status: 'active' as 'active' | 'inactive',
  employee_id: '',
};

export default function UserManager() {
  const { user } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedUser, setExpandedUser] = useState<string | null>(null);

  const [showAddForm, setShowAddForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteRole, setInviteRole] = useState<UserProfile['role']>('karyawan');
  const [inviteCount, setInviteCount] = useState(1);
  const [generatedLinks, setGeneratedLinks] = useState<InviteLink[]>([]);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [inviteLinks, setInviteLinks] = useState<InviteLink[]>([]);
  const [showInviteList, setShowInviteList] = useState(false);

  useEffect(() => {
    fetchUsers();
    fetchInviteLinks();
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    const { data } = await supabase.from('employees').select('id, name, employee_code').eq('status', 'active').order('name');
    if (data) setEmployees(data);
  };

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setUsers(data || []);
    } catch (err) {
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchInviteLinks = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('invite_links')
      .select('*')
      .eq('created_by', user.id)
      .order('created_at', { ascending: false });
    if (!error && data) setInviteLinks(data);
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const result = await supabase.auth.createUser(formData);
      if (result.error) {
        alert(result.error.message);
        return;
      }
      setShowAddForm(false);
      setFormData(EMPTY_FORM);
      fetchUsers();
    } catch (err) {
      alert('Gagal membuat user');
    } finally {
      setSaving(false);
    }
  };

  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({
          role: formData.role,
          full_name: formData.full_name,
          phone: formData.phone,
          department: formData.department,
          job_title: formData.job_title,
          hire_date: formData.hire_date || null,
          nik: formData.nik,
          gender: formData.gender,
          date_of_birth: formData.date_of_birth || null,
          address: formData.address,
          status: formData.status,
          employee_id: formData.employee_id || null,
        })
        .eq('id', editingUser.id);
      if (error) throw error;

      if (formData.employee_id) {
        await supabase.from('user_profiles')
          .update({ employee_id: null })
          .eq('employee_id', formData.employee_id)
          .neq('id', editingUser.id);
      }

      setShowEditForm(false);
      setEditingUser(null);
      fetchUsers();
      fetchEmployees();
    } catch (err) {
      alert('Gagal mengupdate user');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (userId: string) => {
    try {
      const result = await supabase.auth.deleteUser(userId);
      if (result.error) {
        alert(result.error.message);
        return;
      }
      setDeleteConfirm(null);
      fetchUsers();
    } catch (err) {
      alert('Gagal menghapus user');
    }
  };

  const openEdit = (profile: UserProfile) => {
    if (profile.email === 'admin@admin.com') {
      alert('Tidak bisa mengubah akun superadmin utama');
      return;
    }
    setEditingUser(profile);
    setFormData({
      email: profile.email,
      password: '',
      full_name: profile.full_name || '',
      role: profile.role,
      nik: profile.nik || '',
      gender: profile.gender || '',
      date_of_birth: profile.date_of_birth ? profile.date_of_birth.split('T')[0] : '',
      address: profile.address || '',
      department: profile.department || '',
      job_title: profile.job_title || '',
      hire_date: profile.hire_date ? profile.hire_date.split('T')[0] : '',
      phone: profile.phone || '',
      status: profile.status || 'active',
      employee_id: profile.employee_id || '',
    });
    setShowEditForm(true);
  };

  const generateInviteLinks = async () => {
    if (!user || inviteCount < 1 || inviteCount > 20) {
      alert('Jumlah link harus antara 1-20');
      return;
    }
    const links: InviteLink[] = [];
    for (let i = 0; i < inviteCount; i++) {
      const token = Array.from({ length: 32 }, () => Math.random().toString(36).charAt(2)).join('');
      const { data, error } = await supabase
        .from('invite_links')
        .insert([{ created_by: user.id, invite_token: token, role: inviteRole, max_uses: 1, current_uses: 0, is_active: true }])
        .select()
        .single();
      if (!error && data) links.push(data);
    }
    setGeneratedLinks(links);
    fetchInviteLinks();
  };

  const copyToClipboard = async (token: string, index: number) => {
    const url = `${window.location.origin}/invite/${token}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch {
      alert('Gagal menyalin link');
    }
  };

  const toggleInviteActive = async (id: string, current: boolean) => {
    const { error } = await supabase.from('invite_links').update({ is_active: !current }).eq('id', id);
    if (!error) fetchInviteLinks();
  };

  const getRoleName = (role: string) => {
    const map: Record<string, string> = {
      superadmin: 'Super Admin', admin_keuangan: 'Admin Keuangan',
      admin_sariroti: 'Admin Sariroti', karyawan: 'Karyawan', karyawan_sariroti: 'Karyawan Sari Roti',
    };
    return map[role] || role;
  };

  const getRoleColor = (role: string) => {
    const map: Record<string, string> = {
      superadmin: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300', admin_keuangan: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300',
      admin_sariroti: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300', karyawan: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
      karyawan_sariroti: 'bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300',
    };
    return map[role] || 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
  };

  const getInitials = (name: string) =>
    name ? name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase() : '?';

  const getAvatarColor = (role: string) => {
    const map: Record<string, string> = {
      superadmin: 'bg-red-500', admin_keuangan: 'bg-blue-500',
      admin_sariroti: 'bg-green-500', karyawan: 'bg-gray-400', karyawan_sariroti: 'bg-orange-400',
    };
    return map[role] || 'bg-gray-400';
  };

  if (loading) {
    return <div className="text-center py-8 text-gray-500 dark:text-gray-400">Memuat data...</div>;
  }

  const handleCancel = () => { setShowAddForm(false); setShowEditForm(false); setEditingUser(null); setFormData(EMPTY_FORM); };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-100 dark:bg-blue-900/50 rounded-lg">
            <UserCircle className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Manajemen User</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">{users.length} user terdaftar</p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setShowInviteList(true)}
            className="flex items-center gap-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-sm">
            <Users className="w-4 h-4" /> Invite Links
          </button>
          <button onClick={() => setShowInviteModal(true)}
            className="flex items-center gap-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-sm">
            <LinkIcon className="w-4 h-4" /> Generate Invite
          </button>
          <button onClick={() => { setFormData(EMPTY_FORM); setShowAddForm(true); }}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium">
            <UserPlus className="w-4 h-4" /> Tambah User
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        {users.length === 0 ? (
          <div className="text-center py-12">
            <UserCircle className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400">Belum ada user</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-8">#</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Karyawan</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">NIK</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Dept / Jabatan</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Role</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Telepon</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {users.map((up, idx) => (
                  <React.Fragment key={up.id}>
                    <tr className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                      <td className="px-4 py-3 text-sm text-gray-400 dark:text-gray-500">{idx + 1}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ${getAvatarColor(up.role)}`}>
                            {getInitials(up.full_name)}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">{up.full_name || '—'}</p>
                            <p className="text-xs text-gray-400 dark:text-gray-500">{up.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-gray-700 dark:text-gray-300 font-mono">{up.nik || '—'}</span>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm text-gray-800 dark:text-gray-200">{up.department || '—'}</p>
                        <p className="text-xs text-gray-400 dark:text-gray-500">{up.job_title || ''}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getRoleColor(up.role)}`}>
                          {getRoleName(up.role)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{up.phone || '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          up.status === 'inactive' ? 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300'
                        }`}>
                          {up.status === 'inactive' ? 'Non-Aktif' : 'Aktif'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => setExpandedUser(expandedUser === up.id ? null : up.id)}
                            className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded" title="Detail">
                            {expandedUser === up.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                          {up.email !== 'admin@admin.com' && (
                            <>
                              <button onClick={() => openEdit(up)} className="p-1.5 text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 rounded" title="Edit">
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button onClick={() => setDeleteConfirm(up.user_id)} className="p-1.5 text-red-400 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 rounded" title="Hapus">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                    {expandedUser === up.id && (
                      <tr className="bg-blue-50 dark:bg-blue-900/20">
                        <td colSpan={8} className="px-6 py-4">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div className="flex items-start gap-2">
                              <Hash className="w-4 h-4 text-gray-400 dark:text-gray-500 mt-0.5 flex-shrink-0" />
                              <div>
                                <p className="text-xs text-gray-400 dark:text-gray-500">NIK</p>
                                <p className="font-medium text-gray-800 dark:text-gray-200">{up.nik || '—'}</p>
                              </div>
                            </div>
                            <div className="flex items-start gap-2">
                              <Phone className="w-4 h-4 text-gray-400 dark:text-gray-500 mt-0.5 flex-shrink-0" />
                              <div>
                                <p className="text-xs text-gray-400 dark:text-gray-500">Telepon</p>
                                <p className="font-medium text-gray-800 dark:text-gray-200">{up.phone || '—'}</p>
                              </div>
                            </div>
                            <div className="flex items-start gap-2">
                              <Building2 className="w-4 h-4 text-gray-400 dark:text-gray-500 mt-0.5 flex-shrink-0" />
                              <div>
                                <p className="text-xs text-gray-400 dark:text-gray-500">Departemen</p>
                                <p className="font-medium text-gray-800 dark:text-gray-200">{up.department || '—'}</p>
                              </div>
                            </div>
                            <div className="flex items-start gap-2">
                              <Briefcase className="w-4 h-4 text-gray-400 dark:text-gray-500 mt-0.5 flex-shrink-0" />
                              <div>
                                <p className="text-xs text-gray-400 dark:text-gray-500">Jabatan</p>
                                <p className="font-medium text-gray-800 dark:text-gray-200">{up.job_title || '—'}</p>
                              </div>
                            </div>
                            <div className="flex items-start gap-2">
                              <Calendar className="w-4 h-4 text-gray-400 dark:text-gray-500 mt-0.5 flex-shrink-0" />
                              <div>
                                <p className="text-xs text-gray-400 dark:text-gray-500">Tgl Lahir</p>
                                <p className="font-medium text-gray-800 dark:text-gray-200">
                                  {up.date_of_birth ? new Date(up.date_of_birth).toLocaleDateString('id-ID') : '—'}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-start gap-2">
                              <Calendar className="w-4 h-4 text-gray-400 dark:text-gray-500 mt-0.5 flex-shrink-0" />
                              <div>
                                <p className="text-xs text-gray-400 dark:text-gray-500">Tgl Bergabung</p>
                                <p className="font-medium text-gray-800 dark:text-gray-200">
                                  {up.hire_date ? new Date(up.hire_date).toLocaleDateString('id-ID') : '—'}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-start gap-2 col-span-2">
                              <UserCircle className="w-4 h-4 text-gray-400 dark:text-gray-500 mt-0.5 flex-shrink-0" />
                              <div>
                                <p className="text-xs text-gray-400 dark:text-gray-500">Alamat</p>
                                <p className="font-medium text-gray-800 dark:text-gray-200">{up.address || '—'}</p>
                              </div>
                            </div>
                            <div>
                              <p className="text-xs text-gray-400 dark:text-gray-500">Jenis Kelamin</p>
                              <p className="font-medium text-gray-800 dark:text-gray-200">{up.gender || '—'}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-400 dark:text-gray-500">Terdaftar Sejak</p>
                              <p className="font-medium text-gray-800 dark:text-gray-200">{new Date(up.created_at).toLocaleDateString('id-ID')}</p>
                            </div>
                            {up.employee_id && (() => {
                              const linked = employees.find(e => e.id === up.employee_id);
                              return linked ? (
                                <div className="flex items-start gap-2 col-span-2">
                                  <LinkIcon className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                                  <div>
                                    <p className="text-xs text-blue-400">Terhubung ke Karyawan</p>
                                    <p className="font-medium text-blue-700 dark:text-blue-300">{linked.name} <span className="text-gray-400 font-normal">({linked.employee_code})</span></p>
                                  </div>
                                </div>
                              ) : null;
                            })()}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {(showAddForm || showEditForm) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-2xl my-6">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg">
                  <UserPlus className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                  {showEditForm ? `Edit User — ${editingUser?.full_name || editingUser?.email}` : 'Tambah User Manual'}
                </h3>
              </div>
              <button onClick={handleCancel} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6">
              <UserForm
                isEdit={showEditForm}
                formData={formData}
                setFormData={setFormData}
                showPassword={showPassword}
                setShowPassword={setShowPassword}
                saving={saving}
                employees={employees}
                users={users}
                editingUser={editingUser}
                onSubmit={showEditForm ? handleEditUser : handleAddUser}
                onCancel={handleCancel}
              />
            </div>
          </div>
        </div>
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-sm w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-100 dark:bg-red-900/50 rounded-lg">
                <Trash2 className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Hapus User</h3>
            </div>
            <p className="text-gray-600 dark:text-gray-400 mb-6">Apakah Anda yakin ingin menghapus user ini? Tindakan ini tidak bisa dibatalkan.</p>
            <div className="flex gap-3">
              <button onClick={() => handleDelete(deleteConfirm)}
                className="flex-1 bg-red-600 text-white py-2.5 rounded-lg hover:bg-red-700 transition-colors font-medium">
                Hapus
              </button>
              <button onClick={() => setDeleteConfirm(null)}
                className="flex-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 py-2.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors font-medium">
                Batal
              </button>
            </div>
          </div>
        </div>
      )}

      {showInviteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-2xl w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Generate Invite Links</h3>
              <button onClick={() => { setShowInviteModal(false); setGeneratedLinks([]); }} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                <X className="w-6 h-6" />
              </button>
            </div>
            {generatedLinks.length === 0 ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Role untuk User Baru</label>
                  <select value={inviteRole} onChange={e => setInviteRole(e.target.value as UserProfile['role'])}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                    <option value="karyawan">Karyawan</option>
                    <option value="karyawan_sariroti">Karyawan Sari Roti</option>
                    <option value="admin_sariroti">Admin Sariroti</option>
                    <option value="admin_keuangan">Admin Keuangan</option>
                    <option value="superadmin">Super Admin</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Jumlah Link (1-20)</label>
                  <input type="number" min="1" max="20" value={inviteCount}
                    onChange={e => setInviteCount(parseInt(e.target.value) || 1)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Setiap link hanya bisa digunakan 1 kali</p>
                </div>
                <button onClick={generateInviteLinks}
                  className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium">
                  Generate {inviteCount} Link{inviteCount > 1 ? 's' : ''}
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-700 rounded-lg p-4">
                  <p className="text-emerald-800 dark:text-emerald-300 font-medium">{generatedLinks.length} invite link berhasil dibuat!</p>
                  <p className="text-sm text-emerald-700 dark:text-emerald-400 mt-1">Role: <span className="font-semibold">{getRoleName(inviteRole)}</span></p>
                </div>
                <div className="max-h-80 overflow-y-auto space-y-2">
                  {generatedLinks.map((link, index) => (
                    <div key={link.id} className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600 flex items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Link #{index + 1}</p>
                        <code className="text-xs text-gray-700 dark:text-gray-300 break-all">{window.location.origin}/invite/{link.invite_token}</code>
                      </div>
                      <button onClick={() => copyToClipboard(link.invite_token, index)}
                        className="flex items-center gap-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-xs flex-shrink-0">
                        {copiedIndex === index ? <><Check className="w-3 h-3" /> Copied!</> : <><Copy className="w-3 h-3" /> Copy</>}
                      </button>
                    </div>
                  ))}
                </div>
                <button onClick={() => { setShowInviteModal(false); setGeneratedLinks([]); }}
                  className="w-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 py-3 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors font-medium">
                  Selesai
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {showInviteList && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-4xl w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Daftar Invite Links</h3>
              <button onClick={() => setShowInviteList(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                <X className="w-6 h-6" />
              </button>
            </div>
            {inviteLinks.length === 0 ? (
              <div className="text-center py-12">
                <LinkIcon className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400">Belum ada invite link</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {inviteLinks.map((link) => (
                  <div key={link.id} className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getRoleColor(link.role)}`}>{getRoleName(link.role)}</span>
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${link.is_active ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300' : 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300'}`}>
                            {link.is_active ? 'Active' : 'Inactive'}
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">{link.current_uses}/{link.max_uses} digunakan</span>
                        </div>
                        <code className="text-xs text-gray-700 dark:text-gray-300 break-all block">{window.location.origin}/invite/{link.invite_token}</code>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Dibuat: {new Date(link.created_at).toLocaleString('id-ID')}</p>
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <button onClick={() => copyToClipboard(link.invite_token, inviteLinks.indexOf(link))}
                          className="p-2 bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/70 transition-colors">
                          {copiedIndex === inviteLinks.indexOf(link) ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        </button>
                        {link.current_uses === 0 && (
                          <button onClick={() => toggleInviteActive(link.id, link.is_active)}
                            className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${link.is_active ? 'bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/70' : 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-200 dark:hover:bg-emerald-900/70'}`}>
                            {link.is_active ? 'Deactivate' : 'Activate'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
