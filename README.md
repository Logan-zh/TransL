# DEMOL

Windows 桌面應用程式（**會員版**）：選取文字後，按住 Ctrl 連按兩次 C 呼叫翻譯浮動窗。翻譯服務由 [demol-admin](../demol-admin) 後台管理，會員登入後使用。

## 功能

- 連按兩次 `Ctrl+C` 觸發翻譯浮動窗（0.8 秒內，可在設定改為其他按鍵）
- 按住 `Ctrl` 連按兩次 `Q` **回覆建議**（可在設定中自訂）
- 按住 `Ctrl+Alt` 連按兩次 `D` **翻譯並直接貼上**（可在設定中自訂，例如改為 Alt+C×2 或 F4）
- **Ctrl + Alt + 雙擊 S** 框選螢幕區域（可在設定中自訂）
- **中文** → 英文；**其他語言**（英、韓、日等）→ 繁體中文（自動判斷，由 AI 辨識原文語系）
- **會員登入**：由管理後台建立帳號並指派 OpenAI / Gemini 服務
- Always-on-top 浮動翻譯窗，顯示於游標附近；可 **拖曳標題列** 移開避免遮擋原文
- **拖曳**或**雙擊選字**後，游標旁可顯示 **翻譯小圖示**與關閉按鈕（可在設定關閉）；雙擊開啟 App 不會顯示；點翻譯才複製，不會自動讀剪貼簿
- 翻譯完成後可 **貼上** 譯文、**發音**（播放原文）、或 **修改** 語氣（更自然 / 更專業）、或改譯為 **英文 / 韓文 / 日文**
- 系統匣常駐，右鍵可開啟設定（含快捷鍵自訂）

## 環境需求

- Windows 10 / 11
- Node.js 18+

## 安裝與開發

```bash
npm install
npm run dev
```

首次執行若尚未登入，會自動開啟登入視窗。請先啟動 DEMOL 後台（demol-admin）並建立會員帳號。

```bash
# 另開 terminal 啟動後台（需 Docker）
cd ../demol-admin
docker compose up -d --build
```

## 使用方式

1. 啟動 DEMOL（會常駐系統匣）
2. 在任意應用程式中選取文字
3. 快捷鍵（0.8 秒內連按兩次同一鍵，除截圖外須按住 Ctrl）：
   - **Ctrl + C**：顯示翻譯浮動窗，可再貼上或調整語氣
   - **Ctrl + Alt + D ×2**：直接翻譯並貼回選取位置（不顯示浮動窗）
   - **Ctrl + Alt + S**：拖曳框選螢幕區域 → 辨識、翻譯並合成 **譯文圖**（存剪貼簿）
4. 浮動窗模式下按 `Esc` 或點擊外部關閉

## 測試

```bash
npm test              # 執行 Vitest（API 連線、下載 URL、登入錯誤訊息）
npm run test:watch    # 監聽模式
```

## 打包

```bash
npm run build
npm run dist:win
```

安裝檔會輸出至 `release/` 目錄。若打包時遇到 code signing 權限問題，專案已設定 `signAndEditExecutable: false` 以略過簽章步驟。

## 設定項目

| 項目 | 說明 | 預設值 |
|------|------|--------|
| 開機自動啟動 | 登入 Windows 後常駐系統匣 | 關閉 |

會員帳號與翻譯服務指派請至 DEMOL 管理後台（demol-admin，預設 http://localhost:8080，admin/admin）。

## API 伺服器位址（部署用）

桌面版 **不提供使用者設定** API 位址，改由環境變數 `TRANSL_API_URL` 設定。

**開發／本機建置**：複製 `.env.example` 為 `.env` 後調整：

```bash
TRANSL_API_URL=http://localhost:3000
```

**打包正式版**（建置時寫入）：

```powershell
$env:TRANSL_API_URL="https://api.your-domain.com"
npm run dist:win
```

或在專案根目錄建立 `.env` 再執行 `npm run dist:win`。

**執行時覆寫**（進階）：在啟動 DEMOL 前設定系統環境變數 `TRANSL_API_URL` 可覆蓋建置時的值。

## 快捷鍵

預設可在 **設定 → 快捷鍵** 修改：

| 功能 | 預設 |
|------|------|
| 翻譯浮動窗 | 0.8 秒內連按兩次 Ctrl+C（剪貼簿） |
| 翻譯貼上 | Ctrl+Alt 連按兩次 D |
| 回覆建議 | Ctrl 連按兩次 Q |
| 截圖翻譯 | Ctrl+Alt 連按兩次 S |

## 已知限制

- 透過鍵盤偵測「**0.8 秒內連按兩次 Ctrl+C**」（須實際按兩次 C，非剪貼簿任一變動）；剪貼簿僅有圖片時不觸發
- `Ctrl+Q` 雙擊會先模擬 `Ctrl+C` 取得框選文字，再顯示回覆建議浮動窗（含繁中【理解】與各選項中文說明）
- `Ctrl+Alt+D` 雙擊會先模擬 `Ctrl+C` 取得選取文字，再貼上譯文；需同時按住 Ctrl 與 Alt，較不易與其他 `Ctrl+D` 快捷鍵衝突
- 若雙擊 Ctrl+C 無反應，可先用系統匣 → **翻譯目前剪貼簿** 測試（先 Ctrl+C 複製一次即可）
- 截圖翻譯需使用支援 Vision 的模型（預設 `gpt-4o-mini`、`gemini-2.0-flash` 皆可）
- 截圖內容會送至所設定的 AI API 進行辨識，請留意隱私
- 跨螢幕框選以選區中心所在螢幕為準
- 部分受保護欄位（密碼框）或特殊 UWP 應用可能無法複製
- 翻譯方向：含中文 → 譯英文；不含中文 → 譯繁中（韓文、日文等由模型自動辨識）；混合語句若含中文則走中→英

## 技術棧

- Electron + electron-vite
- React + TypeScript
- electron-store
- koffi（Windows 鍵盤狀態偵測、剪貼簿序號 API）
- @nut-tree-fork/nut-js（模擬 Ctrl+C / Ctrl+V）

## 專案結構

```
demol/
├── electron/           # 主行程、preload、服務模組
├── src/renderer/       # 浮動窗 (overlay)、截圖選區 (capture)、設定 (settings) UI
├── out/                # 建置輸出
├── release/            # Windows 安裝檔輸出
└── package.json
```

## 授權

MIT

## 更新紀錄

詳見 [CHANGELOG.md](CHANGELOG.md)。
