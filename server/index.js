const express = require('express');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const JWT_SECRET = process.env.SESSION_SECRET || 'cashflow_secret_key';

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

// FK registry: table -> { relatedTable -> fkColumn }
const FK_REGISTRY = {
  transactions: { categories: 'category_id' },
  employees: { job_positions: 'job_position_id' },
  salary_payments: { employees: 'employee_id' },
  employee_loans: { employees: 'employee_id' },
  budget_plans: { categories: 'category_id' },
};

// Parse select string: "*, category:categories(*), col1, col2"
function parseSelect(selectStr) {
  const parts = [];
  let depth = 0, current = '';
  for (const ch of selectStr) {
    if (ch === '(') depth++;
    if (ch === ')') depth--;
    if (ch === ',' && depth === 0) { parts.push(current.trim()); current = ''; }
    else current += ch;
  }
  if (current.trim()) parts.push(current.trim());

  const columns = [];
  const relations = [];
  for (const part of parts) {
    // alias:table(cols) or table(cols)
    const m = part.match(/^(\w+):(\w+)\((.+)\)$/) || part.match(/^(\w+)\((.+)\)$/);
    if (m) {
      if (m[3]) {
        relations.push({ alias: m[1], table: m[2], cols: m[3] });
      } else {
        relations.push({ alias: m[1], table: m[1], cols: m[2] });
      }
    } else {
      columns.push(part.trim());
    }
  }
  return { columns, relations };
}

// Build the SELECT expression for a relation
function buildRelationExpr(parentTable, rel) {
  const fkMap = FK_REGISTRY[parentTable] || {};
  const fk = fkMap[rel.table] || fkMap[rel.alias] || `${rel.alias}_id`;

  let colExpr;
  if (rel.cols === '*') {
    colExpr = `(SELECT row_to_json(r) FROM ${rel.table} r WHERE r.id = t.${fk})`;
  } else {
    const cols = rel.cols.split(',').map(c => c.trim()).filter(Boolean);
    const jsonParts = cols.map(c => `'${c}', r.${c}`).join(', ');
    colExpr = `(SELECT json_build_object(${jsonParts}) FROM ${rel.table} r WHERE r.id = t.${fk})`;
  }
  return `${colExpr} AS ${rel.alias}`;
}

// Build the full SELECT query
function buildSelectSQL(tableName, selectStr, conditions, orderBy, orderDir, limitN, singleRow) {
  const { columns, relations } = parseSelect(selectStr || '*');

  const selectParts = [];
  if (columns.length === 0 || columns.includes('*')) {
    selectParts.push('t.*');
  } else {
    selectParts.push(...columns.map(c => `t.${c}`));
  }
  for (const rel of relations) {
    selectParts.push(buildRelationExpr(tableName, rel));
  }

  let sql = `SELECT ${selectParts.join(', ')} FROM ${tableName} t`;

  if (conditions.length > 0) {
    sql += ' WHERE ' + conditions.map((c, i) => `t.${c.col} = $${i + 1}`).join(' AND ');
  }

  if (orderBy) {
    sql += ` ORDER BY t.${orderBy} ${orderDir === 'desc' ? 'DESC' : 'ASC'}`;
  }

  if (limitN) sql += ` LIMIT ${parseInt(limitN)}`;

  return sql;
}

// Auth middleware
function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ data: null, error: { message: 'Unauthorized' } });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ data: null, error: { message: 'Invalid token' } });
  }
}

// Role guard middleware factory
function requireRole(...roles) {
  return (req, res, next) => {
    const userRole = req.user?.role || 'karyawan';
    if (!roles.includes(userRole)) {
      return res.status(403).json({ data: null, error: { message: 'Akses ditolak. Role Anda tidak memiliki izin untuk tindakan ini.' } });
    }
    next();
  };
}

const ADMIN_ROLES = ['superadmin', 'admin_keuangan', 'admin_sariroti'];
const ALL_ADMIN_ROLES = ['superadmin', 'admin_keuangan', 'admin_sariroti'];
const SUPERADMIN_ONLY = ['superadmin'];
const SARIROTI_USER = ['karyawan_sariroti'];
const SARIROTI_AND_ADMIN = ['superadmin', 'admin_sariroti', 'admin_keuangan', 'karyawan_sariroti'];

// Tables that require specific roles for write operations
const WRITE_ROLE_MAP = {
  job_positions:    SUPERADMIN_ONLY,
  invite_links:     SUPERADMIN_ONLY,
  user_profiles:    SUPERADMIN_ONLY,
  employees:        ADMIN_ROLES,
  salary_payments:  ADMIN_ROLES,
  employee_loans:   ADMIN_ROLES,
  announcements:    ALL_ADMIN_ROLES,
  sariroti_settings: ALL_ADMIN_ROLES,
  visit_plans:      SARIROTI_AND_ADMIN,
  visit_checkins:   SARIROTI_AND_ADMIN,
  bread_scans:      SARIROTI_AND_ADMIN,
};

// POST /api/auth/login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (!rows[0]) return res.json({ data: null, error: { message: 'Invalid login credentials' } });
    const valid = await bcrypt.compare(password, rows[0].password_hash);
    if (!valid) return res.json({ data: null, error: { message: 'Invalid login credentials' } });

    // Fetch role from user_profiles
    const profileResult = await pool.query('SELECT role FROM user_profiles WHERE user_id = $1', [rows[0].id]);
    const role = profileResult.rows[0]?.role || 'karyawan';

    const user = { id: rows[0].id, email: rows[0].email, role };
    const token = jwt.sign(user, JWT_SECRET, { expiresIn: '30d' });

    // Log login
    await pool.query(
      "INSERT INTO login_history (user_id, ip_address, status) VALUES ($1, $2, 'success')",
      [rows[0].id, req.ip]
    ).catch(() => {});

    res.json({ data: { session: { access_token: token, user } }, error: null });
  } catch (err) {
    res.status(500).json({ data: null, error: { message: err.message } });
  }
});

