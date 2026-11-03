const fs = require('node:fs');
const path = require('node:path');

const CONFIG_PATH = path.join(__dirname, 'turso-config.json');
const UPLOAD_DIR = path.resolve(__dirname, '..', 'uploads');

const TABLES = [
  'PROJECT',
  'PERSONNEL',
  'REQUEST',
  'REQUEST_MEMBER',
  'ALLOCATION_BATCH',
  'ALLOCATION_ITEM',
  'DOCUMENT',
  'ACCEPTANCE_RECORD',
  'AUDIT_LOG'
];

const SCHEMA_STMTS = [
  `CREATE TABLE IF NOT EXISTS PROJECT (
    id INTEGER PRIMARY KEY, code TEXT NOT NULL, name TEXT NOT NULL,
    customer_name TEXT DEFAULT 'Nội bộ', status TEXT NOT NULL DEFAULT 'ACTIVE',
    is_deleted INTEGER NOT NULL DEFAULT 0, created_at TEXT, updated_at TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS PERSONNEL (
    id INTEGER PRIMARY KEY, code TEXT NOT NULL, full_name TEXT NOT NULL,
    default_role TEXT NOT NULL, email TEXT DEFAULT '', phone TEXT DEFAULT '',
    status TEXT NOT NULL DEFAULT 'ACTIVE', note TEXT DEFAULT '',
    is_deleted INTEGER NOT NULL DEFAULT 0, created_at TEXT, updated_at TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS REQUEST (
    id INTEGER PRIMARY KEY, project_id INTEGER NOT NULL, code TEXT NOT NULL,
    name TEXT NOT NULL, description TEXT DEFAULT '', type TEXT NOT NULL DEFAULT 'CR',
    received_date TEXT DEFAULT '2026-10-01', deadline TEXT DEFAULT '',
    status TEXT NOT NULL DEFAULT 'NEW', customer_requester TEXT DEFAULT '',
    external_link TEXT DEFAULT '', estimated_md REAL NOT NULL DEFAULT 0,
    locked_md REAL NOT NULL DEFAULT 0, is_deleted INTEGER NOT NULL DEFAULT 0,
    created_at TEXT, updated_at TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS REQUEST_MEMBER (
    id INTEGER PRIMARY KEY, request_id INTEGER NOT NULL, personnel_id INTEGER NOT NULL,
    role_in_request TEXT NOT NULL, is_deleted INTEGER NOT NULL DEFAULT 0, created_at TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS ALLOCATION_BATCH (
    id INTEGER PRIMARY KEY, request_id INTEGER NOT NULL, month_period TEXT NOT NULL,
    note TEXT DEFAULT '', is_deleted INTEGER NOT NULL DEFAULT 0, created_at TEXT, updated_at TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS ALLOCATION_ITEM (
    id INTEGER PRIMARY KEY, batch_id INTEGER NOT NULL, personnel_id INTEGER NOT NULL,
    effort_md REAL NOT NULL, note TEXT DEFAULT '', is_deleted INTEGER NOT NULL DEFAULT 0,
    created_at TEXT, updated_at TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS DOCUMENT (
    id INTEGER PRIMARY KEY, project_id INTEGER NOT NULL, request_id INTEGER,
    title TEXT NOT NULL, document_type TEXT NOT NULL DEFAULT 'Tài liệu',
    external_url TEXT NOT NULL, note TEXT DEFAULT '', is_deleted INTEGER NOT NULL DEFAULT 0,
    created_at TEXT, updated_at TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS ACCEPTANCE_RECORD (
    id INTEGER PRIMARY KEY, request_id INTEGER NOT NULL, record_code TEXT NOT NULL,
    title TEXT NOT NULL, external_url TEXT NOT NULL, delivery_status TEXT NOT NULL DEFAULT 'NOT_SENT',
    sent_date TEXT, note TEXT DEFAULT '', is_deleted INTEGER NOT NULL DEFAULT 0,
    created_at TEXT, updated_at TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS AUDIT_LOG (
    id INTEGER PRIMARY KEY, table_name TEXT NOT NULL, record_id TEXT NOT NULL,
    action TEXT NOT NULL, column_name TEXT DEFAULT '', old_value TEXT DEFAULT '',
    new_value TEXT DEFAULT '', created_at TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS CLOUD_META (
    id INTEGER PRIMARY KEY, updated_at INTEGER NOT NULL, snapshot_json TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS CLOUD_FILES (
    file_name TEXT PRIMARY KEY, content_base64 TEXT NOT NULL, updated_at INTEGER NOT NULL
  )`
];

