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
├── Maintenance-System/     # 維護排程模組
├── doc/                    # 系統設計文件（可透過 /docs 路由在線檢視）
├── tests/                  # 整合測試腳本
└── scripts/                # 工具腳本
```

## 相關文件

- `INSTRUCTIONS.md` — 部署操作指南
- `doc/DEPLOYMENT_GUIDE_v1.md` — 完整部署說明
- `doc/REFACTORING_LOG.md` — 重構變更紀錄
- `doc/ERROR_TEST_MATRIX.md` — 錯誤-測試追溯矩陣
