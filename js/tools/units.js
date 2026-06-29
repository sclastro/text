// Tool 13: 單位換算 (length/weight/temperature/area, incl. HK units)
const CATS = {
  length: { name: '長度', base: 'm', units: {
    'mm 毫米': 0.001, 'cm 厘米': 0.01, 'm 米': 1, 'km 公里': 1000,
    'in 英吋': 0.0254, 'ft 英尺／呎': 0.3048, 'yd 碼': 0.9144, 'mi 英里': 1609.344, 'nmi 海里': 1852,
  }},
  weight: { name: '重量', base: 'g', units: {
    'mg 毫克': 0.001, 'g 克': 1, 'kg 公斤': 1000, 't 公噸': 1e6,
    'lb 磅': 453.59237, 'oz 盎司': 28.349523125,
    '斤（香港）': 604.78982, '両（香港）': 37.7993638, '斤（市制 500g）': 500,
  }},
  area: { name: '面積', base: 'm2', units: {
    'cm² 平方厘米': 0.0001, 'm² 平方米': 1, 'km² 平方公里': 1e6, 'ha 公頃': 1e4,
    'ft² 平方呎': 0.09290304, 'acre 英畝': 4046.8564224, '坪': 3.305785,
  }},
  temp: { name: '溫度', base: 'C', units: { '°C 攝氏': 'C', '°F 華氏': 'F', 'K 開爾文': 'K' } },
};

function tempTo(value, from, to) {
  let c;
  if (from === 'C') c = value; else if (from === 'F') c = (value - 32) * 5 / 9; else c = value - 273.15;
  if (to === 'C') return c; if (to === 'F') return c * 9 / 5 + 32; return c + 273.15;
}

let current = 'length';

export function init() {
  const tabs = document.getElementById('unit-tabs');
  const fromSel = document.getElementById('unit-from');
  const valInput = document.getElementById('unit-value');
  const out = document.getElementById('unit-output');

  tabs.innerHTML = Object.entries(CATS).map(([k, c]) =>
    `<button class="btn unit-tab" data-cat="${k}">${c.name}</button>`).join('');

  function loadCat(cat) {
    current = cat;
    document.querySelectorAll('.unit-tab').forEach(b =>
      b.classList.toggle('btn-primary', b.dataset.cat === cat));
    fromSel.innerHTML = Object.keys(CATS[cat].units).map(u => `<option>${u}</option>`).join('');
    render();
  }

  function render() {
    const cat = CATS[current];
    const v = parseFloat(valInput.value);
    if (isNaN(v)) { out.innerHTML = ''; return; }
    const from = fromSel.value;
    let html = '<thead><tr><th>單位</th><th>數值</th></tr></thead><tbody>';
    for (const u of Object.keys(cat.units)) {
      let result;
      if (current === 'temp') result = tempTo(v, cat.units[from], cat.units[u]);
      else result = v * cat.units[from] / cat.units[u];
      const display = Math.abs(result) >= 1e-4 && Math.abs(result) < 1e15
        ? +result.toFixed(6) : result.toExponential(4);
      html += `<tr${u === from ? ' style="font-weight:700"' : ''}><td>${u}</td><td>${display}</td></tr>`;
    }
    out.innerHTML = html + '</tbody>';
  }

  tabs.addEventListener('click', e => { const b = e.target.closest('.unit-tab'); if (b) loadCat(b.dataset.cat); });
  fromSel.addEventListener('change', render);
  valInput.addEventListener('input', render);
  loadCat('length');
}