function getConfig() {
  const envUrl = process.env.TURSO_DATABASE_URL || '';
  const envToken = process.env.TURSO_AUTH_TOKEN || '';
  if (envUrl && envToken) {
    return { url: envUrl.trim(), token: envToken.trim() };
  }
  if (fs.existsSync(CONFIG_PATH)) {
    try {
      const cfg = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
      if (cfg && cfg.url && cfg.token) {
        return { url: String(cfg.url).trim(), token: String(cfg.token).trim() };
      }
    } catch (_) {}
  }
  return { url: '', token: '' };
}

function saveConfig(url, token) {
  const cleanUrl = String(url || '').trim();
  const cleanToken = String(token || '').trim();
  fs.writeFileSync(CONFIG_PATH, JSON.stringify({ url: cleanUrl, token: cleanToken }, null, 2), 'utf8');
  return { url: cleanUrl, token: cleanToken };
}

function toHttpUrl(dbUrl) {
  let u = String(dbUrl || '').trim().replace(/\/+$/, '');
  if (u.startsWith('libsql://')) u = 'https://' + u.slice('libsql://'.length);
  else if (u.startsWith('wss://')) u = 'https://' + u.slice('wss://'.length);
  else if (!u.startsWith('http://') && !u.startsWith('https://')) u = 'https://' + u;
  return u + '/v2/pipeline';
}

function toTursoArg(val) {
  if (val === null || val === undefined) return { type: 'null' };
  if (typeof val === 'number') {
    if (Number.isInteger(val)) return { type: 'integer', value: String(val) };
    return { type: 'float', value: val };
  }
  return { type: 'text', value: String(val) };
}

