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