// GET /api/auth/me
app.get('/api/auth/me', authMiddleware, (req, res) => {
  res.json({ data: { user: req.user }, error: null });
});

// POST /api/auth/logout
app.post('/api/auth/logout', (req, res) => {
  res.json({ data: null, error: null });
});

// POST /api/auth/register
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password } = req.body;
    const hash = await bcrypt.hash(password, 10);
    const { rows } = await pool.query(
      'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email',
      [email, hash]
    );
    const user = rows[0];
    // Create default profile
    await pool.query(
      "INSERT INTO user_profiles (user_id, role, full_name, email) VALUES ($1, 'karyawan', $2, $3) ON CONFLICT DO NOTHING",
      [user.id, '', email]
    );
    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '30d' });
    res.json({ data: { session: { access_token: token, user: { id: user.id, email: user.email } } }, error: null });
  } catch (err) {
    if (err.code === '23505') {
      res.json({ data: null, error: { message: 'Email already registered' } });
    } else {
      res.status(500).json({ data: null, error: { message: err.message } });
    }
  }
});

// POST /api/auth/create-user  (superadmin only)
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

    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.json({ data: null, error: { message: 'Email sudah terdaftar.' } });
    }

    const hash = await bcrypt.hash(password, 10);
    const { rows } = await pool.query(
      'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email',
      [email, hash]
    );
    const newUser = rows[0];

    await pool.query(
      `INSERT INTO user_profiles
        (user_id, role, full_name, email, phone, department, job_title, hire_date, nik, gender, date_of_birth, address, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
      [newUser.id, role, full_name, email, phone, department, job_title,
       hire_date || null, nik, gender, date_of_birth || null, address, status]
    );

    res.json({ data: { id: newUser.id, email: newUser.email }, error: null });
  } catch (err) {
    console.error('create-user error:', err.message);
    res.status(500).json({ data: null, error: { message: err.message } });
  }
});

// DELETE /api/auth/delete-user/:userId  (superadmin only)
app.delete('/api/auth/delete-user/:userId', authMiddleware, requireRole('superadmin'), async (req, res) => {
  try {
    const { userId } = req.params;
    // Protect main superadmin
    const profile = await pool.query('SELECT email FROM user_profiles WHERE user_id = $1', [userId]);
    if (profile.rows[0]?.email === 'admin@admin.com') {
      return res.json({ data: null, error: { message: 'Tidak bisa menghapus akun superadmin utama.' } });
    }
    await pool.query('DELETE FROM user_profiles WHERE user_id = $1', [userId]);
    await pool.query('DELETE FROM users WHERE id = $1', [userId]);
    res.json({ data: null, error: null });
  } catch (err) {
    console.error('delete-user error:', err.message);
    res.status(500).json({ data: null, error: { message: err.message } });
  }
});

// POST /api/auth/update-password
app.post('/api/auth/update-password', authMiddleware, async (req, res) => {
  try {
    const { password } = req.body;
    const hash = await bcrypt.hash(password, 10);
    await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, req.user.id]);
    res.json({ data: { user: req.user }, error: null });
  } catch (err) {
    res.status(500).json({ data: null, error: { message: err.message } });
  }
});

// Parse filter query params: filter=col:val (multiple allowed)
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

// ─── STORES ───────────────────────────────────────────────────────────────────

// GET /api/stores - list stores (admin: all, karyawan_sariroti: own)
app.get('/api/stores', authMiddleware, async (req, res) => {
  try {
    const userRole = req.user?.role || 'karyawan';
    const adminRoles = ['superadmin', 'admin_sariroti', 'admin_keuangan'];
    let query, params;
    if (adminRoles.includes(userRole)) {
      query = `
        SELECT s.*, up.full_name AS karyawan_name, up.email AS karyawan_email
        FROM stores s
        LEFT JOIN user_profiles up ON up.id = s.user_profile_id
        ORDER BY s.created_at DESC`;
      params = [];
    } else {
      const { rows: profile } = await pool.query('SELECT id FROM user_profiles WHERE user_id = $1', [req.user.id]);
      if (!profile[0]) return res.json({ data: [], error: null });
      query = 'SELECT * FROM stores WHERE user_profile_id = $1 ORDER BY created_at DESC';
      params = [profile[0].id];
    }
    const { rows } = await pool.query(query, params);
    res.json({ data: rows, error: null });
  } catch (err) {
    res.status(500).json({ data: null, error: { message: err.message } });
  }
});

// POST /api/stores - register store (karyawan_sariroti)
app.post('/api/stores', authMiddleware, upload.single('foto_toko'), async (req, res) => {
  try {
    const userRole = req.user?.role || 'karyawan';
    if (!['karyawan_sariroti', 'superadmin', 'admin_sariroti', 'admin_keuangan'].includes(userRole)) {
      return res.status(403).json({ data: null, error: { message: 'Akses ditolak.' } });
    }
    const { rows: profile } = await pool.query('SELECT id FROM user_profiles WHERE user_id = $1', [req.user.id]);
    if (!profile[0]) return res.status(400).json({ data: null, error: { message: 'Profil tidak ditemukan.' } });
    const { nama_toko, nama_pemilik, alamat, nomor_hp, sharelok } = req.body;
    const foto_toko = req.file ? `/uploads/${req.file.filename}` : '';
    const { rows } = await pool.query(
      `INSERT INTO stores (user_profile_id, nama_toko, nama_pemilik, alamat, nomor_hp, sharelok, foto_toko)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [profile[0].id, nama_toko, nama_pemilik, alamat || '', nomor_hp || '', sharelok || '', foto_toko]
    );
    res.json({ data: rows[0], error: null });
  } catch (err) {
    res.status(500).json({ data: null, error: { message: err.message } });
  }
});

