require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env') });
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

function createUserClient(token) {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
}

const app = express();

const UPLOAD_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${path.extname(file.originalname)}`),
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use('/uploads', express.static(UPLOAD_DIR));

const ADMIN_ROLES = ['superadmin', 'admin_keuangan', 'admin_sariroti'];
const SUPERADMIN_ONLY = ['superadmin'];
const SARIROTI_AND_ADMIN = ['superadmin', 'admin_sariroti', 'admin_keuangan', 'karyawan_sariroti'];

const WRITE_ROLE_MAP = {
  job_positions: SUPERADMIN_ONLY,
  invite_links: SUPERADMIN_ONLY,
  user_profiles: SUPERADMIN_ONLY,
  employees: ADMIN_ROLES,
  salary_payments: ADMIN_ROLES,
  employee_loans: ADMIN_ROLES,
  announcements: ADMIN_ROLES,
  sariroti_settings: ADMIN_ROLES,
  visit_plans: SARIROTI_AND_ADMIN,
  visit_checkins: SARIROTI_AND_ADMIN,
  bread_scans: SARIROTI_AND_ADMIN,
};

async function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ data: null, error: { message: 'Unauthorized' } });

  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !user) {
    return res.status(401).json({ data: null, error: { message: 'Invalid token' } });
  }

  const userClient = createUserClient(token);
  const { data: profile } = await userClient
    .from('user_profiles')
    .select('id, role, full_name, email')
    .eq('user_id', user.id)
    .maybeSingle();

  req.user = { id: user.id, email: user.email, role: profile?.role || 'karyawan', profileId: profile?.id };
  req.token = token;
  req.supabase = userClient;
  next();
}

function requireRole(...roles) {
  return (req, res, next) => {
    const userRole = req.user?.role || 'karyawan';
    if (!roles.includes(userRole)) {
      return res.status(403).json({ data: null, error: { message: 'Akses ditolak.' } });
    }
    next();
  };
}

async function dbQuery(sql, params = []) {
  const url = `${SUPABASE_URL}/rest/v1/rpc/exec_sql`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({ query: sql, params }),
  });
  return res.json();
}

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const { data, error } = await supabaseAdmin.auth.signInWithPassword({ email, password });
    if (error) return res.json({ data: null, error: { message: error.message } });

    const userClient = createUserClient(data.session.access_token);
    const { data: profile } = await userClient
      .from('user_profiles')
      .select('role')
      .eq('user_id', data.user.id)
      .maybeSingle();

    const user = { id: data.user.id, email: data.user.email, role: profile?.role || 'karyawan' };
    res.json({ data: { session: { access_token: data.session.access_token, user } }, error: null });
  } catch (err) {
    res.status(500).json({ data: null, error: { message: err.message } });
  }
});

app.get('/api/auth/me', authMiddleware, (req, res) => {
  res.json({ data: { user: req.user }, error: null });
});

app.post('/api/auth/logout', (_req, res) => {
  res.json({ data: null, error: null });
});

app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password } = req.body;
    const { data, error } = await supabaseAdmin.auth.signUp({ email, password });
    if (error) return res.json({ data: null, error: { message: error.message } });
    if (!data.session) return res.json({ data: null, error: { message: 'Registration failed' } });

    const userClient = createUserClient(data.session.access_token);
    await userClient.from('user_profiles').insert({
      user_id: data.user.id,
      role: 'karyawan',
      full_name: '',
      email,
    });

    res.json({ data: { session: { access_token: data.session.access_token, user: { id: data.user.id, email } } }, error: null });
  } catch (err) {
    res.status(500).json({ data: null, error: { message: err.message } });
  }
});

app.post('/api/auth/create-user', authMiddleware, requireRole('superadmin'), async (req, res) => {
  try {
    const {
      email, password, full_name = '', role = 'karyawan',
      phone = '', department = '', job_title = '', hire_date = null,
      nik = '', gender = '', date_of_birth = null, address = '', status = 'active',
    } = req.body;

    if (!email || !password) {
      return res.status(400).json({ data: null, error: { message: 'Email dan password wajib diisi.' } });
    }

    const { data: signUpData, error: signUpError } = await supabaseAdmin.auth.signUp({ email, password });
    if (signUpError) return res.json({ data: null, error: { message: signUpError.message } });

    const userId = signUpData.user?.id;
    if (!userId) return res.json({ data: null, error: { message: 'Gagal membuat user.' } });

    const { error: profileError } = await req.supabase.from('user_profiles').insert({
      user_id: userId,
      role,
      full_name,
      email,
      phone,
      department,
      job_title,
      hire_date: hire_date || null,
      nik,
      gender,
      date_of_birth: date_of_birth || null,
      address,
      status,
    });

    if (profileError) return res.json({ data: null, error: { message: profileError.message } });

    res.json({ data: { id: userId, email }, error: null });
  } catch (err) {
    res.status(500).json({ data: null, error: { message: err.message } });
  }
});

app.delete('/api/auth/delete-user/:userId', authMiddleware, requireRole('superadmin'), async (req, res) => {
  try {
    const { userId } = req.params;
    const { data: profile } = await req.supabase
      .from('user_profiles')
      .select('email')
      .eq('user_id', userId)
      .maybeSingle();

    if (profile?.email === 'admin@admin.com') {
      return res.json({ data: null, error: { message: 'Tidak bisa menghapus akun superadmin utama.' } });
    }

    await req.supabase.from('user_profiles').delete().eq('user_id', userId);
    res.json({ data: null, error: null });
  } catch (err) {
    res.status(500).json({ data: null, error: { message: err.message } });
  }
});

app.post('/api/auth/update-password', authMiddleware, async (req, res) => {
  try {
    const { password } = req.body;
    const { error } = await supabaseAdmin.auth.updateUser({ password });
    if (error) return res.json({ data: null, error: { message: error.message } });
    res.json({ data: { user: req.user }, error: null });
  } catch (err) {
    res.status(500).json({ data: null, error: { message: err.message } });
  }
});

function parseFilters(query) {
  const filters = [];
  const filterParam = query.filter;
  if (!filterParam) return filters;
  const arr = Array.isArray(filterParam) ? filterParam : [filterParam];
  for (const f of arr) {
    const colonIdx = f.indexOf(':');
    if (colonIdx > 0) {
      filters.push({ col: f.substring(0, colonIdx), val: f.substring(colonIdx + 1) });
    }
  }
  return filters;
}

app.get('/api/stores', authMiddleware, async (req, res) => {
  try {
    const userRole = req.user?.role || 'karyawan';
    const adminRoles = ['superadmin', 'admin_sariroti', 'admin_keuangan'];

    if (adminRoles.includes(userRole)) {
      const { data: stores, error } = await req.supabase
        .from('stores')
        .select('*, user_profile:user_profiles(full_name, email)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      const mapped = (stores || []).map(s => ({
        ...s,
        karyawan_name: s.user_profile?.full_name || '',
        karyawan_email: s.user_profile?.email || '',
        user_profile: undefined,
      }));
      res.json({ data: mapped, error: null });
    } else {
      const { data: profile } = await req.supabase
        .from('user_profiles')
        .select('id')
        .eq('user_id', req.user.id)
        .maybeSingle();

      if (!profile) return res.json({ data: [], error: null });

      const { data: stores, error } = await req.supabase
        .from('stores')
        .select('*')
        .eq('user_profile_id', profile.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      res.json({ data: stores || [], error: null });
    }
  } catch (err) {
    res.status(500).json({ data: null, error: { message: err.message } });
  }
});

app.post('/api/stores', authMiddleware, upload.single('foto_toko'), async (req, res) => {
  try {
    const userRole = req.user?.role || 'karyawan';
    if (!['karyawan_sariroti', 'superadmin', 'admin_sariroti', 'admin_keuangan'].includes(userRole)) {
      return res.status(403).json({ data: null, error: { message: 'Akses ditolak.' } });
    }

    const { data: profile } = await req.supabase
      .from('user_profiles')
      .select('id')
      .eq('user_id', req.user.id)
      .maybeSingle();

    if (!profile) return res.status(400).json({ data: null, error: { message: 'Profil tidak ditemukan.' } });

    const { nama_toko, nama_pemilik, alamat, nomor_hp, sharelok } = req.body;
    const foto_toko = req.file ? `/uploads/${req.file.filename}` : '';

    const { data, error } = await req.supabase.from('stores').insert({
      user_profile_id: profile.id,
      nama_toko,
      nama_pemilik: nama_pemilik || '',
      alamat: alamat || '',
      nomor_hp: nomor_hp || '',
      sharelok: sharelok || '',
      foto_toko,
    }).select().single();

    if (error) throw error;
    res.json({ data, error: null });
  } catch (err) {
    res.status(500).json({ data: null, error: { message: err.message } });
  }
});

app.put('/api/stores/:id', authMiddleware, requireRole('superadmin', 'admin_sariroti', 'admin_keuangan'), upload.single('foto_toko'), async (req, res) => {
  try {
    const { nama_toko, nama_pemilik, alamat, nomor_hp, sharelok, status } = req.body;

    const { data: existing } = await req.supabase
      .from('stores')
      .select('*')
      .eq('id', req.params.id)
      .maybeSingle();

    if (!existing) return res.status(404).json({ data: null, error: { message: 'Toko tidak ditemukan.' } });

    const foto_toko = req.file ? `/uploads/${req.file.filename}` : existing.foto_toko;

    const { data, error } = await req.supabase
      .from('stores')
      .update({
        nama_toko, nama_pemilik,
        alamat: alamat || '', nomor_hp: nomor_hp || '',
        sharelok: sharelok || '', foto_toko,
        status: status || 'active',
      })
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;
    res.json({ data, error: null });
  } catch (err) {
    res.status(500).json({ data: null, error: { message: err.message } });
  }
});

app.put('/api/stores/:id/transfer', authMiddleware, requireRole('superadmin', 'admin_sariroti', 'admin_keuangan'), async (req, res) => {
  try {
    const { new_user_profile_id } = req.body;
    if (!new_user_profile_id) return res.status(400).json({ data: null, error: { message: 'Target karyawan wajib diisi.' } });

    const { data, error } = await req.supabase
      .from('stores')
      .update({ user_profile_id: new_user_profile_id })
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ data: null, error: { message: 'Toko tidak ditemukan.' } });
    res.json({ data, error: null });
  } catch (err) {
    res.status(500).json({ data: null, error: { message: err.message } });
  }
});

app.delete('/api/stores/:id', authMiddleware, requireRole('superadmin', 'admin_sariroti', 'admin_keuangan'), async (req, res) => {
  try {
    await req.supabase.from('stores').delete().eq('id', req.params.id);
    res.json({ data: null, error: null });
  } catch (err) {
    res.status(500).json({ data: null, error: { message: err.message } });
  }
});

app.get('/api/sku-items', authMiddleware, async (req, res) => {
  try {
    const activeOnly = req.query.active_only === 'true';
    let query = req.supabase.from('sku_items').select('*').order('kategori').order('kode');
    if (activeOnly) query = query.eq('is_active', true);

    const { data, error } = await query;
    if (error) throw error;
    res.json({ data: data || [], error: null });
  } catch (err) {
    res.status(500).json({ data: null, error: { message: err.message } });
  }
});

app.post('/api/sku-items', authMiddleware, requireRole('superadmin', 'admin_sariroti'), async (req, res) => {
  try {
    const { kode, nama, kategori, cbp } = req.body;
    if (!kode || !nama || !kategori) {
      return res.status(400).json({ data: null, error: { message: 'Kode, nama, dan kategori wajib diisi' } });
    }

    const { data: existing } = await req.supabase
      .from('sku_items')
      .select('id')
      .eq('kode', kode)
      .maybeSingle();

    if (existing) {
      return res.status(409).json({ data: null, error: { message: `SKU dengan kode "${kode}" sudah ada` } });
    }

    const { data, error } = await req.supabase.from('sku_items').insert({
      kode: kode.trim(), nama: nama.trim(), kategori: kategori.trim(), cbp: cbp || 0, is_active: true,
    }).select().single();

    if (error) throw error;
    res.json({ data, error: null });
  } catch (err) {
    res.status(500).json({ data: null, error: { message: err.message } });
  }
});

app.put('/api/sku-items/:id', authMiddleware, requireRole('superadmin', 'admin_sariroti'), async (req, res) => {
  try {
    const { kode, nama, kategori, cbp, is_active } = req.body;
    const updates = {};
    if (kode !== undefined) updates.kode = kode;
    if (nama !== undefined) updates.nama = nama;
    if (kategori !== undefined) updates.kategori = kategori;
    if (cbp !== undefined) updates.cbp = cbp;
    if (is_active !== undefined) updates.is_active = is_active;

    const { data, error } = await req.supabase
      .from('sku_items')
      .update(updates)
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ data: null, error: { message: 'SKU tidak ditemukan' } });
    res.json({ data, error: null });
  } catch (err) {
    res.status(500).json({ data: null, error: { message: err.message } });
  }
});

app.delete('/api/sku-items/:id', authMiddleware, requireRole('superadmin', 'admin_sariroti'), async (req, res) => {
  try {
    const { data, error } = await req.supabase
      .from('sku_items')
      .delete()
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ data: null, error: { message: 'SKU tidak ditemukan' } });
    res.json({ data, error: null });
  } catch (err) {
    res.status(500).json({ data: null, error: { message: err.message } });
  }
});

app.get('/api/sariroti-settings/:userProfileId', authMiddleware, async (req, res) => {
  try {
    const { data, error } = await req.supabase
      .from('sariroti_settings')
      .select('*')
      .eq('user_profile_id', req.params.userProfileId)
      .maybeSingle();

    if (error) throw error;
    res.json({ data: data || null, error: null });
  } catch (err) {
    res.status(500).json({ data: null, error: { message: err.message } });
  }
});

app.put('/api/sariroti-settings/:userProfileId', authMiddleware, requireRole('superadmin', 'admin_sariroti', 'admin_keuangan'), async (req, res) => {
  try {
    const { min_visits, max_visits, plan_deadline } = req.body;

    const { data, error } = await req.supabase
      .from('sariroti_settings')
      .upsert({
        user_profile_id: req.params.userProfileId,
        min_visits, max_visits, plan_deadline,
      }, { onConflict: 'user_profile_id' })
      .select()
      .single();

    if (error) throw error;
    res.json({ data, error: null });
  } catch (err) {
    res.status(500).json({ data: null, error: { message: err.message } });
  }
});

app.post('/api/checkin', authMiddleware, upload.single('selfie'), async (req, res) => {
  try {
    const { visit_plan_id, store_name, store_address, visit_type, total_billing, has_expired_bread, notes, gps_lat, gps_lng, gps_accuracy } = req.body;
    if (!store_name || !visit_plan_id || !visit_type) {
      return res.status(400).json({ data: null, error: { message: 'visit_plan_id, store_name, visit_type wajib diisi.' } });
    }
    const selfie_url = req.file ? `/uploads/${req.file.filename}` : '';

    const { data: plan } = await req.supabase
      .from('visit_plans')
      .select('plan_date, user_id')
      .eq('id', visit_plan_id)
      .maybeSingle();

    if (!plan) return res.status(404).json({ data: null, error: { message: 'Plan tidak ditemukan.' } });

    const { data: existingCheckins } = await req.supabase
      .from('visit_checkins')
      .select('id, visit_plan_id')
      .eq('visit_plan_id', visit_plan_id)
      .ilike('store_name', store_name.trim());

    if (existingCheckins && existingCheckins.length > 0) {
      return res.status(409).json({ data: null, error: { message: `Toko "${store_name}" sudah di-check-in hari ini.` } });
    }

    const { data, error } = await req.supabase.from('visit_checkins').insert({
      visit_plan_id,
      user_id: plan.user_id,
      store_name: store_name.trim(),
      store_address: store_address || '',
      selfie_url,
      visit_type,
      total_billing: parseFloat(total_billing || '0'),
      has_expired_bread: has_expired_bread === 'true' || has_expired_bread === true,
      notes: notes || '',
      status: 'completed',
      gps_lat: gps_lat ? parseFloat(gps_lat) : null,
      gps_lng: gps_lng ? parseFloat(gps_lng) : null,
      gps_accuracy: gps_accuracy ? parseFloat(gps_accuracy) : null,
    }).select().single();

    if (error) throw error;
    res.json({ data, error: null });
  } catch (err) {
    res.status(500).json({ data: null, error: { message: err.message } });
  }
});

app.post('/api/checkout/:checkinId', authMiddleware, async (req, res) => {
  try {
    const { data: existing } = await req.supabase
      .from('visit_checkins')
      .select('*')
      .eq('id', req.params.checkinId)
      .maybeSingle();

    if (!existing) return res.status(404).json({ data: null, error: { message: 'Check-in tidak ditemukan.' } });
    if (existing.user_id !== req.user.id && !['superadmin', 'admin_sariroti', 'admin_keuangan'].includes(req.user.role)) {
      return res.status(403).json({ data: null, error: { message: 'Akses ditolak.' } });
    }
    if (existing.checkout_time) {
      return res.status(400).json({ data: null, error: { message: 'Sudah di-checkout.' } });
    }

    const now = new Date();
    const checkinTime = new Date(existing.checkin_time);
    const durationMinutes = Math.round((now - checkinTime) / 60000);

    const { data, error } = await req.supabase
      .from('visit_checkins')
      .update({ checkout_time: now.toISOString(), duration_minutes: durationMinutes })
      .eq('id', req.params.checkinId)
      .select()
      .single();

    if (error) throw error;
    res.json({ data, error: null });
  } catch (err) {
    res.status(500).json({ data: null, error: { message: err.message } });
  }
});

app.get('/api/laporan-karyawan', authMiddleware, async (req, res) => {
  try {
    const { from, to, user_profile_id } = req.query;
    const isAdmin = ['superadmin', 'admin_sariroti', 'admin_keuangan'].includes(req.user.role);

    let plansQuery = req.supabase.from('visit_plans').select('id, plan_date, status, stores, user_id');
    if (from) plansQuery = plansQuery.gte('plan_date', from);
    if (to) plansQuery = plansQuery.lte('plan_date', to);
    if (!isAdmin) plansQuery = plansQuery.eq('user_id', req.user.id);

    const { data: plans } = await plansQuery.order('plan_date', { ascending: false });
    if (!plans || plans.length === 0) return res.json({ data: [], error: null });

    const planIds = plans.map(p => p.id);
    const userIds = [...new Set(plans.map(p => p.user_id))];

    const { data: profiles } = await req.supabase
      .from('user_profiles')
      .select('id, user_id, full_name, email')
      .in('user_id', userIds);

    if (user_profile_id && profiles) {
      const targetProfile = profiles.find(p => p.id === user_profile_id);
      if (!targetProfile) return res.json({ data: [], error: null });
    }

    const { data: checkins } = await req.supabase
      .from('visit_checkins')
      .select('id, visit_plan_id, total_billing, duration_minutes')
      .in('visit_plan_id', planIds);

    const profileMap = {};
    (profiles || []).forEach(p => { profileMap[p.user_id] = p; });

    const rows = plans.map(vp => {
      const up = profileMap[vp.user_id] || {};
      if (user_profile_id && up.id !== user_profile_id) return null;
      const planCheckins = (checkins || []).filter(c => c.visit_plan_id === vp.id);
      const totalBilling = planCheckins.reduce((s, c) => s + (parseFloat(c.total_billing) || 0), 0);
      const durations = planCheckins.filter(c => c.duration_minutes).map(c => c.duration_minutes);
      const avgDuration = durations.length > 0 ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : null;
      const plannedStores = Array.isArray(vp.stores) ? vp.stores.length : 0;

      return {
        plan_date: vp.plan_date,
        user_profile_id: up.id,
        full_name: up.full_name || '',
        email: up.email || '',
        total_checkins: planCheckins.length,
        total_billing: totalBilling,
        avg_duration_minutes: avgDuration,
        plan_status: vp.status,
        plan_id: vp.id,
        planned_stores: plannedStores,
        plan_completed: planCheckins.length >= plannedStores && plannedStores > 0,
      };
    }).filter(Boolean);

    res.json({ data: rows, error: null });
  } catch (err) {
    res.status(500).json({ data: null, error: { message: err.message } });
  }
});

app.get('/api/laporan-karyawan/export', authMiddleware, async (req, res) => {
  try {
    const { from, to, user_profile_id } = req.query;
    const isAdmin = ['superadmin', 'admin_sariroti', 'admin_keuangan'].includes(req.user.role);

    let plansQuery = req.supabase.from('visit_plans').select('id, plan_date, user_id');
    if (from) plansQuery = plansQuery.gte('plan_date', from);
    if (to) plansQuery = plansQuery.lte('plan_date', to);
    if (!isAdmin) plansQuery = plansQuery.eq('user_id', req.user.id);
    const { data: plans } = await plansQuery;

    const planIds = (plans || []).map(p => p.id);
    const userIds = [...new Set((plans || []).map(p => p.user_id))];

    const { data: profiles } = await req.supabase
      .from('user_profiles')
      .select('id, user_id, full_name, email')
      .in('user_id', userIds);

    const { data: checkins } = await req.supabase
      .from('visit_checkins')
      .select('*')
      .in('visit_plan_id', planIds)
      .order('checkin_time', { ascending: true });

    const profileMap = {};
    (profiles || []).forEach(p => { profileMap[p.user_id] = p; });
    const planMap = {};
    (plans || []).forEach(p => { planMap[p.id] = p; });

    const header = ['Tanggal', 'Nama Karyawan', 'Email', 'Nama Toko', 'Alamat Toko', 'Jenis Kunjungan', 'Total Tagihan',
      'Waktu Checkin', 'Waktu Checkout', 'Durasi (menit)', 'Ada Roti Tarik', 'GPS Lat', 'GPS Lng', 'Akurasi GPS (m)', 'Catatan'];
    const escape = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const lines = [header.map(escape).join(',')];

    (checkins || []).forEach(vc => {
      const plan = planMap[vc.visit_plan_id];
      const up = plan ? profileMap[plan.user_id] : {};
      if (user_profile_id && up?.id !== user_profile_id) return;
      const row = [
        plan?.plan_date, up?.full_name || '', up?.email || '', vc.store_name || '', vc.store_address || '',
        vc.visit_type || '', vc.total_billing || 0,
        vc.checkin_time ? new Date(vc.checkin_time).toLocaleString('id-ID') : '',
        vc.checkout_time ? new Date(vc.checkout_time).toLocaleString('id-ID') : '',
        vc.duration_minutes || '', vc.has_expired_bread ? 'Ya' : 'Tidak',
        vc.gps_lat || '', vc.gps_lng || '', vc.gps_accuracy || '', vc.notes || '',
      ];
      lines.push(row.map(escape).join(','));
    });

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="laporan-kunjungan-${from || 'all'}-${to || 'all'}.csv"`);
    res.send('\uFEFF' + lines.join('\r\n'));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/performa-karyawan', authMiddleware, requireRole('superadmin', 'admin_sariroti', 'admin_keuangan'), async (req, res) => {
  try {
    const { bulan, tahun } = req.query;
    const month = parseInt(bulan) || new Date().getMonth() + 1;
    const year = parseInt(tahun) || new Date().getFullYear();

    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endMonth = month === 12 ? 1 : month + 1;
    const endYear = month === 12 ? year + 1 : year;
    const endDate = `${endYear}-${String(endMonth).padStart(2, '0')}-01`;

    const { data: sarirotiProfiles } = await req.supabase
      .from('user_profiles')
      .select('id, user_id, full_name, email')
      .eq('role', 'karyawan_sariroti');

    if (!sarirotiProfiles || sarirotiProfiles.length === 0) {
      return res.json({ data: [], error: null });
    }

    const userIds = sarirotiProfiles.map(p => p.user_id);
    const { data: plans } = await req.supabase
      .from('visit_plans')
      .select('id, user_id, status')
      .in('user_id', userIds)
      .gte('plan_date', startDate)
      .lt('plan_date', endDate);

    const planIds = (plans || []).map(p => p.id);
    const { data: checkins } = planIds.length > 0
      ? await req.supabase
          .from('visit_checkins')
          .select('id, visit_plan_id, total_billing, duration_minutes')
          .in('visit_plan_id', planIds)
      : { data: [] };

    const rows = sarirotiProfiles.map(up => {
      const userPlans = (plans || []).filter(p => p.user_id === up.user_id);
      const userPlanIds = userPlans.map(p => p.id);
      const userCheckins = (checkins || []).filter(c => userPlanIds.includes(c.visit_plan_id));
      const submittedPlans = userPlans.filter(p => ['submitted', 'approved'].includes(p.status)).length;
      const totalBilling = userCheckins.reduce((s, c) => s + (parseFloat(c.total_billing) || 0), 0);
      const durations = userCheckins.filter(c => c.duration_minutes).map(c => c.duration_minutes);
      const avgDuration = durations.length > 0 ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : null;
      const compliancePct = userPlans.length > 0 ? Math.round(submittedPlans / userPlans.length * 100) : null;

      return {
        user_profile_id: up.id,
        full_name: up.full_name,
        email: up.email,
        total_plans: userPlans.length,
        submitted_plans: submittedPlans,
        total_checkins: userCheckins.length,
        total_billing: totalBilling,
        avg_duration_minutes: avgDuration,
        compliance_pct: compliancePct,
      };
    });

    rows.sort((a, b) => b.total_billing - a.total_billing);
    res.json({ data: rows, error: null });
  } catch (err) {
    res.status(500).json({ data: null, error: { message: err.message } });
  }
});

