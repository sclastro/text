// Tool 14: 短網址還原 (frontend, CORS-limited)
export function init() {
  const input = document.getElementById('us-input');
  const output = document.getElementById('us-output');
  const status = document.getElementById('us-status');

  document.getElementById('us-run').addEventListener('click', async () => {
    const url = input.value.trim();
    output.value = ''; status.textContent = '';
    if (!url) return;
    status.className = 'status-line'; status.textContent = '查詢中…';
    const useProxy = document.getElementById('us-proxy').checked;
    try {
      const target = useProxy ? `https://corsproxy.io/?url=${encodeURIComponent(url)}` : url;
      const res = await fetch(target, { method: 'GET', redirect: 'follow' });
      const finalUrl = res.url && !useProxy ? res.url : (res.headers.get('x-final-url') || res.url);
      output.value = finalUrl || '(無法取得最終網址)';
      status.className = 'status-line success';
      status.textContent = `✓ HTTP ${res.status}`;
    } catch (e) {
      status.className = 'status-line error';
      status.textContent = '✗ 失敗（多數因 CORS 限制）：' + e.message + '。可嘗試勾選 CORS 代理。';
    }
  });
}
