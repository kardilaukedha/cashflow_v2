import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { UserCircle, Edit2, X, Link as LinkIcon, Copy, Check, Users } from 'lucide-react';

interface UserProfile {
  id: string;
  user_id: string;
  role: 'superadmin' | 'admin_keuangan' | 'admin_sariroti' | 'karyawan';
  full_name: string;
  employee_id: string | null;
  created_at: string;
  email?: string;
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

export default function UserManager() {
  const { user } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [showEditForm, setShowEditForm] = useState(false);
  const [formData, setFormData] = useState({
    role: '' as UserProfile['role'],
    full_name: '',
  });

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
  }, []);

  const fetchUsers = async () => {
    try {
      const { data: profiles, error: profilesError } = await supabase
        .from('user_profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      setUsers(profiles || []);
    } catch (error) {
      console.error('Error fetching users:', error);
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

    if (!error && data) {
      setInviteLinks(data);
    }
  };

  const generateInviteLinks = async () => {
    if (!user || inviteCount < 1 || inviteCount > 20) {
      alert('Jumlah link harus antara 1-20');
      return;
    }

    const links: InviteLink[] = [];

    for (let i = 0; i < inviteCount; i++) {
      const token = generateRandomToken();
      const { data, error } = await supabase
        .from('invite_links')
        .insert([{
          created_by: user.id,
          invite_token: token,
          role: inviteRole,
          max_uses: 1,
          current_uses: 0,
          is_active: true,
        }])
        .select()
        .single();

      if (!error && data) {
        links.push(data);
      }
    }

    setGeneratedLinks(links);
    fetchInviteLinks();
  };

  const generateRandomToken = () => {
    return Array.from({ length: 32 }, () =>
      Math.random().toString(36).charAt(2)
    ).join('');
  };

  const copyToClipboard = async (token: string, index: number) => {
    const url = `${window.location.origin}/invite/${token}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch (err) {
      alert('Gagal menyalin link');
    }
  };

  const toggleInviteActive = async (id: string, currentActive: boolean) => {
    const { error } = await supabase
      .from('invite_links')
      .update({ is_active: !currentActive })
      .eq('id', id);

    if (!error) {
      fetchInviteLinks();
    }
  };

  const handleEdit = (userProfile: UserProfile) => {
    if (userProfile.email === 'admin@admin.com') {
      alert('Tidak bisa mengubah role superadmin utama');
      return;
    }
    setEditingUser(userProfile);
    setFormData({
      role: userProfile.role,
      full_name: userProfile.full_name,
    });
    setShowEditForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({
          role: formData.role,
          full_name: formData.full_name,
        })
        .eq('id', editingUser.id);

      if (error) throw error;

      setShowEditForm(false);
      setEditingUser(null);
      fetchUsers();
    } catch (error) {
      console.error('Error updating user:', error);
      alert('Gagal mengupdate user');
    }
  };

  const cancelForm = () => {
    setShowEditForm(false);
    setEditingUser(null);
    setFormData({ role: '' as UserProfile['role'], full_name: '' });
  };

  const getRoleName = (role: string) => {
    switch (role) {
      case 'superadmin': return 'Super Admin';
      case 'admin_keuangan': return 'Admin Keuangan';
      case 'admin_sariroti': return 'Admin Sariroti';
      case 'karyawan': return 'Karyawan';
      default: return role;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'superadmin': return 'bg-red-100 text-red-800';
      case 'admin_keuangan': return 'bg-blue-100 text-blue-800';
      case 'admin_sariroti': return 'bg-green-100 text-green-800';
      case 'karyawan': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-100 rounded-lg">
            <UserCircle className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Manajemen User</h2>
            <p className="text-sm text-gray-600">Kelola role dan akses user</p>
          </div>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowInviteList(true)}
            className="flex items-center gap-2 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <Users className="w-4 h-4" />
            Invite Links
          </button>
          <button
            onClick={() => setShowInviteModal(true)}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <LinkIcon className="w-4 h-4" />
            Generate Invite
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {users.length === 0 ? (
          <div className="text-center py-12">
            <UserCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">Belum ada user</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {users.map((userProfile) => (
                  <tr key={userProfile.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                          <UserCircle className="w-6 h-6 text-gray-400" />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {userProfile.full_name || 'No Name'}
                          </div>
                          <div className="text-xs text-gray-500">
                            {new Date(userProfile.created_at).toLocaleDateString('id-ID')}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{userProfile.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getRoleColor(userProfile.role)}`}>
                        {getRoleName(userProfile.role)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      {userProfile.email !== 'admin@admin.com' && (
                        <button
                          onClick={() => handleEdit(userProfile)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          <Edit2 className="w-4 h-4 inline" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showEditForm && editingUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">Edit User</h3>
              <button onClick={cancelForm} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <input
                  type="text"
                  value={editingUser.email}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nama Lengkap
                </label>
                <input
                  type="text"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Role
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as UserProfile['role'] })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="">Pilih Role</option>
                  <option value="superadmin">Super Admin</option>
                  <option value="admin_keuangan">Admin Keuangan</option>
                  <option value="admin_sariroti">Admin Sariroti</option>
                  <option value="karyawan">Karyawan</option>
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  Update
                </button>
                <button
                  type="button"
                  onClick={cancelForm}
                  className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                >
                  Batal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showInviteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">Generate Invite Links</h3>
              <button onClick={() => { setShowInviteModal(false); setGeneratedLinks([]); }} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>

            {generatedLinks.length === 0 ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Role untuk User Baru
                  </label>
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value as UserProfile['role'])}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="karyawan">Karyawan</option>
                    <option value="admin_sariroti">Admin Sariroti</option>
                    <option value="admin_keuangan">Admin Keuangan</option>
                    <option value="superadmin">Super Admin</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Jumlah Link (1-20)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={inviteCount}
                    onChange={(e) => setInviteCount(parseInt(e.target.value) || 1)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Setiap link hanya bisa digunakan 1 kali
                  </p>
                </div>

                <button
                  onClick={generateInviteLinks}
                  className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  Generate {inviteCount} Link{inviteCount > 1 ? 's' : ''}
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 mb-4">
                  <p className="text-emerald-800 font-medium">
                    ✓ {generatedLinks.length} invite link berhasil dibuat!
                  </p>
                  <p className="text-sm text-emerald-700 mt-1">
                    Role: <span className="font-semibold">{getRoleName(inviteRole)}</span>
                  </p>
                </div>

                <div className="max-h-96 overflow-y-auto space-y-2">
                  {generatedLinks.map((link, index) => (
                    <div key={link.id} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-gray-500 mb-1">Link #{index + 1}</p>
                          <code className="text-xs text-gray-700 break-all">
                            {window.location.origin}/invite/{link.invite_token}
                          </code>
                        </div>
                        <button
                          onClick={() => copyToClipboard(link.invite_token, index)}
                          className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm flex-shrink-0"
                        >
                          {copiedIndex === index ? (
                            <>
                              <Check className="w-4 h-4" />
                              Copied!
                            </>
                          ) : (
                            <>
                              <Copy className="w-4 h-4" />
                              Copy
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => { setShowInviteModal(false); setGeneratedLinks([]); }}
                  className="w-full bg-gray-100 text-gray-700 py-3 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                >
                  Selesai
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {showInviteList && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">Daftar Invite Links</h3>
              <button onClick={() => setShowInviteList(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>

            {inviteLinks.length === 0 ? (
              <div className="text-center py-12">
                <LinkIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">Belum ada invite link</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {inviteLinks.map((link) => (
                  <div key={link.id} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getRoleColor(link.role)}`}>
                            {getRoleName(link.role)}
                          </span>
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                            link.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                          }`}>
                            {link.is_active ? 'Active' : 'Inactive'}
                          </span>
                          <span className="text-xs text-gray-500">
                            {link.current_uses}/{link.max_uses} digunakan
                          </span>
                        </div>
                        <code className="text-xs text-gray-700 break-all block">
                          {window.location.origin}/invite/{link.invite_token}
                        </code>
                        <p className="text-xs text-gray-500 mt-1">
                          Dibuat: {new Date(link.created_at).toLocaleString('id-ID')}
                        </p>
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <button
                          onClick={() => copyToClipboard(link.invite_token, inviteLinks.indexOf(link))}
                          className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors"
                          title="Copy Link"
                        >
                          {copiedIndex === inviteLinks.indexOf(link) ? (
                            <Check className="w-4 h-4" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </button>
                        {link.current_uses === 0 && (
                          <button
                            onClick={() => toggleInviteActive(link.id, link.is_active)}
                            className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                              link.is_active
                                ? 'bg-red-100 text-red-600 hover:bg-red-200'
                                : 'bg-emerald-100 text-emerald-600 hover:bg-emerald-200'
                            }`}
                          >
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