app.get('/api/store-visit-history/:storeId', authMiddleware, requireRole('superadmin', 'admin_sariroti', 'admin_keuangan'), async (req, res) => {
  try {
    const { data: store } = await req.supabase
      .from('stores')
      .select('nama_toko')
      .eq('id', req.params.storeId)
      .maybeSingle();

    if (!store) return res.status(404).json({ data: null, error: { message: 'Toko tidak ditemukan.' } });

    const { data: checkins } = await req.supabase
      .from('visit_checkins')
      .select('id, checkin_time, checkout_time, duration_minutes, visit_type, total_billing, has_expired_bread, gps_lat, gps_lng, notes, user_id, visit_plan_id')
      .ilike('store_name', store.nama_toko)
      .order('checkin_time', { ascending: false })
      .limit(100);

    const userIds = [...new Set((checkins || []).map(c => c.user_id))];
    const planIds = [...new Set((checkins || []).map(c => c.visit_plan_id))];

    const { data: profiles } = userIds.length > 0
      ? await req.supabase.from('user_profiles').select('user_id, full_name').in('user_id', userIds)
      : { data: [] };

    const { data: plans } = planIds.length > 0
      ? await req.supabase.from('visit_plans').select('id, plan_date').in('id', planIds)
      : { data: [] };

    const profileMap = {};
    (profiles || []).forEach(p => { profileMap[p.user_id] = p.full_name; });
    const planMap = {};
    (plans || []).forEach(p => { planMap[p.id] = p.plan_date; });

    const rows = (checkins || []).map(vc => ({
      ...vc,
      karyawan_name: profileMap[vc.user_id] || '',
      plan_date: planMap[vc.visit_plan_id] || '',
    }));

    res.json({ data: rows, error: null });
  } catch (err) {
    res.status(500).json({ data: null, error: { message: err.message } });
  }
});

