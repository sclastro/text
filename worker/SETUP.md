# 檔案中轉站 — 設定教學

手機擺低檔案，電腦幾時得閒都可以攞返（或者相反）。唔使經 Google Drive，
檔案存喺**你自己嘅** Cloudflare 帳戶，到期自動刪除。

- **唔使信用卡**
- **免費**：1 GB 儲存、每日 10 萬次下載、1,000 次上載
- **單檔上限 24 MB**（Word／Excel／相片綽綽有餘）

全程喺網頁做，唔使安裝任何嘢。大概 10 分鐘。

---

## 第 1 步：開 Cloudflare 帳戶

1. 去 **https://dash.cloudflare.com/sign-up**
2. 入你嘅電郵同一個密碼 → 撳 **Sign Up**
3. 去電郵收驗證信，撳入面條連結啟用帳戶
4. 如果佢問你要加網域（domain），**可以跳過** —— 我哋唔需要自己嘅網域

> 💡 唔使畀信用卡。如果有任何地方要求付款資料，即係你撳錯咗去 R2 或者付費方案，退返出嚟。

---

## 第 2 步：開一個 KV 儲存空間

KV 就係放檔案嗰度。

1. 喺左邊選單搵 **Storage & Databases**（有啲版本叫 **Workers & Pages**）→ **KV**
2. 撳 **Create a namespace**（或 **Create**）
3. 名隨便改，例如 `file-relay`
4. 撳 **Add** / **Create**

搞掂。你會見到清單多咗一行。

---

## 第 3 步：整個 Worker

Worker 就係負責收檔案同派檔案嘅小程式。

1. 左邊選單撳 **Compute (Workers)** 或 **Workers & Pages**
2. 撳 **Create** → 揀 **Start with Hello World!**（或者 **Create Worker**）
3. 改個名，例如 `file-relay`
4. 撳 **Deploy**（先部署個預設版本，下一步先換成我哋嘅程式碼）
5. 部署完之後撳 **Edit code**（或 **Continue to project** → **Edit code**）
6. 將編輯器入面**全部**原有程式碼刪清光
7. 打開呢個檔案 👉 [`worker/file-relay.js`](./file-relay.js)，**全部複製**，貼入去
8. 撳右上角 **Deploy**

部署完會畀個網址你，樣子好似：

```
https://file-relay.你個名.workers.dev
```

**將呢條網址抄低**，第 6 步要用。

---

## 第 4 步：將 KV 接駁去 Worker

而家個 Worker 仲未知道去邊度攞儲存空間。

1. 喺你個 Worker 頁面撳 **Settings** → **Bindings**
2. 撳 **Add** → 揀 **KV namespace**
3. 填：
   - **Variable name**：`FILES` ← ⚠️ **一定要係大階 `FILES`，唔可以改**
   - **KV namespace**：揀返第 2 步整嗰個（`file-relay`）
4. 撳 **Deploy** / **Save**

---

## 第 5 步：設定通行碼

呢個係你嘅密碼。冇咗佢，全世界都可以用你個中轉站擺嘢。

1. 同一個 **Settings** → **Variables and Secrets**（或 **Bindings**）
2. 撳 **Add** → 類型揀 **Secret**（⚠️ **唔好揀 Plaintext** —— Secret 先會加密）
3. 填：
   - **Variable name**：`PASSPHRASE` ← ⚠️ **一定要係大階 `PASSPHRASE`**
   - **Value**：你自己諗一個長少少嘅通行碼，例如 `hoeng1gong2-2026-mou5jan4zi1`
4. 撳 **Deploy** / **Save**

> 🔑 呢個通行碼要記住，第 6 步同每次用都要入。建議存喺密碼管理器。

### （選用）調整設定

同一頁可以加呢兩個普通變數（Plaintext，唔係 Secret）：

| 變數名稱 | 預設 | 作用 |
|---|---|---|
| `EXPIRE_DAYS` | `7` | 幾多日之後自動刪除 |
| `MAX_MB` | `24` | 單檔上限（唔好調高過 24） |

---

## 第 6 步：喺工具箱入面接駁

1. 開 **https://sclastro.github.io/text/**
2. 左邊揀 **檔案中轉站**
3. 填：
   - **Worker 網址**：第 3 步嗰條 `https://file-relay.xxx.workers.dev`
   - **通行碼**：第 5 步設嗰個
4. 撳 **儲存並測試連線**

見到 `✓ 連線成功（單檔上限 24 MB，7 日後自動刪除）` 就成功喇 🎉

喺手機同電腦各做一次（設定只存喺該部機嘅瀏覽器，唔會傳去任何地方）。

---

## 點樣用

| 想做 | 點做 |
|---|---|
| 手機 → 電腦 | 手機開工具箱 → 檔案中轉站 → 揀／拖檔案上載。之後電腦開同一版，撳「下載」 |
| 電腦 → 手機 | 一樣，方向調轉 |
| 唔想等佢自動過期 | 撳「刪除」即刻清走 |

---

## 有咩唔妥？

| 情況 | 原因 / 解決 |
|---|---|
| `通行碼唔啱` | 通行碼打錯，或者 Secret 名唔係大階 `PASSPHRASE` |
| `未設定 KV 綁定` | 第 4 步個 Variable name 唔係大階 `FILES` |
| `未設定 PASSPHRASE 密鑰` | 第 5 步未做，或者部署後未生效 —— 改完記得撳 Deploy |
| 上載完，另一部機睇唔到 | KV 全球同步最多要一分鐘，等陣再撳「重新整理清單」 |
| `檔案太大` | 單檔上限 24 MB，超過就要用其他方法 |
| 完全連唔到 | 確認 Worker 網址冇打錯、冇多咗尾斜線；試吓喺瀏覽器直接開條網址（應該見到 `{"error":"通行碼唔啱"}`，咁即係個 Worker 生效緊） |

---

## 安全同私隱

- **通行碼用 Secret 儲存**，加密，喺程式碼度睇唔到
- **所有操作都要通行碼**，包括列表同下載
- **檔案自動過期**，到期由 Cloudflare 自動刪除
- **你嘅設定只存喺你部機嘅 localStorage**，唔會傳去第三方
- 檔案存喺你自己嘅 Cloudflare 帳戶，除咗你冇人掂到

⚠️ **唔好將通行碼寫喺公開地方**（例如 commit 入 GitHub）。如果懷疑洩漏咗，去 Settings 改咗個 Secret 再 Deploy 就即刻失效。

⚠️ 呢個係方便用嘅中轉站，**唔係加密保險箱**。真係好敏感嘅嘢（身份證、銀行資料），建議先自己加密再上載。
