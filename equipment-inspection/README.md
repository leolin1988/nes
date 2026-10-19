# 設備數位點檢系統

網站程式碼備份，與儲存庫原有訂餐系統分開保存。

- 前台：dist/（HTML、JavaScript、CSS 與圖示）。
- 後台：backend/ 內的 TypeScript，Supabase Edge Function。
- 資料庫：SQL 結構及功能腳本，未包含正式資料。SQL 為歷次開發腳本，須確認相依順序，請勿直接全量執行至正式資料庫。
- 未包含：帳號密碼、連線金鑰、登入憑證、點檢紀錄、使用者照片及 Excel/CSV 檔。

前台備份來源：正式網站 v98，來源版本 59eed0a5b77d1d8efa096ca6c21ccc092fdae5ab。後台依目前正式 Edge Function v55 同步。

此分支僅備份原始碼；不會自動取代現有網站，也未建立自動部署或持續同步。後台需要由環境提供 SUPABASE_URL 與 SUPABASE_SERVICE_ROLE_KEY，金鑰不可寫入前台或 Git。

