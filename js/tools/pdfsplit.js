// PDF 分拆 — 將一個 PDF 按頁數範圍分成幾份，可逐份下載或打包 ZIP。
// 切割用 pdf-lib，縮圖預覽用 pdf.js；兩者都喺本機運行，檔案唔會上傳。
// 預覽載入失敗（例如離線而又未快取）都照樣可以分拆，只係冇縮圖。

const PDFLIB = 'https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js';
const PDFJS = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.min.mjs';
const PDFJS_WORKER = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.worker.min.mjs';

// 每份一隻顏色，縮圖上用同一隻色標示屬於邊份
const COLORS = ['#3b82f6', '#ef4444', '#16a34a', '#d97706', '#9333ea', '#0891b2', '#db2777', '#65a30d'];

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src;
    s.onload = resolve;
    s.onerror = () => reject(new Error('載入失敗：' + src));
    document.head.appendChild(s);
  });
}

let pdfLibReady = null;
const loadPdfLib = () => (pdfLibReady ??= loadScript(PDFLIB).then(() => window.PDFLib));

let pdfjsReady = null;
const loadPdfjs = () => (pdfjsReady ??= import(PDFJS).then(m => {
  m.GlobalWorkerOptions.workerSrc = PDFJS_WORKER;
  return m;
}));

/* ---------- 簡單 ZIP（唔壓縮）：PDF 本身已經壓縮過，再壓都細唔到幾多 ---------- */

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(bytes) {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function makeZip(files) {
  const enc = new TextEncoder();
  const d = new Date();
  const time = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1);
  const date = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
  const parts = [], central = [];
  let offset = 0;

  for (const f of files) {
    const name = enc.encode(f.name);
    const crc = crc32(f.data), size = f.data.length;

    const local = new DataView(new ArrayBuffer(30));
    local.setUint32(0, 0x04034b50, true);
    local.setUint16(4, 20, true);
    local.setUint16(6, 0x0800, true);   // 檔名用 UTF-8（中文檔名唔會亂碼）
    local.setUint16(8, 0, true);        // 不壓縮
    local.setUint16(10, time, true);
    local.setUint16(12, date, true);
    local.setUint32(14, crc, true);
    local.setUint32(18, size, true);
    local.setUint32(22, size, true);
    local.setUint16(26, name.length, true);
    local.setUint16(28, 0, true);
    parts.push(local, name, f.data);

    const cd = new DataView(new ArrayBuffer(46));
    cd.setUint32(0, 0x02014b50, true);
    cd.setUint16(4, 20, true);
    cd.setUint16(6, 20, true);
    cd.setUint16(8, 0x0800, true);
    cd.setUint16(10, 0, true);
    cd.setUint16(12, time, true);
    cd.setUint16(14, date, true);
    cd.setUint32(16, crc, true);
    cd.setUint32(20, size, true);
    cd.setUint32(24, size, true);
    cd.setUint16(28, name.length, true);
    cd.setUint32(42, offset, true);
    central.push(cd, name);

    offset += 30 + name.length + size;
  }

  const cdSize = central.reduce((n, p) => n + p.byteLength, 0);
  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true);
  end.setUint16(8, files.length, true);
  end.setUint16(10, files.length, true);
  end.setUint32(12, cdSize, true);
  end.setUint32(16, offset, true);
  return new Blob([...parts, ...central, end], { type: 'application/zip' });
}

