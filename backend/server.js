const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { URL } = require('node:url');
const { createDatabase, BusinessError } = require('./db');

const PORT = process.env.PORT || 3000;
const DB_PATH = path.join(__dirname, 'data', 'outsource-pm.db');
const repo = createDatabase(DB_PATH);

function sendJson(res, status, payload) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  res.end(JSON.stringify(payload));
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk) => { raw += chunk; });
    req.on('end', () => {
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch (err) {
        reject(new BusinessError('BAD_JSON', 'Dữ liệu JSON không hợp lệ.'));
      }
    });
    req.on('error', reject);
  });
}

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.pdf': 'application/pdf',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xls': 'application/vnd.ms-excel',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.ppt': 'application/vnd.ms-powerpoint',
  '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  '.zip': 'application/zip',
  '.rar': 'application/vnd.rar',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.txt': 'text/plain; charset=utf-8',
  '.csv': 'text/csv; charset=utf-8'
};

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    return res.end();
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = parsedUrl.pathname;

  // ==================== REST API ROUTES ====================
  if (pathname.startsWith('/api/')) {
    try {
      // GET /api/state -> Full normalized state from SQLite
      if (req.method === 'GET' && pathname === '/api/state') {
        return sendJson(res, 200, repo.getFullState());
      }

      // POST /api/projects & PUT /api/projects/:id
      if (req.method === 'POST' && pathname === '/api/projects') {
        const body = await readJsonBody(req);
        const id = repo.saveProject(body);
        return sendJson(res, 201, { id, db: repo.getFullState() });
      }
      if (req.method === 'PUT' && /^\/api\/projects\/\d+$/.test(pathname)) {
        const id = Number(pathname.split('/').pop());
        const body = await readJsonBody(req);
        repo.saveProject({ ...body, id });
        return sendJson(res, 200, { id, db: repo.getFullState() });
      }

      // POST /api/requests & PUT /api/requests/:id
      if (req.method === 'POST' && pathname === '/api/requests') {
        const body = await readJsonBody(req);
        const id = repo.saveRequest(body);
        return sendJson(res, 201, { id, db: repo.getFullState() });
      }
      if (req.method === 'PUT' && /^\/api\/requests\/\d+$/.test(pathname)) {
        const id = Number(pathname.split('/').pop());
        const body = await readJsonBody(req);
        repo.saveRequest({ ...body, id });
        return sendJson(res, 200, { id, db: repo.getFullState() });
      }

      // POST /api/personnel, PUT /api/personnel/:id, PATCH /api/personnel/:id/toggle
      if (req.method === 'POST' && pathname === '/api/personnel') {
        const body = await readJsonBody(req);
        const id = repo.savePersonnel(body);
        return sendJson(res, 201, { id, db: repo.getFullState() });
      }
      if (req.method === 'PUT' && /^\/api\/personnel\/\d+$/.test(pathname)) {
        const id = Number(pathname.split('/').pop());
        const body = await readJsonBody(req);
        repo.savePersonnel({ ...body, id });
        return sendJson(res, 200, { id, db: repo.getFullState() });
      }
      if (req.method === 'PATCH' && /^\/api\/personnel\/\d+\/toggle$/.test(pathname)) {
        const id = Number(pathname.split('/')[3]);
        const status = repo.togglePersonnelStatus(id);
        return sendJson(res, 200, { id, status, db: repo.getFullState() });
      }

      // POST /api/members
      if (req.method === 'POST' && pathname === '/api/members') {
        const body = await readJsonBody(req);
        const id = repo.assignMember(body);
        return sendJson(res, 201, { id, db: repo.getFullState() });
      }

      // POST /api/allocations & PUT /api/allocations/:id
      if (req.method === 'POST' && pathname === '/api/allocations') {
        const body = await readJsonBody(req);
        const id = repo.saveAllocationBatch(body);
        return sendJson(res, 201, { id, db: repo.getFullState() });
      }
      if (req.method === 'PUT' && /^\/api\/allocations\/\d+$/.test(pathname)) {
        const batchId = Number(pathname.split('/').pop());
        const body = await readJsonBody(req);
        repo.saveAllocationBatch({ ...body, batchId });
        return sendJson(res, 200, { id: batchId, db: repo.getFullState() });
      }

      // POST /api/upload (Upload file attachment for Hồ sơ / BBNT)
      if (req.method === 'POST' && pathname === '/api/upload') {
        const body = await readJsonBody(req);
        const origName = String(body.fileName || 'file.bin').replace(/[^a-zA-Z0-9._\-\u00C0-\u1EF9 ]/g, '_').trim() || 'file.bin';
        const dataUrl = String(body.dataUrl || '');
        const match = dataUrl.match(/^data:[^;]*;base64,(.+)$/);
        const base64Data = match ? match[1] : dataUrl;
        if (!base64Data) {
          throw new BusinessError('VALIDATION', 'Không có dữ liệu file tải lên.');
        }
        const uploadDir = path.resolve(__dirname, '..', 'uploads');
        fs.mkdirSync(uploadDir, { recursive: true });
        const savedName = `${Date.now()}_${origName}`;
        const destPath = path.join(uploadDir, savedName);
        const buf = Buffer.from(base64Data, 'base64');
        fs.writeFileSync(destPath, buf);
        return sendJson(res, 201, {
          url: '/uploads/' + encodeURIComponent(savedName),
          fileName: origName,
          size: buf.length
        });
      }

      // POST /api/documents & PUT /api/documents/:id
      if (req.method === 'POST' && pathname === '/api/documents') {
        const body = await readJsonBody(req);
        const id = repo.saveDocument(body);
        return sendJson(res, 201, { id, db: repo.getFullState() });
      }
      if (req.method === 'PUT' && /^\/api\/documents\/\d+$/.test(pathname)) {
        const id = Number(pathname.split('/').pop());
        const body = await readJsonBody(req);
        repo.saveDocument({ ...body, id });
        return sendJson(res, 200, { id, db: repo.getFullState() });
      }

      // POST /api/acceptance-records, PUT /api/acceptance-records/:id, PATCH /api/acceptance-records/:id/status
      if (req.method === 'POST' && pathname === '/api/acceptance-records') {
        const body = await readJsonBody(req);
        const id = repo.saveBbnt(body);
        return sendJson(res, 201, { id, db: repo.getFullState() });
      }
      if (req.method === 'PUT' && /^\/api\/acceptance-records\/\d+$/.test(pathname)) {
        const id = Number(pathname.split('/').pop());
        const body = await readJsonBody(req);
        repo.saveBbnt({ ...body, id });
        return sendJson(res, 200, { id, db: repo.getFullState() });
      }
      if (req.method === 'PATCH' && /^\/api\/acceptance-records\/\d+\/status$/.test(pathname)) {
        const id = Number(pathname.split('/')[3]);
        const body = await readJsonBody(req);
        repo.toggleBbntStatus(id, !!body.send, body.sentDate);
        return sendJson(res, 200, { id, db: repo.getFullState() });
      }

      // DELETE /api/trash/:coll/:id (Soft delete) & POST /api/trash/:coll/:id/restore
      const delMatch = pathname.match(/^\/api\/trash\/([a-z]+)\/(\d+)$/);
      if (req.method === 'DELETE' && delMatch) {
        const label = repo.softDelete(delMatch[1], Number(delMatch[2]));
        return sendJson(res, 200, { label, db: repo.getFullState() });
      }
      const restoreMatch = pathname.match(/^\/api\/trash\/([a-z]+)\/(\d+)\/restore$/);
      if (req.method === 'POST' && restoreMatch) {
        const label = repo.restore(restoreMatch[1], Number(restoreMatch[2]));
        return sendJson(res, 200, { label, db: repo.getFullState() });
      }

      // POST /api/excel/import (Dry-run & Upsert)
      if (req.method === 'POST' && pathname === '/api/excel/import') {
        const body = await readJsonBody(req);
        const result = repo.importData(body);
        return sendJson(res, 200, { ...result, db: repo.getFullState() });
      }

      // GET /api/excel/export/:type
      const exportMatch = pathname.match(/^\/api\/excel\/export\/([a-z]+)$/);
      if (req.method === 'GET' && exportMatch) {
        const type = exportMatch[1];
        const projId = parsedUrl.searchParams.get('projectId');
        const csv = repo.exportCsv(type, projId);
        res.writeHead(200, {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="OutsourcePM_${type}_2026-11-02.csv"`,
          'Access-Control-Allow-Origin': '*'
        });
        return res.end(csv);
      }

      return sendJson(res, 404, { error: 'NOT_FOUND', message: `Không tìm thấy API ${pathname}` });
    } catch (err) {
      const status = err instanceof BusinessError ? err.status : 500;
      return sendJson(res, status, {
        error: err.code || 'INTERNAL_ERROR',
        message: err.message || 'Lỗi xử lý trên server'
      });
    }
  }

  // ==================== SERVE FRONTEND STATIC FILES ====================
  const rootDir = path.resolve(__dirname, '..');
  let relPath = decodeURIComponent(pathname === '/' ? '/index.html' : pathname);
  let filePath = path.join(rootDir, relPath);

  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    // Fallback to Main.dc.html if index.html does not exist yet
    filePath = path.join(rootDir, 'Main.dc.html');
  }

  try {
    const ext = path.extname(filePath).toLowerCase();
    const content = fs.readFileSync(filePath);
    const headers = { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' };
    if (parsedUrl.searchParams.get('download') === '1') {
      const baseName = path.basename(filePath).replace(/^\d+_/, '');
      headers['Content-Disposition'] = `attachment; filename*=UTF-8''${encodeURIComponent(baseName)}`;
    }
    res.writeHead(200, headers);
    res.end(content);
  } catch (e) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('404 Not Found');
  }
});

server.listen(PORT, () => {
  console.log(`🚀 Outsource PM Server (SQLite) đang chạy tại: http://localhost:${PORT}`);
  console.log(`📂 CSDL SQLite lưu tại: ${DB_PATH}`);
});
