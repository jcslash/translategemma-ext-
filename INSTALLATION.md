# 📦 安裝和故障排除指南

## 快速安裝步驟

### 1. 載入插件到 Chrome

1. 打開 Chrome 瀏覽器
2. 在地址欄輸入 `chrome://extensions/` 並按 Enter
3. 在右上角啟用「**開發者模式**」（Developer mode）
4. 點擊左上角的「**載入未封裝項目**」（Load unpacked）按鈕
5. 選擇 `translategemma-ext-` 資料夾
6. 插件應該會出現在擴展列表中

### 2. 獲取 Hugging Face API Key

1. 前往 [https://huggingface.co/settings/tokens](https://huggingface.co/settings/tokens)
2. 如果還沒有帳號，先註冊一個（完全免費）
3. 點擊「**New token**」按鈕
4. 給 token 起個名字（例如：`TranslateGemma Extension`）
5. 選擇權限：**Read** （只需讀取權限）
6. 點擊「**Generate token**」
7. **複製生成的 token**（以 `hf_` 開頭）

### 3. 配置插件

1. 點擊 Chrome 工具欄中的拼圖圖標 🧩
2. 找到「TranslateGemma Webpage Translator」並點擊
3. 在彈出的視窗中，將您的 API key 貼到輸入框中
4. 點擊「**Save**」按鈕
5. 看到「API key saved successfully!」提示

### 4. 開始翻譯

1. 導航到任何您想翻譯的網頁（例如：英文新聞網站）
2. 點擊插件圖標
3. 選擇翻譯方向：
   - 「Translate to Traditional Chinese」- 將英文翻譯成繁體中文
   - 「Translate to English」- 將繁體中文翻譯成英文
4. 等待翻譯完成

## 🔧 故障排除

### 問題 1: "Error: Cannot access this page"

**原因：** Content script 未能注入到頁面中

**解決方法：**

1. **重新載入擴展：**
   - 前往 `chrome://extensions/`
   - 找到 TranslateGemma 插件
   - 點擊 🔄 重新載入按鈕

2. **刷新網頁：**
   - 按 `F5` 或 `Ctrl+R` (Windows/Linux) / `Cmd+R` (Mac) 刷新目標網頁
   - 再次嘗試翻譯

3. **檢查頁面類型：**
   - 插件無法翻譯以下頁面：
     - `chrome://` 開頭的 Chrome 內部頁面
     - `chrome-extension://` 擴展頁面
     - 新標籤頁
   - 請在普通網頁（http:// 或 https://）上使用

4. **檢查權限：**
   - 前往 `chrome://extensions/`
   - 點擊插件的「詳情」
   - 確保「在所有網站上」的權限已啟用

### 問題 2: "Please set your Hugging Face API key first"

**解決方法：**
- 確認您已經在插件彈窗中保存了 API key
- API key 必須以 `hf_` 開頭
- 重新輸入並保存 API key

### 問題 3: "Translation failed: API error"

**可能原因和解決方法：**

1. **API key 無效：**
   - 前往 Hugging Face 確認 token 仍然有效
   - 重新生成一個新的 token

2. **超過速率限制：**
   - Hugging Face 免費版有每小時約 1000 次請求限制
   - 等待一小時後再試
   - 或升級到 Hugging Face Pro

3. **網絡連接問題：**
   - 檢查您的網絡連接
   - 確認可以訪問 huggingface.co

4. **模型加載中：**
   - TranslateGemma 模型可能正在加載（首次請求時）
   - 等待 10-30 秒後重試

### 問題 4: "No text found to translate"

**可能原因：**
- 頁面主要是圖片或視頻內容
- 頁面使用了特殊的渲染方式（如 Canvas）
- 文本被隱藏或在 iframe 中

**解決方法：**
- 嘗試其他網頁
- 確保頁面已完全載入

### 問題 5: 翻譯速度很慢

**優化建議：**

1. **首次請求較慢：**
   - Hugging Face 需要載入模型（可能需要 30-60 秒）
   - 後續請求會快很多

2. **大型網頁：**
   - 包含大量文本的頁面需要更長時間
   - 考慮翻譯特定部分而不是整個頁面

3. **網絡延遲：**
   - API 調用需要網絡往返時間
   - 使用穩定的網絡連接

### 問題 6: 翻譯質量不佳

**說明：**
- TranslateGemma 4B 是一個通用翻譯模型
- 對於某些專業術語或俚語可能不夠準確
- 這是模型本身的限制，不是插件的問題

**建議：**
- 對於重要文檔，建議人工複核翻譯結果
- 可以嘗試重新翻譯（有時結果會略有不同）

## 🔍 調試模式

如果問題持續存在，可以啟用調試模式：

1. **打開開發者工具：**
   - 在插件彈窗上右鍵 → 「檢查」
   - 或按 `F12` 在網頁上打開開發者工具

2. **查看控制台日誌：**
   - **Popup Console**：API key 驗證、翻譯請求
   - **Background Console**：API 調用、批處理
   - **Content Console**：文本提取、替換操作

3. **常見日誌消息：**
   ```
   TranslateGemma content script initialized  ✓ 正常
   Content script may already be injected      ✓ 正常（重複注入）
   Translation API error                       ✗ API 問題
   Error applying translation                  ✗ 替換失敗
   ```

## 📊 性能基準

**預期翻譯時間：**
- 小型頁面（< 100 元素）：2-5 秒
- 中型頁面（100-500 元素）：5-15 秒
- 大型頁面（> 500 元素）：15-30 秒

**首次使用：**
- 第一次翻譯可能需要額外 30-60 秒載入模型

## 🆘 仍然無法解決？

1. **重新安裝插件：**
   - 在 `chrome://extensions/` 中移除插件
   - 重新載入未封裝項目

2. **檢查 Chrome 版本：**
   - 需要 Chrome 88 或更高版本
   - 更新到最新版本

3. **嘗試不同的網頁：**
   - 測試簡單的網頁（如 Wikipedia）
   - 確認插件基本功能正常

4. **查看錯誤報告：**
   - 開發者工具中的 Console 標籤
   - 截圖錯誤信息以便排查

## 📝 測試網站推薦

測試插件是否正常工作，可以使用這些網站：

**英文 → 繁體中文：**
- [Wikipedia (English)](https://en.wikipedia.org/)
- [BBC News](https://www.bbc.com/news)
- [The New York Times](https://www.nytimes.com/)

**繁體中文 → 英文：**
- [維基百科（中文）](https://zh.wikipedia.org/)
- [聯合新聞網](https://udn.com/)
- [中央社](https://www.cna.com.tw/)

## ✅ 成功標誌

插件正常工作時，您應該看到：
1. ✓ API key 保存成功的提示
2. ✓ 「Found X text elements. Translating...」消息
3. ✓ 網頁文本被翻譯成目標語言
4. ✓ 「✓ Translated X elements in Xs」成功消息
5. ✓ 可以使用「Restore Original」恢復原始內容

---

如果按照以上步驟仍無法解決問題，請檢查 Chrome 開發者工具的 Console 標籤中的錯誤信息。
