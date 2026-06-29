// Tool 6: 繁簡轉換 (OpenCC-JS)
const cache = {};
function getConverter(from, to) {
  const key = `${from}|${to}`;
  if (!cache[key]) cache[key] = OpenCC.Converter({ from, to });
  return cache[key];
}

export function init() {
  const input = document.getElementById('cv-input');
  const output = document.getElementById('cv-output');
  const status = document.getElementById('cv-status');
  document.getElementById('cv-run').addEventListener('click', () => {
    if (typeof OpenCC === 'undefined') {
      status.className = 'status-line error'; status.textContent = '✗ OpenCC 未載入（請檢查網絡）'; return;
    }
    const [from, to] = document.getElementById('cv-mode').value.split('|');
    try {
      const convert = getConverter(from, to);
      output.value = convert(input.value);
      status.className = 'status-line success'; status.textContent = '✓ 轉換完成';
    } catch (e) {
      status.className = 'status-line error'; status.textContent = '✗ ' + e.message;
    }
  });
}
