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
    const values = keys.map(k => data[k]);
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
    const values = keys.map(k => data[k]);

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
  // Verify DB connection on startup
  try {
    await pool.query('SELECT 1');
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
