// Tool 1: 字數統計
const CJK = /[㐀-鿿豈-﫿]/g;
const LATIN_WORD = /[A-Za-z0-9_À-ɏ]+/g;

export function init() {
  const input = document.getElementById('wc-input');
  const update = () => {
    const t = input.value;
    const chars = [...t].length;
    const nospace = [...t.replace(/\s/g, '')].length;
    const cjk = (t.match(CJK) || []).length;
    const words = (t.match(LATIN_WORD) || []).length;
    const lines = t === '' ? 0 : t.split('\n').length;
    const paras = t.split(/\n\s*\n/).filter(p => p.trim()).length;
    // reading: Chinese ~400 chars/min, English ~200 words/min
    const minutes = cjk / 400 + words / 200;
    const time = minutes < 1 && minutes > 0 ? '< 1 分鐘' : `${Math.ceil(minutes)} 分鐘`;
    set('wc-chars', chars); set('wc-nospace', nospace); set('wc-cjk', cjk);
    set('wc-words', words); set('wc-lines', lines); set('wc-paras', paras);
    set('wc-time', minutes === 0 ? '0 分鐘' : time);
  };
  input.addEventListener('input', update);
  update();
}
function set(id, v) { document.getElementById(id).textContent = v; }
