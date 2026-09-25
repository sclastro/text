// 檔案格式偵測 — 讀取檔頭 magic number 辨認真實格式，不依賴副檔名
// 純 JS、零依賴、完全離線運作。

const dec = (bytes, start, len) =>
  String.fromCharCode(...bytes.slice(start, start + len));

const hex = (bytes, start, len) =>
  [...bytes.slice(start, start + len)].map(b => b.toString(16).padStart(2, '0')).join('');

// 每條規則：[名稱, 建議副檔名, MIME, 判斷函式, 備註]
const SIGNATURES = [
  ['PDF 文件', 'pdf', 'application/pdf', b => dec(b, 0, 5) === '%PDF-'],
  ['MOBI 電子書', 'mobi', 'application/x-mobipocket-ebook',
    b => dec(b, 60, 8) === 'BOOKMOBI', '可用「電子書轉 PDF」工具處理'],
  ['PalmDOC 電子書', 'pdb', 'application/vnd.palm',
    b => dec(b, 60, 8) === 'TEXtREAd'],
  ['PNG 圖片', 'png', 'image/png', b => hex(b, 0, 8) === '89504e470d0a1a0a'],
  ['JPEG 圖片', 'jpg', 'image/jpeg', b => hex(b, 0, 3) === 'ffd8ff'],
  ['GIF 圖片', 'gif', 'image/gif', b => dec(b, 0, 6) === 'GIF87a' || dec(b, 0, 6) === 'GIF89a'],
  ['WebP 圖片', 'webp', 'image/webp', b => dec(b, 0, 4) === 'RIFF' && dec(b, 8, 4) === 'WEBP'],
  ['BMP 圖片', 'bmp', 'image/bmp', b => dec(b, 0, 2) === 'BM'],
  ['TIFF 圖片', 'tiff', 'image/tiff', b => ['49492a00', '4d4d002a'].includes(hex(b, 0, 4))],
  ['ICO 圖示', 'ico', 'image/x-icon', b => hex(b, 0, 4) === '00000100'],
  ['PSD (Photoshop)', 'psd', 'image/vnd.adobe.photoshop', b => dec(b, 0, 4) === '8BPS'],
  ['RAR 壓縮檔', 'rar', 'application/vnd.rar', b => dec(b, 0, 6) === 'Rar!\x1a\x07'],
  ['7-Zip 壓縮檔', '7z', 'application/x-7z-compressed', b => hex(b, 0, 6) === '377abcaf271c'],
  ['GZIP 壓縮檔', 'gz', 'application/gzip', b => hex(b, 0, 2) === '1f8b'],
  ['XZ 壓縮檔', 'xz', 'application/x-xz', b => hex(b, 0, 6) === 'fd377a585a00'],
  ['ZSTD 壓縮檔', 'zst', 'application/zstd', b => hex(b, 0, 4) === '28b52ffd'],
  ['BZIP2 壓縮檔', 'bz2', 'application/x-bzip2', b => dec(b, 0, 3) === 'BZh'],
  ['MP3 音訊', 'mp3', 'audio/mpeg', b => dec(b, 0, 3) === 'ID3' || hex(b, 0, 2) === 'fffb'],
  ['FLAC 音訊', 'flac', 'audio/flac', b => dec(b, 0, 4) === 'fLaC'],
  ['WAV 音訊', 'wav', 'audio/wav', b => dec(b, 0, 4) === 'RIFF' && dec(b, 8, 4) === 'WAVE'],
  ['OGG 音訊', 'ogg', 'audio/ogg', b => dec(b, 0, 4) === 'OggS'],
  ['MP4／M4A 影音', 'mp4', 'video/mp4', b => dec(b, 4, 4) === 'ftyp'],
  ['Matroska／WebM 影片', 'mkv', 'video/x-matroska', b => hex(b, 0, 4) === '1a45dfa3'],
  ['AVI 影片', 'avi', 'video/x-msvideo', b => dec(b, 0, 4) === 'RIFF' && dec(b, 8, 4) === 'AVI '],
  ['SQLite 資料庫', 'sqlite', 'application/vnd.sqlite3', b => dec(b, 0, 15) === 'SQLite format 3'],
  ['RTF 文件', 'rtf', 'application/rtf', b => dec(b, 0, 5) === '{\\rtf'],
  ['舊版 Office 文件 (97-2003)', 'doc', 'application/msword',
    b => hex(b, 0, 8) === 'd0cf11e0a1b11ae1', '.doc / .xls / .ppt 舊格式，無法單靠檔頭再細分'],
  ['Windows 執行檔', 'exe', 'application/vnd.microsoft.portable-executable', b => dec(b, 0, 2) === 'MZ'],
  ['Linux 執行檔 (ELF)', 'elf', 'application/x-elf', b => hex(b, 0, 4) === '7f454c46'],
  ['Java class', 'class', 'application/java-vm', b => hex(b, 0, 4) === 'cafebabe'],
  ['WOFF 字型', 'woff', 'font/woff', b => dec(b, 0, 4) === 'wOFF'],
  ['WOFF2 字型', 'woff2', 'font/woff2', b => dec(b, 0, 4) === 'wOF2'],
  ['TrueType 字型', 'ttf', 'font/ttf', b => hex(b, 0, 4) === '00010000'],
  ['OpenType 字型', 'otf', 'font/otf', b => dec(b, 0, 4) === 'OTTO'],
];