app.get('/api/notifikasi-deadline', authMiddleware, async (req, res) => {
  try {
    const isAdmin = ['superadmin', 'admin_sariroti', 'admin_keuangan'].includes(req.user.role);
    const today = new Date().toISOString().split('T')[0];

    if (isAdmin) {
      const { data: sarirotiUsers } = await req.supabase
        .from('user_profiles')
        .select('id, user_id, full_name, email')
        .eq('role', 'karyawan_sariroti');

      if (!sarirotiUsers || sarirotiUsers.length === 0) return res.json({ data: [], error: null });

      const userIds = sarirotiUsers.map(u => u.user_id);
      const profileIds = sarirotiUsers.map(u => u.id);

      const { data: todayPlans } = await req.supabase
        .from('visit_plans')
        .select('id, user_id, status, submitted_at')
        .in('user_id', userIds)
        .eq('plan_date', today);

      const { data: settings } = await req.supabase
        .from('sariroti_settings')
        .select('user_profile_id, plan_deadline')
        .in('user_profile_id', profileIds);

      const planMap = {};
      (todayPlans || []).forEach(p => { planMap[p.user_id] = p; });
      const settingsMap = {};
      (settings || []).forEach(s => { settingsMap[s.user_profile_id] = s; });

      const rows = sarirotiUsers
        .filter(up => {
          const plan = planMap[up.user_id];
          return !plan || plan.status === 'draft';
        })
        .map(up => {
          const plan = planMap[up.user_id];
          const ss = settingsMap[up.id];
          return {
            user_profile_id: up.id,
            full_name: up.full_name,
            email: up.email,
            plan_status: plan?.status || null,
            submitted_at: plan?.submitted_at || null,
            plan_deadline: ss?.plan_deadline || null,
            status: plan ? plan.status : 'no_plan',
          };
        });

      res.json({ data: rows, error: null });
    } else {
      const { data: profile } = await req.supabase
        .from('user_profiles')
        .select('id')
        .eq('user_id', req.user.id)
        .maybeSingle();

      if (!profile) return res.json({ data: null, error: null });

      const { data: plan } = await req.supabase
        .from('visit_plans')
        .select('status, submitted_at')
        .eq('user_id', req.user.id)
        .eq('plan_date', today)
        .maybeSingle();

      const { data: ss } = await req.supabase
        .from('sariroti_settings')
        .select('plan_deadline')
        .eq('user_profile_id', profile.id)
        .maybeSingle();

      res.json({
        data: {
          status: plan?.status || null,
          submitted_at: plan?.submitted_at || null,
          plan_deadline: ss?.plan_deadline || null,
          plan_status: plan ? plan.status : 'no_plan',
        },
        error: null,
      });
    }
  } catch (err) {
    res.status(500).json({ data: null, error: { message: err.message } });
  }
});

