// Tool 11: QR Code 生成 (qrcodejs)
export function init() {
  const input = document.getElementById('qr-input');
  const out = document.getElementById('qr-output');
  const status = document.getElementById('qr-status');

  const generate = () => {
    const text = input.value.trim();
    status.textContent = ''; status.className = 'status-line';
    out.innerHTML = '';
    if (!text) { status.textContent = '請輸入內容'; return; }
    if (typeof QRCode === 'undefined') { status.className = 'status-line error'; status.textContent = '✗ QRCode 未載入'; return; }
    const size = +document.getElementById('qr-size').value;
    try {
      new QRCode(out, {
        text, width: size, height: size,
        colorDark: document.getElementById('qr-fg').value,
        colorLight: document.getElementById('qr-bg').value,
        correctLevel: QRCode.CorrectLevel[document.getElementById('qr-level').value],
      });
    } catch (e) {
      status.className = 'status-line error'; status.textContent = '✗ 內容過長或無法生成';
    }
  };

  document.getElementById('qr-run').addEventListener('click', generate);
  document.getElementById('qr-download').addEventListener('click', () => {
    const canvas = out.querySelector('canvas');
    const img = out.querySelector('img');
    const url = canvas ? canvas.toDataURL('image/png') : (img ? img.src : null);
    if (!url) { status.textContent = '請先生成 QR Code'; return; }
    const a = document.createElement('a');
    a.href = url; a.download = 'qrcode.png'; a.click();
  });
}
