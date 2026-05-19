import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useProductionTimer, formatDuration } from '../../hooks/useProductionTimer';

describe('formatDuration', () => {
  it('should format 0 seconds', () => {
    expect(formatDuration(0)).toBe('00:00:00');
  });

  it('should format seconds only', () => {
    expect(formatDuration(45)).toBe('00:00:45');
  });

  it('should format minutes and seconds', () => {
    expect(formatDuration(125)).toBe('00:02:05');
  });

  it('should format hours, minutes and seconds', () => {
    expect(formatDuration(3661)).toBe('01:01:01');
  });

  it('should handle NaN gracefully', () => {
    expect(formatDuration(NaN)).toBe('00:00:00');
  });

  it('should handle undefined gracefully', () => {
    expect(formatDuration(undefined)).toBe('00:00:00');
  });
});

describe('useProductionTimer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should initialize all timers at zero', () => {
    const currentDataRef = { current: { line_speed: 0 } };
    const { result } = renderHook(() =>
      useProductionTimer({
        currentDataRef,
        isContinuousProduction: false,
        setIsContinuousProduction: vi.fn(),
      })
    );

    expect(result.current.jobRunTime).toBe(0);
    expect(result.current.jobStopTime).toBe(0);
    expect(result.current.todayRunTime).toBe(0);
    expect(result.current.todayStopTime).toBe(0);
    expect(result.current.prepTimeSeconds).toBe(0);
  });

  it('should increment run time when speed > 0', () => {
    const currentDataRef = { current: { line_speed: 100 } };
    const setIsContinuousProduction = vi.fn();
    const { result } = renderHook(() =>
      useProductionTimer({
        currentDataRef,
        isContinuousProduction: false,
        setIsContinuousProduction,
      })
    );

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(result.current.jobRunTime).toBe(3);
    expect(result.current.todayRunTime).toBe(3);
    expect(setIsContinuousProduction).toHaveBeenCalledWith(true);
  });

  it('should increment stop time when speed = 0', () => {
    const currentDataRef = { current: { line_speed: 0 } };
    const { result } = renderHook(() =>
      useProductionTimer({
        currentDataRef,
        isContinuousProduction: true,
        setIsContinuousProduction: vi.fn(),
      })
    );

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(result.current.jobStopTime).toBe(2);
    expect(result.current.todayStopTime).toBe(2);
  });

  it('should increment prep time when not in continuous production', () => {
    const currentDataRef = { current: { line_speed: 0 } };
    const { result } = renderHook(() =>
      useProductionTimer({
        currentDataRef,
        isContinuousProduction: false,
        setIsContinuousProduction: vi.fn(),
      })
    );

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(result.current.prepTimeSeconds).toBe(5);
  });

  it('should reset job timers', () => {
    const currentDataRef = { current: { line_speed: 100 } };
    const setIsContinuousProduction = vi.fn();
    const { result } = renderHook(() =>
      useProductionTimer({
        currentDataRef,
        isContinuousProduction: false,
        setIsContinuousProduction,
      })
    );

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(result.current.jobRunTime).toBe(3);

    act(() => {
      result.current.resetJobTimers();
    });

    expect(result.current.jobRunTime).toBe(0);
    expect(result.current.jobStopTime).toBe(0);
    expect(result.current.prepTimeSeconds).toBe(0);
    expect(setIsContinuousProduction).toHaveBeenCalledWith(false);
  });
});
