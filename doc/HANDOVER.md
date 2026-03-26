# Flexo IoT System Handover Document

**Version**: 1.0  
**Date**: 2026-01-19  
**From**: Development Team (@iot-fullstack-architect)  
**To**: Operations & Maintenance Team

---

## 1. System Overview

**Flexo IoT** is a real-time production monitoring system for Corrugated Box manufacturing. It connects legacy PLC machines via MQTT to a modern Web Dashboard.

*   **Repository**: `Printing IoT`
*   **Key Services**:
    *   `frontend`: React (Vite) Dashboard (:5600)
    *   `backend-api`: .NET 9 Web API (:5200)
    *   `backend-worker`: MQTT Ingestion Service
    *   `postgres`: Primary Data Store (:5433)
    *   `redis`: Hot Data Cache (:6380)
    *   `mqtt-broker`: Mosquitto (:1884)

---

## 2. Key Credentials & Accessibility

| Service | Internal URL | Username | Password (Default) |
| :--- | :--- | :--- | :--- |
| **Dashboard** | `http://localhost:5600` | N/A | N/A (Role-based F9) |
| **API Swagger** | `http://localhost:5200/swagger` | N/A | N/A |
| **Database** | `localhost:5433` | `postgres` | `password` |
| **Redis** | `localhost:6380` | N/A | N/A |
| **MQTT** | `tcp://localhost:1884` | N/A | N/A |

> **Cloud Access**: External access is managed via **Cloudflare Tunnel**. Check `docker-compose.yml` for the tunnel token.

---

## 3. Deployment & Maintenance

### Start System
```bash
docker-compose up -d --build
```

### View Logs
```bash
# Backend Logic
docker-compose logs -f backend-worker

# API Errors
docker-compose logs -f backend-api
```

### Database Backup
```bash
# Backup to file
docker exec -t printingiot-postgres-1 pg_dump -U postgres FlexoDB > backup_$(date +%Y%m%d).sql
```

---

## 4. Known Issues & Workarounds

1.  **MQTT Disconnects**: If the dashboard Red Light flashes, check if the `backend-worker` container is running. If not, `docker restart backend-worker`.
2.  **Order Sync**: If "Current Order" doesn't sync to backend, press **F3** again to force resync.
3.  **Stress Load**: System tested up to 50 concurrent users. Beyond that, Redis clustering is recommended.

---

## 5. Documentation Map

*   [`doc/TEST_CASES.md`](./TEST_CASES.md) - Standard UAT Scenarios (Product/Order Specs).
*   [`doc/STRESS_TEST_REPORT.md`](./STRESS_TEST_REPORT.md) - Performance Validation.
*   [`doc/FLEXO_HQ_INTEGRATION.md`](./FLEXO_HQ_INTEGRATION.md) - Cloud HQ Architecture.
*   [`doc/Operator Manual.md`](../.agent/Operator%20Manual.md) - AI Agent Roles.

---

**Sign-off**: _______________________ (Manager)
