import { useState, useEffect, useRef } from 'react';
import { getRealtimeData } from '../services/api';

/**
 * useRealtimeData — 即時數據 Hook
 *
 * 管理來自後端 API 的即時監控數據（速度、計數、狀態），
 * 包含 Tare (歸零) 邏輯與 Offset 管理。
 *
 * 從 Dashboard.jsx Effect:Real-time Data Polling (L733-L765) 抽取。
 */
export function useRealtimeData({ isSimulating, simulationMode }) {
  const [currentData, setCurrentData] = useState({
    line_speed: 0,
    di1: 0,
    status_code: 0,
  });

  const [resetOffset, setResetOffset] = useState(0);
  const isOffsetInitialized = useRef(false);
  const currentDataRef = useRef(currentData);

  // Keep ref in sync (avoid stale closure in timers)
  currentDataRef.current = currentData;

  // API Polling
  useEffect(() => {
    const fetchRealtime = async () => {
      if (isSimulating && simulationMode === 'local') return;

      try {
        const data = await getRealtimeData();
        if (data) {
          setCurrentData((prev) => ({
            ...prev,
            line_speed:
              data.lineSpeed ?? data.speed ?? data.line_speed ?? 0,
            di1:
              data.di1 ?? data.DI1 ?? data.totalLength ?? data.total_length ?? 0,
            status_code: data.status,
          }));

          // INITIALIZE OFFSET (TARE) ON FIRST DATA LOAD
          if (
            !isOffsetInitialized.current &&
            (data.di1 || data.totalLength || data.d1) > 0
          ) {
            const rawVal =
              data.di1 ?? data.DI1 ?? data.totalLength ?? data.total_length ?? 0;
            setResetOffset(rawVal);
            isOffsetInitialized.current = true;
          }
        }
      } catch (err) {
        // Silently retry — normal in disconnected/startup scenarios
      }
    };

    const interval = setInterval(fetchRealtime, 1000);
    return () => clearInterval(interval);
  }, [isSimulating, simulationMode]);

  return {
    currentData,
    setCurrentData,
    currentDataRef,
    resetOffset,
    setResetOffset,
  };
}
