// Tool 15: 農曆／公曆換算 (lunar-javascript)
function card(label, value) {
  return `<div class="info-card"><div class="label">${label}</div><div class="value">${value}</div></div>`;
}
const WEEK = ['日', '一', '二', '三', '四', '五', '六'];

export function init() {
  const mode = document.getElementById('lu-mode');
  const solarFields = document.getElementById('lu-solar-fields');
  const lunarFields = document.getElementById('lu-lunar-fields');
  const out = document.getElementById('lu-output');
  const status = document.getElementById('lu-status');
  const dateInput = document.getElementById('lu-date');
  if (!dateInput.value) dateInput.value = new Date().toISOString().slice(0, 10);

  mode.addEventListener('change', () => {
    const s2l = mode.value === 's2l';
    solarFields.hidden = !s2l; lunarFields.hidden = s2l;
  });

  document.getElementById('lu-run').addEventListener('click', () => {
    status.textContent = ''; status.className = 'status-line'; out.innerHTML = '';
    if (typeof Solar === 'undefined' || typeof Lunar === 'undefined') {
      status.className = 'status-line error'; status.textContent = '✗ lunar-javascript 未載入'; return;
    }
    try {
      let solar, lunar;
      if (mode.value === 's2l') {
        const [y, m, d] = dateInput.value.split('-').map(Number);
        solar = Solar.fromYmd(y, m, d);
        lunar = solar.getLunar();
      } else {
        const y = +document.getElementById('lu-ly').value;
        let m = +document.getElementById('lu-lm').value;
        const d = +document.getElementById('lu-ld').value;
        if (document.getElementById('lu-leap').checked) m = -m;
        lunar = Lunar.fromYmd(y, m, d);
        solar = lunar.getSolar();
      }
      const jq = lunar.getJieQi();
      out.innerHTML =
        card('公曆', `${solar.getYear()}年${solar.getMonth()}月${solar.getDay()}日`) +
        card('農曆', `${lunar.getYearInGanZhi()}年 ${lunar.getMonthInChinese()}月${lunar.getDayInChinese()}`) +
        card('星期', '星期' + WEEK[solar.getWeek()]) +
        card('生肖', lunar.getYearShengXiao()) +
        card('干支（年）', lunar.getYearInGanZhi()) +
        card('干支（日）', lunar.getDayInGanZhi()) +
        (jq ? card('節氣', jq) : '') +
        (lunar.getFestivals().length ? card('農曆節日', lunar.getFestivals().join('、')) : '') +
        (solar.getFestivals().length ? card('公曆節日', solar.getFestivals().join('、')) : '');
    } catch (e) {
      status.className = 'status-line error'; status.textContent = '✗ ' + e.message;
    }
  });
}
