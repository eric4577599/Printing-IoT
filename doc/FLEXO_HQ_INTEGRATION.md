# Flexo HQ Integration Guide

**Version**: 1.0  
**Date**: 2026-01-19  
**Architect**: @iot-fullstack-architect

---

## 🏗️ System Architecture

The Flexo IoT ecosystem consists of two main layers: **Local Edge** (Factory) and **Cloud HQ** (Central Management).

```mermaid
graph TD
    subgraph Factory_Edge [Factory LAN (Local Edge)]
        PLC[Machines / PLC] -->|Modbus/TCP| MQTT_Edge[Mosquitto Broker :1883]
        Backend[Backend API / Worker] -->|Subscribe| MQTT_Edge
        Backend -->|Write| DB_Edge[(PostgreSQL / Redis)]
        Frontend[Dashboard UI] -->|Socket| MQTT_Edge
        Frontend -->|HTTP| Backend
    end

    subgraph Cloud_Layer [Flexo HQ (Cloud)]
        HQ_API[HQ API]
        HQ_DB[(Central DB)]
    end

    subgraph Security_Tunnel [Secure Boundary]
        Cloudflared[Cloudflare Tunnel]
        Cloudflared -->|Secure Outbound| Cloudflare_Edge
    end

    Backend -->|Push Data| HQ_API
    Cloudflare_Edge -->|Public Ingress| Cloudflared
    Cloudflared -->|Proxy| Frontend
    Cloudflared -->|Proxy| Backend
```

---

## 🔌 Integration Components

### 1. Cloudflare Tunnel (Secure Access)
*   **Role**: Provides secure remote access to the factory dashboard without opening firewall ports.
*   **Container**: `cloudflared`
*   **Config**: Defined in `docker-compose.yml`.
*   **Ingress Rules**:
    *   `dashboard.flexo.com` -> `http://frontend:80`
    *   `api.flexo.com` -> `http://backend-api:8080`

### 2. Store-and-Forward (Resilience)
*   **Mechanism**:
    1.  **Local First**: All production data is written to local PostgreSQL immediately.
    2.  **Queueing**: Data to be synced to HQ is queued in Redis (List: `hq:sync:queue`).
    3.  **Sync Worker**: A background task consumes the queue and posts to `https://hq-api.flexo.com/sync`.
    4.  **Retry Policy**: If internet is down, data remains in Redis until connected.

### 3. Data Synchronization Scope
*   **Real-time Status**: Sent via MQTT Bridge or HTTP Pulse (Interval: 5s).
*   **Production Records**: Synced upon "Order Completion" (Immediate).
*   **Maintenance Logs**: Synced daily or on-demand.

---

## 🛠️ Configuration & Troubleshooting

### HQ Connection Settings
Configuration located in `backend/appsettings.json` or Environment Variables:

```json
{
  "FlexoHQ": {
    "ApiUrl": "https://api.flexohq.com",
    "ApiKey": "YOUR_FACTORY_API_KEY",
    "SyncIntervalSeconds": 60
  }
}
```

### Common Issues

| Issue | Check Item | Solution |
|-------|------------|----------|
| **Dashboard Offline from Outside** | Cloudflared Status | Check `docker logs cloudflared`. Ensure token is valid. |
| **Data not affecting HQ** | Sync Queue | Check Redis queue length. Check Backend Worker logs for "Sync Failed". |
| **PLC Data Missing** | MQTT Broker | Verify `mosquitto` container is running and port 1883 is open locally. |

---

> **Note**: This architecture ensures "Offline-First" capability. The factory continues to operate 100% even if the connection to HQ is lost.
