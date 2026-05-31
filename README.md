# TransL

Windows 桌面應用程式：選取文字後，按住 Ctrl 連按兩次 C 呼叫翻譯浮動窗，透過 OpenAI 或 Google Gemini API 自動翻譯。

## 功能

- 連按兩次 `Ctrl+C` 觸發翻譯浮動窗（0.8 秒內）
- 連按兩次 `Ctrl+D` **翻譯並直接貼上**（0.8 秒內，無浮動窗）
- **Ctrl + Alt + 雙擊 S** 框選螢幕區域，辨識圖中文字並翻譯；**譯文疊加至截圖** 後寫入剪貼簿
- 英文 → 繁體中文；中文 → 英文（自動偵測）
- 支援 OpenAI 與 Gemini 兩種 AI 服務
- Always-on-top 浮動翻譯窗，顯示於游標附近（保留原文換行排版，方便對照）
- 翻譯完成後可 **貼上** 譯文，或 **修改** 語氣（更平易近人 / 更專業）
- 系統匣常駐，右鍵可開啟設定

## 環境需求

- Windows 10 / 11
- Node.js 18+

## 安裝與開發

```bash
npm install
npm run dev
```

首次執行若尚未設定 API Key，會自動開啟設定視窗；也可從系統匣圖示右鍵 → **設定** 進行設定。

## 使用方式

1. 啟動 TransL（會常駐系統匣）
2. 在任意應用程式中選取文字
3. 快捷鍵（0.8 秒內連按兩次同一鍵，除截圖外須按住 Ctrl）：
   - **Ctrl + C**：顯示翻譯浮動窗，可再貼上或調整語氣
   - **Ctrl + D**：直接翻譯並貼回選取位置（不顯示浮動窗）
   - **Ctrl + Alt + S**：拖曳框選螢幕區域 → 辨識、翻譯並合成 **譯文圖**（存剪貼簿）
4. 浮動窗模式下按 `Esc` 或點擊外部關閉

## 打包

```bash
npm run build
npm run dist:win
```

安裝檔會輸出至 `release/` 目錄。若打包時遇到 code signing 權限問題，專案已設定 `signAndEditExecutable: false` 以略過簽章步驟。

## 設定項目

| 項目 | 說明 | 預設值 |
|------|------|--------|
| Provider | OpenAI 或 Gemini | OpenAI |
| OpenAI Model | Chat Completions 模型 | gpt-4o-mini |
| Gemini Model | Generate Content 模型 | gemini-2.0-flash |
| 開機自動啟動 | 登入 Windows 後常駐系統匣 | 關閉 |

API Key 儲存於本機使用者目錄（electron-store），不會寫入專案檔案。

## 已知限制

- 透過 Windows 剪貼簿序號偵測「連按兩次 Ctrl+C」，兩次複製須在 **0.8 秒內** 完成
- `Ctrl+D` 雙擊會先模擬 `Ctrl+C` 取得選取文字，再貼上譯文；部分應用程式中 `Ctrl+D` 可能有其他用途（如瀏覽器加入書籤）
- 若雙擊 Ctrl+C 無反應，可先用系統匣 → **翻譯目前剪貼簿** 測試（先 Ctrl+C 複製一次即可）
- 截圖翻譯需使用支援 Vision 的模型（預設 `gpt-4o-mini`、`gemini-2.0-flash` 皆可）
- 截圖內容會送至所設定的 AI API 進行辨識，請留意隱私
- 跨螢幕框選以選區中心所在螢幕為準
- 部分受保護欄位（密碼框）或特殊 UWP 應用可能無法複製
- 語言偵測以是否含中文字元為準；混合語言時含中文則翻譯成英文

## 技術棧

- Electron + electron-vite
- React + TypeScript
- electron-store
- koffi（Windows 剪貼簿序號 API、鍵盤狀態偵測）
- @nut-tree-fork/nut-js（模擬 Ctrl+C / Ctrl+V）

## 專案結構

```
TransL/
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
