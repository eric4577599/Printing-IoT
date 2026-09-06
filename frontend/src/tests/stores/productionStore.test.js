import { describe, it, expect } from 'vitest';
import useProductionStore from '../../stores/productionStore';

describe('useProductionStore', () => {
  // Reset store between tests
  beforeEach(() => {
    // Clear localStorage mocks
    localStorage.clear();
    // Reset store to initial state
    useProductionStore.setState({
      orders: [{ id: 'placeholder', boxNo: 'WAITING', msg: '等待派工 (Waiting)', orderNo: '-', qty: 0, eta: '-', status: 'Idle' }],
      products: [],
      logs: [],
    });
  });

  describe('Orders', () => {
    it('should start with a placeholder order', () => {
      const { orders } = useProductionStore.getState();
      expect(orders).toHaveLength(1);
      expect(orders[0].id).toBe('placeholder');
    });

    it('should save a new order', () => {
      useProductionStore.getState().saveOrder({
        boxNo: 'BOX-001',
        productName: 'Test Product',
        qty: 500,
        orderNo: 'ORD-2026-001',
      });

      const { orders } = useProductionStore.getState();
      expect(orders).toHaveLength(2);
      expect(orders[1].boxNo).toBe('BOX-001');
      expect(orders[1].qty).toBe(500);
      expect(orders[1].status).toBe('Queued');
    });

    it('should update an existing order', () => {
      // Add an order first
      useProductionStore.getState().saveOrder({
        boxNo: 'BOX-001',
        productName: 'Original',
        qty: 100,
      });
      const orderId = useProductionStore.getState().orders[1].id;

      // Update it
      useProductionStore.getState().saveOrder(
        { productName: 'Updated', qty: 999 },
        true,
        orderId
      );

      const { orders } = useProductionStore.getState();
      const updated = orders.find((o) => o.id === orderId);
      expect(updated.msg).toBe('Updated');
      expect(updated.qty).toBe(999);
    });

    it('should delete an order', () => {
      useProductionStore.getState().saveOrder({
        boxNo: 'BOX-DEL',
        productName: 'To Delete',
        qty: 100,
      });
      const orderId = useProductionStore.getState().orders[1].id;

      useProductionStore.getState().deleteOrder(orderId);
      const { orders } = useProductionStore.getState();
      expect(orders.find((o) => o.id === orderId)).toBeUndefined();
    });

    it('should move orders', () => {
      // Add two orders
      useProductionStore.getState().saveOrder({ boxNo: 'A', productName: 'A', qty: 1 });
      useProductionStore.getState().saveOrder({ boxNo: 'B', productName: 'B', qty: 2 });

      // Initial: [placeholder, A, B]
      const beforeMove = useProductionStore.getState().orders;
      expect(beforeMove[1].boxNo).toBe('A');
      expect(beforeMove[2].boxNo).toBe('B');

      // Swap 1 and 2
      useProductionStore.getState().moveOrder(1, 2);
      const afterMove = useProductionStore.getState().orders;
      expect(afterMove[1].boxNo).toBe('B');
      expect(afterMove[2].boxNo).toBe('A');
    });

    it('should reorder (renumber) orders', () => {
      useProductionStore.getState().saveOrder({ boxNo: 'X', qty: 10 });
      useProductionStore.getState().saveOrder({ boxNo: 'Y', qty: 20 });

      useProductionStore.getState().reorderOrders();

      const { orders } = useProductionStore.getState();
      expect(orders[0].seqNo).toBe(10);
      expect(orders[1].seqNo).toBe(20);
      expect(orders[2].seqNo).toBe(30);
    });
  });

  describe('Products', () => {
    it('should save a new product', () => {
      useProductionStore.getState().saveProduct({
        boxNo: 'PROD-001',
        productName: 'Widget',
      });

      const { products } = useProductionStore.getState();
      expect(products).toHaveLength(1);
      expect(products[0].boxNo).toBe('PROD-001');
    });

    it('should update existing product by boxNo', () => {
      useProductionStore.getState().saveProduct({
        boxNo: 'PROD-001',
        productName: 'V1',
      });
      useProductionStore.getState().saveProduct({
        boxNo: 'PROD-001',
        productName: 'V2',
      });

      const { products } = useProductionStore.getState();
      expect(products).toHaveLength(1);
      expect(products[0].productName).toBe('V2');
    });

    it('should delete a product by index', () => {
      useProductionStore.getState().saveProduct({ boxNo: 'A' });
      useProductionStore.getState().saveProduct({ boxNo: 'B' });

      useProductionStore.getState().deleteProduct(0);
      const { products } = useProductionStore.getState();
      expect(products).toHaveLength(1);
      expect(products[0].boxNo).toBe('B');
    });
  });

  describe('Logs', () => {
    it('should add a log entry', () => {
      useProductionStore.getState().addLog('Test message');
      const { logs } = useProductionStore.getState();
      expect(logs).toHaveLength(1);
      expect(logs[0].message).toBe('Test message');
      expect(logs[0].time).toBeDefined();
    });

    it('should cap logs at 50', () => {
      for (let i = 0; i < 60; i++) {
        useProductionStore.getState().addLog(`Log ${i}`);
      }
      const { logs } = useProductionStore.getState();
      expect(logs).toHaveLength(50);
    });
  });
});
