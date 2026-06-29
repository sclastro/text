// Tool 2: 全形／半形轉換
function toHalf(str, includePunct) {
  return str.replace(/[！-～]/g, c => {
    const half = String.fromCharCode(c.charCodeAt(0) - 0xFEE0);
    if (!includePunct && !/[A-Za-z0-9]/.test(half)) return c;
    return half;
  }).replace(/　/g, includePunct ? ' ' : '　');
}
function toFull(str, includePunct) {
  return str.replace(/[!-~]/g, c => {
    if (!includePunct && !/[A-Za-z0-9]/.test(c)) return c;
    return String.fromCharCode(c.charCodeAt(0) + 0xFEE0);
  }).replace(/ /g, includePunct ? '　' : ' ');
}

export function init() {
  const input = document.getElementById('fw-input');
  const output = document.getElementById('fw-output');
  const punct = document.getElementById('fw-punct');
  document.getElementById('fw-to-half').addEventListener('click',
    () => { output.value = toHalf(input.value, punct.checked); });
  document.getElementById('fw-to-full').addEventListener('click',
    () => { output.value = toFull(input.value, punct.checked); });
}
