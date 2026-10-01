// 電子書轉 PDF — MOBI / AZW3 / EPUB / FB2 / CBZ
// 以 foliate-js 在本地解析（檔案不會上傳），再交由瀏覽器的列印引擎輸出 PDF。
// 採用列印而不用 html2canvas 的原因：canvas 有面積上限，約三至五萬字後
// toDataURL 會無聲失敗，輸出空白檔；而且截圖產生的 PDF 沒有文字層，
// 無法選取及搜尋。列印引擎使用系統中文字型，輸出為真文字，檔案亦較小。

const FOLIATE = 'https://cdn.jsdelivr.net/npm/foliate-js@1.0.1/view.js';

let makeBookFn = null;
async function loadFoliate() {
  if (!makeBookFn) ({ makeBook: makeBookFn } = await import(FOLIATE));
  return makeBookFn;
}

function metaText(meta) {
  const t = meta?.title;
  const title = typeof t === 'string' ? t : (t?.[0]?.value ?? t?.value ?? '');
  const a = meta?.author;
  const author = Array.isArray(a)
    ? a.map(x => x?.name ?? x).filter(Boolean).join('、')
    : (a?.name ?? (typeof a === 'string' ? a : ''));
  return { title, author };
}

// 擷取每章 <body> 內容，並移除 script／style 及固定定位
function bodyOf(docText) {
  const doc = new DOMParser().parseFromString(docText, 'text/html');
  doc.querySelectorAll('script, style, link').forEach(el => el.remove());
  doc.querySelectorAll('[style]').forEach(el => {
    const s = el.getAttribute('style') || '';
    if (/position\s*:\s*(fixed|absolute)/i.test(s)) el.removeAttribute('style');
  });
  return doc.body ? doc.body.innerHTML : '';
}

// docTitle 會成為瀏覽器「另存為 PDF」的預設檔名
function buildPrintable({ title, author, html, docTitle }) {
  return `<!DOCTYPE html><html lang="zh-Hant"><head><meta charset="UTF-8">
<title>${escapeHtml(docTitle || title || '電子書')}</title>
<style>
  @page { size: A4; margin: 18mm 16mm; }
  body { font-family: "Noto Serif TC","Songti TC","PingFang TC","Microsoft JhengHei",serif;
         font-size: 11.5pt; line-height: 1.85; color:#000; margin:0; }
  img { max-width: 100%; height: auto; }
  h1,h2,h3 { line-height:1.4; page-break-after: avoid; }
  p { margin: 0 0 .7em; text-align: justify; }
  .ebk-cover { text-align:center; padding: 30vh 0 0; page-break-after: always; }
  .ebk-cover h1 { font-size: 26pt; margin:0 0 .6em; }
  .ebk-cover .by { font-size: 13pt; color:#333; }
  .ebk-sec { page-break-before: always; }
  .ebk-sec:first-of-type { page-break-before: avoid; }
  a { color:#000; text-decoration:none; }
</style></head><body>
<div class="ebk-cover"><h1>${escapeHtml(title || '未命名')}</h1>
${author ? `<div class="by">${escapeHtml(author)}</div>` : ''}</div>
${html}
</body></html>`;
}

