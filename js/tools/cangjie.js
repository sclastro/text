// Tool 16: 倉頡／速成查詢
import { CANGJIE, CJ_KEYS } from '../../data/cangjie.js';

const radicals = code => [...code].map(c => CJ_KEYS[c] || c).join('');
const quick = code => code.length <= 1 ? code : code[0] + code[code.length - 1];

export function init() {
  const input = document.getElementById('cj-input');
  const out = document.getElementById('cj-output');
  const status = document.getElementById('cj-status');

  const run = () => {
    out.innerHTML = ''; status.textContent = '';
    const chars = [...input.value].filter(c => c.trim());
    const codes = [];
    chars.forEach(ch => {
      const entry = CANGJIE[ch];
      const div = document.createElement('div');
      div.className = 'cj-card';
      if (!entry) {
        div.innerHTML = `<div class="cj-char">${ch}</div><div class="cj-missing">查無此字</div>`;
      } else {
        const primary = entry[0];
        codes.push(`${ch}:${primary.toUpperCase()}`);
        const alts = entry.slice(1);
        div.innerHTML =
          `<div class="cj-char">${ch}</div>` +
          `<div class="cj-code">${primary.toUpperCase()}</div>` +
          `<div class="cj-radicals">${radicals(primary)}</div>` +
          `<div class="cj-quick">速成：${quick(primary).toUpperCase()}（${radicals(quick(primary))}）</div>` +
          (alts.length ? `<div class="cj-alt">其他：${alts.map(a => a.toUpperCase()).join('、')}</div>` : '');
      }
      out.appendChild(div);
    });
    out.dataset.codes = codes.join('  ');
  };

  document.getElementById('cj-run').addEventListener('click', run);
  document.getElementById('cj-copy').addEventListener('click', () => {
    if (out.dataset.codes) {
      navigator.clipboard.writeText(out.dataset.codes);
      status.className = 'status-line success'; status.textContent = '✓ 已複製';
    }
  });
}
