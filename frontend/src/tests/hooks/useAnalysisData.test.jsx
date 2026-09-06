import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

// 以 mock 取代 axios(沿用既有寫法),讓 hook 走真正的 api 與 useProductionRecords。
const mockInstance = {
    get: vi.fn(() => Promise.resolve({ data: [] })),
    post: vi.fn(() => Promise.resolve({ data: null })),
    put: vi.fn(() => Promise.resolve({ data: null })),
    delete: vi.fn(() => Promise.resolve({ data: null })),
    // S5:api.js 於 import 期註冊攔截器,假 instance 必須具備 interceptors 形狀
    interceptors: {
        request: { use: vi.fn() },
        response: { use: vi.fn() },
    },
};

vi.mock('axios', () => ({
    default: {
        create: () => mockInstance,
    },
}));

const { LanguageProvider } = await import('../../modules/language/LanguageContext');
const { useAnalysisData } = await import('../../pages/analysis/hooks/useAnalysisData');

/**
 * useAnalysisData 改讀後端測試(AC-S4-02、AC-S4-03,以及既有回傳欄位不得減少)。
 */

const today = new Date().toISOString().split('T')[0];

/** 造一筆後端完工實績 DTO。 */
const dto = (over = {}) => ({
    id: 'guid-1',
    clientRecordId: '1001',
    orderId: null,
    orderNumber: 'BACKEND-001',
    operator: '阿明',
    shift: 'A',
    targetQty: 1000,
    goodQty: 900,
    defectQty: 100,
    prepTimeMinutes: 20,
    runTimeMinutes: 90,
    stopTimeMinutes: 30,
    stopCount: 1,
    avgSpeed: 120,
    availabilityRate: 90,
    performanceRate: 90,
    qualityRate: 90,
    oee: 55.5,
    shortageReason: '',
    completedAt: `${today}T06:30:00Z`,
    productionDate: today,
    defects: [],
    stops: [],
    ...over,
});

/** 造一筆本機快取記錄。 */
const local = (over = {}) => ({
    id: 1001,
    orderNo: 'LOCAL-1001',
    customer: '老客戶',
    productName: '五層箱',
    shift: 'B',
    targetQty: 1000,
    goodQty: 900,
    defectQty: 100,
    prepTime: 20,
    runTime: 90,
    stopTime: 30,
    stopCount: 1,
    avgSpeed: 110,
    oee: 99,
    date: today,
    finishedAt: `${today}T10:00:00Z`,
    stopReasons: [],
    ...over,
});

const wrapper = ({ children }) => <LanguageProvider>{children}</LanguageProvider>;

describe('useAnalysisData 改讀後端(S4 / F4.2)', () => {
    beforeEach(() => {
        mockInstance.get.mockReset();
        mockInstance.get.mockResolvedValue({ data: [] });
        localStorage.clear();
        vi.spyOn(console, 'warn').mockImplementation(() => { });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('AC-S4-02:localStorage 有資料時仍呼叫 API,productionHistory 含後端列', async () => {
        localStorage.setItem('productionHistory', JSON.stringify([local({ id: 900, orderNo: 'LOCAL-900' })]));
        mockInstance.get.mockResolvedValue({ data: [dto()] });

        const { result } = renderHook(() => useAnalysisData(), { wrapper });

        await waitFor(() => expect(result.current.isLoading).toBe(false));

        expect(mockInstance.get).toHaveBeenCalled();
        expect(mockInstance.get.mock.calls[0][0]).toBe('/production/completions');
        expect(result.current.productionHistory.some(r => r.orderNo === 'BACKEND-001')).toBe(true);
    });

    it('AC-S4-02b:日期區間下推給後端(from / to 為 hook 的 startDate / endDate)', async () => {
        const { result } = renderHook(() => useAnalysisData(), { wrapper });

        await waitFor(() => expect(result.current.isLoading).toBe(false));

        const [, config] = mockInstance.get.mock.calls[0];
        expect(config.params.from).toBe(result.current.startDate);
        expect(config.params.to).toBe(result.current.endDate);
    });

    it('AC-S4-03:同一筆時顯示後端的 oee,即使本機快取是不同數字', async () => {
        localStorage.setItem('productionHistory', JSON.stringify([local({ id: 1001, oee: 99 })]));
        mockInstance.get.mockResolvedValue({ data: [dto({ clientRecordId: '1001', oee: 55.5 })] });

        const { result } = renderHook(() => useAnalysisData(), { wrapper });

        await waitFor(() => expect(result.current.isLoading).toBe(false));

        expect(result.current.productionHistory).toHaveLength(1);
        expect(result.current.productionHistory[0].oee).toBe(55.5);
        expect(result.current.productionHistory[0].source).toBe('backend');
    });

    it('既有回傳欄位一個不少,並新增資料狀態欄位(加法式變更)', async () => {
        const { result } = renderHook(() => useAnalysisData(), { wrapper });

        await waitFor(() => expect(result.current.isLoading).toBe(false));

        [
            'startDate', 'setStartDate', 'endDate', 'setEndDate',
            'selectedCategories', 'setSelectedCategories', 'chartType', 'setChartType',
            'timeScale', 'setTimeScale', 'selectedDisplayItems', 'setSelectedDisplayItems',
            'viewMode', 'setViewMode', 'sidebarCollapsed', 'setSidebarCollapsed',
            'productionHistory', 'groupedData', 'summaryStats', 't',
            'isLoading', 'error', 'isDegraded', 'truncated', 'localOnlyCount', 'reload',
        ].forEach(key => {
            expect(result.current, `useAnalysisData 應回傳 ${key}`).toHaveProperty(key);
        });
    });

    it('API 失敗時退回本機快取並標示降級', async () => {
        localStorage.setItem('productionHistory', JSON.stringify([local({ id: 900, orderNo: 'LOCAL-900' })]));
        mockInstance.get.mockRejectedValue(new Error('Network Error'));

        const { result } = renderHook(() => useAnalysisData(), { wrapper });

        await waitFor(() => expect(result.current.isLoading).toBe(false));

        expect(result.current.isDegraded).toBe(true);
        expect(result.current.productionHistory).toHaveLength(1);
        expect(result.current.productionHistory[0].source).toBe('local');
    });
});
