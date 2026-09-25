/**
 * 檔案中轉站 — Cloudflare Worker
 * =================================================
 * 手機上載 → 電腦下載（反之亦可）。檔案存於 Cloudflare Workers KV，
 * 到期自動刪除。毋須信用卡，在免費額度內不收費用。
 *
 * 部署設定（在 Cloudflare 網頁介面完成，毋須安裝任何軟件）：
 *   1. KV 綁定  變數名稱必須為  FILES      → 指向你的 KV namespace
 *   2. 密鑰     變數名稱必須為  PASSPHRASE → 自訂的通行碼（須用 Secret，不可用普通變數）
 *   3. （選用）變數 MAX_MB      預設 24；KV 單一值上限為 25 MB，不可高於 24
 *   4. （選用）變數 EXPIRE_DAYS 預設 7；檔案保存日數，到期自動刪除
 *
 * API：
 *   POST   /api/upload      上載（檔案內容放 body，檔名放 X-Filename 標頭，需 X-Auth）
 *   GET    /api/list        列出未過期的檔案（需 X-Auth）
 *   GET    /api/file/:id    下載（需 X-Auth）
 *   DELETE /api/file/:id    刪除（需 X-Auth）
 *   GET    /api/ping        測試通行碼是否正確（需 X-Auth）
 */

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type,X-Auth,X-Filename',
  'Access-Control-Max-Age': '86400',
};

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json; charset=utf-8' },
  });

// 逐字元比較，避免用提早 return 洩漏時間資訊
function sameSecret(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

// 簡短、易讀、不易混淆的代碼（不含 0/O/1/I）
function newId(len = 8) {
  const alphabet = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  const bytes = crypto.getRandomValues(new Uint8Array(len));
  return [...bytes].map(b => alphabet[b % alphabet.length]).join('');
}

// 檔名可以是中文，故經 header 傳送時須 encodeURIComponent
function decodeName(raw) {
  if (!raw) return 'file';
  let name = raw;
  try { name = decodeURIComponent(raw); } catch { /* 未經編碼則直接使用 */ }
  name = name.replace(/[\\/\u0000-\u001f]/g, '_').trim();
  return name.slice(0, 120) || 'file';
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });

    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, '');

    if (!env.FILES) return json({ error: '未設定 KV 綁定（變數名稱須為 FILES）' }, 500);
    if (!env.PASSPHRASE) return json({ error: '未設定 PASSPHRASE 密鑰' }, 500);

    // 除 CORS 預檢外，所有請求均須通行碼
    if (!sameSecret(request.headers.get('X-Auth') || '', env.PASSPHRASE))
      return json({ error: '通行碼錯誤' }, 401);

    const maxBytes = Math.min(Number(env.MAX_MB) || 24, 24) * 1024 * 1024;
    const expireDays = Math.max(Number(env.EXPIRE_DAYS) || 7, 1);
    const ttl = Math.max(expireDays * 86400, 60); // KV 最短 60 秒

    try {
      if (path === '/api/ping')
        return json({ ok: true, maxMB: Math.round(maxBytes / 1048576), expireDays });

      if (path === '/api/upload' && request.method === 'POST') {
        const declared = Number(request.headers.get('Content-Length') || 0);
        if (declared > maxBytes)
          return json({ error: `檔案太大（上限 ${Math.round(maxBytes / 1048576)} MB）` }, 413);

        const body = await request.arrayBuffer();
        if (!body.byteLength) return json({ error: '未收到檔案內容' }, 400);
        if (body.byteLength > maxBytes)
          return json({ error: `檔案太大（上限 ${Math.round(maxBytes / 1048576)} MB）` }, 413);

        const id = newId();
        const meta = {
          name: decodeName(request.headers.get('X-Filename')),
          size: body.byteLength,
          type: request.headers.get('Content-Type') || 'application/octet-stream',
          at: Date.now(),
          exp: Date.now() + ttl * 1000,
        };
        await env.FILES.put(id, body, { expirationTtl: ttl, metadata: meta });
        return json({ ok: true, id, ...meta });
      }

      const fileMatch = path.match(/^\/api\/file\/([A-Z0-9]{4,24})$/i);
      if (fileMatch) {
        const id = fileMatch[1].toUpperCase();

        if (request.method === 'DELETE') {
          await env.FILES.delete(id);
          return json({ ok: true, deleted: id });
        }

        if (request.method === 'GET') {
          const { value, metadata } = await env.FILES.getWithMetadata(id, { type: 'arrayBuffer' });
          if (!value) return json({ error: '找不到此檔案（可能已過期或已刪除）' }, 404);
          const meta = metadata || {};
          const name = meta.name || 'file';
          return new Response(value, {
            headers: {
              ...CORS,
              'Content-Type': meta.type || 'application/octet-stream',
              'Content-Disposition':
                `attachment; filename*=UTF-8''${encodeURIComponent(name)}`,
              'Cache-Control': 'no-store',
            },
          });
        }
      }

      if (path === '/api/list' && request.method === 'GET') {
        const { keys } = await env.FILES.list({ limit: 200 });
        const files = keys.map(k => ({
          id: k.name,
          ...(k.metadata || {}),
          // KV 會自行刪除過期項目，但列表時亦一併過濾
        })).filter(f => !f.exp || f.exp > Date.now());
        files.sort((a, b) => (b.at || 0) - (a.at || 0));
        return json({ ok: true, files, expireDays });
      }

      return json({ error: '無法辨認此路徑' }, 404);
    } catch (err) {
      return json({ error: '伺服器錯誤：' + (err?.message || String(err)) }, 500);
    }
  },
};