app.get('/api/visit-summary', authMiddleware, requireRole('superadmin', 'admin_sariroti', 'admin_keuangan'), async (req, res) => {
  try {
    const { date } = req.query;
    let query = req.supabase.from('visit_plans').select('id, plan_date, status, submitted_at, stores, user_id');
    if (date) query = query.eq('plan_date', date);
    query = query.order('plan_date', { ascending: false });

    const { data: plans } = await query;
    if (!plans || plans.length === 0) return res.json({ data: [], error: null });

    const userIds = [...new Set(plans.map(p => p.user_id))];
    const planIds = plans.map(p => p.id);

    const { data: profiles } = await req.supabase
      .from('user_profiles')
      .select('id, user_id, full_name, email')
      .in('user_id', userIds);

    const { data: checkins } = await req.supabase
      .from('visit_checkins')
      .select('id, visit_plan_id, total_billing')
      .in('visit_plan_id', planIds);

    const profileMap = {};
    (profiles || []).forEach(p => { profileMap[p.user_id] = p; });

    const rows = plans.map(vp => {
      const up = profileMap[vp.user_id] || {};
      const planCheckins = (checkins || []).filter(c => c.visit_plan_id === vp.id);
      const totalBilling = planCheckins.reduce((s, c) => s + (parseFloat(c.total_billing) || 0), 0);

      return {
        id: vp.id,
        plan_date: vp.plan_date,
        status: vp.status,
        submitted_at: vp.submitted_at,
        stores: vp.stores,
        full_name: up.full_name || '',
        email: up.email || '',
        user_profile_id: up.id || '',
        checkin_count: planCheckins.length,
        total_billing: totalBilling,
      };
    });

    res.json({ data: rows, error: null });
  } catch (err) {
    res.status(500).json({ data: null, error: { message: err.message } });
  }
});

