const JSZip = require('jszip');

const escRe = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const pad2 = (n) => String(n).padStart(2, '0');
const xmlDecode = (s) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');
const xmlEncode = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// Build replacer for PYC code, tolerant to separators: "PYC-3595" matches "PYC 3595", "PYC_3595", "PYC3595"
function buildCodeReplacer(oldCode, newCode) {
  const oldTok = String(oldCode).match(/[A-Za-z]+|\d+/g) || [];
  const newTok = String(newCode).match(/[A-Za-z]+|\d+/g) || [];
  let re;
  if (oldTok.length && oldTok.length === newTok.length) {
    const body = oldTok.map((t, i) => (/^\d+$/.test(t) ? (i === 0 ? '(?<!\\d)' : '') + t + '(?!\\d)' : escRe(t))).join('[\\s_\\-]*');
    re = new RegExp(body, 'gi');
    return {
      re,
      apply(str, onHit) {
        return str.replace(re, (m) => {
          onHit();
          const sepMatch = m.match(/[\s_\-]+/);
          return newTok.join(sepMatch ? sepMatch[0] : '');
        });
      }
    };
  }
  re = new RegExp(escRe(oldCode), 'gi');
  return { re, apply: (str, onHit) => str.replace(re, () => { onHit(); return newCode; }) };
}

// Replace month/year in common Vietnamese date notations
function buildDateReplacer(month, year) {
  const dim = new Date(year, month, 0).getDate();
  const mStr = (orig) => (String(orig).startsWith('0') ? pad2(month) : String(month));
  const re = /(th[áa]ng\s+)(\d{1,2})(\s+n[ăaâ]m\s+)(\d{4})|(?<![\d\/])(\d{1,2})\/(\d{1,2})\/(\d{4})(?![\d])|(th[áa]ng\s*)(\d{1,2})(\s*\/\s*)(\d{4})|(\bT)(\d{1,2})(\/)(\d{4})|(?<![\d\/])(\d{1,2})\/(\d{4})(?![\d\/])/gi;
  return {
    re,
    apply(str, onHit) {
      return str.replace(re, (...a) => {
        if (a[1] !== undefined) { onHit(); return a[1] + mStr(a[2]) + a[3] + year; }
        if (a[5] !== undefined) {
          if (Number(a[6]) < 1 || Number(a[6]) > 12) return a[0];
          onHit();
          const d = Math.min(Number(a[5]), dim);
          return (a[5].startsWith('0') ? pad2(d) : String(d)) + '/' + mStr(a[6]).padStart(a[6].length === 2 ? 2 : 1, '0') + '/' + year;
        }
        if (a[8] !== undefined) { onHit(); return a[8] + mStr(a[9]) + a[10] + year; }
        if (a[12] !== undefined) { onHit(); return a[12] + mStr(a[13]) + a[14] + year; }
        if (a[16] !== undefined) {
          if (Number(a[16]) < 1 || Number(a[16]) > 12) return a[0];
          onHit();
          return mStr(a[16]) + '/' + year;
        }
        return a[0];
      });
    }
  };
}

function makeTransformer(oldCode, newCode, monthStr) {
  const [y, m] = String(monthStr).split('-').map(Number);
  const codeR = buildCodeReplacer(oldCode, newCode);
  const dateR = buildDateReplacer(m, y);
  const stats = { code: 0, date: 0 };
  const text = (s) => {
    let out = codeR.apply(s, () => { stats.code++; });
    out = dateR.apply(out, () => { stats.date++; });
    return out;
  };
  const nameOnly = (s) => codeR.apply(s, () => {});
  return { text, nameOnly, stats };
}

// Merge text runs of each unit (paragraph / shared string), transform, write back into first run
function processUnits(xml, unitRe, tRe, transform) {
  return xml.replace(unitRe, (unit) => {
    const parts = [];
    unit.replace(tRe, (_, o, t) => { parts.push(xmlDecode(t)); return _; });
    if (!parts.length) return unit;
    const full = parts.join('');
    const next = transform(full);
    if (next === full) return unit;
    let i = 0;
    return unit.replace(tRe, (_, open) => {
      const idx = i++;
      if (idx === 0) {
        const o = /xml:space=/.test(open) ? open : open.replace(/^<([\w:]+)/, '<$1 xml:space="preserve"');
        return o + xmlEncode(next) + '</' + open.slice(1).split(/[\s>]/)[0] + '>';
      }
      return open + '</' + open.slice(1).split(/[\s>]/)[0] + '>';
    });
  });
}

