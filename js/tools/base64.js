// Bonus: Base64 編碼／解碼 (UTF-8 safe)
function encode(str, urlSafe) {
  const bytes = new TextEncoder().encode(str);
  let bin = '';
  bytes.forEach(b => bin += String.fromCharCode(b));
  let b64 = btoa(bin);
  if (urlSafe) b64 = b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return b64;
}
function decode(b64, urlSafe) {
  if (urlSafe) b64 = b64.replace(/-/g, '+').replace(/_/g, '/');
  b64 = b64.replace(/\s/g, '');
  while (b64.length % 4) b64 += '=';
  const bin = atob(b64);
  const bytes = Uint8Array.from(bin, c => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export function init() {
  const input = document.getElementById('b64-input');
  const output = document.getElementById('b64-output');
  const status = document.getElementById('b64-status');
  const urlSafe = () => document.getElementById('b64-urlsafe').checked;
  const fail = m => { status.className = 'status-line error'; status.textContent = '✗ ' + m; };
  const clear = () => { status.className = 'status-line'; status.textContent = ''; };

  document.getElementById('b64-enc').addEventListener('click', () => {
    clear(); try { output.value = encode(input.value, urlSafe()); } catch (e) { fail(e.message); }
  });
  document.getElementById('b64-dec').addEventListener('click', () => {
    clear(); try { output.value = decode(input.value, urlSafe()); } catch (e) { fail('不是有效的 Base64'); }
  });
}
