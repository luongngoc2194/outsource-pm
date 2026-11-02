const { DatabaseSync } = require('node:sqlite');
const path = require('node:path');
const fs = require('node:fs');

const r1 = (v) => Math.round((Number(v) + Number.EPSILON) * 100) / 100;
const f1 = (v) => Number(v).toFixed(2);
const mm = (md) => (Number(md) * 22).toFixed(2);
const isValidStep = (v) => {
  if (v === '' || v === null || v === undefined || isNaN(v)) return false;
  const n = Number(v);
  return Math.abs(Math.round(n * 100) - n * 100) < 1e-6;
};

function createDatabase(dbPath) {
  if (dbPath !== ':memory:') {
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  }
  const db = new DatabaseSync(dbPath);
  db.exec('PRAGMA foreign_keys = ON;');

  // Create 9 tables according to ERD (01-SRS-ERD-Business-Rules-TestCases.md)
  db.exec(`
    CREATE TABLE IF NOT EXISTS PROJECT (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT NOT NULL,
      name TEXT NOT NULL,
      customer_name TEXT DEFAULT 'Nội bộ',
      status TEXT NOT NULL DEFAULT 'ACTIVE',
      is_deleted INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS PERSONNEL (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT NOT NULL,
      full_name TEXT NOT NULL,
      default_role TEXT NOT NULL,
      email TEXT DEFAULT '',
      phone TEXT DEFAULT '',
      status TEXT NOT NULL DEFAULT 'ACTIVE',
      note TEXT DEFAULT '',
      is_deleted INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS REQUEST (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL REFERENCES PROJECT(id),
      code TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      type TEXT NOT NULL DEFAULT 'CR',
      received_date TEXT DEFAULT '2026-10-01',
      deadline TEXT DEFAULT '',
      status TEXT NOT NULL DEFAULT 'NEW',
      customer_requester TEXT DEFAULT '',
      external_link TEXT DEFAULT '',
      estimated_md REAL NOT NULL DEFAULT 0,
      locked_md REAL NOT NULL DEFAULT 0,
      is_deleted INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS REQUEST_MEMBER (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      request_id INTEGER NOT NULL REFERENCES REQUEST(id),
      personnel_id INTEGER NOT NULL REFERENCES PERSONNEL(id),
      role_in_request TEXT NOT NULL,
      is_deleted INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS ALLOCATION_BATCH (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      request_id INTEGER NOT NULL REFERENCES REQUEST(id),
      month_period TEXT NOT NULL,
      note TEXT DEFAULT '',
      is_deleted INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS ALLOCATION_ITEM (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      batch_id INTEGER NOT NULL REFERENCES ALLOCATION_BATCH(id),
      personnel_id INTEGER NOT NULL REFERENCES PERSONNEL(id),
      effort_md REAL NOT NULL,
      note TEXT DEFAULT '',
      is_deleted INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS DOCUMENT (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL REFERENCES PROJECT(id),
      request_id INTEGER REFERENCES REQUEST(id),
      title TEXT NOT NULL,
      document_type TEXT NOT NULL DEFAULT 'Tài liệu',
      external_url TEXT NOT NULL,
      note TEXT DEFAULT '',
      is_deleted INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS ACCEPTANCE_RECORD (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      request_id INTEGER NOT NULL REFERENCES REQUEST(id),
      record_code TEXT NOT NULL,
      title TEXT NOT NULL,
      external_url TEXT NOT NULL,
      delivery_status TEXT NOT NULL DEFAULT 'NOT_SENT',
      sent_date TEXT,
      note TEXT DEFAULT '',
      is_deleted INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS AUDIT_LOG (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      table_name TEXT NOT NULL,
      record_id TEXT NOT NULL,
      action TEXT NOT NULL,
      column_name TEXT NOT NULL,
      old_value TEXT,
      new_value TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    );
  `);

  // Ensure email & phone columns exist on existing DBs
  const cols = db.prepare("PRAGMA table_info(PERSONNEL)").all().map(c => c.name);
  if (!cols.includes('email')) {
    db.exec("ALTER TABLE PERSONNEL ADD COLUMN email TEXT DEFAULT '';");
  }
  if (!cols.includes('phone')) {
    db.exec("ALTER TABLE PERSONNEL ADD COLUMN phone TEXT DEFAULT '';");
  }

  // Seed default data if PROJECT is empty
  const count = db.prepare('SELECT COUNT(*) AS cnt FROM PROJECT').get().cnt;
  if (count === 0) {
    seedDatabase(db);
  }
  ensureImagePersonnel(db);

  return new PMRepository(db);
}