async function execPipeline(statements, customCfg) {
  const cfg = customCfg || getConfig();
  if (!cfg.url || !cfg.token) {
    throw new Error('Chưa cấu hình TURSO_DATABASE_URL và TURSO_AUTH_TOKEN.');
  }
  const endpoint = toHttpUrl(cfg.url);
  const requests = statements.map(st => {
    if (typeof st === 'string') return { type: 'execute', stmt: { sql: st } };
    return {
      type: 'execute',
      stmt: {
        sql: st.sql,
        args: (st.args || []).map(toTursoArg)
      }
    };
  });
  requests.push({ type: 'close' });

  let res;
  let lastErr;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${cfg.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ requests })
      });
      break;
    } catch (e) {
      const cause = e.cause ? (e.cause.code || e.cause.message) : '';
      lastErr = new Error(`Không kết nối được Turso (${e.message}${cause ? ': ' + cause : ''}). Kiểm tra mạng/VPN/proxy.`);
      if (attempt < 3) await new Promise(r => setTimeout(r, 1500 * attempt));
    }
  }
  if (!res) throw lastErr;

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Lỗi kết nối Turso (${res.status}): ${errText}`);
  }
  const data = await res.json();
  if (data && Array.isArray(data.results)) {
    for (const r of data.results) {
      if (r.type === 'error') {
        throw new Error(`Lỗi SQL Turso: ${r.error ? r.error.message : JSON.stringify(r)}`);
      }
    }
  }
  return data;
}

function parseRows(execResult) {
  if (!execResult || !execResult.response || !execResult.response.result) return [];
  const { cols, rows } = execResult.response.result;
  return rows.map(row => {
    const obj = {};
    cols.forEach((col, i) => {
      const cell = row[i];
      if (!cell || cell.type === 'null') obj[col.name] = null;
      else if (cell.type === 'integer') obj[col.name] = Number(cell.value);
      else if (cell.type === 'float') obj[col.name] = Number(cell.value);
      else obj[col.name] = cell.value;
    });
    return obj;
  });
}

// Export full local SQLite tables into an object and mirror to Turso Cloud
async function pushToTurso(sqliteDb, customCfg) {
  const cfg = customCfg || getConfig();
  if (!cfg.url || !cfg.token) return { synced: false, reason: 'NO_CONFIG' };

  await execPipeline(SCHEMA_STMTS, cfg);

  const dump = {};
  const mirrorStmts = [];

  for (const tbl of TABLES) {
    const rows = sqliteDb.prepare(`SELECT * FROM ${tbl}`).all();
    dump[tbl] = rows;
    mirrorStmts.push(`DELETE FROM ${tbl}`);
    for (const r of rows) {
      const keys = Object.keys(r);
      const placeholders = keys.map(() => '?').join(', ');
      mirrorStmts.push({
        sql: `INSERT INTO ${tbl} (${keys.join(', ')}) VALUES (${placeholders})`,
        args: keys.map(k => r[k])
      });
    }
  }

  const now = Date.now();
  mirrorStmts.push({
    sql: `INSERT OR REPLACE INTO CLOUD_META (id, updated_at, snapshot_json) VALUES (1, ?, ?)`,
    args: [now, JSON.stringify(dump)]
  });

  await execPipeline(mirrorStmts, cfg);
  return { synced: true, updatedAt: now };
}

// Push a single uploaded file to Turso CLOUD_FILES
async function pushFileToTurso(fileName, base64Data, customCfg) {
  const cfg = customCfg || getConfig();
  if (!cfg.url || !cfg.token) return false;
  await execPipeline([
    SCHEMA_STMTS[SCHEMA_STMTS.length - 1],
    {
      sql: `INSERT OR REPLACE INTO CLOUD_FILES (file_name, content_base64, updated_at) VALUES (?, ?, ?)`,
      args: [fileName, base64Data, Date.now()]
    }
  ], cfg);
  return true;
}

// Pull latest data & files from Turso Cloud into local SQLite & uploads/
async function pullFromTurso(sqliteDb, customCfg) {
  const cfg = customCfg || getConfig();
  if (!cfg.url || !cfg.token) return { pulled: false, reason: 'NO_CONFIG' };

  await execPipeline(SCHEMA_STMTS, cfg);

  const res = await execPipeline([
    `SELECT updated_at, snapshot_json FROM CLOUD_META WHERE id = 1`,
    `SELECT file_name FROM CLOUD_FILES`
  ], cfg);

  const metaRows = parseRows(res.results[0]);
  if (!metaRows.length || !metaRows[0].snapshot_json) {
    // Cloud is empty -> push current local data to Cloud!
    await pushToTurso(sqliteDb, cfg);
    await syncLocalFilesToTurso(cfg);
    return { pulled: false, initializedCloud: true };
  }

  const dump = JSON.parse(metaRows[0].snapshot_json);

  sqliteDb.exec('PRAGMA foreign_keys = OFF;');
  sqliteDb.exec('BEGIN');
  try {
    for (const tbl of TABLES) {
      if (!Array.isArray(dump[tbl])) continue;
      sqliteDb.exec(`DELETE FROM ${tbl}`);
      for (const r of dump[tbl]) {
        const keys = Object.keys(r);
        const placeholders = keys.map(() => '?').join(', ');
        sqliteDb.prepare(`INSERT INTO ${tbl} (${keys.join(', ')}) VALUES (${placeholders})`).run(...keys.map(k => r[k]));
      }
    }
    sqliteDb.exec('COMMIT');
  } catch (err) {
    sqliteDb.exec('ROLLBACK');
    throw err;
  } finally {
    sqliteDb.exec('PRAGMA foreign_keys = ON;');
  }

  // Pull any missing uploaded files from CLOUD_FILES into local uploads/
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  const cloudFiles = parseRows(res.results[1]);
  for (const cf of cloudFiles) {
    const fName = cf.file_name;
    const localPath = path.join(UPLOAD_DIR, fName);
    if (!fs.existsSync(localPath)) {
      const fRes = await execPipeline([
        { sql: `SELECT content_base64 FROM CLOUD_FILES WHERE file_name = ?`, args: [fName] }
      ], cfg);
      const fRows = parseRows(fRes.results[0]);
      if (fRows.length && fRows[0].content_base64) {
        fs.writeFileSync(localPath, Buffer.from(fRows[0].content_base64, 'base64'));
      }
    }
  }

  return { pulled: true, updatedAt: metaRows[0].updated_at };
}

async function syncLocalFilesToTurso(customCfg) {
  const cfg = customCfg || getConfig();
  if (!cfg.url || !cfg.token || !fs.existsSync(UPLOAD_DIR)) return;
  const res = await execPipeline([`SELECT file_name FROM CLOUD_FILES`], cfg);
  const existing = new Set(parseRows(res.results[0]).map(r => r.file_name));
  const localFiles = fs.readdirSync(UPLOAD_DIR);
  for (const f of localFiles) {
    if (existing.has(f)) continue;
    const full = path.join(UPLOAD_DIR, f);
    const stat = fs.statSync(full);
    // Sync files up to 10MB to Turso Cloud
    if (stat.isFile() && stat.size <= 10 * 1024 * 1024) {
      const b64 = fs.readFileSync(full).toString('base64');
      await pushFileToTurso(f, b64, cfg);
    }
  }
}

module.exports = {
  getConfig,
  saveConfig,
  pushToTurso,
  pullFromTurso,
  pushFileToTurso,
  syncLocalFilesToTurso
};