// ZIP 容器：EPUB / DOCX / XLSX / PPTX / ODF / CBZ / JAR 都是 ZIP，須檢視內容才能區分
function inspectZip(bytes, text) {
  if (text.includes('mimetypeapplication/epub+zip'))
    return ['EPUB 電子書', 'epub', 'application/epub+zip', '可用「電子書轉 PDF」工具處理'];
  if (text.includes('word/'))
    return ['Word 文件 (DOCX)', 'docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', ''];
  if (text.includes('xl/'))
    return ['Excel 試算表 (XLSX)', 'xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', ''];
  if (text.includes('ppt/'))
    return ['PowerPoint 簡報 (PPTX)', 'pptx', 'application/vnd.openxmlformats-officedocument.presentationml.presentation', ''];
  if (text.includes('mimetypeapplication/vnd.oasis.opendocument.text'))
    return ['OpenDocument 文件', 'odt', 'application/vnd.oasis.opendocument.text', ''];
  if (text.includes('mimetypeapplication/vnd.oasis.opendocument.spreadsheet'))
    return ['OpenDocument 試算表', 'ods', 'application/vnd.oasis.opendocument.spreadsheet', ''];
  if (/\.(jpg|jpeg|png|webp)/i.test(text) && !text.includes('META-INF/'))
    return ['漫畫壓縮檔 (CBZ) 或圖片壓縮檔', 'cbz', 'application/vnd.comicbook+zip', '內含圖片的 ZIP'];
  if (text.includes('META-INF/MANIFEST.MF'))
    return ['Java 封存檔 (JAR)', 'jar', 'application/java-archive', ''];
  return ['ZIP 壓縮檔', 'zip', 'application/zip', ''];
}

