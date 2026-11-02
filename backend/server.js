const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { URL } = require('node:url');
const mammoth = require('mammoth');
const XLSX = require('xlsx');
const WordExtractor = require('word-extractor');
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
    const chunks = [];
    req.on('data', (chunk) => { chunks.push(chunk); });
    req.on('end', () => {
      if (!chunks.length) return resolve({});
      try {
        const raw = Buffer.concat(chunks).toString('utf8');
        resolve(JSON.parse(raw));
      } catch (err) {
        reject(new BusinessError('BAD_JSON', 'Dữ liệu JSON không hợp lệ.'));
      }
    });
    req.on('error', reject);
  });
}

function escapeHtml(str) {
  return String(str == null ? '' : str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

async function renderOfficePreviewHtml(filePath, rawUrlPath, embedMode) {
  const ext = path.extname(filePath).toLowerCase();
  const baseName = path.basename(filePath).replace(/^\d+_/, '');
  const downloadUrl = `${rawUrlPath}?download=1`;
  let typeBadge = ext.replace('.', '').toUpperCase();
  let contentHtml = '';
  let isSpreadsheet = false;

  if (ext === '.docx') {
    typeBadge = 'WORD (.DOCX)';
    const result = await mammoth.convertToHtml({ path: filePath });
    contentHtml = `<div class="doc-paper">${result.value || '<p style="color:#666">Tài liệu trống.</p>'}</div>`;
  } else if (ext === '.doc') {
    typeBadge = 'WORD 97-2003 (.DOC)';
    const extractor = new WordExtractor();
    const doc = await extractor.extract(filePath);
    const fullText = [doc.getHeaders(), doc.getBody(), doc.getFootnotes(), doc.getEndnotes()].filter(Boolean).join('\n');
    const lines = fullText.split(/\r?\n/);
    const htmlLines = lines.map((line) => {
      const trimmed = line.trim();
      if (!trimmed) return '<div style="height:10px"></div>';
      if (line.includes('\t')) {
        const cells = line.split('\t').map(c => `<td style="padding:6px 10px;border:1px solid #d0d7de;vertical-align:top">${escapeHtml(c.trim())}</td>`).join('');
        return `<table style="width:100%;border-collapse:collapse;margin:4px 0"><tr>${cells}</tr></table>`;
      }
      const isHeading = trimmed === trimmed.toUpperCase() && trimmed.length > 3 && trimmed.length < 100;
      if (isHeading) {
        return `<p style="font-weight:700;text-align:center;margin:8px 0;color:#10202A">${escapeHtml(trimmed)}</p>`;
      }
      return `<p style="margin:6px 0;line-height:1.6">${escapeHtml(line)}</p>`;
    }).join('');
    contentHtml = `<div class="doc-paper">${htmlLines}</div>`;
  } else if (ext === '.xlsx' || ext === '.xls' || ext === '.csv') {
    isSpreadsheet = true;
    typeBadge = `EXCEL (${ext.toUpperCase()})`;
    const wb = XLSX.readFile(filePath);
    const tabs = [];
    const panels = [];
    wb.SheetNames.forEach((name, idx) => {
      const ws = wb.Sheets[name];
      const tableHtml = XLSX.utils.sheet_to_html(ws, { id: `sheet-table-${idx}`, editable: false });
      const bodyMatch = tableHtml.match(/<table[\s\S]*<\/table>/i);
      const cleanTable = bodyMatch ? bodyMatch[0] : '<p>Sheet trống</p>';
      tabs.push(`<button class="sheet-tab ${idx === 0 ? 'active' : ''}" onclick="switchSheet(${idx})" id="tab-btn-${idx}">📊 ${escapeHtml(name)}</button>`);
      panels.push(`<div class="sheet-panel" id="sheet-panel-${idx}" style="display:${idx === 0 ? 'block' : 'none'}"><div class="table-wrap">${cleanTable}</div></div>`);
    });
    contentHtml = `
      <div class="sheet-bar">${tabs.join('')}</div>
      <div class="sheet-container">${panels.join('')}</div>
      <script>
        function switchSheet(idx) {
          document.querySelectorAll('.sheet-panel').forEach((el, i) => { el.style.display = i === idx ? 'block' : 'none'; });
          document.querySelectorAll('.sheet-tab').forEach((el, i) => { el.classList.toggle('active', i === idx); });
        }
      </script>
    `;
  } else if (ext === '.txt') {
    typeBadge = 'TEXT (.TXT)';
    const txt = fs.readFileSync(filePath, 'utf8');
    contentHtml = `<div class="doc-paper"><pre style="white-space:pre-wrap;font-family:inherit;line-height:1.6">${escapeHtml(txt)}</pre></div>`;
  } else {
    return null;
  }

  return `<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Xem trước: ${escapeHtml(baseName)}</title>
<style>
  * { box-sizing: border-box; }
  body { margin: 0; font-family: 'Be Vietnam Pro', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #E9ECEF; color: #10202A; }
  .preview-topbar {
    position: sticky; top: 0; z-index: 20;
    display: ${embedMode ? 'none' : 'flex'}; align-items: center; justify-content: space-between; gap: 12px;
    background: #10202A; color: #fff; padding: 12px 24px; box-shadow: 0 2px 10px rgba(0,0,0,.18);
  }
  .file-title { font-weight: 700; font-size: 15px; display: flex; align-items: center; gap: 10px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .badge { background: #0B5563; color: #E2F3E8; font-size: 11px; font-weight: 700; padding: 3px 8px; border-radius: 6px; letter-spacing: .04em; }
  .dl-btn {
    background: #0B5563; color: #fff; text-decoration: none; padding: 8px 14px; border-radius: 8px;
    font-size: 13px; font-weight: 600; border: 1px solid #197282; white-space: nowrap;
  }
  .dl-btn:hover { background: #094450; }
  .main-area { padding: ${isSpreadsheet ? '16px' : '28px 16px'}; }
  .doc-paper {
    max-width: 860px; margin: 0 auto; background: #fff; padding: 44px 56px;
    border-radius: 10px; box-shadow: 0 4px 20px rgba(16,32,42,.1);
    line-height: 1.65; font-size: 14.5px; color: #18242C; overflow-x: auto;
  }
  .doc-paper table { width: 100%; border-collapse: collapse; margin: 14px 0; font-size: 13.5px; }
  .doc-paper td, .doc-paper th { border: 1px solid #CBD2D9; padding: 8px 10px; vertical-align: top; }
  .doc-paper th { background: #F1F5F8; font-weight: 700; }
  .doc-paper img { max-width: 100%; height: auto; border-radius: 4px; margin: 8px 0; }
  .doc-paper p { margin: 8px 0; }
  .doc-paper h1, .doc-paper h2, .doc-paper h3 { color: #0B5563; margin-top: 18px; margin-bottom: 8px; }
  .sheet-bar {
    display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 12px;
    background: #fff; padding: 8px 12px; border-radius: 8px; border: 1px solid #CBD2D9;
  }
  .sheet-tab {
    border: 1px solid #CBD2D9; background: #F8F9FA; color: #33404A;
    padding: 6px 14px; border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer;
  }
  .sheet-tab.active { background: #0B5563; color: #fff; border-color: #0B5563; }
  .table-wrap {
    background: #fff; border-radius: 8px; border: 1px solid #CBD2D9;
    overflow: auto; max-height: ${embedMode ? 'calc(100vh - 85px)' : 'calc(100vh - 150px)'};
    box-shadow: 0 2px 10px rgba(16,32,42,.06);
  }
  .table-wrap table { width: 100%; border-collapse: collapse; font-size: 13px; }
  .table-wrap td, .table-wrap th { border: 1px solid #DDE2E6; padding: 6px 10px; white-space: pre-wrap; min-width: 60px; }
  .table-wrap tr:first-child td, .table-wrap tr:first-child th { background: #EEF5F6; font-weight: 700; color: #0B5563; position: sticky; top: 0; }
  .table-wrap tr:nth-child(even) { background: #FAFBFB; }
</style>
</head>
<body>
  <div class="preview-topbar">
    <div class="file-title">
      <span class="badge">${escapeHtml(typeBadge)}</span>
      <span>${escapeHtml(baseName)}</span>
    </div>
    <a class="dl-btn" href="${escapeHtml(downloadUrl)}">⬇ Tải file gốc về máy</a>
  </div>
  <div class="main-area">
    ${contentHtml}
  </div>
</body>
</html>`;
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
    const isDownload = parsedUrl.searchParams.get('download') === '1';
    const isRaw = parsedUrl.searchParams.get('raw') === '1';
    const isEmbed = parsedUrl.searchParams.get('embed') === '1';

    if (pathname.startsWith('/uploads/') && !isDownload && !isRaw && ['.docx', '.doc', '.xlsx', '.xls', '.csv', '.txt'].includes(ext)) {
      const previewHtml = await renderOfficePreviewHtml(filePath, pathname, isEmbed);
      if (previewHtml) {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        return res.end(previewHtml);
      }
    }

    const content = fs.readFileSync(filePath);
    const headers = { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' };
    if (isDownload) {
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
