// 抽獎轉盤 — 輸入學號範圍，轉盤轉完指針指住邊個就係邊個。
// 抽中邊個喺轉之前已經用 crypto.getRandomValues 公平決定，
// 動畫只係將轉盤停喺嗰格（停喺格內隨機位置，唔會次次正中）。
// 設定同已抽紀錄存喺 localStorage，重開頁面唔會唔見。

const KEY = 'wheel-state';
const MAX = 200;
const COLORS = ['#2563eb', '#dc2626', '#16a34a', '#d97706', '#7c3aed', '#0891b2', '#db2777', '#4d7c0f'];

const load = () => { try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch { return {}; } };
const save = s => { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* 私隱模式 */ } };

const TAU = Math.PI * 2;
const mod = (a, n) => ((a % n) + n) % n;

// 0 ≤ 結果 < n，冇 modulo bias
function randInt(n) {
  const buf = new Uint32Array(1), limit = Math.floor(0x100000000 / n) * n;
  do crypto.getRandomValues(buf); while (buf[0] >= limit);
  return buf[0] % n;
}

// 「5, 12, 20-22」→ Set{5,12,20,21,22}；全形數字同中文標點都接受
function parseList(text) {
  const out = new Set(), bad = [];
  const norm = text.replace(/[０-９]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
    .replace(/[－—～~至]/g, '-');
  for (const tok of norm.split(/[\s,，、;；]+/).filter(Boolean)) {
    const m = tok.match(/^(\d+)(?:-(\d+))?$/);
    if (!m) { bad.push(tok); continue; }
    let a = +m[1], b = m[2] ? +m[2] : a;
    if (a > b) [a, b] = [b, a];
    if (b - a > 10000) { bad.push(tok); continue; }
    for (let k = a; k <= b; k++) out.add(k);
  }
  return { set: out, bad };
}

export function init() {
  const $ = id => document.getElementById(id);
  const fromIn = $('wh-from'), toIn = $('wh-to'), exIn = $('wh-exclude');
  const noRep = $('wh-norepeat'), sound = $('wh-sound');
  const info = $('wh-info'), stage = $('wh-stage'), canvas = $('wh-canvas');
  const spinBtn = $('wh-spin'), result = $('wh-result'), hist = $('wh-history');
  const ctx = canvas.getContext('2d');

  const saved = load();
  if (Number.isFinite(saved.from)) fromIn.value = saved.from;
  if (Number.isFinite(saved.to)) toIn.value = saved.to;
  exIn.value = saved.exclude || '';
  if (typeof saved.norepeat === 'boolean') noRep.checked = saved.norepeat;
  if (typeof saved.sound === 'boolean') sound.checked = saved.sound;

  let drawn = Array.isArray(saved.drawn) ? saved.drawn.filter(Number.isInteger) : [];
  let pool = [];          // 轉盤上而家有嘅學號
  let rot = 0;            // 轉盤角度（弧度）
  let spinning = false;
  let holdLast = false;   // 啱啱抽中嗰個先留喺轉盤，等大家睇清楚，下次轉先移走

  const persist = () => save({
    from: +fromIn.value, to: +toIn.value, exclude: exIn.value,
    norepeat: noRep.checked, sound: sound.checked, drawn,
  });

  const setInfo = (msg, kind = '') => {
    info.className = 'status-line' + (kind ? ' ' + kind : '');
    info.textContent = msg;
  };

  function computePool() {
    const a = parseInt(fromIn.value, 10), b = parseInt(toIn.value, 10);
    if (!Number.isInteger(a) || !Number.isInteger(b)) return { err: '請輸入學號範圍。' };
    if (a > b) return { err: '「由」嘅學號唔可以大過「至」。' };
    if (b - a + 1 > MAX) return { err: `最多 ${MAX} 個學號。` };
    const { set: ex, bad } = parseList(exIn.value);
    const done = new Set(noRep.checked ? drawn : []);
    if (holdLast && drawn.length) done.delete(drawn[drawn.length - 1]);
    const list = [];
    for (let k = a; k <= b; k++) if (!ex.has(k) && !done.has(k)) list.push(k);
    return { list, bad, total: b - a + 1 - [...ex].filter(k => k >= a && k <= b).length };
  }

  function update() {
    if (spinning) return;
    const r = computePool();
    if (r.err) { pool = []; setInfo('✗ ' + r.err, 'error'); draw(); spinBtn.disabled = true; return; }
    pool = r.list;
    const left = holdLast ? pool.length - 1 : pool.length;
    if (r.bad.length) setInfo(`✗ 睇唔明：${r.bad.join('、')}（格式例如 5, 12, 20-22）`, 'error');
    else if (!left && noRep.checked && r.total) setInfo('全部學號已經抽晒。㩒「重設」重新開始。', 'success');
    else if (!r.total) setInfo('✗ 冇學號可以抽。', 'error');
    else setInfo(noRep.checked
      ? `轉盤上有 ${left} 個學號（全班 ${r.total} 個，已抽 ${r.total - left} 個）`
      : `轉盤上有 ${pool.length} 個學號（可重複抽中）`);
    spinBtn.disabled = !(noRep.checked ? left : pool.length);
    draw();
  }

  /* ---------- 畫轉盤 ---------- */

  function fit() {
    const size = canvas.clientWidth;
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    if (canvas.width !== Math.round(size * dpr)) {
      canvas.width = canvas.height = Math.round(size * dpr);
    }
    draw();
  }

  function draw() {
    const W = canvas.width;
    if (!W) return;
    const c = W / 2, R = c * 0.97;
    ctx.clearRect(0, 0, W, W);
    const n = pool.length;
    if (!n) {
      ctx.beginPath(); ctx.arc(c, c, R, 0, TAU);
      ctx.fillStyle = '#94a3b8'; ctx.fill();
      return;
    }
    const seg = TAU / n;
    // 數字一律企直寫，投影時邊個角度都睇得清楚
    const tr = R * (n <= 8 ? 0.62 : 0.8);
    const fs = Math.max(10, Math.min(R * 0.14, tr * seg * 0.6));
    ctx.font = `700 ${fs}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let i = 0; i < n; i++) {
      const a0 = rot + i * seg;
      // 最後一格唔好同第一格同色
      let col = COLORS[i % COLORS.length];
      if (i === n - 1 && n > 1 && i % COLORS.length === 0) col = COLORS[3];
      ctx.beginPath();
      ctx.moveTo(c, c);
      ctx.arc(c, c, R, a0, a0 + seg);
      ctx.closePath();
      ctx.fillStyle = col;
      ctx.fill();
      if (n > 1) { ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = Math.max(1, W / 400); ctx.stroke(); }

      const mid = a0 + seg / 2;
      ctx.fillStyle = '#fff';
      ctx.fillText(String(pool[i]), c + Math.cos(mid) * tr, c + Math.sin(mid) * tr);
    }
    ctx.beginPath(); ctx.arc(c, c, R, 0, TAU);
    ctx.strokeStyle = 'rgba(0,0,0,.25)'; ctx.lineWidth = W / 160; ctx.stroke();
  }

  // 指針喺正上方（canvas 角度 -90°）；計返指住第幾格
  const indexAt = r => Math.floor(mod(-Math.PI / 2 - r, TAU) / (TAU / pool.length));

  /* ---------- 音效 ---------- */

  let audio = null;
  function beep(freq, dur, vol = 0.15) {
    if (!sound.checked) return;
    try {
      audio ??= new (window.AudioContext || window.webkitAudioContext)();
      const t = audio.currentTime, o = audio.createOscillator(), g = audio.createGain();
      o.type = 'triangle';
      o.frequency.value = freq;
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g).connect(audio.destination);
      o.start(t); o.stop(t + dur);
    } catch { /* 冇聲都照轉 */ }
  }

  /* ---------- 轉 ---------- */

  function spin() {
    if (spinning) return;
    if (holdLast) { holdLast = false; update(); }
    if (!pool.length || spinBtn.disabled) return;
    audio?.resume?.();

    const k = randInt(pool.length);
    const winner = pool[k];
    const seg = TAU / pool.length;
    const frac = 0.15 + Math.random() * 0.7;   // 停喺格內 15%–85%，避開邊界
    const target = -Math.PI / 2 - (k + frac) * seg;
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const turns = reduce ? 1 : 5 + randInt(3);
    const start = rot;
    const end = start + turns * TAU + mod(target - start, TAU);
    const dur = reduce ? 1200 : 4800 + randInt(1200);
    const t0 = performance.now();
    let lastIdx = indexAt(rot);

    spinning = true;
    spinBtn.disabled = true;
    stage.classList.add('spinning');
    result.textContent = '';
    result.classList.remove('show');

    const frame = now => {
      const t = Math.min((now - t0) / dur, 1);
      const e = 1 - Math.pow(1 - t, 4); // ease-out：開頭快，慢慢停
      rot = start + (end - start) * e;
      draw();
      const idx = indexAt(rot);
      if (idx !== lastIdx) { lastIdx = idx; beep(900, 0.03, 0.08); }
      if (t < 1) { requestAnimationFrame(frame); return; }

      rot = mod(end, TAU);
      spinning = false;
      stage.classList.remove('spinning');
      drawn.push(winner);
      holdLast = noRep.checked;
      persist();
      result.innerHTML = `<span class="wh-num-big">${winner}</span> 號`;
      result.classList.add('show');
      beep(660, 0.18); setTimeout(() => beep(990, 0.35), 140);
      renderHistory();
      update();
    };
    requestAnimationFrame(frame);
  }

  function renderHistory() {
    hist.innerHTML = drawn.length
      ? '已抽：' + drawn.map((d, i) => `<span class="wh-chip${i === drawn.length - 1 ? ' last' : ''}">${d}</span>`).join('')
      : '';
  }

  /* ---------- 事件 ---------- */

  const onSettings = () => { holdLast = false; persist(); update(); };
  [fromIn, toIn, exIn].forEach(el => el.addEventListener('input', onSettings));
  noRep.addEventListener('change', onSettings);
  sound.addEventListener('change', persist);

  spinBtn.addEventListener('click', spin);
  $('wh-reset').addEventListener('click', () => {
    if (spinning) return;
    if (drawn.length && !confirm('清除所有已抽紀錄，全部學號返回轉盤？')) return;
    drawn = []; holdLast = false;
    result.textContent = ''; result.classList.remove('show');
    persist(); renderHistory(); update();
  });

  // 空白鍵／Enter 抽（打緊字嗰陣唔好搶）
  document.addEventListener('keydown', e => {
    if (document.getElementById('panel-wheel').hidden) return;
    if (e.target.closest('input, textarea, select, button')) return;
    if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); spin(); }
  });

  const fullBtn = $('wh-full');
  if (!stage.requestFullscreen) fullBtn.hidden = true;
  fullBtn.addEventListener('click', () => {
    if (document.fullscreenElement) document.exitFullscreen();
    else stage.requestFullscreen().catch(() => {});
  });
  document.addEventListener('fullscreenchange', () => {
    fullBtn.textContent = document.fullscreenElement ? '✕ 離開全螢幕' : '⛶ 全螢幕';
  });

  new ResizeObserver(fit).observe(canvas);
  renderHistory();
  update();
  fit();
}