// 若非二進位檔，則嘗試辨認文字格式
function inspectText(bytes) {
  // 含 NUL 或大量不可列印字元 → 視為二進位
  const sample = bytes.slice(0, 512);
  let ctrl = 0;
  for (const b of sample) {
    if (b === 0) return null;
    if (b < 9 || (b > 13 && b < 32)) ctrl++;
  }
  if (ctrl / (sample.length || 1) > 0.1) return null;

  let bom = '';
  if (hex(bytes, 0, 3) === 'efbbbf') bom = 'UTF-8 BOM';
  else if (hex(bytes, 0, 2) === 'fffe') return ['文字檔（UTF-16 LE）', 'txt', 'text/plain', 'UTF-16 LE BOM'];
  else if (hex(bytes, 0, 2) === 'feff') return ['文字檔（UTF-16 BE）', 'txt', 'text/plain', 'UTF-16 BE BOM'];

  let text;
  try { text = new TextDecoder('utf-8', { fatal: true }).decode(bytes.slice(0, 2048)); }
  catch { return ['文字檔（非 UTF-8 編碼）', 'txt', 'text/plain', '可能是 Big5／GB 編碼，可用「亂碼修復」工具處理']; }

  const t = text.replace(/^﻿/, '').trimStart();
  const note = bom || 'UTF-8';
  if (/^<\?xml/i.test(t)) {
    if (/<svg[\s>]/i.test(t)) return ['SVG 向量圖', 'svg', 'image/svg+xml', note];
    if (/<fictionbook/i.test(t)) return ['FB2 電子書', 'fb2', 'application/x-fictionbook+xml', '可用「電子書轉 PDF」工具處理'];
    return ['XML 文件', 'xml', 'application/xml', note];
  }
  if (/^<(!doctype html|html)[\s>]/i.test(t)) return ['HTML 網頁', 'html', 'text/html', note];
  if (/^[{[]/.test(t)) { try { JSON.parse(text); return ['JSON 資料', 'json', 'application/json', note]; } catch { /* 內容可能不完整 */ } }
  if (/^%!PS/.test(t)) return ['PostScript', 'ps', 'application/postscript', note];
  if (/^#!\s*\//.test(t)) return ['腳本檔（有 shebang）', 'sh', 'text/x-shellscript', t.split('\n')[0].slice(0, 40)];
  if (/^(﻿)?1\s*\r?\n\d{2}:\d{2}:\d{2}/.test(text)) return ['SRT 字幕', 'srt', 'text/plain', note];
  return ['純文字', 'txt', 'text/plain', note];
}

function identify(bytes) {
  for (const [name, ext, mime, test, note] of SIGNATURES) {
    let ok = false;
    try { ok = test(bytes); } catch { ok = false; }
    if (ok) return { name, ext, mime, note: note || '', confidence: '高（檔頭簽章）' };
  }
  if (dec(bytes, 0, 2) === 'PK' && [3, 5, 7].includes(bytes[2])) {
    const text = dec(bytes, 0, Math.min(bytes.length, 4096));
    const [name, ext, mime, note] = inspectZip(bytes, text);
    return { name, ext, mime, note, confidence: ext === 'zip' ? '中（ZIP 容器，內容未明）' : '高（ZIP 內容特徵）' };
  }
  const asText = inspectText(bytes);
  if (asText) {
    const [name, ext, mime, note] = asText;
    return { name, ext, mime, note, confidence: '中（文字內容判斷）' };
  }
  return { name: '未知二進位格式', ext: '', mime: 'application/octet-stream',
           note: '頭 16 bytes: ' + hex(bytes, 0, 16), confidence: '低' };
}

const fmtSize = n =>
  n < 1024 ? `${n} B`
  : n < 1024 ** 2 ? `${(n / 1024).toFixed(1)} KB`
  : n < 1024 ** 3 ? `${(n / 1024 ** 2).toFixed(1)} MB`
  : `${(n / 1024 ** 3).toFixed(2)} GB`;

async function analyse(file) {
  // 讀取前 8KB 已足夠（MOBI 須讀至 offset 60，ZIP 內容特徵通常在前數 KB）
  const buf = await file.slice(0, 8192).arrayBuffer();
  const bytes = new Uint8Array(buf);
  const res = identify(bytes);
  const declared = (file.name.match(/\.([^.]+)$/) || [, ''])[1].toLowerCase();
  const matches = !declared || !res.ext || declared === res.ext
    || (res.ext === 'jpg' && ['jpeg', 'jpe'].includes(declared))
    || (res.ext === 'tiff' && declared === 'tif')
    || (res.ext === 'mp4' && ['m4a', 'm4v', 'mov'].includes(declared))
    || (res.ext === 'sqlite' && ['db', 'sqlite3'].includes(declared))
    || (res.ext === 'html' && declared === 'htm');
  return { file, ...res, declared, matches };
}

export function init() {
  const out = document.getElementById('ft-output');
  const status = document.getElementById('ft-status');
  const input = document.getElementById('ft-input');
  const drop = document.getElementById('ft-drop');

  async function run(files) {
    const list = [...files];
    if (!list.length) return;
    status.className = 'status-line';
    status.textContent = `分析中…（${list.length} 個檔案）`;
    const rows = [];
    for (const f of list) {
      try { rows.push(await analyse(f)); }
      catch (e) { rows.push({ file: f, name: '讀取失敗：' + e.message, ext: '', mime: '', note: '', confidence: '—', declared: '', matches: true }); }
    }
    let html = '<thead><tr><th>檔名</th><th>大小</th><th>偵測到的格式</th><th>建議副檔名</th><th>MIME</th><th>備註</th></tr></thead><tbody>';
    for (const r of rows) {
      const warn = r.matches ? '' :
        `<br><span class="ft-warn">⚠ 副檔名 .${r.declared} 與實際格式不符</span>`;
      html += `<tr>
        <td>${escapeHtml(r.file.name)}${warn}</td>
        <td>${fmtSize(r.file.size)}</td>
        <td><strong>${escapeHtml(r.name)}</strong><br><span class="ft-conf">${escapeHtml(r.confidence)}</span></td>
        <td>${r.ext ? '.' + r.ext : '—'}</td>
        <td><code>${escapeHtml(r.mime)}</code></td>
        <td>${escapeHtml(r.note)}</td></tr>`;
    }
    out.innerHTML = html + '</tbody>';
    const bad = rows.filter(r => !r.matches).length;
    status.className = bad ? 'status-line error' : 'status-line success';
    status.textContent = bad
      ? `✓ 完成：${rows.length} 個檔案，其中 ${bad} 個副檔名與實際格式不符`
      : `✓ 完成：${rows.length} 個檔案，副檔名全部正確`;
  }

  input.addEventListener('change', () => { run(input.files); input.value = ''; });
  drop.addEventListener('click', () => input.click());
  drop.addEventListener('dragover', e => { e.preventDefault(); drop.classList.add('drag-over'); });
  drop.addEventListener('dragleave', () => drop.classList.remove('drag-over'));
  drop.addEventListener('drop', e => {
    e.preventDefault();
    drop.classList.remove('drag-over');
    run(e.dataTransfer.files);
  });
}

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
