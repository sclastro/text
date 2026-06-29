// Tool 8: CSV 表格 (PapaParse)
let lastData = null, lastHeader = true;

function buildTable(data, hasHeader) {
  const table = document.createElement('table');
  table.className = 'data-table';
  let rows = data, headerRow = null;
  if (hasHeader && data.length) { headerRow = data[0]; rows = data.slice(1); }
  if (headerRow) {
    const thead = table.createTHead();
    const tr = thead.insertRow();
    headerRow.forEach(c => { const th = document.createElement('th'); th.textContent = c; tr.appendChild(th); });
  }
  const tbody = table.createTBody();
  rows.slice(0, 500).forEach(r => {
    const tr = tbody.insertRow();
    r.forEach(c => { tr.insertCell().textContent = c; });
  });
  return { table, total: rows.length };
}

export function init() {
  const input = document.getElementById('csv-input');
  const out = document.getElementById('csv-output');
  const status = document.getElementById('csv-status');
  const headerCb = document.getElementById('csv-header');

  document.getElementById('csv-file').addEventListener('change', e => {
    const f = e.target.files[0]; if (!f) return;
    const reader = new FileReader();
    reader.onload = () => { input.value = reader.result; };
    reader.readAsText(f, 'utf-8');
  });

  document.getElementById('csv-run').addEventListener('click', () => {
    if (typeof Papa === 'undefined') { status.className = 'status-line error'; status.textContent = '✗ PapaParse 未載入'; return; }
    const res = Papa.parse(input.value.trim(), { skipEmptyLines: true });
    if (res.errors.length) { status.className = 'status-line error'; status.textContent = '✗ ' + res.errors[0].message; }
    else status.className = 'status-line';
    lastData = res.data; lastHeader = headerCb.checked;
    const { table, total } = buildTable(res.data, headerCb.checked);
    out.innerHTML = ''; out.appendChild(table);
    status.textContent = `共 ${total} 列${total > 500 ? '（只顯示前 500 列）' : ''}`;
  });

  document.getElementById('csv-md').addEventListener('click', () => {
    if (!lastData || !lastData.length) return;
    const rows = lastData;
    const header = lastHeader ? rows[0] : rows[0].map((_, i) => `欄${i + 1}`);
    const body = lastHeader ? rows.slice(1) : rows;
    let md = '| ' + header.join(' | ') + ' |\n';
    md += '| ' + header.map(() => '---').join(' | ') + ' |\n';
    body.forEach(r => { md += '| ' + r.join(' | ') + ' |\n'; });
    navigator.clipboard.writeText(md);
    status.className = 'status-line success'; status.textContent = '✓ 已複製 Markdown 表格';
  });
}
