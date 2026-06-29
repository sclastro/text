// Tool 10: 中文數字 ↔ 阿拉伯數字 + 財務大寫
const SETS = {
  normal: { digits: '零一二三四五六七八九', units: ['', '十', '百', '千'], mags: ['', '萬', '億', '兆'] },
  fin:    { digits: '零壹貳參肆伍陸柒捌玖', units: ['', '拾', '佰', '仟'], mags: ['', '萬', '億', '兆'] },
};

// integer (as string of digits) -> chinese, using given set.
// Digit-by-digit with a pending-zero flag; magnitudes (萬/億/兆) added at
// group boundaries only when the group is non-zero.
function intToChinese(numStr, set) {
  numStr = numStr.replace(/^0+/, '') || '0';
  if (numStr === '0') return set.digits[0];
  const n = numStr.length;
  let result = '';
  let zeroPending = false;
  for (let i = 0; i < n; i++) {
    const d = +numStr[i];
    const pos = n - 1 - i;            // position counted from the right
    const unitInGroup = pos % 4;      // 0..3 within a 4-digit group
    const groupIdx = Math.floor(pos / 4); // 0=個, 1=萬, 2=億, 3=兆
    if (d === 0) {
      zeroPending = true;
    } else {
      if (zeroPending && result) result += set.digits[0];
      zeroPending = false;
      result += set.digits[d] + set.units[unitInGroup];
    }
    if (unitInGroup === 0 && groupIdx > 0) {
      const groupDigits = numStr.slice(Math.max(0, i - 3), i + 1);
      if (parseInt(groupDigits, 10) !== 0) { result += set.mags[groupIdx]; zeroPending = false; }
    }
  }
  if (set === SETS.normal) result = result.replace(/^一十/, '十');
  return result;
}

function arabicToChinese(input, fin) {
  const set = fin ? SETS.fin : SETS.normal;
  let s = input.trim().replace(/,/g, '');
  let neg = false;
  if (s[0] === '-') { neg = true; s = s.slice(1); }
  if (!/^\d+(\.\d+)?$/.test(s)) throw new Error('請輸入有效數字');
  const [intPart, decPart] = s.split('.');
  let out;
  if (fin) {
    out = intToChinese(intPart, set) + '元';
    if (decPart && /[1-9]/.test(decPart)) {
      const jiao = +decPart[0], fen = +(decPart[1] || 0);
      if (jiao) out += set.digits[jiao] + '角';
      else out += set.digits[0];
      if (fen) out += set.digits[fen] + '分';
      else out = out.replace(/$/, '整').replace('角整', '角');
      out = out.replace(/整$/, '');
      if (!/[角分]$/.test(out)) out += '整';
    } else out += '整';
  } else {
    out = intToChinese(intPart, set);
    if (decPart) out += '點' + [...decPart].map(d => set.digits[+d]).join('');
  }
  return (neg ? '負' : '') + out;
}

const VAL = { 零:0, 〇:0, 一:1, 壹:1, 二:2, 貳:2, 两:2, 兩:2, 三:3, 參:3, 叁:3, 四:4, 肆:4, 五:5, 伍:5, 六:6, 陸:6, 七:7, 柒:7, 八:8, 捌:8, 九:9, 玖:9 };
const UNIT = { 十:10, 拾:10, 百:100, 佰:100, 千:1000, 仟:1000 };
const MAG = { 萬:1e4, 万:1e4, 億:1e8, 亿:1e8, 兆:1e12 };

function chineseToArabic(input) {
  let s = input.trim().replace(/元|圓|整|塊|毛/g, '');
  let neg = false;
  if (/^[負负]/.test(s)) { neg = true; s = s.slice(1); }
  const [intStr, decStr] = s.split(/[點点\.]/);
  let total = 0, section = 0, current = 0;
  for (const ch of intStr) {
    if (ch in VAL) current = VAL[ch];
    else if (ch in UNIT) {
      const u = UNIT[ch];
      if (ch === '十' || ch === '拾') section += (current || 1) * u;
      else section += current * u;
      current = 0;
    } else if (ch in MAG) {
      section += current;
      total += section * MAG[ch];
      section = 0; current = 0;
    } else if (ch === ' ') continue;
    else throw new Error('無法辨識的字元：' + ch);
  }
  total += section + current;
  let result = String(total);
  if (decStr) result += '.' + [...decStr].map(c => VAL[c] ?? '').join('');
  return (neg ? '-' : '') + result;
}

export function init() {
  const input = document.getElementById('cn-input');
  const output = document.getElementById('cn-output');
  const status = document.getElementById('cn-status');
  document.getElementById('cn-run').addEventListener('click', () => {
    status.textContent = ''; status.className = 'status-line';
    try {
      const mode = document.getElementById('cn-mode').value;
      if (mode === 'a2c') output.value = arabicToChinese(input.value, false);
      else if (mode === 'a2f') output.value = arabicToChinese(input.value, true);
      else output.value = chineseToArabic(input.value);
    } catch (e) {
      status.className = 'status-line error'; status.textContent = '✗ ' + e.message; output.value = '';
    }
  });
}
