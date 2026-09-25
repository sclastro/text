// 檔案中轉站 — 手機上載，電腦下載（經使用者自己的 Cloudflare Worker）
// Worker 網址及通行碼只存於本機的 localStorage，不會傳送到其他地方。

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
    if (!base() || !auth()) { setStatus('請先填寫 Worker 網址及通行碼，再按「儲存並測試連線」。', 'error'); return false; }
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

  // 由 /api/ping 取得的伺服器設定，用於在狀態列顯示上限
  let limits = null;

  // Workers KV 屬最終一致：上載或刪除後，list() 最多約 60 秒才會反映。
  // 在本機記錄剛完成的改動，期間以此修正伺服器傳回的舊清單。
  const PENDING_MS = 2 * 60 * 1000;
  const added = new Map();    // id → 檔案資料（等待出現於清單）
  const removed = new Map();  // id → 紀錄到期時間（等待從清單消失）
  let listed = [], listedDays;  // 最近一次從伺服器取得的清單

  function merge(files = listed) {
    const now = Date.now();
    const ids = new Set(files.map(f => f.id));
    for (const [id, f] of added)
      if (ids.has(id) || f.until < now) added.delete(id);
    for (const [id, until] of removed)
      if (!ids.has(id) || until < now) removed.delete(id);
    const out = files.filter(f => !removed.has(f.id)).concat([...added.values()]);
    return out.sort((a, b) => (b.at || 0) - (a.at || 0));
  }

  async function refresh() {
    if (!ready()) return;
    try {
      const data = await api('/api/list');
      listed = data.files || []; listedDays = data.expireDays;
      render(merge(), listedDays);
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
      listBox.innerHTML = '<p class="tool-desc" style="margin:0">（暫無檔案）</p>';
      setStatus(`✓ 連線正常，暫無檔案${limitNote(expireDays)}`, 'success');
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
    let failed = '';
    for (const file of [...files]) {
      setStatus(`上載中… ${file.name}（${fmtSize(file.size)}）`);
      try {
        const { ok, ...meta } = await api('/api/upload', {
          method: 'POST',
          headers: {
            'X-Filename': encodeURIComponent(file.name),
            'Content-Type': file.type || 'application/octet-stream',
          },
          body: file,
        });
        added.set(meta.id, { ...meta, until: Date.now() + PENDING_MS });
      } catch (e) { failed = `✗ ${file.name}：${e.message}`; break; }
    }
    // 不等待 KV 同步，立即將新檔案加入清單
    panel.hidden = false;
    render(merge(), listedDays);
    if (failed) setStatus(failed, 'error');
    else setStatus(`✓ 上載完成。其他裝置約一分鐘內會在清單顯示${limitNote(listedDays)}`, 'success');
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
      if (!confirm('確定刪除此檔案？')) return;
      const id = del.dataset.id;
      try {
        await api('/api/file/' + id, { method: 'DELETE' });
        // 不等待 KV 同步，立即從清單移除
        added.delete(id);
        removed.set(id, Date.now() + PENDING_MS);
        render(merge(), listedDays);
      }
      catch (err) { setStatus('✗ ' + err.message, 'error'); }
    }
  });

  // 重新開啟頁面時，先取得伺服器設定（上限／保存日數），再列出清單
  if (c.url && c.pass) {
    api('/api/ping')
      .then(r => { limits = { maxMB: r.maxMB, expireDays: r.expireDays }; })
      .catch(() => { /* 無法連線時由 refresh 報錯 */ })
      .finally(refresh);
  }
}
