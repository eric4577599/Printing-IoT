import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useRealtimeData } from '../../hooks/useRealtimeData';

// Mock the api module
vi.mock('../../services/api', () => ({
  getRealtimeData: vi.fn(),
}));

import { getRealtimeData } from '../../services/api';

describe('useRealtimeData', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should initialize with zero values', () => {
    const { result } = renderHook(() =>
      useRealtimeData({ isSimulating: false, simulationMode: 'remote' })
    );

    expect(result.current.currentData).toEqual({
      line_speed: 0,
      di1: 0,
      status_code: 0,
    });
    expect(result.current.resetOffset).toBe(0);
  });

  it('should poll API every 1 second', async () => {
    getRealtimeData.mockResolvedValue({
      lineSpeed: 120,
      di1: 500,
      status: 1,
    });

    const { result } = renderHook(() =>
      useRealtimeData({ isSimulating: false, simulationMode: 'remote' })
    );

    // Advance 1 second to trigger first poll
    await act(async () => {
      vi.advanceTimersByTime(1000);
    });

    expect(getRealtimeData).toHaveBeenCalledTimes(1);
  });

  it('should skip polling when local simulation is active', async () => {
    const { result } = renderHook(() =>
      useRealtimeData({ isSimulating: true, simulationMode: 'local' })
    );

    await act(async () => {
      vi.advanceTimersByTime(3000);
    });

    expect(getRealtimeData).not.toHaveBeenCalled();
  });

  it('should initialize offset on first non-zero data', async () => {
    getRealtimeData.mockResolvedValue({
      lineSpeed: 100,
      di1: 1500,
      status: 1,
    });

    const { result } = renderHook(() =>
      useRealtimeData({ isSimulating: false, simulationMode: 'remote' })
    );

    await act(async () => {
      vi.advanceTimersByTime(1000);
    });

    // After first data load with di1 > 0, offset should be initialized
    expect(result.current.resetOffset).toBe(1500);
  });

  it('should allow manual offset adjustment', () => {
    const { result } = renderHook(() =>
      useRealtimeData({ isSimulating: false, simulationMode: 'remote' })
    );

    act(() => {
      result.current.setResetOffset(100);
    });

    expect(result.current.resetOffset).toBe(100);
  });

  it('should handle API errors gracefully', async () => {
    getRealtimeData.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() =>
      useRealtimeData({ isSimulating: false, simulationMode: 'remote' })
    );

    // Should not throw
    await act(async () => {
      vi.advanceTimersByTime(1000);
    });

    // Data should remain at defaults
    expect(result.current.currentData.line_speed).toBe(0);
  });
});