// Windows 檔名不允許的字元換成底線，並去掉使用者誤加的副檔名
const safeName = s => String(s ?? '').replace(/[\\/:*?"<>|\u0000-\u001f]/g, '_')
  .replace(/\.(pdf|html?)$/i, '').trim();

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export function init() {
  const drop = document.getElementById('ebk-drop');
  const input = document.getElementById('ebk-input');
  const status = document.getElementById('ebk-status');
  const list = document.getElementById('ebk-list');

  const books = [];      // { id, file, base, title, author, html, chars, sections, state, msg }
  const queue = [];      // 等待解析的書
  let busy = false, nextId = 1;

  const setStatus = (msg, kind = '') => {
    status.className = 'status-line' + (kind ? ' ' + kind : '');
    status.textContent = msg;
  };

  function summary() {
    const done = books.filter(b => b.state === 'done').length;
    const failed = books.filter(b => b.state === 'error').length;
    const waiting = books.length - done - failed;
    if (!books.length) return setStatus('');
    const parts = [`共 ${books.length} 本`];
    if (done) parts.push(`已完成 ${done} 本`);
    if (waiting) parts.push(`處理中 ${waiting} 本`);
    if (failed) parts.push(`失敗 ${failed} 本`);
    setStatus((waiting ? '' : '✓ ') + parts.join('，'), waiting ? '' : (failed && !done ? 'error' : 'success'));
  }

  /* ---------- 每本書一張卡片 ---------- */

  function card(b) {
    const el = document.createElement('div');
    el.className = 'ebk-book';
    el.dataset.id = b.id;
    el.innerHTML = `
      <div class="ebk-head">
        <strong class="ebk-src">${escapeHtml(b.file.name)}</strong>
        <button class="btn ebk-remove" title="移除" aria-label="移除 ${escapeHtml(b.file.name)}">✕</button>
      </div>
      <div class="status-line ebk-state"></div>
      <div class="ebk-body"></div>`;
    return el;
  }

  const cardOf = b => list.querySelector(`.ebk-book[data-id="${b.id}"]`);

  function setBookState(b, msg, kind = '') {
    const st = cardOf(b)?.querySelector('.ebk-state');
    if (!st) return;
    st.className = 'status-line ebk-state' + (kind ? ' ' + kind : '');
    st.textContent = msg;
  }

  function renderDone(b) {
    const el = cardOf(b);
    if (!el) return;
    const plain = b.html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    el.querySelector('.ebk-body').innerHTML = `
      <div class="info-cards">
        <div class="info-card"><div class="label">書名</div><div class="value">${escapeHtml(b.title || '（無）')}</div></div>
        <div class="info-card"><div class="label">作者</div><div class="value">${escapeHtml(b.author || '（無）')}</div></div>
        <div class="info-card"><div class="label">章節數</div><div class="value">${b.sections}</div></div>
        <div class="info-card"><div class="label">字數</div><div class="value">${b.chars.toLocaleString()}</div></div>
      </div>
      <div class="ebk-preview"><div class="ebk-clamp">${escapeHtml(plain.slice(0, 200) + (plain.length > 200 ? '…' : ''))}</div></div>
      <div class="control-row ebk-actions">
        <label class="ebk-name">輸出檔名
          <input type="text" class="tool-input" value="${escapeHtml(b.base)}" spellcheck="false" aria-label="${escapeHtml(b.file.name)} 的輸出檔名">
        </label>
        <button class="btn btn-primary ebk-print">列印／另存 PDF</button>
        <button class="btn ebk-html">下載 HTML</button>
      </div>`;
    setBookState(b, `✓ 解析完成：${b.sections} 章、${b.chars.toLocaleString()} 字`, 'success');
  }

  /* ---------- 解析 ---------- */

  function add(files) {
    for (const file of [...(files || [])]) {
      const b = {
        id: nextId++, file, state: 'queued',
        base: safeName(file.name.replace(/\.[^.]+$/, '')) || 'ebook',
      };
      books.push(b);
      queue.push(b);
      list.appendChild(card(b));
      setBookState(b, '等待處理…');
    }
    summary();
    pump();
  }

  // 逐本解析，避免同時載入多本書佔用大量記憶體
  async function pump() {
    if (busy) return;
    busy = true;
    while (queue.length) {
      const b = queue.shift();
      if (!books.includes(b)) continue; // 等待期間已被移除
      b.state = 'working';
      try {
        await convert(b);
        b.state = 'done';
        renderDone(b);
      } catch (e) {
        b.state = 'error';
        setBookState(b, '✗ ' + (e?.message || e), 'error');
      }
      summary();
    }
    busy = false;
  }

  async function convert(b) {
    setBookState(b, '載入解析引擎…（首次需要連網，之後會快取）');
    let makeBook;
    try { makeBook = await loadFoliate(); }
    catch (e) { makeBookFn = null; throw new Error('載入 foliate-js 失敗，請檢查網絡：' + e.message); }

    setBookState(b, '解析電子書…');
    let book;
    try {
      book = await makeBook(b.file);
    } catch (e) {
      const m = String(e?.message || e);
      throw new Error(/drm|encrypt/i.test(m)
        ? '此檔案設有 DRM 保護，無法開啟。'
        : '無法解析：' + m + '（支援 .mobi/.azw3/.epub/.fb2/.cbz；設有 DRM 的檔案無法開啟）');
    }

    const { title, author } = metaText(book.metadata);
    const secs = book.sections || [];
    let html = '', chars = 0, done = 0;

    for (const section of secs) {
      try {
        const target = await section.load();
        const text = typeof target === 'string' && /^blob:|^https?:/.test(target)
          ? await (await fetch(target)).text()
          : String(target ?? '');
        const body = bodyOf(text);
        if (body.trim()) {
          html += `<section class="ebk-sec">${body}</section>\n`;
          chars += body.replace(/<[^>]+>/g, '').replace(/\s/g, '').length;
        }
      } catch { /* 個別章節失敗則略過，以免整本書轉換失敗 */ }
      section.unload?.();
      done++;
      if (done % 5 === 0 || done === secs.length)
        setBookState(b, `解析中… ${done}/${secs.length} 章`);
    }

    if (!chars) throw new Error('無法擷取任何文字內容（可能是純圖片書籍或設有 DRM）');
    Object.assign(b, { html, title, author, chars, sections: secs.length });
  }

  /* ---------- 輸出 ---------- */

  const outName = (b, el) => safeName(el.querySelector('.ebk-name input').value) || b.base;

  // 用隱藏 iframe 列印，避免彈出視窗遭瀏覽器封鎖。
  // 部分瀏覽器以頂層頁面的標題作為 PDF 預設檔名，故列印期間暫時改用輸出檔名。
  function printBook(b, name) {
    document.getElementById('ebk-print-frame')?.remove();
    const frame = document.createElement('iframe');
    frame.id = 'ebk-print-frame';
    frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden';
    document.body.appendChild(frame);
    const doc = frame.contentDocument;
    doc.open();
    doc.write(buildPrintable({ ...b, docTitle: name }));
    doc.close();

    const go = () => {
      const prev = document.title;
      let restored = false;
      const restore = () => { if (!restored) { restored = true; document.title = prev; } };
      document.title = name;
      frame.contentWindow.addEventListener('afterprint', restore);
      setTimeout(restore, 60000);
      try { frame.contentWindow.focus(); frame.contentWindow.print(); }
      catch (e) { restore(); setBookState(b, '✗ 無法開啟列印視窗：' + e.message, 'error'); }
    };
    if (doc.readyState === 'complete') setTimeout(go, 300);
    else frame.onload = () => setTimeout(go, 300);
    setBookState(b, `已開啟列印視窗，在「目的地」選擇「另存為 PDF」即可（預設檔名：${name}.pdf）。`, 'success');
  }

  function downloadHtml(b, name) {
    const blob = new Blob([buildPrintable({ ...b, docTitle: name })], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = name + '.html';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  list.addEventListener('click', e => {
    const el = e.target.closest('.ebk-book');
    const b = el && books.find(x => x.id === +el.dataset.id);
    if (!b) return;
    if (e.target.closest('.ebk-remove')) {
      books.splice(books.indexOf(b), 1);
      el.remove();
      summary();
    } else if (e.target.closest('.ebk-print')) {
      printBook(b, outName(b, el));
    } else if (e.target.closest('.ebk-html')) {
      downloadHtml(b, outName(b, el));
    }
  });

  input.addEventListener('change', () => { add(input.files); input.value = ''; });
  drop.addEventListener('click', () => input.click());
  drop.addEventListener('dragover', e => { e.preventDefault(); drop.classList.add('drag-over'); });
  drop.addEventListener('dragleave', () => drop.classList.remove('drag-over'));
  drop.addEventListener('drop', e => {
    e.preventDefault(); drop.classList.remove('drag-over');
    add(e.dataTransfer.files);
  });
}
