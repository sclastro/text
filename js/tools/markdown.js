// Tool 7: Markdown 預覽 + PDF 匯出
function render(input, preview) {
  const raw = marked.parse(input.value || '');
  preview.innerHTML = window.DOMPurify ? DOMPurify.sanitize(raw) : raw;
}

// 用瀏覽器列印引擎輸出 PDF，唔用 html2canvas 影相。
// html2canvas 會將成份文件畫成一張巨型 canvas，而 canvas 有面積上限
// （約 268 MP）：實測大約 3–5 萬字之後 toDataURL 就會靜靜雞失敗，
// 匯出一個空白 PDF 而唔會報錯。影相出嚟嘅 PDF 亦冇文字層，
// 揀唔到、搜尋唔到，檔案仲大幾倍。列印引擎用系統中文字型，
// 輸出係真文字，長文件都冇上限。
function printHtml(bodyHtml, title) {
  const old = document.getElementById('md-print-frame');
  if (old) old.remove();
  const frame = document.createElement('iframe');
  frame.id = 'md-print-frame';
  frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden';
  document.body.appendChild(frame);
  const doc = frame.contentDocument;
  doc.open();
  doc.write(`<!DOCTYPE html><html lang="zh-Hant"><head><meta charset="UTF-8">
<title>${title}</title><style>
  @page { size: A4; margin: 18mm 16mm; }
  body { font-family:"Noto Sans TC","PingFang TC","Microsoft JhengHei",system-ui,sans-serif;
         font-size:11.5pt; line-height:1.8; color:#000; margin:0; }
  h1,h2,h3,h4 { line-height:1.4; page-break-after:avoid; }
  pre { background:#f4f4f5; padding:.7em; border-radius:4px; white-space:pre-wrap;
        word-wrap:break-word; page-break-inside:avoid; }
  code { font-family:"JetBrains Mono",Consolas,monospace; font-size:.9em; }
  img { max-width:100%; height:auto; }
  table { border-collapse:collapse; width:100%; }
  th,td { border:1px solid #999; padding:.4em .6em; }
  blockquote { border-left:3px solid #ccc; margin-left:0; padding-left:1em; color:#444; }
</style></head><body>${bodyHtml}</body></html>`);
  doc.close();
  const go = () => { try { frame.contentWindow.focus(); frame.contentWindow.print(); } catch (e) { alert('無法開啟列印視窗：' + e.message); } };
  if (doc.readyState === 'complete') setTimeout(go, 250);
  else frame.onload = () => setTimeout(go, 250);
}

export function init() {
  const input = document.getElementById('md-input');
  const preview = document.getElementById('md-preview');
  if (typeof marked === 'undefined') { preview.textContent = 'Marked 未載入（請檢查網絡）'; return; }

  let timer;
  const update = () => { clearTimeout(timer); timer = setTimeout(() => render(input, preview), 150); };
  input.addEventListener('input', update);
  if (!input.value) input.value = '# 你好，世界\n\n這是 **Markdown** 預覽。\n\n- 項目一\n- 項目二\n\n```js\nconsole.log("hi");\n```';
  render(input, preview);

  document.getElementById('md-copy-html').addEventListener('click', () => {
    navigator.clipboard.writeText(preview.innerHTML);
  });
  document.getElementById('md-pdf').addEventListener('click', () => {
    if (!preview.innerHTML.trim()) return;
    printHtml(preview.innerHTML, 'document');
  });
}