// PUT /api/stores/:id - edit store (admin only)
app.put('/api/stores/:id', authMiddleware, requireRole('superadmin', 'admin_sariroti', 'admin_keuangan'), upload.single('foto_toko'), async (req, res) => {
  try {
    const { nama_toko, nama_pemilik, alamat, nomor_hp, sharelok, status } = req.body;
    const { rows: existing } = await pool.query('SELECT * FROM stores WHERE id = $1', [req.params.id]);
    if (!existing[0]) return res.status(404).json({ data: null, error: { message: 'Toko tidak ditemukan.' } });
    const foto_toko = req.file ? `/uploads/${req.file.filename}` : existing[0].foto_toko;
    const { rows } = await pool.query(
      `UPDATE stores SET nama_toko=$1, nama_pemilik=$2, alamat=$3, nomor_hp=$4, sharelok=$5, foto_toko=$6, status=$7, updated_at=now()
       WHERE id=$8 RETURNING *`,
      [nama_toko, nama_pemilik, alamat || '', nomor_hp || '', sharelok || '', foto_toko, status || 'active', req.params.id]
    );
    res.json({ data: rows[0], error: null });
  } catch (err) {
    res.status(500).json({ data: null, error: { message: err.message } });
  }
});

// PUT /api/stores/:id/transfer - transfer store to another karyawan_sariroti (admin only)
app.put('/api/stores/:id/transfer', authMiddleware, requireRole('superadmin', 'admin_sariroti', 'admin_keuangan'), async (req, res) => {
  try {
    const { new_user_profile_id } = req.body;
    if (!new_user_profile_id) return res.status(400).json({ data: null, error: { message: 'Target karyawan wajib diisi.' } });
    const { rows } = await pool.query(
      `UPDATE stores SET user_profile_id=$1, updated_at=now() WHERE id=$2 RETURNING *`,
      [new_user_profile_id, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ data: null, error: { message: 'Toko tidak ditemukan.' } });
    res.json({ data: rows[0], error: null });
  } catch (err) {
    res.status(500).json({ data: null, error: { message: err.message } });
  }
});

// DELETE /api/stores/:id - delete store (admin only)
app.delete('/api/stores/:id', authMiddleware, requireRole('superadmin', 'admin_sariroti', 'admin_keuangan'), async (req, res) => {
  try {
    await pool.query('DELETE FROM stores WHERE id = $1', [req.params.id]);
    res.json({ data: null, error: null });
  } catch (err) {
    res.status(500).json({ data: null, error: { message: err.message } });
  }
});

// ===== SKU Management Routes =====

// GET /api/sku-items - list all SKU items (all authenticated users)
app.get('/api/sku-items', authMiddleware, async (req, res) => {
  try {
    const activeOnly = req.query.active_only === 'true';
    const sql = activeOnly
      ? 'SELECT * FROM sku_items WHERE is_active = true ORDER BY kategori, kode'
      : 'SELECT * FROM sku_items ORDER BY kategori, kode';
    const { rows } = await pool.query(sql);
    res.json({ data: rows, error: null });
  } catch (err) {
    res.status(500).json({ data: null, error: { message: err.message } });
  }
});

// POST /api/sku-items - create SKU item (admin only)
app.post('/api/sku-items', authMiddleware, requireRole('superadmin', 'admin_sariroti'), async (req, res) => {
  try {
    const { kode, nama, kategori, cbp } = req.body;
    if (!kode || !nama || !kategori) {
      return res.status(400).json({ data: null, error: { message: 'Kode, nama, dan kategori wajib diisi' } });
    }
    const existing = await pool.query('SELECT id FROM sku_items WHERE kode = $1', [kode]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ data: null, error: { message: `SKU dengan kode "${kode}" sudah ada` } });
    }
    const { rows } = await pool.query(
      'INSERT INTO sku_items (kode, nama, kategori, cbp, is_active) VALUES ($1, $2, $3, $4, true) RETURNING *',
      [kode.trim(), nama.trim(), kategori.trim(), cbp || 0]
    );
    res.json({ data: rows[0], error: null });
  } catch (err) {
    res.status(500).json({ data: null, error: { message: err.message } });
  }
});

// PUT /api/sku-items/:id - update SKU item (admin only)
app.put('/api/sku-items/:id', authMiddleware, requireRole('superadmin', 'admin_sariroti'), async (req, res) => {
  try {
    const { kode, nama, kategori, cbp, is_active } = req.body;
    const { rows } = await pool.query(
      `UPDATE sku_items SET kode = COALESCE($1, kode), nama = COALESCE($2, nama), kategori = COALESCE($3, kategori),
       cbp = COALESCE($4, cbp), is_active = COALESCE($5, is_active), updated_at = NOW() WHERE id = $6 RETURNING *`,
      [kode, nama, kategori, cbp, is_active, req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ data: null, error: { message: 'SKU tidak ditemukan' } });
    res.json({ data: rows[0], error: null });
  } catch (err) {
    res.status(500).json({ data: null, error: { message: err.message } });
  }
});

// DELETE /api/sku-items/:id - delete SKU item (admin only)
app.delete('/api/sku-items/:id', authMiddleware, requireRole('superadmin', 'admin_sariroti'), async (req, res) => {
  try {
    const { rows } = await pool.query('DELETE FROM sku_items WHERE id = $1 RETURNING *', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ data: null, error: { message: 'SKU tidak ditemukan' } });
    res.json({ data: rows[0], error: null });
  } catch (err) {
    res.status(500).json({ data: null, error: { message: err.message } });
  }
});

// GET /api/:table
app.get('/api/:table', authMiddleware, async (req, res) => {
  try {
    const { table } = req.params;
    const { select = '*', order, limit, single } = req.query;

    const filters = parseFilters(req.query);
    const values = filters.map(f => f.val);

    let orderCol = null, orderDir = 'asc';
    if (order) {
      const parts = order.split(':');
      orderCol = parts[0];
      orderDir = parts[1] === 'desc' ? 'desc' : 'asc';
    }

    const sql = buildSelectSQL(table, select, filters, orderCol, orderDir, limit, single);
    const result = await pool.query(sql, values);

    if (single === '1' || single === 'true') {
      res.json({ data: result.rows[0] || null, error: null });
    } else {
      res.json({ data: result.rows, error: null });
    }
  } catch (err) {
    console.error('GET error:', err.message);
    res.status(500).json({ data: null, error: { message: err.message } });
  }
});

