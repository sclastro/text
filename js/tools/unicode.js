// Bonus: Unicode 字符查詢
function utf8Hex(ch) {
  return [...new TextEncoder().encode(ch)].map(b => b.toString(16).toUpperCase().padStart(2, '0')).join(' ');
}
function blockName(cp) {
  if (cp >= 0x4E00 && cp <= 0x9FFF) return 'CJK 統一表意文字';
  if (cp >= 0x3400 && cp <= 0x4DBF) return 'CJK 擴展 A';
  if (cp >= 0x3000 && cp <= 0x303F) return 'CJK 符號標點';
  if (cp >= 0xFF00 && cp <= 0xFFEF) return '全形／半形';
  if (cp >= 0x0000 && cp <= 0x007F) return 'ASCII';
  if (cp >= 0x0080 && cp <= 0x00FF) return 'Latin-1 補充';
  if (cp >= 0x1F300 && cp <= 0x1FAFF) return 'Emoji／符號';
  if (cp >= 0x3040 && cp <= 0x30FF) return '日文假名';
  if (cp >= 0xAC00 && cp <= 0xD7AF) return '韓文諺文';
  return '其他';
}

export function init() {
  const input = document.getElementById('uni-input');
  const out = document.getElementById('uni-output');
  document.getElementById('uni-run').addEventListener('click', () => {
    const chars = [...input.value].filter(c => c !== '\n');
    let html = '<thead><tr><th>字符</th><th>碼位</th><th>十進</th><th>UTF-8 (hex)</th><th>HTML 實體</th><th>區塊</th></tr></thead><tbody>';
    chars.forEach(ch => {
      const cp = ch.codePointAt(0);
      const hex = cp.toString(16).toUpperCase().padStart(4, '0');
      html += `<tr><td style="font-size:1.3rem">${ch === ' ' ? '␠' : ch}</td><td>U+${hex}</td><td>${cp}</td><td>${utf8Hex(ch)}</td><td>&amp;#${cp};</td><td>${blockName(cp)}</td></tr>`;
    });
    out.innerHTML = html + '</tbody>';
  });
}
