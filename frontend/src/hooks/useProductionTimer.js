import { useEffect, useCallback } from 'react';

/**
 * useProductionTimer — 生產計時器 Hook
 *
 * 每秒追蹤 runTime / stopTime / prepTime，
 * 並管理連續生產狀態。
 *
 * 從 Dashboard.jsx Effect:Timers (L786-L808) 抽取。
 */
export function useProductionTimer({ currentDataRef, isContinuousProduction, setIsContinuousProduction }) {
  const [jobRunTime, setJobRunTime] = useStateWithDefault(0);
  const [todayRunTime, setTodayRunTime] = useStateWithDefault(0);
  const [jobStopTime, setJobStopTime] = useStateWithDefault(0);
  const [todayStopTime, setTodayStopTime] = useStateWithDefault(0);
  const [prepTimeSeconds, setPrepTimeSeconds] = useStateWithDefault(0);

  useEffect(() => {
    const timer = setInterval(() => {
      const speed = currentDataRef.current?.line_speed ?? 0;

      if (speed > 0) {
        setJobRunTime((prev) => prev + 1);
        setTodayRunTime((prev) => prev + 1);
        setIsContinuousProduction(true);
      } else {
        setJobStopTime((prev) => prev + 1);
        setTodayStopTime((prev) => prev + 1);
      }

      // 準備時間計時：在未達連續生產狀態時累計
      if (!isContinuousProduction) {
        setPrepTimeSeconds((prev) => prev + 1);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [isContinuousProduction]);

  const resetJobTimers = useCallback(() => {
    setJobRunTime(0);
    setJobStopTime(0);
    setPrepTimeSeconds(0);
    setIsContinuousProduction(false);
  }, []);

  return {
    jobRunTime,
    todayRunTime,
    jobStopTime,
    todayStopTime,
    prepTimeSeconds,
    resetJobTimers,
    setJobRunTime,
    setJobStopTime,
    setPrepTimeSeconds,
  };
}

/**
 * Helper: Format seconds to HH:MM:SS
 */
export function formatDuration(secs) {
  if (!secs || isNaN(secs)) return '00:00:00';
  const h = Math.floor(secs / 3600)
    .toString()
    .padStart(2, '0');
  const m = Math.floor((secs % 3600) / 60)
    .toString()
    .padStart(2, '0');
  const s = (secs % 60).toString().padStart(2, '0');
  return `${h}:${m}:${s}`;
}

// Internal helper — we re-export useState to keep the hook self-contained
// without requiring callers to manage individual state pieces
import { useState } from 'react';
function useStateWithDefault(defaultValue) {
  return useState(defaultValue);
}
