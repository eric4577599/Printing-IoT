# Flexo IoT 系統分析與設計說明書 (SASD)

## 1. 系統概述 (System Overview)

Flexo IoT 是一個整合軟硬體的工業物聯網系統，旨在提供即時的生產設備監控、排程管理與大數據分析。系統採用前後端分離架構，前端為基於 React 的 SPA，後端採用 C# .NET 8 高效能服務，並透過 MQTT 與 WebSocket 實現即時雙向通訊。

## 2. 系統架構 (System Architecture)

本系統採用現代化微服務與容器化架構，確保高可用性與資安防護。

```mermaid
graph TD
    User[操作員/管理員] -->|Cloudflare Tunnel| FE[Frontend (React)]
    
    subgraph "邊緣運算层 (Edge Layer)"
        WISE[WISE I/O Module] -->|Modbus/MQTT| Broker[MQTT Broker]
        PLC[PLC Controller] -->|Adapter| Broker
    end

    subgraph "核心服務層 (Core Services)"
        Broker <-->|Sub: factory/#| Worker[Backend Worker (.NET 8)]
        FE <-->|REST API| API[API Service (.NET 8)]
        FE <-->|MQTT (WS)| Broker
        
        Worker -->|Write| DB[(PostgreSQL/SQLite)]
        Worker -->|Cache| Redis[(Redis Cache)]
        API -->|Read/Write| DB
    end
```

## 3. 前端功能模組 (Frontend Modules)

### 3.1 核心架構
*   **技術棧**: React 18, Vite, Material UI / Tailwind CSS.
*   **通訊協定**: Over MQTT (WebSocket) for Real-time, REST for Management.

### 3.2 功能細項
*   **戰情看板 (Dashboard)**: 
    *   即時顯示車速 (`line_speed`)、產量 (`total_length`)。
    *   雙模模擬器 (Local/Remote Simulation)。
*   **排程管理 (Schedule)**: 拖拉式工單排序 (`seqNo` 管理)。
*   **維運中心 (Maintenance)**: 設備參數設定與通訊診斷。
*   **生產報表 (Reports)**: 提供日報/月報查詢與 Excel 匯出功能。
*   **生產分析 (Analysis)**: OEE 趨勢與停車原因統計分析。

## 4. 後端系統架構 (Backend Architecture)

後端採用 **C# .NET 8** 構建，區分為 API 服務與背景工作服務 (Worker Service)。

### 4.1 核心技術 (Tech Stack)
*   **Language**: C# 12 / .NET 8
*   **ORM**: Entity Framework Core
*   **Database**: PostgreSQL (Production) / SQLite (Dev)
*   **Messaging**: MQTT (via Paho/MQTTnet), WebSocket
*   **Security**: Cloudflare Tunnel (Zero Trust), JWT Auth

### 4.2 模組設計 (Module Design)

#### A. MQTT Worker Service (背景服務)
負責高頻率的數據採集與處理，實現 **Adapter Pattern** 以適配不同設備。

*   **職責**:
    1.  訂閱 `factory/machine/update` 與 `Advantech/+/data`。
    2.  執行 **SpeedCalculator** 邏輯 (移動平均算法)。
    3.  將處理後的數據 (Monitor Data) 發布至 `factory/monitor/update`。
    4.  將原始數據寫入 `ProductionLog` 資料庫。

#### B. API Service (管理服務)
提供標準 RESTful API 供前端呼叫。

*   **主要 Endpoints**:
    *   `GET /api/orders`: 獲取排程。
    *   `POST /api/production/completion`: 接收完工回報 (亦可透過 MQTT)。
    *   `GET /api/reports/oee`: 計算 OEE 報表。

### 4.3 雙軌模擬機制 (Dual-Mode Simulation)

後端需支援「遠端模擬模式」，作為生產軌道的一部分。

1.  **接收**: 監聽 `factory/machine/update`。
2.  **處理**: 視同真實設備訊號，經過同樣的與計算邏輯。
3.  **回饋**: 發布至 `factory/monitor/update`，驗證全鏈路健康度。

## 5. 資料庫設計 (Database Schema)

### 5.1 生產記錄 (ProductionLog)
用於儲存高頻率的原始數據。

```sql
CREATE TABLE ProductionLogs (
    Id BIGINT PRIMARY KEY IDENTITY,
    DeviceId VARCHAR(50) NOT NULL,
    Timestamp DATETIME NOT NULL,
    TotalLength DECIMAL(18, 2),
    Speed DECIMAL(18, 2),
    Status INT
);
```

### 5.2 完工記錄 (ProductCompletion)
儲存工單的一筆完整生產結果。

```sql
CREATE TABLE ProductCompletions (
    Id UNIQUEIDENTIFIER PRIMARY KEY,
    OrderId VARCHAR(50),
    ProductId VARCHAR(50),
    StartTime DATETIME,
    EndTime DATETIME,
    GoodQty INT,
    DefectQty INT,
    AvgSpeed DECIMAL(18, 2),
    OEE DECIMAL(5, 2)
);
```

## 6. 通訊介面定義 (Communication Interfaces)

### MQTT Topics
| Topic | Type | Publisher | Subscriber | Description |
| :--- | :--- | :--- | :--- | :--- |
| `factory/monitor/update` | JSON | Backend | Frontend | 即時戰情數據 |
| `factory/machine/update` | JSON | Simulator | Backend | 模擬機台訊號 |
| `factory/production/completion` | JSON | Frontend | Backend | 完工回報 |

## 7. 安全與部署 (Security & Deployment)

*   **Network**: 所有對外服務僅透過 Cloudflare Tunnel 暴露，不開放 Public IP。
*   **Container**: 使用 Docker Compose 進行服務編排 (Frontend, Backend, Database, Broker, Redis)。