app.get('/api/visit-detail/:planId', authMiddleware, async (req, res) => {
  try {
    const { data: checkins } = await req.supabase
      .from('visit_checkins')
      .select('*')
      .eq('visit_plan_id', req.params.planId)
      .order('checkin_time');

    const checkinIds = (checkins || []).map(c => c.id);
    const { data: scans } = checkinIds.length > 0
      ? await req.supabase.from('bread_scans').select('*').in('checkin_id', checkinIds)
      : { data: [] };

    const result = (checkins || []).map(vc => ({
      ...vc,
      bread_scans: (scans || []).filter(s => s.checkin_id === vc.id),
    }));

    res.json({ data: result, error: null });
  } catch (err) {
    res.status(500).json({ data: null, error: { message: err.message } });
  }
});

app.get('/api/:table', authMiddleware, async (req, res) => {
  try {
    const { table } = req.params;
    const { select: selectStr = '*', order, limit: limitStr, single } = req.query;
    const filters = parseFilters(req.query);

    const selectCols = selectStr.replace(/\s+/g, '');
    let query = req.supabase.from(table).select(selectCols);

    for (const f of filters) {
      query = query.eq(f.col, f.val);
    }

    if (order) {
      const parts = order.split(':');
      query = query.order(parts[0], { ascending: parts[1] !== 'desc' });
    }

    if (limitStr) query = query.limit(parseInt(limitStr));

    if (single === '1' || single === 'true') {
      const { data, error } = await query.maybeSingle();
      if (error) throw error;
      res.json({ data: data || null, error: null });
    } else {
      const { data, error } = await query;
      if (error) throw error;
      res.json({ data: data || [], error: null });
    }
  } catch (err) {
    res.status(500).json({ data: null, error: { message: err.message } });
  }
});

