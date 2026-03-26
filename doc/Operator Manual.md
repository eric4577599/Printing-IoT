# 瓦楞紙業數位工廠 - Antigravity AI 團隊指揮手冊

這份手冊是您 (指揮官) 與 8 位 AI 專家協作的指南。在 Antigravity 中，您可以透過 「@角色名稱」 來呼叫特定專家，或是在對話中描述相關情境，讓系統自動判斷由誰接手。

1. 核心指揮官與架構 (The Core)

🏗️ @iot-fullstack-architect 全端架構師

【職責】：系統骨幹、Cloudflare 資安、Docker 容器化、API 介面定義。
【何時呼叫】：

    當您需要設計資料庫 (SQL Schema) 時。

    當您要設定 Cloudflare Tunnel 或 Docker 環境時。

    當您需要定義新的廠商介面 (Interface) 時。

    指令範例：

        「@iot-fullstack-architect 我們要新增一家『鼎新 ERP』的支援，請幫我設計 IERPConnector 的實作介面。」
        「@iot-fullstack-architect 請給我一份 Docker Compose 檔，包含 Redis 和 SQL Server 的設定。」

⚙️ @ot-production-expert OT 生產專家協調

【職責】：PLC 通訊 (三菱/西門子)、現場訊號邏輯、機台防呆。
【何時呼叫】：

    當您需要讀寫 PLC 暫存器 (Register) 時．


    當您需要將業務邏輯轉換為機台能懂的訊號 (如：換刀訊號) 時。

    指令範例：

        「@ot-production-expert 三菱 Q 系列的 PLC 要怎麼讀取 D8000 到 D8010 的數值？請給我 C# 範例。」
        「@ot-production-expert 現場回報切長誤差很大，我們該監控哪些 PLC 訊號來除錯？」

2. 品質與測試 (Quality & Testing)

🧪 @automated-test-engineer 自動化測試工程師

    【職責】：單元測試 (Unit Test)、硬體模擬 (Mocking)、CI/CD。
    【何時呼叫】：

    當架構師寫完一段核心程式碼後，需要補上測試時。

    當您需要在沒有實體機台的情況下測試連線邏輯時。

    指令範例：

        「@automated-test-engineer 幫我為剛剛的『斷線重連』功能寫完整的 Unit Test，記得 Mock 掉 PLC 連線。」
        「@automated-test-engineer 請檢查這段 Python 腳本有沒有潛在的 Bug。」

🕵️ @domain-qa-specialist 領域 QA 專家

【職責】：瓦楞紙廠場景驗收、例外狀況模擬 (斷紙、換單)。
【何時呼叫】：

    當功能開發完成，要進行驗收測試 (UAT) 規劃時。

    您想知道「如果現場操作員亂按會發生什麼事」時。

    指令範例：

        「@domain-qa-specialist 針對『緊急停機後復歸』的流程，請列出 5 個必要的測試案例 (Test Cases)。」
        「@domain-qa-specialist 如果 ERP 傳來的紙寬資料是錯的，我們的系統該怎麼反應？」

3. 維運與後勤 (Operations & Support)

🛠️ @smart-maintenance-mgr 保養經理

    【職責】：預防保養規則、備品庫存管理、設備生命週期。
    【何時呼叫】：

    您要定義「什麼時候該保養」的規則時。

    您要設計備品庫存的警示邏輯時。

    指令範例：

        「@smart-maintenance-mgr 瓦楞輪運轉多少米之後建議檢查？請幫我寫成 SQL 的觸發規則。」
        「@smart-maintenance-mgr 請設計一個庫存檢查流程，當低於安全庫存時自動發送通知。」

📚 @technical-communicator 技術傳播者

    【職責】：撰寫 API 文件、操作手冊、維修 SOP、知識管理。
    【何時呼叫】：

    當功能完成，需要產出給客戶看的文件時。

    當需要畫精美的流程圖 (Mermaid Chart) 時。

    指令範例：

        「@technical-communicator 請根據目前的架構，畫一張系統資料流向圖 (Data Flow Diagram)。」
        「@technical-communicator 請幫我寫一份給現場領班看的『機台連線故障排除 SOP』。」

