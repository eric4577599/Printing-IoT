# Printing IoT — 印刷機台物聯網管理系統

> 設備監控 × 預測維護 × 智慧零件管理

## 專案簡介

針對印刷機台的完整 IoT 解決方案，整合 MQTT 即時監控、Modbus 協議通訊、OCR 零件辨識與 AI 視覺，提供設備健康管理與智慧備料建議。

## 技術架構

| 層次 | 技術 |
|------|------|
| 後端 API | Python FastAPI + Uvicorn |
| IoT 協議 | MQTT (Paho) + Modbus (Pymodbus) |
| AI 視覺 | PaddleOCR + PaddlePaddle + OpenCV |
| 生成式 AI | Google Gemini |
| 前端（主系統） | React 19 + Vite + Leaflet |
| 前端（零件管理） | React + Vite（smart-parts-frontend） |
| 物件儲存 | MinIO (S3) |
| 資料庫 | PostgreSQL |
| 容器化 | Docker Compose |

## 核心功能

- **即時監控**：MQTT 訂閱機台狀態與感測器數據
- **Modbus 整合**：工業設備 PLC 數據讀取
- **OCR 零件辨識**：拍照自動辨識零件型號
- **預測維護**：異常偵測 + 維護排程提醒
- **智慧零件管理**（Smart Parts）：庫存追蹤、備料建議
- **地圖視覺化**：Leaflet 廠區設備分佈圖

## 快速啟動

```bash
docker compose up -d --build
# 主系統前端：http://localhost:5173
# 零件管理前端：http://localhost:5174
# API：http://localhost:8000
```

## 目錄結構

```
Printing IoT/
├── backend/              # FastAPI 後端服務
├── frontend/             # 主系統 React 前端
├── smart-parts-frontend/ # 零件管理前端
├── Maintenance-System/   # 維護排程模組
├── doc/                  # 系統設計文件
└── tests/                # 整合測試腳本
```

## 相關文件

- `INSTRUCTIONS.md` — 部署操作指南
- `doc/DEPLOYMENT_GUIDE` — 完整部署說明
