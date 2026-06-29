// Tool 12: 時區轉換 (Intl)
const ZONES = [
  ['Asia/Hong_Kong', '香港'], ['Asia/Taipei', '台北'], ['Asia/Shanghai', '北京／上海'],
  ['Asia/Tokyo', '東京'], ['Asia/Singapore', '新加坡'], ['Asia/Seoul', '首爾'],
  ['Asia/Bangkok', '曼谷'], ['Asia/Kolkata', '印度'], ['Europe/London', '倫敦'],
  ['Europe/Paris', '巴黎'], ['Europe/Moscow', '莫斯科'], ['America/New_York', '紐約'],
  ['America/Chicago', '芝加哥'], ['America/Los_Angeles', '洛杉磯'], ['America/Sao_Paulo', '聖保羅'],
  ['Australia/Sydney', '悉尼'], ['Pacific/Auckland', '奧克蘭'], ['UTC', 'UTC'],
];
const WEEK = ['日', '一', '二', '三', '四', '五', '六'];

export function init() {
  const dt = document.getElementById('tz-input');
  const source = document.getElementById('tz-source');
  const out = document.getElementById('tz-output');

  source.innerHTML = ZONES.map(([z, n]) => `<option value="${z}">${n}（${z}）</option>`).join('');
  source.value = 'Asia/Hong_Kong';

  const setNow = () => {
    const d = new Date();
    dt.value = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  };
  if (!dt.value) setNow();
  document.getElementById('tz-now').addEventListener('click', setNow);

  document.getElementById('tz-run').addEventListener('click', () => {
    if (!dt.value) return;
    // interpret the entered wall-clock time as being in the source zone
    const instant = wallTimeToInstant(dt.value, source.value);
    let html = '<thead><tr><th>時區</th><th>日期時間</th><th>星期</th></tr></thead><tbody>';
    ZONES.forEach(([z, n]) => {
      const fmt = new Intl.DateTimeFormat('zh-Hant', {
        timeZone: z, year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', hour12: false, weekday: 'short', timeZoneName: 'short'
      });
      const parts = Object.fromEntries(fmt.formatToParts(instant).map(p => [p.type, p.value]));
      html += `<tr><td>${n}</td><td>${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute} <span style="color:var(--text-muted)">${parts.timeZoneName || ''}</span></td><td>星期${parts.weekday.replace(/[週周]/,'')}</td></tr>`;
    });
    out.innerHTML = html + '</tbody>';
  });
}

// Convert a "YYYY-MM-DDTHH:mm" wall-clock string in zone `tz` to a real Date instant
function wallTimeToInstant(local, tz) {
  const [datePart, timePart] = local.split('T');
  const [y, mo, d] = datePart.split('-').map(Number);
  const [h, mi] = timePart.split(':').map(Number);
  const asUTC = Date.UTC(y, mo - 1, d, h, mi);
  // find offset of tz at that time
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
  });
  const parts = Object.fromEntries(fmt.formatToParts(new Date(asUTC)).map(p => [p.type, p.value]));
  const tzWall = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour % 24, +parts.minute, +parts.second);
  const offset = tzWall - asUTC;
  return new Date(asUTC - offset);
}
