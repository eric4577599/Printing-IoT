# Smart Parts System - Deployment & Migration Guide

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
