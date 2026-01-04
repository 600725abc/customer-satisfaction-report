<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Sentilyser Pro - 顧客滿意度分析報告系統

這是一個基於 React 的顧客滿意度分析系統，利用 Gemini AI 提供深度的情感分析與行動建議。

## 快速開始

### 1. 本地開發設定

首先，請確保你已經安裝了 Node.js。

```bash
# 安裝相依套件
npm install

# 啟動開發伺朋器
npm run dev
```

### 2. 環境變數設定

本專案使用 Google Gemini API。請在專案根目錄建立 `.env` 檔案，或在部署平台上設定對應的環境變數。

```env
VITE_GEMINI_API_KEY=你的_API_KEY
```

### 3. 專案建置

```bash
# 建立生產環境版本
npm run build
```

建置完成後的檔案將存放在 `dist/` 目錄中。

## 部署與自動化

### GitHub Actions 自動化部署

本專案已設定 GitHub Actions。每當你將程式碼推送到 `main` 分支時，系統會自動：
1. 安裝套件
2. 進行專案建置
3. 自動部署至 **GitHub Pages**

部署腳本位於 [deploy.yml](.github/workflows/deploy.yml)。

> [!IMPORTANT]
> **首次部署必看**：
> 如果部署失敗並出現 `Get Pages site failed` 錯誤，請至 GitHub 專案設定：
> 1. 進入 `Settings` -> `Pages`
> 2. 在 `Build and deployment` -> `Source` 選擇 **GitHub Actions**
> 3. 重新執行 GitHub Action 即可成功。

### 檔案忽略規範 (.gitignore)

我們已建立完整的 `.gitignore` 檔案，確保以下內容不會被上傳至 GitHub：
- `node_modules/` (相依套件)
- `dist/` (建置產物)
- `.env` (敏感性隱私檔案)
- IDE 暫存檔 (`.vscode/`, `.idea/`)

## 專案功能

- **情感趨勢分析**：視覺化呈現客戶滿意度變化。
- **AI 摘要與建議**：自動分析評論內容並提供具體改善建議。
- **匯出功能**：支援匯出 PDF 報告與 CSV 資料。
- **AI 助手**：可針對分析數據進行更深入的對談。