const IMAGE_PERSONNEL = [
  [1, 'NS01', 'Lê Thị Kim Chung', 'Tester', 'chung.le@lifesup.com', '+84 901234567', 'ACTIVE', 'Gia nhập: 2/11/2026'],
  [2, 'NS02', 'Le Quang Minh', 'Frontend', 'minh.le@lifesup.com.vn', 'N/A', 'ACTIVE', 'Gia nhập: 10/9/2026'],
  [3, 'NS03', 'Do Tuan Long', 'Frontend', 'long.do@lifesup.com.vn', 'N/A', 'ACTIVE', 'Gia nhập: 10/9/2026'],
  [4, 'NS04', 'Nguyễn Trọng Nam', 'PM', 'nam.nguyen@lifesup.com.vn', 'N/A', 'ACTIVE', 'Gia nhập: 10/9/2026'],
  [5, 'NS05', 'KHánh Trinh', 'Frontend', 'luong_ngoc21@yahoo.com', '+84 901234567', 'ACTIVE', 'Gia nhập: 30/7/2026'],
  [6, 'NS06', 'Vương Sơn Tùng', 'Frontend', 'tung.vuong@lifesup.com.vn', '+84 901234567', 'ACTIVE', 'Gia nhập: 30/7/2026'],
  [7, 'NS07', 'Đỗ Công Hòa', 'Frontend', 'hoa.do@lifesup.com.vn', '+84 901234567', 'ACTIVE', 'Gia nhập: 30/7/2026'],
  [8, 'NS08', 'Hoàng Thị Huyền Trang', 'Tester', 'trang.hoang01@lifesup.com.vn', '+84 901234567', 'ACTIVE', 'Gia nhập: 30/7/2026'],
  [9, 'NS09', 'Dương Tuấn Vũ', 'Leader', 'vu.duong@lifesup.com.vn', '+84 901234567', 'ACTIVE', 'Technical Leader · Gia nhập: 30/7/2026'],
  [10, 'NS10', 'Nguyễn Đức Thắng', 'Frontend', 'nguyenducthang.neu@gmail.com', '0356851332', 'ACTIVE', 'Lập trình viên Frontend (FE) · Gia nhập: 29/7/2026'],
  [11, 'NS11', 'Lương Bá Ngọc', 'Leader', 'luongngoc2194@gmail.com', '0379394690', 'ACTIVE', 'FE Lead hệ thống · Gia nhập: 29/7/2026'],
  [12, 'NS12', 'Nguyễn Hồng Thơm', 'BA', 'thom.nh96@gmail.com', '0971047982', 'ACTIVE', 'Chuyên viên Phân tích Nghiệp vụ (BA) · Gia nhập: 29/7/2026'],
  [13, 'NS13', 'Trần Ngọc Phú', 'Backend', 'tranphuth0609@gmail.com', '0376395844', 'ACTIVE', 'Lập trình viên Backend (BE) · Gia nhập: 29/7/2026'],
  [14, 'NS14', 'Nguyễn Thị Hà', 'Tester', 'nguyenha.k9d@gmail.com', '0985286441', 'ACTIVE', 'Chuyên viên Kiểm thử (Tester) · Gia nhập: 29/7/2026'],
  [15, 'NS15', 'Tô Thị Mai Quy', 'BA', 'toquy2k2@gmail.com.vn', '0932235082', 'ACTIVE', 'Chuyên viên Phân tích Nghiệp vụ (BA) · Gia nhập: 29/7/2026'],
  [16, 'NS16', 'Nguyễn Quý Giang', 'Frontend', 'giangquy2706@gmail.com.vn', '0366608023', 'ACTIVE', 'Lập trình viên Frontend (FE) · Gia nhập: 29/7/2026'],
  [17, 'NS17', 'Đỗ Văn Trung', 'Frontend', 'dvant24102003@gmail.com', '0876043542', 'ACTIVE', 'Lập trình viên Frontend (FE) · Gia nhập: 29/7/2026'],
  [18, 'NS18', 'Nguyễn Viết Hoàng', 'UIUX', 'hoang17102003.work@gmail.com', '0868229726', 'ACTIVE', 'Thiết kế Giao diện UI/UX Designer · Gia nhập: 29/7/2026'],
  [19, 'NS19', 'Đinh Đức Hải', 'Backend', 'hdtht198@gmail.com', '0347577771', 'ACTIVE', 'Lập trình viên DEV BE · Gia nhập: 29/7/2026']
];

function ensureImagePersonnel(db) {
  const hasFake = db.prepare("SELECT id FROM PERSONNEL WHERE full_name IN ('Nguyễn Văn An', 'Trần Văn Bình', 'Lê Thị Chi', 'Phạm Văn Dũng')").get();
  if (hasFake) {
    db.exec('PRAGMA foreign_keys = OFF;');
    db.exec('DELETE FROM PERSONNEL;');
    const ins = db.prepare('INSERT INTO PERSONNEL (id, code, full_name, default_role, email, phone, status, note, is_deleted) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)');
    for (const row of IMAGE_PERSONNEL) {
      ins.run(...row);
    }
    db.exec(`
      UPDATE REQUEST_MEMBER SET role_in_request = 'Tester' WHERE id = 1;
      UPDATE REQUEST_MEMBER SET role_in_request = 'Frontend' WHERE id = 2;
      UPDATE REQUEST_MEMBER SET role_in_request = 'Frontend' WHERE id = 3;
      UPDATE REQUEST_MEMBER SET role_in_request = 'Frontend' WHERE id = 4;
    `);
    db.exec('PRAGMA foreign_keys = ON;');
  }
}

function seedDatabase(db) {
  db.exec(`
    INSERT INTO PROJECT (id, code, name, customer_name, status, is_deleted) VALUES
      (1, 'DA-01', 'Cổng thông tin khách hàng', 'Viettel / Khối CNTT', 'ACTIVE', 0);
  `);
  const ins = db.prepare('INSERT INTO PERSONNEL (id, code, full_name, default_role, email, phone, status, note, is_deleted) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)');
  for (const row of IMAGE_PERSONNEL) {
    ins.run(...row);
  }
  db.exec(`

    INSERT INTO REQUEST (id, project_id, code, name, type, deadline, status, customer_requester, external_link, estimated_md, locked_md, is_deleted) VALUES
      (1, 1, 'PYC-001', 'Thêm báo cáo doanh thu', 'CR', '2026-12-15', 'IN_PROGRESS', 'Anh Nam - P.Kế toán', 'https://jira.example.com/browse/PYC-001', 28.0, 30.0, 0),
      (2, 1, 'PYC-002', 'Sửa lỗi xuất Excel', 'BUG', '2026-11-10', 'IN_PROGRESS', 'Chị Hương - Vận hành', 'https://jira.example.com/browse/PYC-002', 8.0, 10.0, 0);

    INSERT INTO REQUEST_MEMBER (id, request_id, personnel_id, role_in_request, is_deleted) VALUES
      (1, 1, 1, 'Backend Dev', 0),
      (2, 1, 2, 'Frontend Dev', 0),
      (3, 1, 3, 'Tester', 0),
      (4, 2, 2, 'Frontend Dev', 0);

    INSERT INTO ALLOCATION_BATCH (id, request_id, month_period, note, is_deleted) VALUES
      (1, 1, '2026-10', 'Phân bổ nỗ lực đợt cuối T10/2026', 0),
      (2, 1, '2026-11', 'Phân bổ nỗ lực đợt cuối T11/2026', 0),
      (3, 2, '2026-10', 'Xử lý lỗi xuất file Excel T10/2026', 0);

    INSERT INTO ALLOCATION_ITEM (id, batch_id, personnel_id, effort_md, note, is_deleted) VALUES
      (1, 1, 1, 10.0, 'Thiết kế DB + API báo cáo', 0),
      (2, 1, 2, 6.5, 'Giao diện bảng biểu báo cáo', 0),
      (3, 2, 1, 8.0, 'Tối ưu truy vấn và xuất file', 0),
      (4, 2, 3, 3.5, 'Kiểm thử SIT và UAT', 0),
      (5, 3, 2, 4.0, 'Fix lỗi tràn bộ nhớ khi xuất Excel', 0);

    INSERT INTO DOCUMENT (id, project_id, request_id, title, document_type, external_url, note, is_deleted) VALUES
      (1, 1, NULL, 'Đề cương và kiến trúc tổng thể DA-01', 'Đề cương', 'https://sharepoint.example.com/da01-spec', 'Bản chốt v1.2', 0),
      (2, 1, 1, 'Đặc tả yêu cầu (SRS) - Báo cáo doanh thu', 'SRS / Thiết kế', 'https://sharepoint.example.com/pyc001-srs', 'Khách hàng đã ký duyệt', 0);

    INSERT INTO ACCEPTANCE_RECORD (id, request_id, record_code, title, external_url, delivery_status, sent_date, is_deleted) VALUES
      (1, 1, 'BBNT-01', 'Nghiệm thu giai đoạn 1 PYC-001', 'https://drive.google.com/bbnt-01', 'SENT', '2026-11-01', 0),
      (2, 2, 'BBNT-02', 'Nghiệm thu bản vá lỗi Excel PYC-002', 'https://drive.google.com/bbnt-02', 'NOT_SENT', NULL, 0);

    INSERT INTO AUDIT_LOG (id, table_name, record_id, action, column_name, old_value, new_value, created_at) VALUES
      (1, 'REQUEST', 'PYC-001', 'INSERT', 'locked_md', NULL, 'NULL → 30.0 md', '2026-10-01 09:00:00'),
      (2, 'ALLOCATION_BATCH', 'PYC-001 (2026-10)', 'INSERT', 'effort_md', '0.0', '0.0 → 16.5 md (An: 10.0, Bình: 6.5)', '2026-10-31 17:30:00'),
      (3, 'ALLOCATION_BATCH', 'PYC-001 (2026-11)', 'INSERT', 'effort_md', '16.5', '16.5 → 28.0 md (An: 8.0, Chi: 3.5)', '2026-11-01 15:20:00');
  `);
}

