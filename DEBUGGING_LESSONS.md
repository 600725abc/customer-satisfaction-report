# 開發除錯心得與學習筆記

> 記錄於 2026-01-05，經歷兩天除錯 Gemini API 404 錯誤的經驗總結。

---

## 🔥 問題概述

在 Vercel 部署 React + Vite 應用時，呼叫 Google Gemini API 持續回傳 `404 Not Found` 錯誤，錯誤訊息為：
```
models/gemini-1.5-flash is not found for API version v1beta
```

---

## 📚 學到的重要教訓

### 1. 前後端 SDK 不能混用
| 環境 | 正確的 SDK |
|------|------------|
| 後端 (Node.js, Server) | `@google/genai` |
| 前端 (React, Vue, 瀏覽器) | `@google/generative-ai` |

**教訓**：如果專案是跑在瀏覽器的前端應用，一定要用 `@google/generative-ai`，否則會出現奇怪的 404 或連線錯誤。

---

### 2. Google Cloud 的三道關卡

即使你在 Google AI Studio 拿到了 API Key，要讓它在自己的網站上能用，必須**確保以下三件事都完成**：

1. **Billing 帳戶已綁定**
   - 即使只用免費額度，新帳號通常需要綁定信用卡作為身份驗證。
   - 在 AI Studio 的 API Keys 頁面，確認你的 Key 旁邊顯示的是 `Tier 1` 而不是 `Set up billing`。

2. **Billing 帳戶已連結到專案**
   - 在 Google Cloud Console → Billing → Account Management
   - 確認你的專案 (gen-lang-client-...) 已連結到 Billing Account。

3. **Gemini API 已啟用**
   - 在 Google Cloud Console 搜尋 "Gemini API"
   - 確認顯示 "Manage" 而不是 "Enable"。

---

### 3. 模型名稱可能需要調整

不同帳號、地區、或 API 版本可能對模型名稱有不同的路由規則。

| 嘗試過的名稱 | 結果 |
|--------------|------|
| `gemini-1.5-flash` | 404 |
| `gemini-pro` | 404 |
| `gemini-1.5-flash-latest` | 404 |
| `gemini-2.0-flash-exp` | ✅ 成功 |

**教訓**：如果標準模型名稱不行，可以嘗試 `-exp` 結尾的實驗版模型。

---

### 4. 本地測試 vs Vercel 部署

當本地能跑但 Vercel 不行時，問題通常出在：

1. **環境變數沒設對**
   - Vercel 的 Environment Variables 必須完整複製貼上，不能有多餘空格或換行。
   - Vite 的環境變數必須以 `VITE_` 開頭才會被打包進前端。

2. **程式碼沒推送**
   - 本地改完程式碼後，必須 `git push` 才會觸發 Vercel 重新部署。

3. **瀏覽器快取**
   - 使用**無痕視窗**測試可以避免看到舊版本的網頁。

---

### 5. `systemInstruction` 相容性問題

某些實驗版模型不支援 `getGenerativeModel` 的 `systemInstruction` 參數。

**解法**：把系統指令放進對話歷史 (history) 的第一筆，而不是用參數傳遞。

```typescript
// ❌ 可能不相容
const model = genAI.getGenerativeModel({
  model: MODEL_NAME,
  systemInstruction: "You are an expert..."
});

// ✅ 更通用的寫法
const fullHistory = [
  { role: 'user', parts: [{ text: 'System: You are an expert...' }] },
  { role: 'model', parts: [{ text: 'Understood.' }] },
  ...history
];
const chat = model.startChat({ history: fullHistory });
```

---

## ✅ 未來開發前的檢查清單

- [ ] 確認使用正確的 SDK (`@google/generative-ai` for 前端)
- [ ] 確認 API Key 顯示 `Tier 1`
- [ ] 確認 Billing 已連結到 Cloud 專案
- [ ] 確認 Gemini API 已啟用 (顯示 Manage)
- [ ] 確認 Vercel 環境變數名稱以 `VITE_` 開頭
- [ ] 確認 Vercel 環境變數值沒有多餘空白
- [ ] 推送後用無痕視窗測試

---

## 🛠️ 有用的除錯技巧

1. **在程式碼加入 Debug Log**
   ```typescript
   console.log("API Key Loaded:", API_KEY?.substring(0, 4) + "...");
   ```

2. **本地優先測試**
   - 先在 `npm run dev` 確認功能正常，再推送到 Vercel。

3. **檢查 Console 的完整錯誤訊息**
   - 404 錯誤會告訴你它嘗試連接的 URL，從中可以看出模型名稱是否正確。

---

> 記住：開發順利的關鍵是「每次只改一個變數」，這樣才能快速定位問題來源。
