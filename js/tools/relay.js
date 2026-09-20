// 檔案中轉站 — 手機上載，電腦下載（經你自己嘅 Cloudflare Worker）
// Worker 網址同通行碼只存喺你部機嘅 localStorage，唔會傳去其他地方。

const CFG = 'relay-config';
const cfg = () => {
  try { return JSON.parse(localStorage.getItem(CFG) || '{}'); } catch { return {}; }
};
const saveCfg = c => { try { localStorage.setItem(CFG, JSON.stringify(c)); } catch { /* 私隱模式 */ } };

const fmtSize = n =>
  n < 1024 ? `${n} B`
  : n < 1048576 ? `${(n / 1024).toFixed(1)} KB`
  : `${(n / 1048576).toFixed(1)} MB`;

const fmtLeft = exp => {
  if (!exp) return '—';
  const ms = exp - Date.now();
  if (ms <= 0) return '已過期';
  const h = Math.floor(ms / 3600000);
  return h >= 24 ? `${Math.floor(h / 24)} 日` : (h >= 1 ? `${h} 小時` : `${Math.ceil(ms / 60000)} 分鐘`);
};

const esc = s => String(s ?? '').replace(/[&<>"']/g, c =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function init() {
  const $ = id => document.getElementById(id);
  const urlIn = $('rl-url'), passIn = $('rl-pass'), status = $('rl-status');
  const drop = $('rl-drop'), fileIn = $('rl-file'), listBox = $('rl-list'), panel = $('rl-panel');

  const c = cfg();
  urlIn.value = c.url || '';
  passIn.value = c.pass || '';

  const setStatus = (msg, kind = '') => {
    status.className = 'status-line' + (kind ? ' ' + kind : '');
    status.textContent = msg;
  };

  const base = () => (urlIn.value || '').trim().replace(/\/+$/, '');
  const auth = () => (passIn.value || '').trim();

  function ready() {
    if (!base() || !auth()) { setStatus('請先填 Worker 網址同通行碼，再撳「儲存並測試連線」。', 'error'); return false; }
    return true;
  }

  async function api(path, opts = {}) {
    const res = await fetch(base() + path, {
      ...opts,
      headers: { 'X-Auth': auth(), ...(opts.headers || {}) },
    });
    const ct = res.headers.get('Content-Type') || '';
    if (ct.includes('application/json')) {
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      return data;
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res;
  }

  // 由 /api/ping 得知嘅伺服器設定，用嚟喺狀態列顯示上限
  let limits = null;

  async function refresh() {
    if (!ready()) return;
    try {
      const data = await api('/api/list');
      render(data.files || [], data.expireDays);
      panel.hidden = false;
    } catch (e) { setStatus('✗ ' + e.message, 'error'); }
  }

  const limitNote = expireDays => {
    const bits = [];
    if (limits?.maxMB) bits.push(`單檔上限 ${limits.maxMB} MB`);
    const d = expireDays || limits?.expireDays;
    if (d) bits.push(`${d} 日後自動刪除`);
    return bits.length ? `（${bits.join('，')}）` : '';
  };

  function render(files, expireDays) {
    if (!files.length) {
      listBox.innerHTML = '<p class="tool-desc" style="margin:0">（暫時未有檔案）</p>';
      setStatus(`✓ 連線正常，暫時未有檔案${limitNote(expireDays)}`, 'success');
      return;
    }
    let html = '<table class="data-table"><thead><tr><th>檔名</th><th>大小</th><th>剩餘時間</th><th>操作</th></tr></thead><tbody>';
    for (const f of files) {
      html += `<tr>
        <td>${esc(f.name || f.id)}<br><span class="ft-conf">代碼 ${esc(f.id)}</span></td>
        <td>${fmtSize(f.size || 0)}</td>
        <td>${fmtLeft(f.exp)}</td>
        <td><button class="btn rl-get" data-id="${esc(f.id)}" data-name="${esc(f.name || 'file')}">下載</button>
            <button class="btn rl-del" data-id="${esc(f.id)}">刪除</button></td></tr>`;
    }
    listBox.innerHTML = html + '</tbody></table>';
    setStatus(`✓ 共 ${files.length} 個檔案${limitNote(expireDays)}`, 'success');
  }

  async function upload(files) {
    if (!ready() || !files?.length) return;
    for (const file of [...files]) {
      setStatus(`上載中… ${file.name}（${fmtSize(file.size)}）`);
      try {
        await api('/api/upload', {
          method: 'POST',
          headers: {
            'X-Filename': encodeURIComponent(file.name),
            'Content-Type': file.type || 'application/octet-stream',
          },
          body: file,
        });
      } catch (e) { setStatus(`✗ ${file.name}：${e.message}`, 'error'); return; }
    }
    setStatus('✓ 上載完成', 'success');
    // KV 全球同步最多要一分鐘，列表可能唔即刻見到新檔案
    setTimeout(refresh, 600);
  }

  $('rl-save').addEventListener('click', async () => {
    saveCfg({ url: base(), pass: auth() });
    if (!ready()) return;
    setStatus('測試連線中…');
    try {
      const r = await api('/api/ping');
      limits = { maxMB: r.maxMB, expireDays: r.expireDays };
      setStatus(`✓ 連線成功${limitNote(r.expireDays)}`, 'success');
      panel.hidden = false;
      refresh();
    } catch (e) {
      setStatus('✗ 連線失敗：' + e.message, 'error');
    }
  });

  $('rl-refresh').addEventListener('click', refresh);

  fileIn.addEventListener('change', () => { upload(fileIn.files); fileIn.value = ''; });
  drop.addEventListener('click', () => fileIn.click());
  drop.addEventListener('dragover', e => { e.preventDefault(); drop.classList.add('drag-over'); });
  drop.addEventListener('dragleave', () => drop.classList.remove('drag-over'));
  drop.addEventListener('drop', e => {
    e.preventDefault(); drop.classList.remove('drag-over'); upload(e.dataTransfer.files);
  });

  listBox.addEventListener('click', async e => {
    const get = e.target.closest('.rl-get');
    const del = e.target.closest('.rl-del');
    if (get) {
      setStatus('下載中…');
      try {
        const res = await api('/api/file/' + get.dataset.id);
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = get.dataset.name;
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        setStatus('✓ 已下載 ' + get.dataset.name, 'success');
      } catch (err) { setStatus('✗ ' + err.message, 'error'); }
    }
    if (del) {
      if (!confirm('確定要刪除呢個檔案？')) return;
      try { await api('/api/file/' + del.dataset.id, { method: 'DELETE' }); refresh(); }
      catch (err) { setStatus('✗ ' + err.message, 'error'); }
    }
  });

  // 重開個頁面時，順便攞返伺服器設定（上限／保留日數）先至列清單
  if (c.url && c.pass) {
    api('/api/ping')
      .then(r => { limits = { maxMB: r.maxMB, expireDays: r.expireDays }; })
      .catch(() => { /* 連唔到就由 refresh 報錯 */ })
      .finally(refresh);
  }
}
