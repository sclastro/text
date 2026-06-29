// Bonus: URL 編碼／解碼
export function init() {
  const input = document.getElementById('ue-input');
  const output = document.getElementById('ue-output');
  const status = document.getElementById('ue-status');
  const mode = () => document.getElementById('ue-mode').value;
  const fail = m => { status.className = 'status-line error'; status.textContent = '✗ ' + m; };
  const clear = () => { status.className = 'status-line'; status.textContent = ''; };

  document.getElementById('ue-enc').addEventListener('click', () => {
    clear();
    output.value = mode() === 'uri' ? encodeURI(input.value) : encodeURIComponent(input.value);
  });
  document.getElementById('ue-dec').addEventListener('click', () => {
    clear();
    try { output.value = mode() === 'uri' ? decodeURI(input.value) : decodeURIComponent(input.value); }
    catch (e) { fail('無法解碼（格式錯誤）'); }
  });
}
