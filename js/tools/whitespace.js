// Tool 4: 清除多餘空白
export function init() {
  const input = document.getElementById('ws-input');
  const output = document.getElementById('ws-output');
  document.getElementById('ws-run').addEventListener('click', () => {
    let s = input.value;
    if (document.getElementById('ws-crlf').checked) s = s.replace(/\r\n?/g, '\n');
    if (document.getElementById('ws-zwsp').checked) s = s.replace(/[​-‍﻿⁠]/g, '');
    if (document.getElementById('ws-multi').checked) s = s.replace(/[ \t]{2,}/g, ' ');
    if (document.getElementById('ws-trail').checked) s = s.split('\n').map(l => l.replace(/[ \t]+$/, '')).join('\n');
    if (document.getElementById('ws-blank').checked) s = s.replace(/\n{3,}/g, '\n\n');
    if (document.getElementById('ws-edges').checked) s = s.replace(/^\s*\n+/, '').replace(/\n+\s*$/, '');
    output.value = s;
  });
}
