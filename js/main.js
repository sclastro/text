// 中文工具箱 — navigation, theme, lazy tool init
const TOOLS = [
  { id: 'wordcount', name: '字數統計', cat: '文字處理' },
  { id: 'fullwidth', name: '全形／半形轉換', cat: '文字處理' },
  { id: 'punctuation', name: '標點格式化', cat: '文字處理' },
  { id: 'whitespace', name: '清除多餘空白', cat: '文字處理' },
  { id: 'romanize', name: '拼音／粵拼', cat: '語言' },
  { id: 'converter', name: '繁簡轉換', cat: '語言' },
  { id: 'markdown', name: 'Markdown 預覽', cat: '格式轉換' },
  { id: 'csv', name: 'CSV 表格', cat: '格式轉換' },
  { id: 'json', name: 'JSON 格式化', cat: '格式轉換' },
  { id: 'chinesenum', name: '中文數字', cat: '格式轉換' },
  { id: 'qrcode', name: 'QR Code 生成', cat: '實用工具' },
  { id: 'timezone', name: '時區轉換', cat: '實用工具' },
  { id: 'units', name: '單位換算', cat: '實用工具' },
  { id: 'unshorten', name: '短網址還原', cat: '實用工具' },
  { id: 'lunar', name: '農曆／公曆', cat: '中文特色' },
  { id: 'cangjie', name: '倉頡／速成', cat: '中文特色' },
  { id: 'base64', name: 'Base64 編碼', cat: '額外工具' },
  { id: 'urlencode', name: 'URL 編碼', cat: '額外工具' },
  { id: 'mojibake', name: '亂碼修復', cat: '額外工具' },
  { id: 'unicode', name: 'Unicode 查詢', cat: '額外工具' },
  { id: 'charfreq', name: '字頻分析', cat: '額外工具' },
];

const initialized = new Set();
function initTool(id) {
  if (initialized.has(id)) return;
  initialized.add(id);
  import(`./tools/${id}.js`)
    .then(m => m.init && m.init())
    .catch(err => console.error(`載入工具 ${id} 失敗：`, err));
}

function showTool(id) {
  document.querySelectorAll('.tool-panel').forEach(p => { p.hidden = true; });
  const panel = document.getElementById(`panel-${id}`);
  if (!panel) { document.getElementById('panel-home').hidden = false; return; }
  panel.hidden = false;
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.querySelector(`.nav-item[data-tool="${id}"]`)?.classList.add('active');
  initTool(id);
  history.replaceState(null, '', `#${id}`);
  document.getElementById('content').scrollTop = 0;
  document.getElementById('app').classList.remove('sidebar-open');
}

// Theme
function applyTheme(theme) {
  document.body.className = `theme-${theme}`;
  document.getElementById('theme-toggle').textContent = theme === 'dark' ? '☀️' : '🌙';
}
applyTheme(localStorage.getItem('theme') || 'light');
document.getElementById('theme-toggle').addEventListener('click', () => {
  const next = document.body.classList.contains('theme-dark') ? 'light' : 'dark';
  localStorage.setItem('theme', next);
  applyTheme(next);
});

// Nav clicks
document.querySelectorAll('.nav-item').forEach(item => {
  item.addEventListener('click', () => showTool(item.dataset.tool));
});

// Mobile sidebar
document.getElementById('hamburger').addEventListener('click', () =>
  document.getElementById('app').classList.add('sidebar-open'));
document.getElementById('sidebar-close').addEventListener('click', () =>
  document.getElementById('app').classList.remove('sidebar-open'));
document.getElementById('backdrop').addEventListener('click', () =>
  document.getElementById('app').classList.remove('sidebar-open'));

// Tool search filter
document.getElementById('tool-search').addEventListener('input', e => {
  const q = e.target.value.trim().toLowerCase();
  document.querySelectorAll('.nav-item').forEach(item => {
    item.hidden = q && !item.textContent.toLowerCase().includes(q);
  });
});

// Copy buttons (event delegation)
document.addEventListener('click', e => {
  const btn = e.target.closest('.copy-btn');
  if (!btn) return;
  const target = document.getElementById(btn.dataset.copy);
  if (!target) return;
  const text = target.value !== undefined ? target.value : target.textContent;
  navigator.clipboard.writeText(text).then(() => {
    const orig = btn.textContent;
    btn.textContent = '已複製 ✓';
    setTimeout(() => { btn.textContent = orig; }, 1200);
  });
});

/* ---------- 檔案下載 / 匯入 ---------- */

