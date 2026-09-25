# CLAUDE.md

本文件供 Claude Code 在此 repo 工作時參考。

## 專案概要

「中文工具箱 · Chinese Text Toolbox」：純前端中文文字處理工具箱，共 26 個工具，全部在瀏覽器本地運行，支援 PWA 安裝及離線使用。唯一的後端是「檔案中轉站」所用的 Cloudflare Worker，由使用者自行部署於自己的 Cloudflare 帳戶。

- 網站：https://sclastro.github.io/text/
- 使用者說明：`README.md`；Worker 部署教學：`worker/SETUP.md`

## 分支與部署

- 主要開發分支為 `claude/chinese-text-toolkit-x0gyqt`（repo 暫無 `main`，亦無 PR）。
- `.github/workflows/deploy.yml` 只在推送至 `claude/chinese-text-toolkit-x0gyqt` 時觸發，將整個 repo 根目錄（`path: '.'`）部署至 GitHub Pages。推送至其他分支**不會**更新網站。
- 因整個根目錄都會公開，切勿提交任何密碼、通行碼或私人設定。
- Cloudflare Worker（`worker/file-relay.js`）**不經** GitHub 部署；修改後須由使用者手動貼入 Cloudflare 網頁編輯器再按 Deploy。

## 本地運行

使用 ES modules，須經 HTTP 伺服器開啟，不可直接用 `file://`：

```bash
python3 -m http.server 8000
```

無建置步驟、無 `package.json`、無測試框架。以往的驗證方式是用 Playwright（環境已預裝 Chromium）開啟本地伺服器逐項測試，並非 repo 內的測試檔。

## 檔案結構

```
index.html        介面骨架：側邊欄（.nav-item[data-tool]）、各工具面板（#panel-<id>）、CDN script
css/style.css     樣式、深色／淺色主題、響應式
js/main.js        工具清單 TOOLS、導覽、主題、懶載入、複製／下載／匯入共用邏輯、Service Worker 註冊
js/tools/<id>.js  每個工具一個 ES module，匯出 init()
data/cangjie.js   倉頡碼資料
worker/           檔案中轉站的 Cloudflare Worker 及設定教學
manifest.json     PWA 設定
sw.js             Service Worker（app shell 快取優先；CDN 網絡優先）
icons/            App 圖示
```

## 慣例

**新增工具**須同時修改以下各處，缺一不可：

1. `js/tools/<id>.js`：新模組，匯出 `init()`（首次開啟面板時由 `main.js` 動態 `import` 並呼叫一次）。
2. `index.html`：側邊欄加 `<li class="nav-item" data-tool="<id>">`，並加 `<section id="panel-<id>" class="tool-panel" hidden>`。
3. `js/main.js`：`TOOLS` 陣列加一項（`id`、`name`、`cat`）。
4. `sw.js`：`PRECACHE` 加 `js/tools/<id>.js`。
5. `README.md`：功能清單及工具總數。

**Service Worker 版本**：凡修改任何會被快取的檔案（HTML、CSS、JS、資料、圖示），必須將 `sw.js` 的 `VERSION` 加一（現為 `v10`），否則已安裝的使用者不會取得更新。

**第三方 library** 一律由 CDN（jsDelivr／cdnjs）載入，不引入打包工具。部分於 `index.html` 以 `<script>` 載入，部分由工具模組按需載入（例如電子書工具的 foliate-js、PDF 分拆的 pdf-lib 及 pdf.js）。PDF 分拆的 ZIP 由 `pdfsplit.js` 內的簡單 ZIP writer 產生（不壓縮、UTF-8 檔名），毋須額外 library。

**檔案匯出**：下載統一經 `main.js` 的共用函式處理（優先 `showSaveFilePicker`，否則用 app 內對話框）。呼叫原生儲存對話框前不可有任何 `await`，否則會失去 user activation 而被瀏覽器拒絕。表格類匯出 CSV 須加 BOM。

**PDF 匯出**一律經瀏覽器列印引擎，不可改用 html2canvas／html2pdf：後者輸出無文字層，而且長文（約 5 萬字以上）會因 canvas 面積上限而靜默輸出空白檔。

**`hidden` 屬性**：`style.css` 有 `[hidden]{display:none!important}`。功能性的 `<input type="file">` 不可用 `hidden`，應用 `.sr-only`。

**檔案中轉站**（`js/tools/relay.js` ＋ `worker/file-relay.js`）：
- Worker 網址及通行碼只存於使用者瀏覽器的 `localStorage`（鍵名 `relay-config`），repo 內沒有，亦不應寫入 repo。
- Worker 綁定名稱固定：KV 為 `FILES`，Secret 為 `PASSPHRASE`；選用變數 `MAX_MB`（上限 24，受 KV 單值 25 MB 所限）及 `EXPIRE_DAYS`（預設 7）。
- API：`POST /api/upload`、`GET /api/list`、`GET|DELETE /api/file/:id`、`GET /api/ping`，全部須 `X-Auth` 標頭。中文檔名經 `X-Filename` 以 `encodeURIComponent` 傳送。
- 採用 Workers KV 而非 R2，因為 R2 即使在免費額度內亦須登記信用卡。
- KV 屬最終一致，上載／刪除後約 60 秒內 `list()` 仍可能傳回舊清單。前端以本機的 `added`／`removed` 紀錄修正清單（保留兩分鐘），因此上載或刪除後不應只靠重新讀取清單來更新畫面。

## 語言

介面文字、說明文件（README、`worker/SETUP.md`）、Worker 錯誤訊息及程式註解，一律以繁體中文**標準書面語**撰寫，不用粵語口語（例如用「不」「的」「在」「按」「選擇」，不用「唔」「嘅」「喺」「㩒」「揀」），並避免「進行」「作出」「被」等歐化句式。技術名詞及程式碼保留英文。提交訊息亦以繁體中文撰寫。
