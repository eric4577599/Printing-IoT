# Smart Parts System - Deployment & Migration Guide

> **⚠ 已廢止（DEPRECATED，2026-07）**
>
> 本指南所述 Smart Parts 系統（`SmartPartsDB`、:5100、`smart-parts-frontend`、`smartparts.ericchh.work`）已全數退役。
> 零件管理已依方案 C′ 併入 MM 外掛（`/Volumes/G70Pro/cusor pool/MM/`），部署方式見 MM repo 的 `README.md`。
> `smartparts.ericchh.work` 之 301 轉址與 `mms.ericchh.work` 入口**待 Eric 於 Cloudflare 儀表板手動設定**（步驟見 `docs/report20260707-1.md` §6.3）；生效前 MM 請走本機入口 `http://localhost:5301`。
> 以下正文保留為歷史紀錄，請勿依此部署。

## 1. Database Migration (Required)
Since we created new Entities, we need to apply them to the `SmartPartsDB`.

**Option A: Inside Docker (Recommended)**
1.  Ensure containers are running:
    ```bash
    docker-compose up -d
    ```
2.  Enter the Backend Container:
    ```bash
    docker exec -it <container_name_of_smart_parts_backend> /bin/bash
    ```
    *(Note: You might need to install `dotnet-ef` tool inside container if not present, or run from host if SDK is installed)*

**Option B: From Host (If you have .NET 8 SDK installed)**
1.  Navigate to project root:
    ```bash
    cd "Printing IoT"
    ```
2.  Create Migration:
    ```bash
    dotnet ef migrations add InitialCreate --project backend/SmartParts.API/SmartParts.API.csproj --startup-project backend/SmartParts.API/SmartParts.API.csproj
    ```
3.  Apply Migration:
    ```bash
    dotnet ef database update --project backend/SmartParts.API/SmartParts.API.csproj --startup-project backend/SmartParts.API/SmartParts.API.csproj
    ```

## 2. Cloudflare Tunnel Configuration
To make `Parts.ericchh.work` accessible:

1.  Go to [Cloudflare Zero Trust Dashboard](https://one.dash.cloudflare.com/).
2.  Go to **Access** > **Tunnels**.
3.  Select your existing tunnel (`Printing-IoT` or similar).
4.  Click **Configure**.
5.  **Public Hostname** Tab -> **Add Public Hostname**:
    *   **Subdomain**: `smartparts`
    *   **Domain**: `ericchh.work`
    *   **Service**:
        *   Type: `HTTP`
        *   URL: `smart-parts-frontend:80` (Docker Service Name)
6.  Save Hostname.

## 3. Verification
1.  Open `http://localhost:5100` (Local Access).
2.  Open `https://smartparts.ericchh.work` (Public Access).
3.  Try creating a part with a supplier.