// POST /api/:table
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
    const data = req.body;

    const keys = Object.keys(data).filter(k => data[k] !== undefined);
    const values = keys.map(k => {
      const v = data[k];
      if (Array.isArray(v)) return v;
      if (v !== null && typeof v === 'object') return JSON.stringify(v);
      return v;
    });
    const cols = keys.join(', ');
    const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');

    const sql = `INSERT INTO ${table} (${cols}) VALUES (${placeholders}) RETURNING *`;
    const result = await pool.query(sql, values);

    res.json({ data: result.rows[0] || null, error: null });
  } catch (err) {
    console.error('POST error:', err.message);
    res.status(500).json({ data: null, error: { message: err.message } });
  }
});

// PUT /api/:table
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
    const data = req.body;
    const filters = parseFilters(req.query);

    const keys = Object.keys(data).filter(k => data[k] !== undefined);
    const values = keys.map(k => {
      const v = data[k];
      if (Array.isArray(v)) return v;
      if (v !== null && typeof v === 'object') return JSON.stringify(v);
      return v;
    });

    if (keys.length === 0) return res.json({ data: null, error: { message: 'No data to update' } });
    if (filters.length === 0) return res.json({ data: null, error: { message: 'No filter specified' } });

    const setClauses = keys.map((k, i) => `${k} = $${i + 1}`).join(', ');

    // Add updated_at if the table likely has it
    const offset = values.length;
    const whereClauses = filters.map((f, i) => `${f.col} = $${offset + i + 1}`).join(' AND ');
    const filterValues = filters.map(f => f.val);

    const sql = `UPDATE ${table} SET ${setClauses} WHERE ${whereClauses} RETURNING *`;
    const result = await pool.query(sql, [...values, ...filterValues]);

    res.json({ data: result.rows[0] || null, error: null });
  } catch (err) {
    console.error('PUT error:', err.message);
    res.status(500).json({ data: null, error: { message: err.message } });
  }
});

// DELETE /api/:table
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

    const values = filters.map(f => f.val);
    const whereClauses = filters.map((f, i) => `${f.col} = $${i + 1}`).join(' AND ');

    const sql = `DELETE FROM ${table} WHERE ${whereClauses}`;
    await pool.query(sql, values);

    res.json({ data: null, error: null });
  } catch (err) {
    console.error('DELETE error:', err.message);
    res.status(500).json({ data: null, error: { message: err.message } });
  }
});

// POST /api/upload - image upload for selfies etc
app.post('/api/upload', authMiddleware, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ data: null, error: { message: 'No file uploaded' } });
  const url = `/uploads/${req.file.filename}`;
  res.json({ data: { url }, error: null });
});

// ─── CHECKIN / CHECKOUT ENDPOINTS ────────────────────────────────────────────

// POST /api/checkin - create checkin with server timestamp, GPS, dedup check
app.post('/api/checkin', authMiddleware, upload.single('selfie'), async (req, res) => {
  try {
    const { visit_plan_id, store_name, store_address, visit_type, total_billing, has_expired_bread, notes, gps_lat, gps_lng, gps_accuracy } = req.body;
    if (!store_name || !visit_plan_id || !visit_type) {
      return res.status(400).json({ data: null, error: { message: 'visit_plan_id, store_name, visit_type wajib diisi.' } });
    }
    const selfie_url = req.file ? `/uploads/${req.file.filename}` : '';

    // Anti-manipulation: server-side duplicate check — same store, same plan_date, same user
    const { rows: planRows } = await pool.query('SELECT plan_date, user_id FROM visit_plans WHERE id = $1', [visit_plan_id]);
    if (!planRows[0]) return res.status(404).json({ data: null, error: { message: 'Plan tidak ditemukan.' } });

    const planDate = planRows[0].plan_date;
    const { rows: dupCheck } = await pool.query(
      `SELECT vc.id FROM visit_checkins vc
       JOIN visit_plans vp ON vp.id = vc.visit_plan_id
       WHERE vc.user_id = $1 AND LOWER(vc.store_name) = LOWER($2) AND vp.plan_date = $3`,
      [planRows[0].user_id, store_name.trim(), planDate]
    );
    if (dupCheck.length > 0) {
      return res.status(409).json({ data: null, error: { message: `Toko "${store_name}" sudah di-check-in hari ini.` } });
    }

    const { rows } = await pool.query(
      `INSERT INTO visit_checkins
         (visit_plan_id, user_id, store_name, store_address, checkin_time, selfie_url, visit_type, total_billing, has_expired_bread, notes, status, gps_lat, gps_lng, gps_accuracy)
       VALUES ($1, $2, $3, $4, NOW(), $5, $6, $7, $8, $9, 'completed', $10, $11, $12)
       RETURNING *`,
      [
        visit_plan_id, planRows[0].user_id, store_name.trim(), store_address || '',
        selfie_url, visit_type,
        parseFloat(total_billing || '0'), has_expired_bread === 'true' || has_expired_bread === true,
        notes || '',
        gps_lat ? parseFloat(gps_lat) : null,
        gps_lng ? parseFloat(gps_lng) : null,
        gps_accuracy ? parseFloat(gps_accuracy) : null,
      ]
    );
    res.json({ data: rows[0], error: null });
  } catch (err) {
    console.error('checkin error:', err.message);
    res.status(500).json({ data: null, error: { message: err.message } });
  }
});

