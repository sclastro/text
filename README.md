# 中文工具箱 · Chinese Text Toolbox

純前端文字及檔案處理工具箱，全部功能在瀏覽器本地運行，**無需後端或 API Key**。支援安裝為 PWA（可加到手機主畫面）。

## 檔案匯入／匯出

各工具均可讀入及儲存檔案，毋須依賴複製貼上：

- **匯入**：每個工具都有「📂 載入檔案」按鈕，亦可直接將檔案**拖放**到輸入框
- **匯出**：每項輸出都有「下載」按鈕，按下後會**彈出儲存視窗**，可修改檔名、副檔名及儲存位置
  - Chrome／Edge／Android Chrome：開啟系統原生「另存為」對話框（可選擇資料夾）
  - Safari／Firefox：開啟 App 內對話框（可修改檔名及副檔名，位置由瀏覽器決定）
  - 文字結果 → `.txt`
  - JSON 工具 → `.json`
  - Base64／URL／亂碼修復的解碼結果 → 若內容為有效 JSON，會**自動存為 `.json`**，否則存為 `.txt`
  - 表格類（時區、單位、Unicode、字頻、CSV）→ `.csv`（附 BOM，以 Excel 開啟中文不會亂碼）
  - Markdown → `.md` 原稿、`.html` 或 PDF
  - 倉頡查詢 → `.txt` 碼表；QR Code → `.png`

### PDF 匯出為何採用瀏覽器列印

PDF 匯出（Markdown 及電子書）一律經瀏覽器的列印引擎，不用 html2canvas 截圖。
截圖產生的 PDF 沒有文字層（無法選取、無法搜尋），檔案大數倍；而且 canvas 有面積上限
（約 268 MP），實測約三至五萬字後 `toDataURL` 便會無聲失敗，匯出空白檔案而不報錯。
列印引擎使用系統中文字型，輸出為真文字，十萬字的書籍亦無問題。

## 功能（26 個工具）

### 文字處理
- **字數統計** — 字元、中文字、英文詞、段落、預估閱讀時間
- **全形／半形轉換** — Ａ１ ↔ A1
- **標點格式化** — 統一引號（「」『』）、修正省略號／破折號、清理空白
- **清除多餘空白** — 移除空行、零寬字元，統一換行

### 語言
- **拼音／粵拼** — 輸入中文字，輸出普通話拼音或粵拼（注音／純拼音顯示）
- **繁簡轉換** — 繁體（台灣／香港）↔ 簡體（OpenCC 詞彙級）

### 格式轉換
- **Markdown 預覽** — 即時預覽，可匯出 PDF 及複製 HTML
- **CSV 表格** — 將 CSV 文字或檔案解析為表格，可複製為 Markdown 表格
- **JSON 格式化** — 格式化／壓縮／驗證
- **中文數字** — 阿拉伯數字 ↔ 中文（一二三）↔ 財務大寫（壹貳參）

### 實用工具
- **QR Code 生成** — 自訂尺寸／顏色／容錯，可下載 PNG
- **時區轉換** — 多時區對照，顯示星期
- **單位換算** — 長度／重量／溫度／面積，包括港式單位（斤、両、呎）
- **短網址還原** — 還原短網址（受瀏覽器 CORS 限制）
- **抽獎轉盤** — 輸入學號範圍（可剔除缺席者），轉盤停下時指針所指的學號即為抽中者；可設定抽中後移除（不會重複），支援全螢幕投影及空白鍵抽獎，已抽紀錄在重新開啟頁面後仍會保留

### 檔案工具
- **檔案格式偵測** — 讀取檔頭簽章（magic number）辨認真實格式，不依賴副檔名；可找出副檔名與實際格式不符的檔案
- **電子書轉 PDF** — MOBI／AZW3／EPUB／FB2／CBZ，本機解析，輸出真文字 PDF（可選取、可搜尋）
- **PDF 分拆** — 將一個 PDF 分成若干份，每份自訂起訖頁數（可在縮圖上點選），可逐份下載或全部打包為 ZIP；設有縮圖及放大預覽，全在本機處理
- **檔案中轉站** — 手機上載，電腦下載（反之亦可）。經你自己的 Cloudflare Worker 傳送，到期自動刪除。設定步驟見 [`worker/SETUP.md`](worker/SETUP.md)（毋須信用卡）

### 中文特色
- **農曆／公曆換算** — 互相換算，顯示星期、生肖、干支、節氣
- **倉頡／速成查詢** — 輸入中文字，顯示每字的倉頡碼組合

### 額外工具
- **Base64 編碼** · **URL 編碼** · **亂碼修復** · **Unicode 查詢** · **字頻分析**

## 使用方法

本網站為純靜態網頁，但由於使用 ES modules，須經 HTTP 伺服器開啟（不可直接用 `file://`）：

```bash
python3 -m http.server 8000
# 開啟 http://localhost:8000
```

亦可部署到任何靜態網站主機（GitHub Pages、Netlify、Cloudflare Pages 等）。

### 安裝為 App（PWA）

以手機或電腦瀏覽器開啟網站後：
- **iOS Safari**：分享 → 加入主畫面
- **Android Chrome**：選單 → 安裝應用程式（或會自動彈出安裝提示）
- **桌面 Chrome／Edge**：網址列右側的安裝圖示

安裝後會有獨立的 App 圖示，以全螢幕運行，並支援離線開啟（app shell 由 Service Worker 快取，第三方 CDN library 在首次連線後亦會快取）。

## 技術

- 純 HTML / CSS / JavaScript（ES modules），無建置步驟
- 第三方 library 由 CDN 載入（jsDelivr / cdnjs），首次載入後由瀏覽器快取：
  OpenCC-JS、pinyin-pro、to-jyutping、Marked、DOMPurify、qrcodejs、lunar-javascript、PapaParse、foliate-js（電子書解析）、pdf-lib（PDF 分拆）、pdf.js（PDF 預覽）
- 倉頡資料內建於 `data/cangjie.js`（來源：[ikwbb/cangjie-practice-tool](https://github.com/ikwbb/cangjie-practice-tool)）

## 檔案結構

```
index.html        — 介面骨架、側邊欄、CDN script
worker/           — 檔案中轉站的 Cloudflare Worker 及設定教學
css/style.css     — 樣式、深色／淺色主題、響應式
js/main.js        — 導覽、主題切換、工具懶載入、Service Worker 註冊
js/tools/*.js     — 每個工具一個模組
data/cangjie.js   — 倉頡碼資料
manifest.json     — PWA 設定（名稱、圖示、主題色）
sw.js             — Service Worker（快取 app shell，支援離線）
icons/            — App 圖示（16／32／180／192／512，含 maskable 版本）
```
