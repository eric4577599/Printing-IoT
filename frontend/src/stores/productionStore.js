import { create } from 'zustand';
import { createSeedProducts } from '../data/seedProducts';

/**
 * useProductionStore — 全域生產狀態管理 (Zustand)
 *
 * 取代 MainLayout.jsx 中以 useOutletContext 傳遞的全域狀態，
 * 提供跨頁面共享的 orders, products, logs 等核心狀態。
 *
 * 優勢：
 * - 任何組件可直接 import 使用，無需 Provider 或 Context
 * - 減少 MainLayout 547 行中的狀態管理邏輯
 * - 支援 DevTools 除錯
 */
const useProductionStore = create((set, get) => ({
  // === Orders ===
  orders: (() => {
    try {
      const saved = localStorage.getItem('orders');
      const initialOrders = saved ? JSON.parse(saved) : [];
      if (initialOrders.length === 0) {
        return [createPlaceholder()];
      }
      return initialOrders;
    } catch {
      return [createPlaceholder()];
    }
  })(),

  setOrders: (ordersOrUpdater) => {
    set((state) => {
      const newOrders =
        typeof ordersOrUpdater === 'function'
          ? ordersOrUpdater(state.orders)
          : ordersOrUpdater;
      localStorage.setItem('orders', JSON.stringify(newOrders));
      return { orders: newOrders };
    });
  },

  moveOrder: (fromIndex, toIndex) => {
    set((state) => {
      if (toIndex < 0 || toIndex >= state.orders.length) return state;
      const newOrders = [...state.orders];
      [newOrders[fromIndex], newOrders[toIndex]] = [
        newOrders[toIndex],
        newOrders[fromIndex],
      ];
      localStorage.setItem('orders', JSON.stringify(newOrders));
      return { orders: newOrders };
    });
  },

  deleteOrder: (orderId) => {
    set((state) => {
      const filtered = state.orders.filter(
        (o) => String(o.id) !== String(orderId)
      );
      localStorage.setItem('orders', JSON.stringify(filtered));
      return { orders: filtered };
    });
    get().addLog(`Order ${orderId} Deleted`);
  },

  saveOrder: (formData, isEdit = false, existingId = null) => {
    set((state) => {
      let newOrders;
      if (isEdit && existingId) {
        newOrders = state.orders.map((o) =>
          o.id === existingId
            ? {
                ...o,
                ...formData,
                msg: formData.productName,
                qty:
                  Number(formData.qty) ||
                  Number(formData.bundleCount) * 100 ||
                  1000,
              }
            : o
        );
      } else {
        const timestamp = Date.now();
        const newOrder = {
          id: `ord_${timestamp}`,
          seqNo: (timestamp % 10000) * 10,
          ...formData,
          msg: formData.productName || 'New Product',
          orderNo:
            formData.orderNo ||
            `ORD-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`,
          qty: formData.qty
            ? Number(formData.qty)
            : Number(formData.bundleCount) * 100 || 1000,
          eta: '12:00',
          status: 'Queued',
          boxNo: formData.boxNo || '-',
        };
        newOrders = [...state.orders, newOrder];
      }
      localStorage.setItem('orders', JSON.stringify(newOrders));
      return { orders: newOrders };
    });
  },

  reorderOrders: () => {
    set((state) => {
      const newOrders = state.orders.map((o, index) => ({
        ...o,
        seqNo: (index + 1) * 10,
      }));
      localStorage.setItem('orders', JSON.stringify(newOrders));
      return { orders: newOrders };
    });
    get().addLog('Orders Renumbered (seqNo updated)');
  },

  // === Products ===
  // 產品檔顯示於生產排程頁右側;空白時種入 RSC/HSC 測試料號,供「加入排程→生成工單」驗證。
  products: (() => {
    try {
      const saved = localStorage.getItem('products');
      const initial = saved ? JSON.parse(saved) : [];
      if (initial.length === 0) {
        return createSeedProducts();
      }
      return initial;
    } catch {
      return createSeedProducts();
    }
  })(),

  setProducts: (productsOrUpdater) => {
    set((state) => {
      const newProducts =
        typeof productsOrUpdater === 'function'
          ? productsOrUpdater(state.products)
          : productsOrUpdater;
      localStorage.setItem('products', JSON.stringify(newProducts));
      return { products: newProducts };
    });
  },

  saveProduct: (productData) => {
    set((state) => {
      const exists = state.products.find(
        (p) => p.boxNo === productData.boxNo
      );
      let newProducts;
      if (exists) {
        newProducts = state.products.map((p) =>
          p.boxNo === productData.boxNo ? { ...p, ...productData } : p
        );
      } else {
        newProducts = [
          ...state.products,
          { ...productData, id: `p${Date.now()}` },
        ];
      }
      localStorage.setItem('products', JSON.stringify(newProducts));
      return { products: newProducts };
    });
  },

  deleteProduct: (index) => {
    set((state) => {
      const newProducts = state.products.filter((_, i) => i !== index);
      localStorage.setItem('products', JSON.stringify(newProducts));
      return { products: newProducts };
    });
    get().addLog('Product Deleted from Library');
  },

  // === Logs ===
  logs: [],
  addLog: (msg) => {
    const time = new Date().toLocaleTimeString('en-US', { hour12: false });
    set((state) => ({
      logs: [{ time, message: msg }, ...state.logs].slice(0, 50),
    }));
  },

  // === Monitor Data (Shared for Schedule page) ===
  currentMonitorData: {
    lineSpeed: 0,
    currentQty: 0,
    resetOffset: 0,
  },
  setCurrentMonitorData: (data) => set({ currentMonitorData: data }),

  // === Simulation State ===
  isSimulating: false,
  setIsSimulating: (val) => set({ isSimulating: val }),
  simulationMode: 'remote',
  setSimulationMode: (val) => set({ simulationMode: val }),
  isMotorOn: true,
  setIsMotorOn: (val) => set({ isMotorOn: val }),
  speedFactor: 0,
  setSpeedFactor: (val) => set({ speedFactor: val }),

  // === PLC Connection ===
  isPlcConnected: true,
  setIsPlcConnected: (val) => set({ isPlcConnected: val }),
}));

// === Helper ===
function createPlaceholder() {
  return {
    id: 'placeholder',
    boxNo: 'WAITING',
    msg: '等待派工 (Waiting)',
    orderNo: '-',
    qty: 0,
    eta: '-',
    status: 'Idle',
  };
}


export default useProductionStore;