// POST /api/checkout/:checkinId - record checkout time and duration
app.post('/api/checkout/:checkinId', authMiddleware, async (req, res) => {
  try {
    const { rows: existing } = await pool.query('SELECT * FROM visit_checkins WHERE id = $1', [req.params.checkinId]);
    if (!existing[0]) return res.status(404).json({ data: null, error: { message: 'Check-in tidak ditemukan.' } });
    if (existing[0].user_id !== req.user.id && !['superadmin','admin_sariroti','admin_keuangan'].includes(req.user.role)) {
      return res.status(403).json({ data: null, error: { message: 'Akses ditolak.' } });
    }
    if (existing[0].checkout_time) {
      return res.status(400).json({ data: null, error: { message: 'Sudah di-checkout.' } });
    }
    const { rows } = await pool.query(
      `UPDATE visit_checkins
       SET checkout_time = NOW(),
           duration_minutes = EXTRACT(EPOCH FROM (NOW() - checkin_time)) / 60
       WHERE id = $1 RETURNING *`,
      [req.params.checkinId]
    );
    res.json({ data: rows[0], error: null });
  } catch (err) {
    res.status(500).json({ data: null, error: { message: err.message } });
  }
});

// ─── LAPORAN & PERFORMA ──────────────────────────────────────────────────────

// GET /api/laporan-karyawan?from=&to=&user_profile_id=
app.get('/api/laporan-karyawan', authMiddleware, async (req, res) => {
  try {
    const { from, to, user_profile_id } = req.query;
    const isAdmin = ['superadmin','admin_sariroti','admin_keuangan'].includes(req.user.role);
    let upFilter = '';
    const params = [];
    let pIdx = 1;

    if (!isAdmin) {
      params.push(req.user.id);
      upFilter = `AND u.id = $${pIdx++}`;
    } else if (user_profile_id) {
      params.push(user_profile_id);
      upFilter = `AND up.id = $${pIdx++}`;
    }
    if (from) { params.push(from); upFilter += ` AND vp.plan_date >= $${pIdx++}`; }
    if (to) { params.push(to); upFilter += ` AND vp.plan_date <= $${pIdx++}`; }

    const { rows } = await pool.query(`
      SELECT
        vp.plan_date, up.id AS user_profile_id, up.full_name, up.email,
        COUNT(DISTINCT vc.id) AS total_checkins,
        COALESCE(SUM(vc.total_billing), 0) AS total_billing,
        ROUND(AVG(vc.duration_minutes)) AS avg_duration_minutes,
        vp.status AS plan_status, vp.id AS plan_id,
        jsonb_array_length(vp.stores) AS planned_stores,
        COUNT(DISTINCT vc.id) = jsonb_array_length(vp.stores) AS plan_completed
      FROM visit_plans vp
      JOIN users u ON u.id = vp.user_id
      JOIN user_profiles up ON up.user_id = u.id
      LEFT JOIN visit_checkins vc ON vc.visit_plan_id = vp.id
      WHERE 1=1 ${upFilter}
      GROUP BY vp.id, up.id, up.full_name, up.email
      ORDER BY vp.plan_date DESC, up.full_name
    `, params);
    res.json({ data: rows, error: null });
  } catch (err) {
    res.status(500).json({ data: null, error: { message: err.message } });
  }
});

