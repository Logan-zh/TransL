# TransL

Windows 桌面應用程式：選取文字後，按住 Ctrl 連按兩次 C 呼叫翻譯浮動窗，透過 OpenAI 或 Google Gemini API 自動翻譯。

## 功能

- 連按兩次 `Ctrl+C` 觸發翻譯（0.8 秒內，透過 Windows 剪貼簿序號偵測）
- 英文 → 繁體中文；中文 → 英文（自動偵測）
- 支援 OpenAI 與 Gemini 兩種 AI 服務
- Always-on-top 浮動翻譯窗，顯示在游標附近
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
3. 按住 Ctrl，快速連按兩次 C（第一次複製，第二次呼叫翻譯窗）
4. 浮動窗顯示譯文（中文翻英文，英文翻繁體中文）
5. 按 `Esc` 或點擊外部關閉浮動窗

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

API Key 儲存於本機使用者目錄（electron-store），不會寫入專案檔案。

## 已知限制

- 透過 Windows 剪貼簿序號偵測「連按兩次 Ctrl+C」，兩次複製須在 **0.8 秒內** 完成
- 若雙擊 Ctrl+C 無反應，可先用系統匣 → **翻譯目前剪貼簿** 測試（先 Ctrl+C 複製一次即可）
- 部分受保護欄位（密碼框）或特殊 UWP 應用可能無法複製
- 語言偵測以是否含中文字元為準；混合語言時含中文則翻譯成英文

## 技術棧

- Electron + electron-vite
- React + TypeScript
- electron-store
- koffi（Windows 剪貼簿序號 API）

## 專案結構

```
TransL/
├── electron/           # 主行程、preload、服務模組
├── src/renderer/       # 浮動窗 (overlay) 與設定 (settings) UI
├── out/                # 建置輸出
├── release/            # Windows 安裝檔輸出
└── package.json
```

## 授權

MIT