app.post('/api/:table', authMiddleware, async (req, res) => {
  try {
    const { table } = req.params;
    const allowedRoles = WRITE_ROLE_MAP[table];
    if (allowedRoles) {
      const userRole = req.user?.role || 'karyawan';
      if (!allowedRoles.includes(userRole)) {
        return res.status(403).json({ data: null, error: { message: 'Akses ditolak.' } });
      }
    }

    const { data, error } = await req.supabase.from(table).insert(req.body).select().single();
    if (error) throw error;
    res.json({ data: data || null, error: null });
  } catch (err) {
    res.status(500).json({ data: null, error: { message: err.message } });
  }
});

app.put('/api/:table', authMiddleware, async (req, res) => {
  try {
    const { table } = req.params;
    const allowedRoles = WRITE_ROLE_MAP[table];
    if (allowedRoles) {
      const userRole = req.user?.role || 'karyawan';
      if (!allowedRoles.includes(userRole)) {
        return res.status(403).json({ data: null, error: { message: 'Akses ditolak.' } });
      }
    }
    const filters = parseFilters(req.query);
    if (filters.length === 0) return res.json({ data: null, error: { message: 'No filter specified' } });

    let query = req.supabase.from(table).update(req.body);
    for (const f of filters) {
      query = query.eq(f.col, f.val);
    }

    const { data, error } = await query.select().single();
    if (error) throw error;
    res.json({ data: data || null, error: null });
  } catch (err) {
    res.status(500).json({ data: null, error: { message: err.message } });
  }
});

app.delete('/api/:table', authMiddleware, async (req, res) => {
  try {
    const { table } = req.params;
    const allowedRoles = WRITE_ROLE_MAP[table];
    if (allowedRoles) {
      const userRole = req.user?.role || 'karyawan';
      if (!allowedRoles.includes(userRole)) {
        return res.status(403).json({ data: null, error: { message: 'Akses ditolak.' } });
      }
    }
    const filters = parseFilters(req.query);
    if (filters.length === 0) return res.json({ data: null, error: { message: 'No filter specified' } });

    let query = req.supabase.from(table).delete();
    for (const f of filters) {
      query = query.eq(f.col, f.val);
    }

    await query;
    res.json({ data: null, error: null });
  } catch (err) {
    res.status(500).json({ data: null, error: { message: err.message } });
  }
});

app.post('/api/upload', authMiddleware, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ data: null, error: { message: 'No file uploaded' } });
  const url = `/uploads/${req.file.filename}`;
  res.json({ data: { url }, error: null });
});

app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err.message);
  res.status(500).json({ data: null, error: { message: err.message } });
});

const PORT = 8000;
app.listen(PORT, '127.0.0.1', () => {
  console.log(`API server running on http://localhost:${PORT} (using Supabase REST API)`);
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
});