// GET /api/laporan-karyawan/export?from=&to=&user_profile_id=  (CSV download)
app.get('/api/laporan-karyawan/export', authMiddleware, async (req, res) => {
  try {
    const { from, to, user_profile_id } = req.query;
    const isAdmin = ['superadmin','admin_sariroti','admin_keuangan'].includes(req.user.role);
    let whereClause = 'WHERE 1=1';
    const params = [];
    let pIdx = 1;
    if (!isAdmin) { params.push(req.user.id); whereClause += ` AND u.id = $${pIdx++}`; }
    else if (user_profile_id) { params.push(user_profile_id); whereClause += ` AND up.id = $${pIdx++}`; }
    if (from) { params.push(from); whereClause += ` AND vp.plan_date >= $${pIdx++}`; }
    if (to) { params.push(to); whereClause += ` AND vp.plan_date <= $${pIdx++}`; }

    const { rows } = await pool.query(`
      SELECT
        vp.plan_date, up.full_name, up.email,
        vc.store_name, vc.store_address, vc.visit_type, vc.total_billing,
        vc.checkin_time, vc.checkout_time, vc.duration_minutes,
        vc.has_expired_bread, vc.gps_lat, vc.gps_lng, vc.gps_accuracy, vc.notes
      FROM visit_plans vp
      JOIN users u ON u.id = vp.user_id
      JOIN user_profiles up ON up.user_id = u.id
      LEFT JOIN visit_checkins vc ON vc.visit_plan_id = vp.id
      ${whereClause}
      ORDER BY vp.plan_date DESC, up.full_name, vc.checkin_time
    `, params);

    const header = ['Tanggal','Nama Karyawan','Email','Nama Toko','Alamat Toko','Jenis Kunjungan','Total Tagihan',
                    'Waktu Checkin','Waktu Checkout','Durasi (menit)','Ada Roti Tarik','GPS Lat','GPS Lng','Akurasi GPS (m)','Catatan'];
    const escape = v => `"${String(v ?? '').replace(/"/g,'""')}"`;
    const lines = [header.map(escape).join(',')];
    rows.forEach(r => {
      const row = [
        r.plan_date, r.full_name, r.email, r.store_name || '', r.store_address || '',
        r.visit_type || '', r.total_billing || 0,
        r.checkin_time ? new Date(r.checkin_time).toLocaleString('id-ID') : '',
        r.checkout_time ? new Date(r.checkout_time).toLocaleString('id-ID') : '',
        r.duration_minutes || '', r.has_expired_bread ? 'Ya' : 'Tidak',
        r.gps_lat || '', r.gps_lng || '', r.gps_accuracy || '', r.notes || '',
      ];
      lines.push(row.map(escape).join(','));
    });

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="laporan-kunjungan-${from||'all'}-${to||'all'}.csv"`);
    res.send('\uFEFF' + lines.join('\r\n'));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/performa-karyawan?bulan=&tahun=
app.get('/api/performa-karyawan', authMiddleware, requireRole('superadmin','admin_sariroti','admin_keuangan'), async (req, res) => {
  try {
    const { bulan, tahun } = req.query;
    const month = parseInt(bulan) || new Date().getMonth() + 1;
    const year = parseInt(tahun) || new Date().getFullYear();

    const { rows } = await pool.query(`
      SELECT
        up.id AS user_profile_id, up.full_name, up.email,
        COUNT(DISTINCT vp.id) AS total_plans,
        COUNT(DISTINCT CASE WHEN vp.status IN ('submitted','approved') THEN vp.id END) AS submitted_plans,
        COUNT(DISTINCT vc.id) AS total_checkins,
        COALESCE(SUM(vc.total_billing),0) AS total_billing,
        ROUND(AVG(vc.duration_minutes)) AS avg_duration_minutes,
        ROUND(
          COUNT(DISTINCT CASE WHEN vp.status IN ('submitted','approved') THEN vp.id END)::numeric
          / NULLIF(COUNT(DISTINCT vp.id),0) * 100
        ) AS compliance_pct
      FROM user_profiles up
      JOIN users u ON u.id = up.user_id
      LEFT JOIN visit_plans vp ON vp.user_id = u.id
        AND EXTRACT(MONTH FROM vp.plan_date) = $1
        AND EXTRACT(YEAR FROM vp.plan_date) = $2
      LEFT JOIN visit_checkins vc ON vc.visit_plan_id = vp.id
      WHERE up.role = 'karyawan_sariroti'
      GROUP BY up.id, up.full_name, up.email
      ORDER BY total_billing DESC
    `, [month, year]);
    res.json({ data: rows, error: null });
  } catch (err) {
    res.status(500).json({ data: null, error: { message: err.message } });
  }
});

// GET /api/store-visit-history/:storeId - histori kunjungan per toko
app.get('/api/store-visit-history/:storeId', authMiddleware, requireRole('superadmin','admin_sariroti','admin_keuangan'), async (req, res) => {
  try {
    const { rows: store } = await pool.query('SELECT nama_toko FROM stores WHERE id = $1', [req.params.storeId]);
    if (!store[0]) return res.status(404).json({ data: null, error: { message: 'Toko tidak ditemukan.' } });

    const { rows } = await pool.query(`
      SELECT vc.id, vc.checkin_time, vc.checkout_time, vc.duration_minutes,
             vc.visit_type, vc.total_billing, vc.has_expired_bread, vc.gps_lat, vc.gps_lng, vc.notes,
             up.full_name AS karyawan_name, vp.plan_date
      FROM visit_checkins vc
      JOIN visit_plans vp ON vp.id = vc.visit_plan_id
      JOIN users u ON u.id = vc.user_id
      JOIN user_profiles up ON up.user_id = u.id
      WHERE LOWER(vc.store_name) = LOWER($1)
      ORDER BY vc.checkin_time DESC
      LIMIT 100
    `, [store[0].nama_toko]);
    res.json({ data: rows, error: null });
  } catch (err) {
    res.status(500).json({ data: null, error: { message: err.message } });
  }
});

// GET /api/notifikasi-deadline - siapa yang belum submit plan hari ini
app.get('/api/notifikasi-deadline', authMiddleware, async (req, res) => {
  try {
    const isAdmin = ['superadmin','admin_sariroti','admin_keuangan'].includes(req.user.role);
    const today = new Date().toISOString().split('T')[0];

    if (isAdmin) {
      const { rows } = await pool.query(`
        SELECT up.id AS user_profile_id, up.full_name, up.email,
               vp.status AS plan_status, vp.submitted_at,
               ss.plan_deadline,
               CASE WHEN vp.id IS NULL THEN 'no_plan' ELSE vp.status END AS status
        FROM user_profiles up
        JOIN users u ON u.id = up.user_id
        LEFT JOIN visit_plans vp ON vp.user_id = u.id AND vp.plan_date = $1
        LEFT JOIN sariroti_settings ss ON ss.user_profile_id = up.id
        WHERE up.role = 'karyawan_sariroti'
          AND (vp.id IS NULL OR vp.status = 'draft')
        ORDER BY up.full_name
      `, [today]);
      res.json({ data: rows, error: null });
    } else {
      const { rows: profile } = await pool.query('SELECT id FROM user_profiles WHERE user_id = $1', [req.user.id]);
      if (!profile[0]) return res.json({ data: null, error: null });
      const { rows } = await pool.query(`
        SELECT vp.status, vp.submitted_at, ss.plan_deadline,
               CASE WHEN vp.id IS NULL THEN 'no_plan' ELSE vp.status END AS plan_status
        FROM user_profiles up
        LEFT JOIN users u ON u.id = up.user_id
        LEFT JOIN visit_plans vp ON vp.user_id = u.id AND vp.plan_date = $1
        LEFT JOIN sariroti_settings ss ON ss.user_profile_id = up.id
        WHERE up.id = $2
      `, [today, profile[0].id]);
      res.json({ data: rows[0] || null, error: null });
    }
  } catch (err) {
    res.status(500).json({ data: null, error: { message: err.message } });
  }
});

// GET /api/sariroti-settings/:userProfileId - get settings for a user
app.get('/api/sariroti-settings/:userProfileId', authMiddleware, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM sariroti_settings WHERE user_profile_id = $1', [req.params.userProfileId]);
    res.json({ data: rows[0] || null, error: null });
  } catch (err) {
    res.status(500).json({ data: null, error: { message: err.message } });
  }
});

// PUT /api/sariroti-settings/:userProfileId - upsert settings
app.put('/api/sariroti-settings/:userProfileId', authMiddleware, requireRole('superadmin', 'admin_sariroti', 'admin_keuangan'), async (req, res) => {
  try {
    const { min_visits, max_visits, plan_deadline } = req.body;
    const { rows } = await pool.query(
      `INSERT INTO sariroti_settings (user_profile_id, min_visits, max_visits, plan_deadline)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_profile_id) DO UPDATE SET min_visits=$2, max_visits=$3, plan_deadline=$4, updated_at=now()
       RETURNING *`,
      [req.params.userProfileId, min_visits, max_visits, plan_deadline]
    );
    res.json({ data: rows[0], error: null });
  } catch (err) {
    res.status(500).json({ data: null, error: { message: err.message } });
  }
});

// GET /api/visit-summary - admin summary of visits per user per date
app.get('/api/visit-summary', authMiddleware, requireRole('superadmin', 'admin_sariroti', 'admin_keuangan'), async (req, res) => {
  try {
    const { date } = req.query;
    let whereClause = date ? `WHERE vp.plan_date = $1` : '';
    const params = date ? [date] : [];
    const { rows } = await pool.query(`
      SELECT vp.id, vp.plan_date, vp.status, vp.submitted_at, vp.stores,
             up.full_name, up.email, up.id AS user_profile_id,
             COUNT(vc.id) AS checkin_count,
             COALESCE(SUM(vc.total_billing), 0) AS total_billing
      FROM visit_plans vp
      JOIN users u ON u.id = vp.user_id
      JOIN user_profiles up ON up.user_id = u.id
      LEFT JOIN visit_checkins vc ON vc.visit_plan_id = vp.id
      ${whereClause}
      GROUP BY vp.id, up.full_name, up.email, up.id
      ORDER BY vp.plan_date DESC, up.full_name
    `, params);
    res.json({ data: rows, error: null });
  } catch (err) {
    res.status(500).json({ data: null, error: { message: err.message } });
  }
});

// GET /api/visit-detail/:planId - admin get detail of one plan
app.get('/api/visit-detail/:planId', authMiddleware, async (req, res) => {
  try {
    const { rows: checkins } = await pool.query(
      `SELECT vc.*, array_agg(bs.*) FILTER (WHERE bs.id IS NOT NULL) AS bread_scans
       FROM visit_checkins vc
       LEFT JOIN bread_scans bs ON bs.checkin_id = vc.id
       WHERE vc.visit_plan_id = $1
       GROUP BY vc.id ORDER BY vc.checkin_time`,
      [req.params.planId]
    );
    res.json({ data: checkins, error: null });
  } catch (err) {
    res.status(500).json({ data: null, error: { message: err.message } });
  }
});

// Global error handler
app.use((err, req, res, _next) => {
  console.error('Unhandled error:', err.message);
  res.status(500).json({ data: null, error: { message: err.message } });
});

const PORT = 8000;
app.listen(PORT, '127.0.0.1', async () => {
  try {
    await pool.query('SELECT 1');
    // Auto-migrate: add GPS and checkout columns if not exist
    await pool.query(`
      ALTER TABLE visit_checkins
        ADD COLUMN IF NOT EXISTS gps_lat DECIMAL(10,8),
        ADD COLUMN IF NOT EXISTS gps_lng DECIMAL(11,8),
        ADD COLUMN IF NOT EXISTS gps_accuracy DECIMAL,
        ADD COLUMN IF NOT EXISTS checkout_time TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS duration_minutes INTEGER
    `);
    // Auto-migrate: add target_roles and priority columns to announcements
    await pool.query(`
      ALTER TABLE announcements
        ADD COLUMN IF NOT EXISTS target_roles TEXT[] DEFAULT '{karyawan,karyawan_sariroti}',
        ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'normal'
    `);
    // Auto-migrate: create sku_items table if not exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS sku_items (
        id SERIAL PRIMARY KEY,
        kode VARCHAR(50) NOT NULL UNIQUE,
        nama VARCHAR(255) NOT NULL,
        kategori VARCHAR(100) NOT NULL,
        cbp INTEGER NOT NULL DEFAULT 0,
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    // Seed sku_items from static list if empty
    const { rows: skuCount } = await pool.query('SELECT COUNT(*) as cnt FROM sku_items');
    if (parseInt(skuCount[0].cnt) === 0) {
      const skuData = [
        ['RTS','Roti Tawar Special','Roti Tawar',15000],['RTG','Roti Tawar Gandum','Roti Tawar',18000],
        ['RTPDM','Roti Tawar Pandan Manis','Roti Tawar',18000],['RCC','Roti Tawar Choco Chip','Roti Tawar',19000],
        ['RTKL','Roti Tawar Klasik','Roti Tawar',12500],['RKU','Roti Tawar Kupas','Roti Tawar',6000],
        ['RJKU','Roti Jumbo Tawar Kupas','Roti Tawar',21000],['DOP','Roti Tawar Doble Soft F','Roti Tawar',14500],
        ['DOM','Roti Tawar Doble Soft','Roti Tawar',20500],['RTJS','Roti Tawar Jumbo Spesial','Roti Tawar',18000],
        ['RJMS','Roti Jumbo Milk Soft','Roti Tawar',17500],
        ['SCC','Sandwich Coklat','Sandwich',6000],['SAB','Sandwich Blueberry','Sandwich',6000],
        ['SAP','Sandwich Krim Peanut','Sandwich',6000],['SKI','Sandwich Keju','Sandwich',6000],
        ['SMG','Sandwich Margarin Gula','Sandwich',6000],['SSM','Sandwich Pandan Sarikaya','Sandwich',6000],
        ['SCB','Sandwich Choco Blast','Sandwich',6000],
        ['ZSCCK','Zupper Sandwich Krim Coklat','Zupper Sandwich',5000],['ZSCMK','Zupper Sandwich Krim Moka','Zupper Sandwich',5000],
        ['ZSCS','Zupper Sandwich Creamy Sweet','Zupper Sandwich',5000],['ZSCST','Zuper Sandwich Krim Strawberry','Zupper Sandwich',5000],
        ['ICK GT','Choco Bun','Bun & Sobek',4000],['ICZ GT','Cheese Bun','Bun & Sobek',4000],
        ['ICE','Sweet Cheese Bun','Bun & Sobek',4000],['IST','Blueberry Bun GT','Bun & Sobek',4000],
        ['IBL','Blueberry Bun','Bun & Sobek',4000],['ICO','Coconut Bun GT','Bun & Sobek',4000],
        ['TOC','Roti Sobek Coklat Coklat','Bun & Sobek',18000],['TCC','Roti Sobek Coklat Meses','Bun & Sobek',18000],
        ['TCS','Roti Sobek Coklat Sarikaya','Bun & Sobek',18000],['TST','Roti Sobek Coklat Strawberry','Bun & Sobek',18000],
        ['TCB','Roti Sobek Coklat Blueberry','Bun & Sobek',13500],['TCBIII','Roti Sobek Krim Meses','Bun & Sobek',13500],
        ['TDST','Sobek Duo Strawberry','Bun & Sobek',11000],['TDCB','Sobek Duo Blueberry','Bun & Sobek',11000],
        ['TDOC','Sobek Duo Cokelat','Bun & Sobek',8500],['TDSA','Sobek Duo Sarikaya','Bun & Sobek',8000],
        ['KBC','Klasik Bantal Sweet Cheese','Bun & Sobek',8500],['RMNS','Roti Mini Strawberry','Bun & Sobek',8000],
        ['BUR','Burgerbun','Bun & Sobek',11000],['SRPL','Plain Rolls','Bun & Sobek',11000],
        ['SCM','Roti Krim Cokelat Meses','Roti Krim',5000],['SCCIII','Roti Creamy Cokelat Meses','Roti Krim',5000],
        ['SCVIII','Roti Krim Coklat','Roti Krim',5000],['SCCJII','Roti Krim Keju','Roti Krim',5000],
        ['SRMIII','Roti Krim Moca','Roti Krim',5000],
        ['ZCRCK','Zuperr Creamy Choco Double Choco','Zuperr Creamy',5000],['ZCRCR','Zuperr Creamy Choco Choco Berry','Zuperr Creamy',5000],
        ['ZCRCB','Zuperr Creamy Choco Choco Banana','Zuperr Creamy',5000],['SRS','Roti Sandroll Zuperr Creamy Strawberry','Zuperr Creamy',5000],
        ['DCS','Dorayaki Si Coklat','Dorayaki',7500],['DCP','Dorayaki Choco Peanut','Dorayaki',7500],
        ['DCH','Dorayaki Hokkaido Cheese','Dorayaki',7500],['DHF','Dorayaki Honey Flavor','Dorayaki',7500],
        ['DSK','Dorayaki Sarikaya','Dorayaki',5500],['DMT','Dorayaki Martabak','Dorayaki',6000],
        ['DPS','Dorayaki Pandan Sarikaya','Dorayaki',6000],['DNS','Dorayaki Nastar','Dorayaki',6000],
        ['RKJ','Roti Kasur Keju','Roti Kasur & Sisir',14000],['RSM','Roti Sisir Mentega','Roti Kasur & Sisir',11000],
        ['RKS','Roti Kasur Susu','Roti Kasur & Sisir',11000],
        ['CCC','Chiffon Cake Coklat','Cake',25000],['CCP','Chiffon Cake Pandan','Cake',25000],
        ['MCP VI','Mini Cupcake Vanilla Coconut Isi 6','Cake',22000],['KAOF','Kastela Original Family','Cake',255000],
        ['KAOM','Kastela Original Medium','Cake',105000],['BKV','Bolu Kukus Putih Vanilla','Cake',12500],
        ['BMO','Bolu Mini Original','Cake',5000],['WFO','Waffle Original','Cake',5000],
        ['LSPO','Lapis Surabaya Premium Original','Lapis Surabaya',12500],['LSPK','Lapis Surabaya Premium Keju','Lapis Surabaya',12500],
        ['LSPP','Lapis Surabaya Premium Pandan','Lapis Surabaya',12500],['LSPM','Lapis Surabaya Premium Moca','Lapis Surabaya',12500],
        ['SCCP','Soft Cake Putu Pandan','Soft Cake',9500],['SCPI','Soft Cake Pisang Ijo','Soft Cake',9500],
        ['SCET','Soft Cake Es Teler','Soft Cake',9500],['SCGA','Soft Cake Gula Aren','Soft Cake',9500],
        ['SCPSM','Soft Cake Pandan Salted Caramel Mocca','Soft Cake',9500],
        ['STCS','Steam Cheese Cake Strawberry','Steam Cheese Cake',9500],['STCC','Steam Cheese Cake','Steam Cheese Cake',9500],
        ['STCK','Steam Cheese Cake Cokelat','Steam Cheese Cake',9500],['STCB','Steam Cheese Cake Banana','Steam Cheese Cake',9500],
        ['STCTM','Steam Cheese Cake Tiramisu','Steam Cheese Cake',9500],['STCBA','Steam Cheese Cake Basket','Steam Cheese Cake',9500],
        ['STCDC','Steam Cheese Cake Duo','Steam Cheese Cake',7000],
        ['SCSC','Sari Choco Spread Coklat','Sari Choco',18000],['SCSCH','Sari Choco Spread Coklat Hazelnut','Sari Choco',18000],
        ['SCM110','Sari Choco Milk 110ml','Sari Choco',5000],['SCM180','Sari Choco Milk 180ml','Sari Choco',6000],
        ['BKCK','Bamkohem Original','Bamkohem',10500],['BKKJ','Bamkohem Keju','Bamkohem',10500],
      ];
      const values = skuData.map((s, i) => `($${i*4+1}, $${i*4+2}, $${i*4+3}, $${i*4+4})`).join(',');
      const params = skuData.flat();
      await pool.query(`INSERT INTO sku_items (kode, nama, kategori, cbp) VALUES ${values}`, params);
      console.log(`Seeded ${skuData.length} SKU items`);
    }
    console.log(`API server running on http://localhost:${PORT} (DB connected)`);
  } catch (err) {
    console.error('DB connection failed:', err.message);
    console.log(`API server running on http://localhost:${PORT} (DB unavailable)`);
  }
});

// Prevent crash on unhandled promise rejections
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
});
