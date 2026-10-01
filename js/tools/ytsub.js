// YouTube 字幕整理 — 將「顯示字幕記錄」複製出來的文字轉為 SRT。
// 只處理使用者貼上的文字，不連接 YouTube。
// 字幕記錄沒有結束時間，故每段以下一段的開始時間作結束；最後一段按字數估算。

// 0:05、12:34、1:02:03
const TIME = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/;
// 時間與文字在同一行，例如「0:05 各位同學好」
const TIME_INLINE = /^(\d{1,2}:\d{2}(?::\d{2})?)\s+(.+)$/;
// 部分版本附有供螢幕閱讀器讀出的時長，例如「5 seconds」「1 分鐘 5 秒」
const DURATION = /^\d+\s*(seconds?|minutes?|hours?|秒鐘?|分鐘|小時)(,?\s*\d+\s*(seconds?|minutes?|秒鐘?|分鐘))*$/i;
// [音樂]、[Music]、[掌聲] 等；只處理方括號，以免誤刪正文中的括號內容
const TAG = /[\[［][^\]］]{1,12}[\]］]/g;

function toSeconds(stamp) {
  const m = stamp.match(TIME);
  if (!m) return null;
  return m[3] !== undefined ? (+m[1]) * 3600 + (+m[2]) * 60 + (+m[3]) : (+m[1]) * 60 + (+m[2]);
}

function srtTime(sec) {
  const ms = Math.round(sec * 1000);
  const p = (n, w = 2) => String(n).padStart(w, '0');
  return `${p(Math.floor(ms / 3600000))}:${p(Math.floor(ms / 60000) % 60)}:${p(Math.floor(ms / 1000) % 60)},${p(ms % 1000, 3)}`;
}

export function parseTranscript(text, { stripTags = false } = {}) {
  const cues = [];
  let cur = null;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || DURATION.test(line)) continue;
    let start = toSeconds(line), body = '';
    if (start === null) {
      const m = line.match(TIME_INLINE);
      if (m) { start = toSeconds(m[1]); body = m[2]; }
    }
    if (start !== null) {
      cur = { start, lines: body ? [body] : [] };
      cues.push(cur);
    } else if (cur) {
      cur.lines.push(line);
    } // 第一個時間之前的文字（例如面板標題）略過
  }
  // 文字為空的段落（例如移除 [音樂] 後）仍保留，用以界定前一段的結束時間
  return cues.map(c => ({
    start: c.start,
    text: (stripTags ? c.lines.join(' ').replace(TAG, '') : c.lines.join(' ')).replace(/\s+/g, ' ').trim(),
  }));
}

export function toSrt(cues) {
  const out = [];
  cues.forEach((c, i) => {
    if (!c.text) return;
    const next = cues[i + 1];
    // 最後一段：每字約 0.3 秒，介乎 2 至 6 秒
    const end = next ? Math.max(next.start, c.start + 1) : c.start + Math.min(Math.max(c.text.length * 0.3, 2), 6);
    out.push(`${out.length + 1}\n${srtTime(c.start)} --> ${srtTime(end)}\n${c.text}\n`);
  });
  return out.join('\n');
}

export function init() {
  const input = document.getElementById('yt-input');
  const output = document.getElementById('yt-output');
  const status = document.getElementById('yt-status');
  const tags = document.getElementById('yt-tags');

  const setStatus = (msg, kind = '') => {
    status.className = 'status-line' + (kind ? ' ' + kind : '');
    status.textContent = msg;
  };

  document.getElementById('yt-run').addEventListener('click', () => {
    output.value = '';
    if (!input.value.trim()) { setStatus('請先貼上字幕記錄。', 'error'); return; }
    const all = parseTranscript(input.value, { stripTags: tags.checked });
    const cues = all.filter(c => c.text);
    if (!cues.length) {
      setStatus('✗ 找不到時間標記。請確認字幕記錄有顯示時間（例如 0:05），並連同時間一併複製。', 'error');
      return;
    }
    const backwards = cues.some((c, i) => i && c.start < cues[i - 1].start);
    output.value = toSrt(all);
    const last = cues[cues.length - 1].start;
    setStatus(`${backwards ? '⚠' : '✓'} 共 ${cues.length} 段字幕，最後一段始於 ${Math.floor(last / 60)} 分 ${last % 60} 秒`
      + (backwards ? '（注意：部分時間次序顛倒，請檢查是否混入了其他文字）' : ''), backwards ? 'error' : 'success');
  });
}
