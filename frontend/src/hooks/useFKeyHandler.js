import { useEffect, useCallback } from 'react';

/**
 * useFKeyHandler — F-Key 鍵盤事件處理 Hook
 *
 * 集中管理 F1-F12 按鍵的業務邏輯分派，
 * 避免在 Dashboard 組件中堆積 switch-case。
 *
 * 從 Dashboard.jsx Effect:F-Key Listener (L435-L635) 抽取。
 */
export function useFKeyHandler({
  orders,
  setOrders,
  selectedOrderId,
  setSelectedOrderId,
  currentDataRef,
  resetOffset,
  setResetOffset,
  isPlcConnected,
  addLog,
  t,
  // Action callbacks
  onShowOrderModal,
  onMoveOrder,
  onFinish,
  onShowLoginModal,
  setIsMotorOn,
  setCurrentOrder,
  clearCurrentOrder,
  autoNext,
  setAutoNext,
  setCurrentMonitorData,
}) {
  const handleMoveOrder = useCallback(
    (direction) => {
      if (orders.length < 2) return;

      let targetIndex = 1;
      if (selectedOrderId) {
        const idx = orders.findIndex((o) => o.id === selectedOrderId);
        if (idx > 0) targetIndex = idx;
      }

      if (targetIndex < 1) {
        addLog(`Cannot move Running Order ${selectedOrderId}`);
        return;
      }

      let swapIndex = -1;
      if (direction === 'up' && targetIndex > 1) swapIndex = targetIndex - 1;
      if (direction === 'down' && targetIndex < orders.length - 1)
        swapIndex = targetIndex + 1;

      if (swapIndex !== -1) {
        onMoveOrder(targetIndex, swapIndex);
        addLog(
          `Moved Order ${selectedOrderId || orders[targetIndex].id} ${direction} to pos ${swapIndex}`
        );
      } else {
        addLog(`Cannot move ${direction} further.`);
      }
    },
    [orders, selectedOrderId, addLog, onMoveOrder]
  );

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key.startsWith('F')) e.preventDefault();

      let key = e.key;
      if (e.key === 'F8') key = 'Manual';

      switch (key) {
        case 'F7':
          onShowOrderModal(true);
          addLog(t('dashboard.logs.f7OrderModal'));
          break;

        case 'F1':
          handleMoveOrder('up');
          addLog(t('dashboard.logs.f1Pressed'));
          break;

        case 'F2':
          handleMoveOrder('down');
          addLog(t('dashboard.logs.f2Pressed'));
          break;

        case 'F3':
          handleF3({
            orders,
            setOrders,
            selectedOrderId,
            setSelectedOrderId,
            currentDataRef,
            setResetOffset,
            isPlcConnected,
            addLog,
            t,
            setIsMotorOn,
            setCurrentOrder,
          });
          break;

        case 'F4':
          if (currentDataRef.current.line_speed > 0) {
            alert(t('dashboard.alerts.speedNotZero'));
            addLog('F4 Failed: Speed is not 0');
            return;
          }
          onFinish();
          break;

        case 'F5':
          setResetOffset((prev) => prev - 1);
          addLog(t('dashboard.logs.f5GoodQty'));
          break;

        case 'F6':
          setResetOffset((prev) => prev + 1);
          addLog(t('dashboard.logs.f6DefectQty'));
          break;

        case 'Manual':
          setAutoNext((prev) => {
            addLog(`F8: Auto Next toggled to ${!prev}`);
            return !prev;
          });
          break;

        case 'F9':
          addLog(t('dashboard.logs.f9SwitchShift'));
          onShowLoginModal?.(true);
          break;

        case 'F10':
          handleF10({
            orders,
            setOrders,
            currentDataRef,
            setResetOffset,
            autoNext,
            addLog,
            t,
            setIsMotorOn,
            clearCurrentOrder,
          });
          break;

        case 'F12':
          if (confirm('確定離開?')) {
            addLog('F12: Exit System');
            window.close();
          }
          break;

        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [orders, selectedOrderId, resetOffset, autoNext, handleMoveOrder]);

  return { handleMoveOrder };
}