class BusinessError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
    this.status = 422;
  }
}

class PMRepository {
  constructor(db) {
    this.db = db;
  }

  nowStr() {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    return `2026-11-02 ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  }

  logAudit(table, record, action, field, change) {
    this.db.prepare(`
      INSERT INTO AUDIT_LOG (table_name, record_id, action, column_name, old_value, new_value, created_at)
      VALUES (?, ?, ?, ?, '', ?, ?)
    `).run(table, String(record), action, field, String(change), this.nowStr());
  }

  getAllocatedMd(requestId, excludeBatchId = null) {
    let sql = `
      SELECT COALESCE(SUM(i.effort_md), 0) AS total
      FROM ALLOCATION_ITEM i
      JOIN ALLOCATION_BATCH b ON b.id = i.batch_id
      WHERE b.request_id = ? AND b.is_deleted = 0 AND i.is_deleted = 0
    `;
    const params = [requestId];
    if (excludeBatchId) {
      sql += ' AND b.id != ?';
      params.push(excludeBatchId);
    }
    const row = this.db.prepare(sql).get(...params);
    return r1(row ? row.total : 0);
  }

  // Returns the normalized frontend state matching Main.dc.html structure
  getFullState() {
    const projects = this.db.prepare('SELECT * FROM PROJECT ORDER BY id ASC').all().map(p => ({
      id: p.id, code: p.code, name: p.name, customer: p.customer_name || 'Nội bộ', status: p.status, del: !!p.is_deleted
    }));
    const personnel = this.db.prepare("SELECT * FROM PERSONNEL ORDER BY CASE WHEN status = 'ACTIVE' THEN 0 ELSE 1 END, id ASC").all().map(p => ({
      id: p.id, code: p.code, name: p.full_name, role: p.default_role, email: p.email || '', phone: p.phone || '', status: p.status, note: p.note || '', del: !!p.is_deleted
    }));
    const requests = this.db.prepare('SELECT * FROM REQUEST ORDER BY id ASC').all().map(r => {
      const allocated = this.getAllocatedMd(r.id);
      const remaining = r1(r.locked_md - allocated);
      return {
        id: r.id, proj: r.project_id, code: r.code, name: r.name, type: r.type,
        deadline: r.deadline || '', status: r.status, requester: r.customer_requester || '',
        link: r.external_link || '', est: r1(r.estimated_md), locked: r1(r.locked_md),
        allocated_md: allocated, remaining_md: remaining,
        del: !!r.is_deleted
      };
    });
    const members = this.db.prepare('SELECT * FROM REQUEST_MEMBER ORDER BY id ASC').all().map(m => ({
      id: m.id, req: m.request_id, pers: m.personnel_id, role: m.role_in_request, del: !!m.is_deleted
    }));
    const batches = this.db.prepare('SELECT * FROM ALLOCATION_BATCH ORDER BY id ASC').all().map(b => ({
      id: b.id, req: b.request_id, month: b.month_period, note: b.note || '', del: !!b.is_deleted
    }));
    const items = this.db.prepare('SELECT * FROM ALLOCATION_ITEM ORDER BY id ASC').all().map(i => ({
      id: i.id, batch: i.batch_id, pers: i.personnel_id, md: r1(i.effort_md), note: i.note || '', del: !!i.is_deleted
    }));
    const docs = this.db.prepare('SELECT * FROM DOCUMENT ORDER BY id ASC').all().map(d => ({
      id: d.id, proj: d.project_id, req: d.request_id, title: d.title, type: d.document_type, url: d.external_url, note: d.note || '', del: !!d.is_deleted
    }));
    const bbnt = this.db.prepare('SELECT * FROM ACCEPTANCE_RECORD ORDER BY id ASC').all().map(b => ({
      id: b.id, req: b.request_id, code: b.record_code, title: b.title, url: b.external_url, status: b.delivery_status, sent: b.sent_date, note: b.note || '', del: !!b.is_deleted
    }));
    const audit = this.db.prepare('SELECT * FROM AUDIT_LOG ORDER BY id DESC').all().map(a => ({
      id: a.id, time: a.created_at, table: a.table_name, record: a.record_id, action: a.action, field: a.column_name, change: a.new_value
    }));
    return { projects, requests, personnel, members, batches, items, docs, bbnt, audit };
  }

  // ==================== PROJECT CRUD ====================
  saveProject({ id, code, name, customer, status }) {
    const c = (code || '').trim();
    const n = (name || '').trim();
    const cust = (customer || '').trim() || 'Nội bộ';
    const st = status || 'ACTIVE';
    if (!c || !n) throw new BusinessError('VALIDATION', 'Vui lòng nhập đủ Mã dự án và Tên dự án.');

    const dup = this.db.prepare('SELECT id FROM PROJECT WHERE is_deleted = 0 AND LOWER(code) = LOWER(?) AND id != ?')
      .get(c, id || 0);
    if (dup) throw new BusinessError('BR-05', `Mã dự án "${c}" đã tồn tại.`);

    if (id) {
      this.db.prepare("UPDATE PROJECT SET code = ?, name = ?, customer_name = ?, status = ?, updated_at = datetime('now','localtime') WHERE id = ?")
        .run(c, n, cust, st, id);
      this.logAudit('PROJECT', c, 'UPDATE', 'info', `Cập nhật dự án ${n}`);
      return id;
    } else {
      const res = this.db.prepare('INSERT INTO PROJECT (code, name, customer_name, status, is_deleted) VALUES (?, ?, ?, ?, 0)')
        .run(c, n, cust, st);
      const newId = Number(res.lastInsertRowid);
      this.logAudit('PROJECT', c, 'INSERT', 'code', `Tạo mới dự án ${n}`);
      return newId;
    }
  }

  // ==================== PYC (REQUEST) CRUD ====================
  saveRequest({ id, proj, code, name, type, est, locked, deadline, status, requester, link }) {
    const c = (code || '').trim();
    const n = (name || '').trim();
    if (!c || !n) throw new BusinessError('VALIDATION', 'Vui lòng nhập đủ Mã PYC và Tên PYC.');

    // BR-05: Unique code within project
    const dup = this.db.prepare('SELECT id FROM REQUEST WHERE is_deleted = 0 AND project_id = ? AND LOWER(code) = LOWER(?) AND id != ?')
      .get(proj, c, id || 0);
    if (dup) throw new BusinessError('BR-05', `BR-05: Mã PYC "${c}" đã tồn tại trong dự án này.`);

    // BR-07: Step 0.1 validation (locked is optional until closing PYC)
    const lockedStr = (locked === '' || locked === null || locked === undefined) ? '' : String(locked).trim().replace(',', '.');
    const estStr = (est === '' || est === null || est === undefined) ? '' : String(est).trim().replace(',', '.');

    if (lockedStr !== '' && (!isValidStep(lockedStr) || Number(lockedStr) < 0)) {
      throw new BusinessError('BR-07', 'BR-07: Nỗ lực chốt phải theo bước 0.01 MM.');
    }
    if (estStr !== '' && (!isValidStep(estStr) || Number(estStr) < 0)) {
      throw new BusinessError('BR-07', 'BR-07: Nỗ lực ước tính phải theo bước 0.01 MM.');
    }

    const lockedVal = lockedStr === '' ? 0 : r1(lockedStr);
    const estVal = estStr === '' ? 0 : r1(estStr);
    const st = status || 'NEW';

    if (st === 'CLOSED' && lockedVal <= 0) {
      throw new BusinessError('VALIDATION', 'Khi đóng PYC (trạng thái Đã đóng), vui lòng nhập Nỗ lực chốt (> 0 MM).');
    }

    if (id) {
      // BR-02: Cannot reduce locked_md below current allocated_md (when lockedVal > 0)
      const allocated = this.getAllocatedMd(id);
      if (lockedVal > 0 && lockedVal < allocated) {
        throw new BusinessError('BR-02', `BR-02: Nỗ lực chốt mới (${f1(lockedVal)} MM) không được nhỏ hơn tổng đã phân bổ (${f1(allocated)} MM).`);
      }
      const oldRow = this.db.prepare('SELECT * FROM REQUEST WHERE id = ?').get(id);
      this.db.prepare(`
        UPDATE REQUEST
        SET code = ?, name = ?, type = ?, estimated_md = ?, locked_md = ?, deadline = ?, status = ?, customer_requester = ?, external_link = ?, updated_at = datetime('now','localtime')
        WHERE id = ?
      `).run(c, n, type || 'CR', estVal, lockedVal, deadline || '', st, (requester || '').trim(), (link || '').trim(), id);

      if (oldRow && r1(oldRow.locked_md) !== lockedVal) {
        this.logAudit('REQUEST', c, 'UPDATE', 'locked_md', `${oldRow.locked_md > 0 ? f1(oldRow.locked_md) + ' MM' : 'Chưa chốt'} → ${lockedVal > 0 ? f1(lockedVal) + ' MM' : 'Chưa chốt'}`);
      } else {
        this.logAudit('REQUEST', c, 'UPDATE', 'info', `Cập nhật thông tin ${c}`);
      }
      return id;
    } else {
      const res = this.db.prepare(`
        INSERT INTO REQUEST (project_id, code, name, type, deadline, status, customer_requester, external_link, estimated_md, locked_md, is_deleted)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
      `).run(proj, c, n, type || 'CR', deadline || '', st, (requester || '').trim(), (link || '').trim(), estVal, lockedVal);
      const newId = Number(res.lastInsertRowid);
      this.logAudit('REQUEST', c, 'INSERT', 'locked_md', `Tạo mới PYC, ${lockedVal > 0 ? 'chốt ' + f1(lockedVal) + ' MM' : 'chưa chốt nỗ lực'}`);
      return newId;
    }
  }

  // ==================== PERSONNEL CRUD ====================
  savePersonnel({ id, code, name, role, email, phone, status, note }) {
    const c = (code || '').trim();
    const n = (name || '').trim();
    const r = (role || 'Dev').trim();
    const em = (email || '').trim();
    const ph = (phone || '').trim();
    const st = status || 'ACTIVE';
    const nt = (note || '').trim();
    if (!c || !n) throw new BusinessError('VALIDATION', 'Vui lòng nhập mã và họ tên.');

    const dup = this.db.prepare('SELECT id FROM PERSONNEL WHERE is_deleted = 0 AND LOWER(code) = LOWER(?) AND id != ?')
      .get(c, id || 0);
    if (dup) throw new BusinessError('BR-05', 'Mã nhân sự đã tồn tại.');

    if (id) {
      this.db.prepare("UPDATE PERSONNEL SET code = ?, full_name = ?, default_role = ?, email = ?, phone = ?, status = ?, note = ?, updated_at = datetime('now','localtime') WHERE id = ?")
        .run(c, n, r, em, ph, st, nt, id);
      this.logAudit('PERSONNEL', c, 'UPDATE', 'info', `Cập nhật nhân sự ${n}`);
      return id;
    } else {
      const res = this.db.prepare('INSERT INTO PERSONNEL (code, full_name, default_role, email, phone, status, note, is_deleted) VALUES (?, ?, ?, ?, ?, ?, ?, 0)')
        .run(c, n, r, em, ph, st, nt);
      this.logAudit('PERSONNEL', c, 'INSERT', 'code', `Thêm mới ${n}`);
      return Number(res.lastInsertRowid);
    }
  }

  togglePersonnelStatus(id) {
    const p = this.db.prepare('SELECT * FROM PERSONNEL WHERE id = ?').get(id);
    if (!p) throw new BusinessError('NOT_FOUND', 'Không tìm thấy nhân sự.');
    const next = p.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    this.db.prepare("UPDATE PERSONNEL SET status = ?, updated_at = datetime('now','localtime') WHERE id = ?").run(next, id);
    this.logAudit('PERSONNEL', p.code, 'UPDATE', 'status', `${p.status} → ${next}`);
    return next;
  }

  // ==================== ASSIGN MEMBER TO PYC ====================
  assignMember({ reqId, persId, role }) {
    const p = this.db.prepare('SELECT * FROM PERSONNEL WHERE id = ? AND is_deleted = 0').get(persId);
    const rq = this.db.prepare('SELECT * FROM REQUEST WHERE id = ? AND is_deleted = 0').get(reqId);
    if (!p || !rq) throw new BusinessError('NOT_FOUND', 'Không tìm thấy nhân sự hoặc PYC.');
    if (p.status !== 'ACTIVE') {
      throw new BusinessError('BR-03', `BR-03: Nhân sự ${p.code} đã nghỉ việc, không thể gán mới vào PYC.`);
    }
    const existing = this.db.prepare('SELECT id FROM REQUEST_MEMBER WHERE request_id = ? AND personnel_id = ? AND is_deleted = 0').get(reqId, persId);
    if (existing) throw new BusinessError('BR-05', `Nhân sự ${p.code} đã có trong ${rq.code}.`);

    const roleIn = (role || '').trim() || p.default_role;
    const res = this.db.prepare('INSERT INTO REQUEST_MEMBER (request_id, personnel_id, role_in_request, is_deleted) VALUES (?, ?, ?, 0)')
      .run(reqId, persId, roleIn);
    this.logAudit('REQUEST_MEMBER', `${rq.code} - ${p.code}`, 'INSERT', 'personnel_id', `Gán ${p.full_name} (${roleIn})`);
    return Number(res.lastInsertRowid);
  }

  // ==================== ALLOCATION BATCH & ITEMS ====================
  saveAllocationBatch({ batchId, reqId, month, note, rows }) {
    const rq = this.db.prepare('SELECT * FROM REQUEST WHERE id = ? AND is_deleted = 0').get(reqId);
    if (!rq) throw new BusinessError('NOT_FOUND', 'Không tìm thấy PYC.');
    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      throw new BusinessError('VALIDATION', 'Vui lòng chọn tháng phân bổ hợp lệ (YYYY-MM).');
    }
    if (!Array.isArray(rows) || rows.length === 0) {
      throw new BusinessError('VALIDATION', 'Mỗi đợt phân bổ cần ít nhất 1 dòng nhân sự.');
    }

    // BR-08: Max 1 batch per PYC per month
    const monthDup = this.db.prepare('SELECT id FROM ALLOCATION_BATCH WHERE request_id = ? AND month_period = ? AND is_deleted = 0 AND id != ?')
      .get(reqId, month, batchId || 0);
    if (monthDup) {
      throw new BusinessError('BR-08', `${rq.code} đã có đợt phân bổ tháng ${month}. Mỗi PYC tối đa một đợt mỗi tháng.`);
    }

    // Validate each row (BR-03, BR-07, duplicate personnel)
    const assignedIds = new Set(
      this.db.prepare('SELECT personnel_id FROM REQUEST_MEMBER WHERE request_id = ? AND is_deleted = 0')
        .all(reqId).map(m => m.personnel_id)
    );
    const existingPersInBatch = new Set(
      batchId
        ? this.db.prepare('SELECT personnel_id FROM ALLOCATION_ITEM WHERE batch_id = ? AND is_deleted = 0').all(batchId).map(i => i.personnel_id)
        : []
    );

    const seenPers = new Set();
    let batchTotal = 0;
    const cleanItems = [];

    for (let idx = 0; idx < rows.length; idx++) {
      const r = rows[idx];
      const persId = Number(r.pers);
      const p = this.db.prepare('SELECT * FROM PERSONNEL WHERE id = ? AND is_deleted = 0').get(persId);
      if (!p) throw new BusinessError('BR-03', `Dòng ${idx + 1}: Nhân sự không tồn tại.`);

      // BR-03: Must be assigned to PYC and ACTIVE (unless preserving existing historical row in edit mode)
      if (!assignedIds.has(persId)) {
        throw new BusinessError('BR-03', `BR-03: Nhân sự ${p.code} (${p.full_name}) chưa được gán vào ${rq.code}.`);
      }
      if (p.status !== 'ACTIVE' && !existingPersInBatch.has(persId)) {
        throw new BusinessError('BR-03', `BR-03: Nhân sự ${p.code} (${p.full_name}) đã nghỉ việc, không được phân bổ mới.`);
      }

      if (seenPers.has(persId)) {
        throw new BusinessError('VALIDATION', `Nhân sự ${p.code} bị trùng dòng trong cùng một đợt.`);
      }
      seenPers.add(persId);

      if (!isValidStep(r.md) || Number(r.md) <= 0) {
        throw new BusinessError('BR-07', `BR-07: Nỗ lực phải > 0 và theo bước 0.01 MM (${r.md} bị từ chối).`);
      }

      const mdVal = r1(r.md);
      batchTotal = r1(batchTotal + mdVal);
      cleanItems.push({ pers: persId, md: mdVal, note: (r.note || '').trim() });
    }

    // BR-01: Cannot exceed locked_md (when locked_md > 0)
    const otherAllocated = this.getAllocatedMd(reqId, batchId);
    const newTotalAllocated = r1(otherAllocated + batchTotal);
    if (r1(rq.locked_md) > 0 && newTotalAllocated > r1(rq.locked_md)) {
      throw new BusinessError(
        'BR-01',
        `BR-01: Tổng nỗ lực phân bổ (${f1(newTotalAllocated)} MM) vượt quá nỗ lực chốt (${f1(rq.locked_md)} MM) của ${rq.code}.`
      );
    }

    // Save within transaction
    this.db.exec('BEGIN');
    try {
      let targetBatchId = batchId;
      if (targetBatchId) {
        this.db.prepare("UPDATE ALLOCATION_BATCH SET month_period = ?, note = ?, updated_at = datetime('now','localtime') WHERE id = ?")
          .run(month, (note || '').trim(), targetBatchId);
        this.db.prepare('DELETE FROM ALLOCATION_ITEM WHERE batch_id = ?').run(targetBatchId);
      } else {
        const res = this.db.prepare('INSERT INTO ALLOCATION_BATCH (request_id, month_period, note, is_deleted) VALUES (?, ?, ?, 0)')
          .run(reqId, month, (note || '').trim());
        targetBatchId = Number(res.lastInsertRowid);
        if (rq.status === 'NEW') {
          this.db.prepare("UPDATE REQUEST SET status = 'IN_PROGRESS', updated_at = datetime('now','localtime') WHERE id = ?").run(reqId);
        }
      }

      const insItem = this.db.prepare('INSERT INTO ALLOCATION_ITEM (batch_id, personnel_id, effort_md, note, is_deleted) VALUES (?, ?, ?, ?, 0)');
      for (const it of cleanItems) {
        insItem.run(targetBatchId, it.pers, it.md, it.note);
      }

      this.logAudit(
        'ALLOCATION_BATCH',
        `${rq.code} (${month})`,
        batchId ? 'UPDATE' : 'INSERT',
        'effort_md',
        `${batchId ? 'Cập nhật đợt: ' : 'Thêm đợt mới: +'}${f1(batchTotal)} md`
      );
      this.db.exec('COMMIT');
      return targetBatchId;
    } catch (err) {
      this.db.exec('ROLLBACK');
      throw err;
    }
  }

  // ==================== DOCUMENT & BBNT ====================
  saveDocument({ id, proj, req, title, type, url, note }) {
    const t = (title || '').trim();
    const u = (url || '').trim();
    if (!t || !u) throw new BusinessError('VALIDATION', 'Vui lòng nhập tiêu đề và đính kèm file hoặc liên kết.');
    if (id) {
      this.db.prepare(`
        UPDATE DOCUMENT
        SET request_id = ?, title = ?, document_type = ?, external_url = ?, note = ?, updated_at = datetime('now','localtime')
        WHERE id = ?
      `).run(req || null, t, (type || 'Tài liệu').trim(), u, (note || '').trim(), id);
      this.logAudit('DOCUMENT', t, 'UPDATE', 'info', `Cập nhật hồ sơ ${t}`);
      return id;
    } else {
      const res = this.db.prepare(`
        INSERT INTO DOCUMENT (project_id, request_id, title, document_type, external_url, note, is_deleted)
        VALUES (?, ?, ?, ?, ?, ?, 0)
      `).run(proj, req || null, t, (type || 'Tài liệu').trim(), u, (note || '').trim());
      this.logAudit('DOCUMENT', t, 'INSERT', 'title', t);
      return Number(res.lastInsertRowid);
    }
  }

  saveBbnt({ id, req, code, title, url, status, sent, note }) {
    const c = (code || '').trim();
    const t = (title || '').trim();
    const u = (url || '').trim();
    if (!c || !t || !u || !req) throw new BusinessError('VALIDATION', 'Vui lòng nhập đủ Mã BBNT, Tiêu đề, PYC và Link file.');
    const st = status === 'SENT' ? 'SENT' : 'NOT_SENT';
    const sentDate = st === 'SENT' ? (sent || '2026-11-02') : null;

    if (id) {
      this.db.prepare(`
        UPDATE ACCEPTANCE_RECORD
        SET request_id = ?, record_code = ?, title = ?, external_url = ?, delivery_status = ?, sent_date = ?, note = ?, updated_at = datetime('now','localtime')
        WHERE id = ?
      `).run(req, c, t, u, st, sentDate, (note || '').trim(), id);
      this.logAudit('ACCEPTANCE_RECORD', c, 'UPDATE', 'info', `Cập nhật biên bản ${c}`);
      return id;
    } else {
      const res = this.db.prepare(`
        INSERT INTO ACCEPTANCE_RECORD (request_id, record_code, title, external_url, delivery_status, sent_date, note, is_deleted)
        VALUES (?, ?, ?, ?, ?, ?, ?, 0)
      `).run(req, c, t, u, st, sentDate, (note || '').trim());
      this.logAudit('ACCEPTANCE_RECORD', c, 'INSERT', 'record_code', `Tạo mới biên bản ${c}`);
      return Number(res.lastInsertRowid);
    }
  }

  // BR-09: Toggle BBNT delivery status
  toggleBbntStatus(id, send, sentDate) {
    const b = this.db.prepare('SELECT * FROM ACCEPTANCE_RECORD WHERE id = ?').get(id);
    if (!b) throw new BusinessError('NOT_FOUND', 'Không tìm thấy biên bản nghiệm thu.');
    if (send) {
      const d = sentDate || '2026-11-02';
      this.db.prepare("UPDATE ACCEPTANCE_RECORD SET delivery_status = 'SENT', sent_date = ?, updated_at = datetime('now','localtime') WHERE id = ?")
        .run(d, id);
      this.logAudit('ACCEPTANCE_RECORD', b.record_code, 'UPDATE', 'delivery_status', `NOT_SENT → SENT (Ngày gửi: ${d})`);
    } else {
      this.db.prepare("UPDATE ACCEPTANCE_RECORD SET delivery_status = 'NOT_SENT', sent_date = NULL, updated_at = datetime('now','localtime') WHERE id = ?")
        .run(id);
      this.logAudit('ACCEPTANCE_RECORD', b.record_code, 'UPDATE', 'delivery_status', 'SENT → NOT_SENT');
    }
  }

  // ==================== SOFT DELETE & RESTORE (BR-04, BR-06) ====================
  softDelete(coll, id) {
    const map = {
      projects: { table: 'PROJECT', label: (r) => r.code },
      requests: { table: 'REQUEST', label: (r) => r.code },
      batches: { table: 'ALLOCATION_BATCH', label: (r) => {
        const rq = this.db.prepare('SELECT code FROM REQUEST WHERE id = ?').get(r.request_id);
        return `${rq ? rq.code : ''} (${r.month_period})`;
      }},
      bbnt: { table: 'ACCEPTANCE_RECORD', label: (r) => r.record_code },
      docs: { table: 'DOCUMENT', label: (r) => r.title },
      members: { table: 'REQUEST_MEMBER', label: (r) => `#${r.id}` },
      personnel: { table: 'PERSONNEL', label: (r) => r.code }
    };
    const cfg = map[coll];
    if (!cfg) throw new BusinessError('VALIDATION', 'Loại dữ liệu không hợp lệ.');