function saveFile(text, filename, mime = 'text/plain;charset=utf-8') {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function isJsonText(t) {
  const s = (t || '').trim();
  if (!s || !/^[{[]/.test(s)) return false;
  try { JSON.parse(s); return true; } catch { return false; }
}

// Serialize a rendered <table> (or a wrapper containing one) to CSV.
// BOM prefix so Excel on Windows/HK opens UTF-8 Chinese correctly.
function tableToCsv(el) {
  const table = el.tagName === 'TABLE' ? el : el.querySelector('table');
  if (!table) return '';
  const esc = s => (/[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s);
  const rows = [...table.rows].map(r =>
    [...r.cells].map(c => esc(c.textContent.trim())).join(',')
  );
  return '﻿' + rows.join('\r\n');
}

// Cangjie panel renders cards, not text — rebuild a readable code list.
function cangjieToText(el) {
  return [...el.querySelectorAll('.cj-card')].map(card => {
    const ch = card.querySelector('.cj-char')?.textContent || '';
    const code = card.querySelector('.cj-code')?.textContent || '';
    const quick = card.querySelector('.cj-quick')?.textContent || '';
    return code ? `${ch}\t${code}\t${quick}` : `${ch}\t(查無此字)`;
  }).join('\n');
}

function extractForDownload(el, kind) {
  switch (kind) {
    case 'table':   return { text: tableToCsv(el), mime: 'text/csv;charset=utf-8' };
    case 'cangjie': return { text: cangjieToText(el), mime: 'text/plain;charset=utf-8' };
    case 'html':    return { text: el.innerHTML, mime: 'text/html;charset=utf-8' };
    case 'value':   return { text: el.value ?? '', mime: 'text/plain;charset=utf-8' };
    case 'node':    return { text: el.innerText ?? el.textContent ?? '', mime: 'text/plain;charset=utf-8' };
    default:        return { text: el.value !== undefined ? el.value : (el.innerText ?? el.textContent ?? ''),
                             mime: 'text/plain;charset=utf-8' };
  }
}

// Download buttons (event delegation)
document.addEventListener('click', e => {
  const btn = e.target.closest('.dl-btn');
  if (!btn) return;
  const target = document.getElementById(btn.dataset.download);
  if (!target) return;

  const kind = btn.dataset.kind || 'text';
  let { text, mime } = extractForDownload(target, kind);

  if (!text.trim()) {
    const orig = btn.textContent;
    btn.textContent = '冇內容';
    setTimeout(() => { btn.textContent = orig; }, 1200);
    return;
  }

  let filename = btn.dataset.filename || 'output.txt';
  // When the output format varies (e.g. Base64 decode), name it .json if it really is JSON.
  if (btn.dataset.smart === '1' && isJsonText(text)) {
    filename = filename.replace(/\.[^.]+$/, '') + '.json';
    mime = 'application/json;charset=utf-8';
  }

  saveFile(text, filename, mime);
  const orig = btn.textContent;
  btn.textContent = '已下載 ✓';
  setTimeout(() => { btn.textContent = orig; }, 1200);
});

// One reusable hidden file input for all "載入檔案" buttons
const filePicker = document.createElement('input');
filePicker.type = 'file';
filePicker.accept = '.txt,.json,.csv,.tsv,.md,.xml,.html,.log,.srt,text/*,application/json';
filePicker.hidden = true;
document.body.appendChild(filePicker);
let pickerTarget = null;

function loadFileInto(file, textarea) {
  const reader = new FileReader();
  reader.onload = () => {
    textarea.value = reader.result;
    // let live tools (字數統計, Markdown 預覽) recompute
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
  };
  reader.readAsText(file, 'utf-8');
}

filePicker.addEventListener('change', () => {
  const file = filePicker.files[0];
  if (file && pickerTarget) loadFileInto(file, pickerTarget);
  filePicker.value = '';
});

// Inject a 載入檔案 button + drag & drop for every tool input
document.querySelectorAll('.tool-panel').forEach(panel => {
  const input = panel.querySelector('textarea.tool-input');
  if (!input) return;

  const btn = document.createElement('button');
  btn.className = 'btn load-btn';
  btn.textContent = '📂 載入檔案';
  btn.title = '由檔案讀入文字（亦可將檔案拖入輸入框）';
  btn.addEventListener('click', () => { pickerTarget = input; filePicker.click(); });

  const row = panel.querySelector('.control-row');
  if (row) row.appendChild(btn);
  else {
    const wrap = document.createElement('div');
    wrap.className = 'control-row';
    wrap.appendChild(btn);
    input.insertAdjacentElement('afterend', wrap);
  }
});

document.querySelectorAll('textarea.tool-input').forEach(ta => {
  ta.addEventListener('dragover', e => { e.preventDefault(); ta.classList.add('drag-over'); });
  ta.addEventListener('dragleave', () => ta.classList.remove('drag-over'));
  ta.addEventListener('drop', e => {
    e.preventDefault();
    ta.classList.remove('drag-over');
    const file = e.dataTransfer?.files?.[0];
    if (file) loadFileInto(file, ta);
  });
});

// Home tiles
const homeGrid = document.getElementById('home-grid');
TOOLS.forEach(t => {
  const tile = document.createElement('div');
  tile.className = 'home-tile';
  tile.innerHTML = `<div class="t-name">${t.name}</div><div class="t-cat">${t.cat}</div>`;
  tile.addEventListener('click', () => showTool(t.id));
  homeGrid.appendChild(tile);
});

// Hash routing on load
const hash = location.hash.slice(1);
if (hash && document.querySelector(`.nav-item[data-tool="${hash}"]`)) {
  showTool(hash);
}

// PWA: register service worker for offline app-shell caching
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(err => console.error('SW 註冊失敗：', err));
  });
}
