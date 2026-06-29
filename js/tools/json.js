// Tool 9: JSON 格式化／壓縮／驗證
export function init() {
  const input = document.getElementById('json-input');
  const output = document.getElementById('json-output');
  const status = document.getElementById('json-status');
  const indentSel = document.getElementById('json-indent');

  const indent = () => indentSel.value === '\\t' ? '\t' : Number(indentSel.value);
  const setErr = m => { status.className = 'status-line error'; status.textContent = '✗ ' + m; };
  const setOk = m => { status.className = 'status-line success'; status.textContent = '✓ ' + m; };

  const parse = () => JSON.parse(input.value);

  document.getElementById('json-format').addEventListener('click', () => {
    try { output.value = JSON.stringify(parse(), null, indent()); setOk('格式化完成'); }
    catch (e) { setErr(e.message); }
  });
  document.getElementById('json-min').addEventListener('click', () => {
    try { output.value = JSON.stringify(parse()); setOk('已壓縮'); }
    catch (e) { setErr(e.message); }
  });
  document.getElementById('json-validate').addEventListener('click', () => {
    try { parse(); setOk('有效的 JSON'); }
    catch (e) { setErr(e.message); }
  });
}
