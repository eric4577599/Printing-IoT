# Printing IoT — 印刷機台物聯網管理系統

> 設備監控 × 預測維護 × 智慧零件管理

## 專案簡介

針對印刷機台的完整 IoT 解決方案，整合 MQTT 即時監控、Modbus 協議通訊、OCR 零件辨識與 AI 視覺，提供設備健康管理與智慧備料建議。

## 技術架構

| 層次 | 技術 |
|------|------|
| 後端 API | .NET 8 (ASP.NET Core Web API) |
| IoT Worker | .NET 8 BackgroundService (MQTT via MQTTnet) |
| IoT 協議 | MQTT (Mosquitto Broker) + Modbus (Pymodbus) |
| 快取 | Redis 7 |
| AI 視覺 | PaddleOCR + PaddlePaddle + OpenCV |
| 生成式 AI | Google Gemini |
| 前端（主系統） | React 19 + Vite + Leaflet |
| 前端（零件管理） | React + Vite + TailwindCSS（smart-parts-frontend） |
| 物件儲存 | MinIO (S3) |
| 資料庫 | PostgreSQL 15 |
| 容器化 | Docker Compose |
| 反向代理 | Cloudflare Tunnel (Zero Trust) |

## 核心功能

- **即時監控**：MQTT 訂閱機台狀態與感測器數據
- **Modbus 整合**：工業設備 PLC 數據讀取
- **OCR 零件辨識**：拍照自動辨識零件型號
- **預測維護**：異常偵測 + 維護排程提醒
- **智慧零件管理**（Smart Parts）：庫存追蹤、備料建議
- **地圖視覺化**：Leaflet 廠區設備分佈圖
- **內建文件入口**：`/docs` 路由提供作業流程、設計文件、操作紀錄在線檢查

## 快速啟動

```bash
# 複製環境變數
cp .env.example .env
# 啟動所有服務
docker compose up -d --build
# 主系統前端：http://localhost:5600
# 零件管理前端：http://localhost:5100
# API (Swagger)：http://localhost:5200/swagger
```

## 目錄結構

```
Printing IoT/
├── backend/                # .NET 8 Solution
│   ├── PrintingIoT.API/    # Web API 服務
│   ├── PrintingIoT.Core/   # 領域模型 (Entities, Interfaces, DTOs)
│   ├── PrintingIoT.Infrastructure/ # 資料存取 (EF Core, Redis, Services)
│   ├── PrintingIoT.Worker/ # MQTT 背景服務
│   ├── PrintingIoT.Tests/  # 單元測試與整合測試
│   └── SmartParts.API/     # 零件管理 API
├── frontend/               # 主系統 React 前端
├── smart-parts-frontend/   # 零件管理前端
├── doc/                    # 系統設計文件（可透過 /docs 路由在線檢視）
├── tests/                  # 整合測試腳本
└── scripts/                # 工具腳本
```

## 跨平台開發注意事項 (Mac / Windows)

本專案可於 macOS 與 Windows 雙環境並行開發,整套技術選型(.NET、React + Vite、Docker Compose)都是跨平台。實務上要留意:

### 1. Git 行尾正規化
- repo `.editorconfig` 已設 LF
- Windows 那台請額外設定:`git config --global core.autocrlf=input`
  (避免簽出時被自動換成 CRLF,污染 diff)

### 2. 大小寫
- macOS / Windows 預設 case-insensitive,**Linux 容器 case-sensitive**
- `import './Foo'` 與 `./foo` 在本機跑得起來,進 Docker 直接炸
- 養成檔名 / import 完全照大小寫拼字的習慣

### 3. 工具版本對齊
| 工具 | 版本 |
|---|---|
| .NET SDK | 9.0.x(net9.0 target) |
| Node | 22.x |
| Docker Desktop | 最新穩定版 |

兩台機器 major version 一致,避免 lockfile / 編譯結果分歧。

### 4. 隱形地雷
- **macOS dot-underscore (`._*`)**:外接 SSD 容易產生,已在 `.gitignore`。若 `dotnet build` 異常,執行 `find . -name "._*" -delete`
- **路徑分隔符號**:程式內統一用 `Path.Combine`(.NET) 或 `path.join`(Node),不要硬寫 `\` 或 `/`
- **`.env` 內 secret 不可 commit**;`JWT_SECRET` 兩台機器各自填,不要共用

### 5. 路徑慣例
| 環境 | 工作目錄 |
|---|---|
| macOS(外接 X10 Pro SSD) | `/Volumes/X10Pro/...` |
| Windows | `d:\MyGitHub\...` |

操作前先確認外接 SSD 已掛載。

## 相關文件

- `INSTRUCTIONS.md` — 部署操作指南
- `doc/DEPLOYMENT_GUIDE_v1.md` — 完整部署說明
- `doc/REFACTORING_LOG.md` — 重構變更紀錄
- `doc/ERROR_TEST_MATRIX.md` — 錯誤-測試追溯矩陣
