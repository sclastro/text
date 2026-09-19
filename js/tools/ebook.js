// 電子書轉 PDF — MOBI / AZW3 / EPUB / FB2 / CBZ
// 用 foliate-js 喺本地解析（檔案唔會上傳），再交畀瀏覽器嘅列印引擎輸出 PDF。
// 用列印而唔用 html2canvas 嘅原因：canvas 有面積上限，約 3–5 萬字之後
// toDataURL 會靜靜雞失敗出空白檔；而且影相出嚟嘅 PDF 冇文字層，
// 揀唔到、搜尋唔到。列印引擎用系統中文字型，文字係真文字，檔案又細。

const FOLIATE = 'https://cdn.jsdelivr.net/npm/foliate-js@1.0.1/view.js';

let makeBookFn = null;
async function loadFoliate() {
  if (!makeBookFn) ({ makeBook: makeBookFn } = await import(FOLIATE));
  return makeBookFn;
}

const state = { html: '', title: '', author: '', chars: 0, sections: 0 };

function metaText(meta) {
  const t = meta?.title;
  const title = typeof t === 'string' ? t : (t?.[0]?.value ?? t?.value ?? '');
  const a = meta?.author;
  const author = Array.isArray(a)
    ? a.map(x => x?.name ?? x).filter(Boolean).join('、')
    : (a?.name ?? (typeof a === 'string' ? a : ''));
  return { title, author };
}

// 抽走每章 <body> 內容，順便清走 script／style 同固定定位
function bodyOf(docText) {
  const doc = new DOMParser().parseFromString(docText, 'text/html');
  doc.querySelectorAll('script, style, link').forEach(el => el.remove());
  doc.querySelectorAll('[style]').forEach(el => {
    const s = el.getAttribute('style') || '';
    if (/position\s*:\s*(fixed|absolute)/i.test(s)) el.removeAttribute('style');
  });
  return doc.body ? doc.body.innerHTML : '';
}

function buildPrintable({ title, author, html }) {
  return `<!DOCTYPE html><html lang="zh-Hant"><head><meta charset="UTF-8">
<title>${escapeHtml(title || '電子書')}</title>
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

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export function init() {
  const drop = document.getElementById('ebk-drop');
  const input = document.getElementById('ebk-input');
  const status = document.getElementById('ebk-status');
  const info = document.getElementById('ebk-info');
  const preview = document.getElementById('ebk-preview');
  const actions = document.getElementById('ebk-actions');

  const setStatus = (msg, kind = '') => {
    status.className = 'status-line' + (kind ? ' ' + kind : '');
    status.textContent = msg;
  };

  async function convert(file) {
    if (!file) return;
    actions.hidden = true;
    info.innerHTML = '';
    preview.innerHTML = '';
    setStatus('載入解析引擎…（首次需要連網，之後會快取）');

    let makeBook;
    try { makeBook = await loadFoliate(); }
    catch (e) { setStatus('✗ 載入 foliate-js 失敗，請檢查網絡：' + e.message, 'error'); return; }

    setStatus('解析電子書…');
    let book;
    try {
      book = await makeBook(file);
    } catch (e) {
      const m = String(e?.message || e);
      setStatus(/drm|encrypt/i.test(m)
        ? '✗ 呢個檔案有 DRM 保護，無法開啟。'
        : '✗ 無法解析：' + m + '（支援 .mobi/.azw3/.epub/.fb2/.cbz；有 DRM 嘅檔案開唔到）', 'error');
      return;
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
      } catch { /* 個別章節失敗就跳過，唔好成本書炒 */ }
      section.unload?.();
      done++;
      if (done % 5 === 0 || done === secs.length)
        setStatus(`解析中… ${done}/${secs.length} 章`);
    }

    if (!chars) { setStatus('✗ 抽唔到任何文字內容（可能係純圖片書或有 DRM）', 'error'); return; }

    Object.assign(state, { html, title, author, chars, sections: secs.length });

    info.innerHTML = `
      <div class="info-card"><div class="label">書名</div><div class="value">${escapeHtml(title || '（無）')}</div></div>
      <div class="info-card"><div class="label">作者</div><div class="value">${escapeHtml(author || '（無）')}</div></div>
      <div class="info-card"><div class="label">章節數</div><div class="value">${secs.length}</div></div>
      <div class="info-card"><div class="label">字數</div><div class="value">${chars.toLocaleString()}</div></div>`;

    const plain = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    preview.textContent = plain.slice(0, 400) + (plain.length > 400 ? '…' : '');
    actions.hidden = false;
    setStatus(`✓ 解析完成：${secs.length} 章、${chars.toLocaleString()} 字`, 'success');
  }

  // 用隱藏 iframe 列印，避免彈出視窗被瀏覽器封鎖
  function printBook() {
    if (!state.html) return;
    const old = document.getElementById('ebk-print-frame');
    if (old) old.remove();
    const frame = document.createElement('iframe');
    frame.id = 'ebk-print-frame';
    frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden';
    document.body.appendChild(frame);
    const doc = frame.contentDocument;
    doc.open();
    doc.write(buildPrintable(state));
    doc.close();
    const go = () => {
      try { frame.contentWindow.focus(); frame.contentWindow.print(); }
      catch (e) { setStatus('✗ 無法開啟列印視窗：' + e.message, 'error'); }
    };
    if (doc.readyState === 'complete') setTimeout(go, 300);
    else frame.onload = () => setTimeout(go, 300);
    setStatus('已開啟列印視窗 —— 喺「目的地」揀「另存為 PDF」即可。', 'success');
  }

  input.addEventListener('change', () => { convert(input.files[0]); input.value = ''; });
  drop.addEventListener('click', () => input.click());
  drop.addEventListener('dragover', e => { e.preventDefault(); drop.classList.add('drag-over'); });
  drop.addEventListener('dragleave', () => drop.classList.remove('drag-over'));
  drop.addEventListener('drop', e => {
    e.preventDefault(); drop.classList.remove('drag-over');
    convert(e.dataTransfer.files[0]);
  });

  document.getElementById('ebk-print').addEventListener('click', printBook);
  document.getElementById('ebk-html').addEventListener('click', () => {
    if (!state.html) return;
    const name = (state.title || 'ebook').replace(/[\\/:*?"<>|]/g, '_') + '.html';
    const blob = new Blob([buildPrintable(state)], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
}