// --- Internal Helpers ---

function handleF3({
  orders,
  setOrders,
  selectedOrderId,
  setSelectedOrderId,
  currentDataRef,
  setResetOffset,
  isPlcConnected,
  addLog,
  t,
  setIsMotorOn,
  setCurrentOrder,
}) {
  if (!isPlcConnected) {
    alert(t('dashboard.alerts.plcDisconnected'));
    addLog('F3 Failed: PLC Disconnected');
    return;
  }

  const isPlaceholder = orders[0]?.id === 'placeholder';

  if (isPlaceholder) {
    if (selectedOrderId) {
      const idx = orders.findIndex((o) => o.id === selectedOrderId);
      if (idx > 0) {
        const newOrders = [...orders];
        const selected = newOrders[idx];
        newOrders[0] = { ...selected, status: 'Running' };
        newOrders.splice(idx, 1);
        setOrders(newOrders);
        setResetOffset(currentDataRef.current.di1);
        setSelectedOrderId?.(null);

        setCurrentOrder?.({
          order_id: selected.id,
          order_no: selected.orderNo || '',
          customer: selected.customer || '',
          box_no: selected.boxNo || '',
          target_qty: selected.qty || 0,
        })
          .then(() => addLog(`F3: Order ${selected.id} synced to backend`))
          .catch((err) =>
            addLog(`F3: Backend sync failed - ${err.message}`)
          );

        addLog(`F3: Moved Order ${selected.id} to Production`);
      }
    } else {
      alert(t('dashboard.alerts.selectQueuedOrder'));
    }
  } else {
    const currentOrder = orders[0];
    if (currentOrder) {
      setCurrentOrder?.({
        order_id: currentOrder.id,
        order_no: currentOrder.orderNo || '',
        customer: currentOrder.customer || '',
        box_no: currentOrder.boxNo || '',
        target_qty: currentOrder.qty || 0,
      })
        .then(() => addLog('F3: CurrentOrder synced to backend'))
        .catch(() => {});
    }
    alert(`F3: ${t('dashboard.alerts.startProduction')}`);
    addLog(t('dashboard.logs.f3Start'));
  }
}

function handleF10({
  orders,
  setOrders,
  currentDataRef,
  setResetOffset,
  autoNext,
  addLog,
  t,
  setIsMotorOn,
  clearCurrentOrder,
}) {
  if (currentDataRef.current.line_speed > 0) {
    alert(t('dashboard.alerts.speedNotZeroReturn'));
    addLog('F10 Failed: Speed is not 0');
    return;
  }

  if (orders.length > 0 && orders[0].id !== 'placeholder') {
    const curLen = currentDataRef.current.di1;
    const newOrders = [...orders];
    const returnedOrder = { ...newOrders[0], status: 'Queued' };

    const placeholder = {
      id: 'placeholder',
      boxNo: 'WAITING',
      msg: '等待派工 (Waiting)',
      orderNo: '-',
      qty: 0,
      eta: '-',
      status: 'Idle',
    };

    if (autoNext && newOrders.length > 1) {
      newOrders[0] = { ...newOrders[1], status: 'Running' };
      newOrders[1] = returnedOrder;
      addLog(
        `F10 (Auto): Swapped ${returnedOrder.id} with ${newOrders[0].id}`
      );
    } else {
      newOrders.splice(0, 0, placeholder);
      newOrders[1] = returnedOrder;
      addLog(`F10: Returned ${returnedOrder.id} to queue. Box is Empty.`);
    }

    setOrders(newOrders);
    setResetOffset(curLen);
    setIsMotorOn(true);

    clearCurrentOrder?.()
      .then(() => addLog('F10: CurrentOrder cleared from backend'))
      .catch((err) =>
        console.error('Failed to clear CurrentOrder:', err)
      );
  }
}