    const row = this.db.prepare(`SELECT * FROM ${cfg.table} WHERE id = ?`).get(id);
    if (!row) throw new BusinessError('NOT_FOUND', 'Không tìm thấy bản ghi.');

    this.db.prepare(`UPDATE ${cfg.table} SET is_deleted = 1 WHERE id = ?`).run(id);
    if (coll === 'batches') {
      this.db.prepare('UPDATE ALLOCATION_ITEM SET is_deleted = 1 WHERE batch_id = ?').run(id);
    }

    const recLabel = cfg.label(row);
    let note = 'false → true';
    if (coll === 'batches') {
      const rq = this.db.prepare('SELECT * FROM REQUEST WHERE id = ?').get(row.request_id);
      if (rq) {
        const rem = r1(rq.locked_md - this.getAllocatedMd(rq.id));
        note += ` (Còn lại của ${rq.code} tăng lên ${f1(rem)} md)`;
      }
    }
    this.logAudit(cfg.table, recLabel, 'SOFT_DELETE', 'is_deleted', note);
    return recLabel;
  }

  restore(coll, id) {
    const map = {
      projects: 'PROJECT',
      requests: 'REQUEST',
      batches: 'ALLOCATION_BATCH',
      bbnt: 'ACCEPTANCE_RECORD',
      docs: 'DOCUMENT',
      members: 'REQUEST_MEMBER',
      personnel: 'PERSONNEL'
    };
    const table = map[coll];
    if (!table) throw new BusinessError('VALIDATION', 'Loại dữ liệu không hợp lệ.');

    const row = this.db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(id);
    if (!row) throw new BusinessError('NOT_FOUND', 'Không tìm thấy bản ghi.');

    if (coll === 'requests') {
      const proj = this.db.prepare('SELECT * FROM PROJECT WHERE id = ?').get(row.project_id);
      if (proj && proj.is_deleted) {
        throw new BusinessError('BR-04', `Không thể khôi phục PYC: Dự án cha (${proj.code}) đang ở Thùng rác.`);
      }
    }

    if (coll === 'batches') {
      const rq = this.db.prepare('SELECT * FROM REQUEST WHERE id = ?').get(row.request_id);
      if (rq && rq.is_deleted) {
        throw new BusinessError('BR-04', `Không thể khôi phục đợt: ${rq.code} đang ở Thùng rác. Hãy khôi phục PYC trước.`);
      }
      const batchSum = r1(
        this.db.prepare('SELECT COALESCE(SUM(effort_md), 0) AS s FROM ALLOCATION_ITEM WHERE batch_id = ?').get(id).s
      );
      const curAlloc = this.getAllocatedMd(row.request_id);
      if (r1(rq.locked_md) > 0 && r1(curAlloc + batchSum) > r1(rq.locked_md)) {
        throw new BusinessError(
          'BR-04',
          `BR-04: Sau khôi phục tổng ${f1(r1(curAlloc + batchSum))} md vượt nỗ lực chốt ${f1(rq.locked_md)} md.`
        );
      }
      this.db.prepare('UPDATE ALLOCATION_ITEM SET is_deleted = 0 WHERE batch_id = ?').run(id);
    }

    this.db.prepare(`UPDATE ${table} SET is_deleted = 0 WHERE id = ?`).run(id);
    const recLabel = row.code || row.record_code || row.title || `#${row.id}`;
    this.logAudit(table, recLabel, 'RESTORE', 'is_deleted', 'true → false');
    return recLabel;
  }

  // ==================== EXCEL IMPORT (DRY-RUN & UPSERT) ====================
  importData({ type, rows, dryRun = true, autoAssign = true }) {
    if (!Array.isArray(rows)) throw new BusinessError('VALIDATION', 'Dữ liệu import không hợp lệ.');
    const results = [];
    let validCount = 0;
    let errorCount = 0;

    if (type === 'personnel') {
      rows.forEach((r, idx) => {
        const rowNum = idx + 2;
        const code = String(r.Ma_NV || r.code || '').trim();
        const name = String(r.Ho_Ten || r.name || '').trim();
        const role = String(r.Vai_Tro_Chinh || r.role || 'Dev').trim();
        const status = String(r.Trang_Thai || r.status || 'ACTIVE').trim().toUpperCase() === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE';
        const note = String(r.Ghi_Chu || r.note || '').trim();

        if (!code || !name) {
          errorCount++;
          results.push({ row: rowNum, key: code || '(Trống)', status: 'ERROR', mode: '-', message: 'Thiếu Mã NV hoặc Họ tên' });
          return;
        }
        const existing = this.db.prepare('SELECT * FROM PERSONNEL WHERE LOWER(code) = LOWER(?) AND is_deleted = 0').get(code);
        validCount++;
        results.push({
          row: rowNum,
          key: `${code} · ${name}`,
          status: 'VALID',
          mode: existing ? 'UPDATE' : 'INSERT',
          message: existing ? `Hợp lệ (Upsert: Cập nhật nhân sự ${code})` : `Hợp lệ (Tạo mới nhân sự ${code})`,
          payload: { id: existing ? existing.id : null, code, name, role, status, note }
        });
      });

      if (!dryRun) {
        this.db.exec('BEGIN');
        try {
          for (const item of results.filter(x => x.status === 'VALID')) {
            this.savePersonnel(item.payload);
          }
          this.db.exec('COMMIT');
        } catch (e) {
          this.db.exec('ROLLBACK');
          throw e;
        }
      }
    } else if (type === 'requests') {
      rows.forEach((r, idx) => {
        const rowNum = idx + 2;
        const projCode = String(r.Ma_Du_An || r.projCode || 'DA-01').trim();
        const code = String(r.Ma_PYC || r.code || '').trim();
        const name = String(r.Ten_PYC || r.name || '').trim();
        const reqType = String(r.Loai_PYC || r.type || 'CR').trim();
        const deadline = String(r.Han_Hoan_Thanh || r.deadline || '2026-12-31').trim();
        const est = r.No_Luc_Uoc_Tinh !== undefined && r.No_Luc_Uoc_Tinh !== '' ? r.No_Luc_Uoc_Tinh : (r.est ?? '');
        const locked = r.No_Luc_Chot !== undefined ? r.No_Luc_Chot : r.locked;
        const requester = String(r.Nguoi_Yeu_Cau || r.requester || '').trim();
        const link = String(r.Link_Ngoai || r.link || '').trim();

        const proj = this.db.prepare('SELECT * FROM PROJECT WHERE LOWER(code) = LOWER(?) AND is_deleted = 0').get(projCode);
        if (!proj) {
          errorCount++;
          results.push({ row: rowNum, key: `${projCode}/${code}`, status: 'ERROR', mode: '-', message: `Dự án ${projCode} không tồn tại` });
          return;
        }
        if (!code || !name) {
          errorCount++;
          results.push({ row: rowNum, key: `${projCode}/${code}`, status: 'ERROR', mode: '-', message: 'Thiếu Mã PYC hoặc Tên PYC' });
          return;
        }
        if (!isValidStep(locked) || Number(locked) < 0) {
          errorCount++;
          results.push({ row: rowNum, key: `${projCode}/${code}`, status: 'ERROR', mode: '-', message: `BR-07: Nỗ lực chốt (${locked}) phải theo bước 0.1 md` });
          return;
        }
        if (est !== '' && (!isValidStep(est) || Number(est) < 0)) {
          errorCount++;
          results.push({ row: rowNum, key: `${projCode}/${code}`, status: 'ERROR', mode: '-', message: `BR-07: Nỗ lực ước tính (${est}) phải theo bước 0.1 md` });
          return;
        }

        const existing = this.db.prepare('SELECT * FROM REQUEST WHERE project_id = ? AND LOWER(code) = LOWER(?) AND is_deleted = 0').get(proj.id, code);
        if (existing) {
          const allocated = this.getAllocatedMd(existing.id);
          if (r1(locked) < allocated) {
            errorCount++;
            results.push({ row: rowNum, key: `${projCode}/${code}`, status: 'ERROR', mode: 'UPDATE', message: `BR-02: Chốt mới (${f1(locked)} md) < đã phân bổ (${f1(allocated)} md)` });
            return;
          }
        }

        validCount++;
        results.push({
          row: rowNum,
          key: `${projCode} / ${code} (${f1(locked)} md)`,
          status: 'VALID',
          mode: existing ? 'UPDATE' : 'INSERT',
          message: existing ? `Hợp lệ (Upsert: Cập nhật ${code}, không tạo trùng)` : `Hợp lệ (Tạo mới ${code})`,
          payload: {
            id: existing ? existing.id : null,
            proj: proj.id,
            code,
            name,
            type: reqType,
            est,
            locked: r1(locked),
            deadline,
            status: existing ? existing.status : 'NEW',
            requester: requester || (existing ? existing.customer_requester : ''),
            link: link || (existing ? existing.external_link : '')
          }
        });
      });

      if (!dryRun) {
        this.db.exec('BEGIN');
        try {
          for (const item of results.filter(x => x.status === 'VALID')) {
            this.saveRequest(item.payload);
          }
          this.db.exec('COMMIT');
        } catch (e) {
          this.db.exec('ROLLBACK');
          throw e;
        }
      }
    }

    return { total_rows: rows.length, valid_rows: validCount, error_rows: errorCount, details: results };
  }

  // ==================== EXCEL / CSV EXPORT ====================
  exportCsv(type, projectId) {
    const state = this.getFullState();
    const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const lines = [];

    if (type === 'personnel') {
      lines.push(['Ma_NV', 'Ho_Ten', 'Vai_Tro_Chinh', 'Email', 'So_Dien_Thoai', 'Trang_Thai', 'Ghi_Chu'].map(esc).join(','));
      state.personnel.filter(p => !p.del).forEach(p => {
        lines.push([p.code, p.name, p.role, p.email || '', p.phone || '', p.status, p.note].map(esc).join(','));
      });
    } else if (type === 'requests') {
      lines.push(['Ma_Du_An', 'Ma_PYC', 'Ten_PYC', 'Loai_PYC', 'Han_Hoan_Thanh', 'Trang_Thai', 'No_Luc_Uoc_Tinh_MD', 'No_Luc_Chot_MD', 'No_Luc_Chot_MM', 'Da_Phan_Bo_MD', 'Con_Lai_MD', 'Nguoi_Yeu_Cau'].map(esc).join(','));
      state.requests.filter(r => !r.del && (!projectId || r.proj === Number(projectId))).forEach(r => {
        const proj = state.projects.find(p => p.id === r.proj);
        lines.push([
          proj ? proj.code : 'DA-01', r.code, r.name, r.type, r.deadline, r.status,
          f1(r.est), f1(r.locked), mm(r.locked), f1(r.allocated_md), f1(r.remaining_md), r.requester
        ].map(esc).join(','));
      });
    } else if (type === 'allocations') {
      lines.push(['Ma_Du_An', 'Ma_PYC', 'Ten_PYC', 'Thang_Phan_Bo', 'Ma_NV', 'Ho_Ten', 'No_Luc_MD', 'No_Luc_MM', 'Ghi_Chu'].map(esc).join(','));
      state.batches.filter(b => !b.del).forEach(b => {
        const req = state.requests.find(r => r.id === b.req && !r.del);
        if (!req || (projectId && req.proj !== Number(projectId))) return;
        const proj = state.projects.find(p => p.id === req.proj);
        state.items.filter(i => i.batch === b.id && !i.del).forEach(i => {
          const pers = state.personnel.find(p => p.id === i.pers);
          lines.push([
            proj ? proj.code : 'DA-01', req.code, req.name, b.month,
            pers ? pers.code : '', pers ? pers.name : '', f1(i.md), mm(i.md), i.note
          ].map(esc).join(','));
        });
      });
    } else if (type === 'bbnt') {
      lines.push(['Ma_Du_An', 'Ma_BBNT', 'Tieu_De', 'Ma_PYC', 'Trang_Thai_Gui', 'Ngay_Gui', 'Link_File'].map(esc).join(','));
      state.bbnt.filter(b => !b.del).forEach(b => {
        const req = state.requests.find(r => r.id === b.req && !r.del);
        if (!req || (projectId && req.proj !== Number(projectId))) return;
        const proj = state.projects.find(p => p.id === req.proj);
        lines.push([
          proj ? proj.code : 'DA-01', b.code, b.title, req.code,
          b.status === 'SENT' ? 'Đã gửi' : 'Chưa gửi', b.sent || '', b.url
        ].map(esc).join(','));
      });
    } else if (type === 'docs') {
      lines.push(['Ma_Du_An', 'Tieu_De_Ho_So', 'Loai_Tai_Lieu', 'Gan_Voi_PYC', 'Link_Hoac_File', 'Ghi_Chu'].map(esc).join(','));
      state.docs.filter(d => !d.del && (!projectId || d.proj === Number(projectId))).forEach(d => {
        const proj = state.projects.find(p => p.id === d.proj);
        const req = state.requests.find(r => r.id === d.req && !r.del);
        lines.push([
          proj ? proj.code : 'DA-01', d.title, d.type, req ? req.code : 'Chung dự án', d.url, d.note || ''
        ].map(esc).join(','));
      });
    }

    return '\uFEFF' + lines.join('\r\n');
  }
}

module.exports = { createDatabase, BusinessError, r1, f1, mm, isValidStep };
