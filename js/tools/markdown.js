// Tool 7: Markdown 預覽 + PDF 匯出
function render(input, preview) {
  const raw = marked.parse(input.value || '');
  preview.innerHTML = window.DOMPurify ? DOMPurify.sanitize(raw) : raw;
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
    if (typeof html2pdf === 'undefined') { alert('html2pdf 未載入'); return; }
    html2pdf().set({
      margin: 12, filename: 'document.pdf',
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    }).from(preview).save();
  });
}