function saveBlob(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const esc = s => String(s ?? '').replace(/[&<>"']/g, c =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Windows 唔准用喺檔名嘅字元換成底線
const safeName = s => s.replace(/[\\/:*?"<>|\u0000-\u001f]/g, '_').trim();

export function init() {
  const $ = id => document.getElementById(id);
  const drop = $('ps-drop'), input = $('ps-input'), status = $('ps-status');
  const work = $('ps-work'), secBox = $('ps-sections'), thumbs = $('ps-thumbs');

  const st = {
    base: '', bytes: null, src: null, pages: 0, view: null,
    sections: [], active: 0, pickEnd: false, nextId: 1,
  };

  const setStatus = (msg, kind = '') => {
    status.className = 'status-line' + (kind ? ' ' + kind : '');
    status.textContent = msg;
  };

  const colorOf = sec => COLORS[(sec.id - 1) % COLORS.length];
  const valid = sec => Number.isInteger(sec.from) && Number.isInteger(sec.to)
    && sec.from >= 1 && sec.to <= st.pages && sec.from <= sec.to;
  const autoName = sec => `${st.base}_p${sec.from}-${sec.to}`;
  const fileName = sec => safeName(sec.name || autoName(sec)).replace(/\.pdf$/i, '') + '.pdf';

  /* ---------- 載入 PDF ---------- */

  async function open(file) {
    if (!file) return;
    work.hidden = true;
    thumbs.innerHTML = '';
    st.view?.destroy?.();
    st.view = null;
    setStatus('載入 PDF 處理引擎…（首次需要連網，之後會快取）');

    let PDFLib;
    try { PDFLib = await loadPdfLib(); }
    catch (e) { pdfLibReady = null; setStatus('✗ 載入 pdf-lib 失敗，請檢查網絡：' + e.message, 'error'); return; }

    setStatus('讀取檔案…');
    const bytes = new Uint8Array(await file.arrayBuffer());
    let src;
    try {
      src = await PDFLib.PDFDocument.load(bytes, { ignoreEncryption: true });
    } catch (e) {
      setStatus('✗ 無法讀取呢個 PDF：' + (e?.message || e), 'error');
      return;
    }
    // 加密咗嘅 PDF 用 pdf-lib 拆出嚟會變亂碼，寧願講明做唔到
    if (src.isEncrypted) {
      setStatus('✗ 呢個 PDF 有加密保護（例如禁止修改），無法分拆。', 'error');
      return;
    }

    st.base = safeName(file.name.replace(/\.pdf$/i, '')) || 'document';
    st.bytes = bytes;
    st.src = src;
    st.pages = src.getPageCount();
    st.sections = [];
    st.nextId = 1;
    addSection(1, st.pages);
    work.hidden = false;
    setStatus(`✓ ${file.name}：共 ${st.pages} 頁`, 'success');
    buildThumbs();
  }

  /* ---------- 分拆設定 ---------- */

  function addSection(from, to) {
    st.sections.push({ id: st.nextId++, from, to, name: '' });
    st.active = st.sections.length - 1;
    st.pickEnd = false;
    renderSections();
    paintThumbs();
  }

  function renderSections() {
    secBox.innerHTML = st.sections.map((sec, i) => {
      const ok = valid(sec);
      const count = ok ? `共 ${sec.to - sec.from + 1} 頁` : '頁數唔啱';
      return `<div class="ps-sec${i === st.active ? ' active' : ''}${ok ? '' : ' invalid'}" data-i="${i}">
        <span class="ps-dot" style="background:${colorOf(sec)}"></span>
        <strong class="ps-label">第 ${i + 1} 份</strong>
        <label>由第 <input type="number" class="tool-input ps-num" data-f="from" min="1" max="${st.pages}" value="${sec.from}" inputmode="numeric"> 頁</label>
        <label>至第 <input type="number" class="tool-input ps-num" data-f="to" min="1" max="${st.pages}" value="${sec.to}" inputmode="numeric"> 頁</label>
        <span class="ps-count">${count}</span>
        <label class="ps-name">檔名 <input type="text" class="tool-input" data-f="name" value="${esc(sec.name)}" placeholder="${esc(ok ? autoName(sec) : '')}" spellcheck="false"></label>
        <span class="ps-btns">
          <button class="btn ps-dl"${ok ? '' : ' disabled'}>下載</button>
          <button class="btn ps-del" title="刪除呢份" aria-label="刪除第 ${i + 1} 份"${st.sections.length > 1 ? '' : ' disabled'}>🗑</button>
        </span>
      </div>`;
    }).join('');
  }

  // 只更新一份嘅狀態（唔重畫輸入框，避免打字時失焦）
  function refreshRow(i) {
    const sec = st.sections[i];
    const row = secBox.querySelector(`.ps-sec[data-i="${i}"]`);
    if (!row) return;
    const ok = valid(sec);
    row.classList.toggle('invalid', !ok);
    row.querySelector('.ps-count').textContent = ok ? `共 ${sec.to - sec.from + 1} 頁` : '頁數唔啱';
    row.querySelector('[data-f="name"]').placeholder = ok ? autoName(sec) : '';
    row.querySelector('.ps-dl').disabled = !ok;
  }

  function setActive(i) {
    if (i === st.active) return;
    st.active = i;
    st.pickEnd = false;
    secBox.querySelectorAll('.ps-sec').forEach(r => r.classList.toggle('active', +r.dataset.i === i));
    paintThumbs();
  }

  secBox.addEventListener('focusin', e => {
    const row = e.target.closest('.ps-sec');
    if (row) setActive(+row.dataset.i);
  });
  secBox.addEventListener('click', e => {
    const row = e.target.closest('.ps-sec');
    if (!row) return;
    const i = +row.dataset.i;
    setActive(i);
    if (e.target.closest('.ps-del')) {
      st.sections.splice(i, 1);
      st.active = Math.min(st.active, st.sections.length - 1);
      renderSections();
      paintThumbs();
    } else if (e.target.closest('.ps-dl')) {
      downloadOne(st.sections[i], e.target.closest('.ps-dl'));
    }
  });
  secBox.addEventListener('input', e => {
    const f = e.target.dataset.f;
    const row = e.target.closest('.ps-sec');
    if (!f || !row) return;
    const i = +row.dataset.i, sec = st.sections[i];
    if (f === 'name') sec.name = e.target.value;
    else sec[f] = e.target.value === '' ? NaN : Number(e.target.value);
    st.pickEnd = false;
    refreshRow(i);
    if (f !== 'name') paintThumbs();
  });

  $('ps-add').addEventListener('click', () => {
    // 新一份由上一份之後開始，一直去到最後一頁
    const last = st.sections[st.sections.length - 1];
    const start = last && valid(last) && last.to < st.pages ? last.to + 1 : 1;
    addSection(start, st.pages);
    secBox.querySelector('.ps-sec.active input')?.focus();
  });

  /* ---------- 輸出 ---------- */

  async function buildPdf(sec) {
    const out = await window.PDFLib.PDFDocument.create();
    const idx = Array.from({ length: sec.to - sec.from + 1 }, (_, k) => sec.from - 1 + k);
    const pages = await out.copyPages(st.src, idx);
    pages.forEach(p => out.addPage(p));
    return out.save();
  }

  async function downloadOne(sec, btn) {
    if (!valid(sec)) return;
    btn.disabled = true;
    try {
      saveBlob(new Blob([await buildPdf(sec)], { type: 'application/pdf' }), fileName(sec));
      setStatus(`✓ 已下載 ${fileName(sec)}`, 'success');
    } catch (e) {
      setStatus('✗ 分拆失敗：' + (e?.message || e), 'error');
    } finally { btn.disabled = false; }
  }

  $('ps-zip').addEventListener('click', async e => {
    const btn = e.currentTarget;
    const bad = st.sections.findIndex(s => !valid(s));
    if (bad >= 0) { setStatus(`✗ 第 ${bad + 1} 份嘅頁數唔啱，請先修正。`, 'error'); return; }
    btn.disabled = true;
    try {
      const used = new Map();
      const files = [];
      for (const [i, sec] of st.sections.entries()) {
        setStatus(`分拆中… 第 ${i + 1}／${st.sections.length} 份`);
        let name = fileName(sec);
        // 同名檔案喺 ZIP 入面會互相覆蓋，所以自動加 (2)、(3)
        const n = (used.get(name.toLowerCase()) || 0) + 1;
        used.set(name.toLowerCase(), n);
        if (n > 1) name = name.replace(/\.pdf$/i, `(${n}).pdf`);
        files.push({ name, data: await buildPdf(sec) });
      }
      saveBlob(makeZip(files), `${st.base}_分拆.zip`);
      setStatus(`✓ 已下載 ZIP（${files.length} 個 PDF）`, 'success');
    } catch (err) {
      setStatus('✗ 分拆失敗：' + (err?.message || err), 'error');
    } finally { btn.disabled = false; }
  });

  /* ---------- 縮圖預覽 ---------- */

  async function buildThumbs() {
    thumbs.innerHTML = Array.from({ length: st.pages }, (_, k) =>
      `<div class="ps-thumb" data-p="${k + 1}" role="button" tabindex="0" aria-label="第 ${k + 1} 頁">
        <canvas width="100" height="141"></canvas>
        <span class="ps-pno">${k + 1}</span>
        <span class="ps-tags"></span>
        <button class="ps-zoom" title="放大" aria-label="放大第 ${k + 1} 頁">🔍</button>
      </div>`).join('');
    paintThumbs();

    let pdfjs;
    try { pdfjs = await loadPdfjs(); }
    catch (e) {
      pdfjsReady = null;
      thumbs.classList.add('no-preview');
      setStatus(`✓ 共 ${st.pages} 頁（預覽載入失敗，但仍然可以分拆）`, 'success');
      return;
    }
    const bytes = st.bytes;
    let doc;
    // pdf.js 會接管傳入嘅 buffer，所以畀一份副本
    try { doc = await pdfjs.getDocument({ data: bytes.slice() }).promise; }
    catch { thumbs.classList.add('no-preview'); return; }
    if (bytes !== st.bytes) { doc.destroy(); return; } // 期間已經換咗檔案
    st.view = doc;

    // 捲到先畫，唔好一次過畫幾百頁
    const io = new IntersectionObserver(entries => {
      for (const en of entries) {
        if (!en.isIntersecting) continue;
        io.unobserve(en.target);
        const cv = en.target.querySelector('canvas');
        renderPage(doc, +en.target.dataset.p, cv, cv.clientWidth || 140).catch(() => {});
      }
    }, { rootMargin: '300px' });
    thumbs.querySelectorAll('.ps-thumb').forEach(t => io.observe(t));
  }

  // 按闊度縮放；有畀 maxHeight 就再收細到成頁放得入
  async function renderPage(doc, num, canvas, cssWidth, maxHeight = Infinity) {
    const page = await doc.getPage(num);
    const base = page.getViewport({ scale: 1 });
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const scale = Math.min(cssWidth / base.width, maxHeight / base.height);
    const vp = page.getViewport({ scale: scale * dpr });
    canvas.width = Math.floor(vp.width);
    canvas.height = Math.floor(vp.height);
    await page.render({ canvasContext: canvas.getContext('2d'), viewport: vp }).promise;
  }

  // 按各份範圍，喺縮圖上標色
  function paintThumbs() {
    const act = st.sections[st.active];
    thumbs.querySelectorAll('.ps-thumb').forEach(t => {
      const p = +t.dataset.p;
      const inSecs = st.sections.map((s, i) => ({ s, i })).filter(({ s }) => valid(s) && p >= s.from && p <= s.to);
      t.querySelector('.ps-tags').innerHTML = inSecs.map(({ s, i }) =>
        `<span style="background:${colorOf(s)}">${i + 1}</span>`).join('');
      const inAct = act && valid(act) && p >= act.from && p <= act.to;
      t.classList.toggle('in-active', !!inAct);
      t.style.setProperty('--sec-color', act ? colorOf(act) : 'transparent');
      t.classList.toggle('unused', !inSecs.length);
    });
  }

  function pickPage(p) {
    const sec = st.sections[st.active];
    if (!sec) return;
    if (!st.pickEnd) {
      sec.from = sec.to = p;
      st.pickEnd = true;
      setStatus(`第 ${st.active + 1} 份：起始頁設為 ${p}，再點一頁設結束頁。`);
    } else {
      if (p < sec.from) [sec.from, sec.to] = [p, sec.from];
      else sec.to = p;
      st.pickEnd = false;
      setStatus(`✓ 第 ${st.active + 1} 份：第 ${sec.from} 至 ${sec.to} 頁`, 'success');
    }
    const row = secBox.querySelector(`.ps-sec[data-i="${st.active}"]`);
    row.querySelector('[data-f="from"]').value = sec.from;
    row.querySelector('[data-f="to"]').value = sec.to;
    refreshRow(st.active);
    paintThumbs();
  }

  thumbs.addEventListener('click', e => {
    const t = e.target.closest('.ps-thumb');
    if (!t) return;
    if (e.target.closest('.ps-zoom')) zoom(+t.dataset.p);
    else pickPage(+t.dataset.p);
  });
  thumbs.addEventListener('keydown', e => {
    const t = e.target.closest('.ps-thumb');
    if (t && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); pickPage(+t.dataset.p); }
  });

  // 放大預覽，可以用左右鍵揭頁
  function zoom(p) {
    if (!st.view) return;
    const doc = st.view;
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal-card ps-zoom-card" role="dialog" aria-modal="true" aria-label="頁面預覽">
        <div class="ps-zoom-bar">
          <button class="btn" data-act="prev" aria-label="上一頁">‹</button>
          <span class="ps-zoom-no"></span>
          <button class="btn" data-act="next" aria-label="下一頁">›</button>
          <button class="btn" data-act="close">關閉</button>
        </div>
        <div class="ps-zoom-body"><canvas></canvas></div>
      </div>`;
    document.body.appendChild(overlay);
    const cv = overlay.querySelector('canvas');
    const no = overlay.querySelector('.ps-zoom-no');
    let cur = p, token = 0;

    const show = async n => {
      cur = Math.min(Math.max(n, 1), st.pages);
      no.textContent = `第 ${cur}／${st.pages} 頁`;
      const my = ++token;
      const body = overlay.querySelector('.ps-zoom-body');
      const w = Math.min(body.clientWidth || 600, 900);
      const h = Math.max(window.innerHeight * 0.94 - body.offsetTop - 24, 200);
      const tmp = document.createElement('canvas');
      await renderPage(doc, cur, tmp, w, h).catch(() => {});
      if (my !== token) return; // 揭得太快，舊嗰頁唔使畫
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      cv.width = tmp.width; cv.height = tmp.height;
      cv.style.width = tmp.width / dpr + 'px';
      cv.getContext('2d').drawImage(tmp, 0, 0);
    };
    const close = () => { overlay.remove(); document.removeEventListener('keydown', onKey); };
    const onKey = ev => {
      if (ev.key === 'Escape') close();
      else if (ev.key === 'ArrowLeft') show(cur - 1);
      else if (ev.key === 'ArrowRight') show(cur + 1);
    };
    overlay.addEventListener('click', ev => {
      if (ev.target === overlay) return close();
      const act = ev.target.closest('[data-act]')?.dataset.act;
      if (act === 'close') close();
      if (act === 'prev') show(cur - 1);
      if (act === 'next') show(cur + 1);
    });
    document.addEventListener('keydown', onKey);
    show(p);
  }

  /* ---------- 揀檔案 ---------- */

  input.addEventListener('change', () => { open(input.files[0]); input.value = ''; });
  drop.addEventListener('click', () => input.click());
  drop.addEventListener('dragover', e => { e.preventDefault(); drop.classList.add('drag-over'); });
  drop.addEventListener('dragleave', () => drop.classList.remove('drag-over'));
  drop.addEventListener('drop', e => {
    e.preventDefault(); drop.classList.remove('drag-over'); open(e.dataTransfer.files[0]);
  });
}
