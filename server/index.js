const express = require('express');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');

const app = express();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const JWT_SECRET = process.env.SESSION_SECRET || 'cashflow_secret_key';

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '10mb' }));

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
const SUPERADMIN_ONLY = ['superadmin'];

// Tables that require specific roles for write operations
const WRITE_ROLE_MAP = {
  job_positions:  SUPERADMIN_ONLY,
  invite_links:   SUPERADMIN_ONLY,
  user_profiles:  SUPERADMIN_ONLY,
  employees:      ADMIN_ROLES,
  salary_payments: ADMIN_ROLES,
  employee_loans: ADMIN_ROLES,
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
