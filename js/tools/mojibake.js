// Bonus: 亂碼修復 — re-decode bytes under a different encoding
// Strategy: turn the garbled text back into the raw bytes (assuming it was
// wrongly decoded as `from`), then re-decode those bytes as `to`.
// Browsers can only ENCODE to UTF-8, and char→byte for Latin-1 is trivial,
// so `from` reliably supports utf-8 / latin1. TextDecoder CAN decode big5/gb18030.

function toBytes(str, from) {
  if (from === 'latin1') {
    const arr = new Uint8Array(str.length);
    for (let i = 0; i < str.length; i++) {
      const c = str.charCodeAt(i);
      if (c > 255) throw new Error('含有非 Latin-1 字元，請改用 UTF-8 作為原始編碼');
      arr[i] = c;
    }
    return arr;
  }
  if (from === 'utf-8') return new TextEncoder().encode(str);
  throw new Error('原始編碼只支援 UTF-8 或 Latin-1（瀏覽器無法重新編碼 Big5／GB）');
}

function attempt(str, from, to) {
  const bytes = toBytes(str, from);
  return new TextDecoder(to, { fatal: false }).decode(bytes);
}

function score(s) {
  // count CJK characters and penalize replacement char
  const cjk = (s.match(/[㐀-鿿]/g) || []).length;
  const repl = (s.match(/�/g) || []).length;
  return cjk - repl * 3;
}

export function init() {
  const input = document.getElementById('mj-input');
  const output = document.getElementById('mj-output');
  const status = document.getElementById('mj-status');

  document.getElementById('mj-run').addEventListener('click', () => {
    status.textContent = ''; status.className = 'status-line';
    try {
      output.value = attempt(input.value, document.getElementById('mj-from').value, document.getElementById('mj-to').value);
    } catch (e) { status.className = 'status-line error'; status.textContent = '✗ ' + e.message; }
  });

  document.getElementById('mj-auto').addEventListener('click', () => {
    status.textContent = ''; status.className = 'status-line';
    const combos = [['latin1', 'big5'], ['latin1', 'gb18030'], ['latin1', 'utf-8'],
                    ['utf-8', 'big5'], ['utf-8', 'gb18030']];
    let best = null;
    for (const [f, t] of combos) {
      try {
        const r = attempt(input.value, f, t);
        const sc = score(r);
        if (!best || sc > best.sc) best = { r, sc, f, t };
      } catch { /* skip */ }
    }
    if (best && best.sc > 0) {
      output.value = best.r;
      status.className = 'status-line success';
      status.textContent = `✓ 最佳推測：${best.f} → ${best.t}`;
    } else {
      status.className = 'status-line error';
      status.textContent = '✗ 自動嘗試未找到合理結果，請手動選擇編碼';
    }
  });
}
