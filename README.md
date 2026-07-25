# 中文工具箱 · Chinese Text Toolbox

純前端中文文字處理工具箱，全部功能喺瀏覽器本地運行，**無需後端或 API Key**。支援安裝做 PWA（可加到手機主畫面）。

## 檔案匯入／匯出

每個工具都可以讀入同儲存檔案，唔使靠複製貼上：

- **匯入**：每個工具都有「📂 載入檔案」按鈕，亦可以直接將檔案**拖放**入輸入框
- **匯出**：每個輸出都有「下載」按鈕，按落去會**彈出儲存視窗**，可以改檔名、副檔名同儲存位置
  - Chrome／Edge／Android Chrome：開啟系統原生「另存為」對話框（可揀資料夾）
  - Safari／Firefox：開啟 app 內對話框（可改檔名同副檔名，位置由瀏覽器決定）
  - 文字結果 → `.txt`
  - JSON 工具 → `.json`
  - Base64／URL／亂碼修復解碼結果 → 若內容係有效 JSON 會**自動存成 `.json`**，否則 `.txt`
  - 表格類（時區、單位、Unicode、字頻、CSV）→ `.csv`（帶 BOM，Excel 開中文唔會亂碼）
  - Markdown → `.md` 原稿、`.html` 或 PDF
  - 倉頡查詢 → `.txt` 碼表；QR Code → `.png`

## 功能（21 個工具）

### 文字處理
- **字數統計** — 字元、中文字、英文詞、段落、預估閱讀時間
- **全形／半形轉換** — Ａ１ ↔ A1
- **標點格式化** — 統一引號（「」『』）、修正省略號／破折號、清理空白
- **清除多餘空白** — 移除空行、零寬字元，統一換行

### 語言
- **拼音／粵拼** — 輸入中文字，輸出普通話拼音或粵拼（注音／純拼音顯示）
- **繁簡轉換** — 繁體（台灣／香港）↔ 簡體（OpenCC 詞彙級）

### 格式轉換
- **Markdown 預覽** — 即時預覽 + 匯出 PDF + 複製 HTML
- **CSV 表格** — 解析 CSV／檔案成表格，可複製為 Markdown 表格
- **JSON 格式化** — 格式化／壓縮／驗證
- **中文數字** — 阿拉伯 ↔ 中文（一二三）↔ 財務大寫（壹貳參）

### 實用工具
- **QR Code 生成** — 自訂尺寸／顏色／容錯，可下載 PNG
- **時區轉換** — 多時區對照，顯示星期
- **單位換算** — 長度／重量／溫度／面積，含港式單位（斤、両、呎）
- **短網址還原** — 還原短網址（受瀏覽器 CORS 限制）

### 中文特色
- **農曆／公曆換算** — 互相換算，顯示星期、生肖、干支、節氣
- **倉頡／速成查詢** — 輸入中文字，顯示每字的倉頡碼組合

### 額外工具
- **Base64 編碼** · **URL 編碼** · **亂碼修復** · **Unicode 查詢** · **字頻分析**

## 使用方法

純靜態網頁，但因使用 ES modules，需透過 HTTP 伺服器開啟（唔可以直接 `file://`）：

```bash
python3 -m http.server 8000
# 開啟 http://localhost:8000
```

或部署到任何靜態網站主機（GitHub Pages、Netlify、Cloudflare Pages 等）。

### 安裝做 App（PWA）

用手機或電腦瀏覽器開啟網站後：
- **iOS Safari**：分享 → 加入主畫面
- **Android Chrome**：選單 → 安裝應用程式（或會自動彈出安裝提示）
- **桌面 Chrome／Edge**：網址列右側嘅安裝圖示

安裝後會有獨立 App 圖示、全螢幕運行，並支援離線開啟（app shell 由 Service Worker 快取，第三方 CDN library 首次連線後都會快取）。

## 技術

- 純 HTML / CSS / JavaScript（ES modules），無建置步驟
- 第三方 library 由 CDN 載入（jsDelivr / cdnjs），首次載入後瀏覽器會快取：
  OpenCC-JS、pinyin-pro、to-jyutping、Marked、DOMPurify、html2pdf.js、qrcodejs、lunar-javascript、PapaParse
- 倉頡資料內建於 `data/cangjie.js`（來源：[ikwbb/cangjie-practice-tool](https://github.com/ikwbb/cangjie-practice-tool)）

## 檔案結構

```
index.html        — 介面骨架、側邊欄、CDN script
css/style.css     — 樣式、深色／淺色主題、響應式
js/main.js        — 導覽、主題切換、工具懶載入、Service Worker 註冊
js/tools/*.js     — 每個工具一個模組
data/cangjie.js   — 倉頡碼資料
manifest.json     — PWA 設定（名稱、圖示、主題色）
sw.js             — Service Worker（快取 app shell，支援離線）
icons/            — App 圖示（16／32／180／192／512，含 maskable 版本）
```