4. 介面與管理 (Interface & Management)

🎨 @creative-ui-designer UI 設計師

    【職責】：Dashboard 設計、RWD 介面、深色模式、多廠商設定頁面。
    【何時呼叫】：

    當後端資料準備好，需要設計前端畫面時。

    您覺得畫面不夠直覺、太醜時。

    指令範例：

        「@creative-ui-designer 請設計一個『機台即時總覽』的 Dashboard，要深色系，顯示車速、溫度和目前的工單。」
        「@creative-ui-designer 針對『多廠商設定』，請設計一個下拉選單介面，讓管理者能切換 Mitsubishi 和 Siemens。」

⏱️ @project-sync-manager 同步經理 (PM)

    【職責】：每日進度總結、跨部門資訊同步、維護專案狀態。
    【何時呼叫】：

    每天工作結束前，或開始工作前。

    您覺得團隊資訊混亂，不知道誰改了什麼時。

    指令範例：

        「@project-sync-manager 總結一下今天的進度，並更新 PROJECT_STATUS.md。」
        「@project-sync-manager 架構師剛剛改了 API，請確認 UI 設計師知道這件事嗎？」

5. 實戰協作劇本 (Scenario Examples)

劇本 A：新增「三菱 PLC 車速讀取」功能

您：「@iot-fullstack-architect 請定義 IMachineDriver 中讀取車速的介面。」

架構師：提供 C# Interface 程式碼。

您：「@ot-production-expert 請根據這個 Interface，實作 Mitsubishi Q 系列的 Driver。」

OT專家：提供讀取 D Register 的實作碼。

您：「@automated-test-engineer 請幫這段程式碼寫單元測試。」

您：「@creative-ui-designer 請把讀到的車速顯示在首頁儀表板上。」

劇本 B：處理「多 ERP 廠商」切換

您：「@iot-fullstack-architect 我們需要支援鼎新 ERP，請建立 Adapter。」

架構師：建立 DigiWinConnector 類別框架。

您：「@technical-communicator 請更新文件，說明如何在 config.json 中切換 ERP 廠商。」

您：「@project-sync-manager 紀錄這項變更，我們現在支援鼎新了。」

7. 資源中心 (Resources)

我們的團隊現在可以自動讀取 `.agent` 資料夾下的系統資源。您不需手動複製貼上，只需在對話中提及即可。

*   **規格書 (Specs)**: 位於 `.agent/specs/`
    *   例如：`architecture-config.json` (系統架構), `interface-definitions.cs` (C# 介面)
    *   指令：「@iot-fullstack-architect 請參考 `interface-definitions.cs` 幫我實作 Adapter。」
*   **範本 (Templates)**: 位於 `.agent/templates/`
    *   例如：`DRIVER_TEMPLATE.md` (驅動程式範本)
    *   指令：「@technical-communicator 請用驅動程式範本幫我產生一份 Mitsubishi 文件。」

8. 特殊指令 (Special Commands)

*   **Cloudflare Tunnel**:
    *   「@iot-fullstack-architect 請給我 cloudflared 的 Docker Compose 設定，確保只有透過 Access 的人能連線。」

*   **Docker 部署**:
    *   「@iot-fullstack-architect 請幫我寫一份 Dockerfile，要包含 .NET 8 的 Runtime 優化。」

9. 角色呼叫清單 (Role Call List)

請複製以下語法並貼入對話框以呼叫特定角色：

| 角色名稱 | 呼叫語法 |
| :--- | :--- |
| **全端架構師** | @.agent/skills/development/iot-fullstack-architect
| **OT 生產專家** | @.agent/skills/domain/ot-production-expert  
| **自動化測試** | @.agent/skills/development/automated-test-engineer 
| **領域 QA 專家** | @.agent/skills/domain/domain-qa-specialist 
| **保養經理** | @.agent/skills/domain/smart-maintenance-mgr 
| **技術傳播者** | @.agent/skills/enterprise/technical-communicator 
| **UI 設計師** | @.agent/skills/creative/creative-ui-designer 
| **同步經理 (PM)** | @.agent/skills/enterprise/project-sync-manager
