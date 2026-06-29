// Tool 5: 拼音／粵拼 (input Chinese -> romanization)
let jyutMod = null;
async function loadJyutping() {
  if (!jyutMod) jyutMod = await import('https://esm.run/to-jyutping');
  return jyutMod;
}

const isCJK = ch => /[㐀-鿿豈-﫿]/.test(ch);
const stripTone = s => (s || '').replace(/[0-9]/g, '');

export function init() {
  const input = document.getElementById('ro-input');
  const output = document.getElementById('ro-output');
  const status = document.getElementById('ro-status');

  document.getElementById('ro-run').addEventListener('click', async () => {
    const text = input.value;
    const system = document.getElementById('ro-system').value;
    const tone = document.getElementById('ro-tone').value;
    const display = document.getElementById('ro-display').value;
    status.textContent = ''; status.className = 'status-line'; output.innerHTML = '';
    if (!text.trim()) return;

    const chars = [...text];
    let pin = null, jyut = null;

    try {
      if (system === 'pinyin' || system === 'both') {
        if (!window.pinyinPro) throw new Error('pinyin-pro 未載入（請檢查網絡）');
        const opt = { type: 'array', toneType: tone === 'none' ? 'none' : tone };
        pin = window.pinyinPro.pinyin(text, opt); // one entry per char
      }
      if (system === 'jyutping' || system === 'both') {
        status.textContent = '載入粵拼資料中…';
        const mod = await loadJyutping();
        const list = mod.getJyutpingList(text); // [[char, jyutping|null], ...]
        jyut = list.map(([, jp]) => tone === 'none' ? stripTone(jp) : (jp || ''));
        status.textContent = '';
      }
    } catch (e) {
      status.className = 'status-line error'; status.textContent = '✗ ' + e.message; return;
    }

    if (display === 'plain') {
      const parts = [];
      chars.forEach((ch, i) => {
        if (!isCJK(ch)) return;
        const p = pin ? (pin[i] || '') : '';
        const j = jyut ? (jyut[i] || '') : '';
        if (system === 'both') parts.push(`${ch}[${p}/${j}]`);
        else parts.push((system === 'pinyin' ? p : j) || ch);
      });
      output.textContent = parts.join('  ');
      return;
    }

    // ruby display
    chars.forEach((ch, i) => {
      if (ch === '\n') { output.appendChild(document.createElement('br')); return; }
      if (!isCJK(ch)) { output.appendChild(document.createTextNode(ch)); return; }
      const ruby = document.createElement('ruby');
      ruby.appendChild(document.createTextNode(ch));
      if (pin) { const rt = document.createElement('rt'); rt.textContent = pin[i] || ''; ruby.appendChild(rt); }
      if (jyut) { const rt = document.createElement('rt'); rt.className = 'jyut'; rt.textContent = jyut[i] || ''; ruby.appendChild(rt); }
      output.appendChild(ruby);
    });
  });
}