async function cloneOoxml(buf, kind, tf) {
  const zip = await JSZip.loadAsync(buf);
  const names = Object.keys(zip.files);
  for (const name of names) {
    const f = zip.files[name];
    if (f.dir) continue;
    let rules = null;
    if (kind === 'docx' && /^word\/(document|header\d*|footer\d*|footnotes|endnotes)\.xml$/.test(name)) {
      rules = [/<w:p(?:\s[^>]*)?>[\s\S]*?<\/w:p>/g, /(<w:t(?:\s[^>]*)?>)([^<]*)(<\/w:t>)/g];
    } else if (kind === 'xlsx' && name === 'xl/sharedStrings.xml') {
      rules = [/<si>[\s\S]*?<\/si>/g, /(<t(?:\s[^>]*)?>)([^<]*)(<\/t>)/g];
    } else if (kind === 'xlsx' && /^xl\/worksheets\/sheet\d+\.xml$/.test(name)) {
      rules = [/<is>[\s\S]*?<\/is>/g, /(<t(?:\s[^>]*)?>)([^<]*)(<\/t>)/g];
    } else if (kind === 'xlsx' && /^xl\/drawings\/drawing\d+\.xml$/.test(name)) {
      rules = [/<a:p>[\s\S]*?<\/a:p>/g, /(<a:t(?:\s[^>]*)?>)([^<]*)(<\/a:t>)/g];
    }
    if (!rules) continue;
    const xml = await f.async('string');
    const out = processUnits(xml, rules[0], rules[1], tf.text);
    if (out !== xml) zip.file(name, out);
  }
  return zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
}

// Legacy .doc: in-place replacement, only when new text has the same length
function cloneLegacyDoc(buf, oldCode, newCode, monthStr) {
  const [y, m] = String(monthStr).split('-').map(Number);
  const out = Buffer.from(buf);
  const stats = { code: 0, date: 0, skipped: 0 };
  const rules = [
    { r: buildCodeReplacer(oldCode, newCode), key: 'code' },
    { r: buildDateReplacer(m, y), key: 'date' }
  ];
  const run = (str, bytesPer) => {
    for (const { r, key } of rules) {
      const scan = new RegExp(r.re.source, r.re.flags);
      let mt;
      while ((mt = scan.exec(str)) !== null) {
        if (mt[0] === '') { scan.lastIndex++; continue; }
        const rep = r.apply(mt[0], () => {});
        if (rep === mt[0]) continue;
        if (rep.length !== mt[0].length) { stats.skipped++; continue; }
        stats[key]++;
        for (let i = 0; i < rep.length; i++) {
          const c = rep.charCodeAt(i);
          if (bytesPer === 1) { if (c < 256) out[mt.index + i] = c; }
          else out.writeUInt16LE(c, (mt.index + i) * 2);
        }
      }
    }
  };
  run(buf.toString('latin1'), 1);
  const even = buf.subarray(0, buf.length - (buf.length % 2));
  run(even.toString('utf16le'), 2);
  return { buffer: out, stats };
}
async function cloneFile(buf, ext, oldCode, newCode, monthStr) {
  const e = ext.toLowerCase();
  if (e === '.docx' || e === '.xlsx') {
    const tf = makeTransformer(oldCode, newCode, monthStr);
    const buffer = await cloneOoxml(buf, e === '.docx' ? 'docx' : 'xlsx', tf);
    return { buffer, code: tf.stats.code, date: tf.stats.date, warnings: [] };
  }
  if (e === '.doc') {
    const r = cloneLegacyDoc(buf, oldCode, newCode, monthStr);
    const warnings = [];
    if (r.stats.skipped) warnings.push(`${r.stats.skipped} chỗ trong file .doc không sửa được (khác độ dài) - hãy mở Word "Lưu thành .docx" rồi clone lại để thay đủ`);
    return { buffer: r.buffer, code: r.stats.code, date: r.stats.date, warnings };
  }
  return { buffer: buf, code: 0, date: 0, warnings: ['Định dạng này không hỗ trợ sửa nội dung, chỉ đổi tên file'] };
}

module.exports = { cloneFile, makeTransformer };
