// Bonus: 字頻分析
export function init() {
  const input = document.getElementById('cf-input');
  const out = document.getElementById('cf-output');
  const status = document.getElementById('cf-status');

  document.getElementById('cf-run').addEventListener('click', () => {
    const mode = document.getElementById('cf-mode').value;
    const text = input.value;
    const map = new Map();
    let total = 0;
    for (const ch of text) {
      if (mode === 'cjk' && !/[㐀-鿿豈-﫿]/.test(ch)) continue;
      if (mode === 'all' && /\s/.test(ch)) continue;
      map.set(ch, (map.get(ch) || 0) + 1);
      total++;
    }
    const sorted = [...map.entries()].sort((a, b) => b[1] - a[1]);
    status.className = 'status-line';
    status.textContent = `共 ${total} 個字元，${sorted.length} 種不同字元`;
    let html = '<thead><tr><th>排名</th><th>字元</th><th>次數</th><th>佔比</th></tr></thead><tbody>';
    sorted.slice(0, 200).forEach(([ch, n], i) => {
      html += `<tr><td>${i + 1}</td><td style="font-size:1.2rem">${ch}</td><td>${n}</td><td>${(n / total * 100).toFixed(2)}%</td></tr>`;
    });
    out.innerHTML = html + '</tbody>';
  });
}
