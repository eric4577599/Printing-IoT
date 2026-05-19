import { useRef, useEffect } from 'react';

/**
 * useSimulation — 模擬引擎 Hook
 *
 * 負責根據 speedFactor 與 isMotorOn 狀態生成虛擬 PLC 數據，
 * 支援 Local (直接更新) 與 Remote (MQTT 發布) 兩種模式。
 *
 * 從 Dashboard.jsx Effect:Simulation Mode (L651-L724) 抽取。
 */
export function useSimulation({
  isSimulating,
  isMotorOn,
  speedFactor = 0,
  machineMaxSpeed = 350,
  thresholdSettings = {},
  simulationMode = 'remote',
  mqttClientRef,
  onLocalUpdate,
}) {
  const simStateRef = useRef({
    line_speed: 0,
    di1: 0,
    status_code: 0,
  });

  // Sync simState with current data when starting simulation
  const syncState = (currentData) => {
    simStateRef.current = { ...currentData };
  };

  useEffect(() => {
    let interval;

    if (isSimulating) {
      interval = setInterval(() => {
        let newSpeed = 0;
        let distance = 0;

        if (isMotorOn) {
          const speedBasePercent = thresholdSettings.speedBasePercent || 80;
          const speedBaseType = thresholdSettings.speedBaseType || 'standard';
          const standardSpeed = machineMaxSpeed * (speedBasePercent / 100);
          const maxSpeed = machineMaxSpeed;
          const baseSpeed = speedBaseType === 'maximum' ? maxSpeed : standardSpeed;

          if (speedFactor <= -1) {
            newSpeed = 0;
          } else if (speedFactor >= 1) {
            newSpeed = maxSpeed + (Math.random() * 10 - 5);
          } else if (speedFactor === 0) {
            newSpeed = baseSpeed + (Math.random() * 20 - 10);
          } else if (speedFactor > 0) {
            const targetSpeed = baseSpeed + (maxSpeed - baseSpeed) * speedFactor;
            newSpeed = targetSpeed + (Math.random() * 15 - 7.5);
          } else {
            const targetSpeed = baseSpeed * (1 + speedFactor);
            newSpeed = Math.max(0, targetSpeed + (Math.random() * 10 - 5));
          }
          distance = newSpeed / 60 / 10;
        }

        // Update Virtual PLC State
        simStateRef.current = {
          ...simStateRef.current,
          line_speed: Math.max(0, newSpeed),
          di1: simStateRef.current.di1 + distance,
          status_code: newSpeed > 0 ? 1 : 0,
        };

        if (simulationMode === 'local') {
          onLocalUpdate?.({ ...simStateRef.current });
        } else {
          // Remote Mode: MQTT Publish
          if (mqttClientRef?.current?.connected) {
            const payload = {
              d1: Math.floor(simStateRef.current.di1),
              di1: simStateRef.current.di1,
              line_speed: simStateRef.current.line_speed,
              status_code: simStateRef.current.status_code,
              timestamp: new Date().toISOString(),
            };
            mqttClientRef.current.publish(
              'factory/machine/update',
              JSON.stringify(payload)
            );
          }
        }
      }, 100);
    } else {
      // Simulation Stop: Send 0 speed once
      if (
        simulationMode === 'remote' &&
        mqttClientRef?.current?.connected
      ) {
        const payload = {
          ...simStateRef.current,
          line_speed: 0,
          status_code: 0,
        };
        mqttClientRef.current.publish(
          'factory/machine/update',
          JSON.stringify(payload)
        );
      }
      if (simulationMode === 'local') {
        onLocalUpdate?.((prev) => ({ ...prev, line_speed: 0 }));
      }
    }

    return () => clearInterval(interval);
  }, [
    isSimulating,
    isMotorOn,
    speedFactor,
    machineMaxSpeed,
    thresholdSettings,
    simulationMode,
  ]);

  return { simStateRef, syncState };
}
