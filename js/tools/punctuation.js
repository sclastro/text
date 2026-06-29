// Tool 3: 標點格式化
function normalizeQuotes(s) {
  // Convert straight double quotes to 「」 in pairs, single to 『』
  let dq = 0, sq = 0;
  s = s.replace(/"/g, () => (dq++ % 2 === 0) ? '「' : '」');
  s = s.replace(/'/g, () => (sq++ % 2 === 0) ? '『' : '』');
  // Also normalize curly quotes
  s = s.replace(/[“]/g, '「').replace(/[”]/g, '」');
  s = s.replace(/[‘]/g, '『').replace(/[’]/g, '』');
  return s;
}

export function init() {
  const input = document.getElementById('pu-input');
  const output = document.getElementById('pu-output');
  document.getElementById('pu-run').addEventListener('click', () => {
    let s = input.value;
    if (document.getElementById('pu-quotes').checked) s = normalizeQuotes(s);
    if (document.getElementById('pu-ellipsis').checked) s = s.replace(/\.{3,}|。{3,}|·{3,}/g, '……');
    if (document.getElementById('pu-dash').checked) s = s.replace(/-{2,}|—(?=—)/g, m => m.length >= 2 ? '——' : m).replace(/--+/g, '——');
    if (document.getElementById('pu-space').checked) {
      s = s.replace(/\s+([，。！？；：、）」』】》])/g, '$1');
      s = s.replace(/([（「『【《])\s+/g, '$1');
    }
    output.value = s;
  });
}
