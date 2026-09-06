import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// 以 mock 取代 axios(沿用 src/tests/services/api.test.js 的既有寫法),
// 讓 ReportsPage 走真正的 api 與 useProductionRecords,只在網路那一層造假。
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

const { LanguageProvider, translations } = await import('../../modules/language/LanguageContext');
const { default: ReportsPage } = await import('../../modules/reports/ReportsPage');

/**
 * ReportsPage 資料來源改接測試
 * (AC-S4-01、AC-S4-06、AC-S4-09、AC-S4-12、AC-S4-13、AC-S4-16 UI、AC-S4-28、AC-S4-29、E-16)。
 */

const tw = translations.tw;

/** 今天的 YYYY-MM-DD(ReportsPage 明細分頁的預設查詢區間)。 */
const today = (() => {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
})();

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
    id: 900,
    orderNo: 'LOCAL-900',
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

const renderPage = () => render(
    <MemoryRouter>
        <LanguageProvider>
            <ReportsPage />
        </LanguageProvider>
    </MemoryRouter>
);

describe('ReportsPage 改讀後端(S4 / F4.1)', () => {
    beforeEach(() => {
        mockInstance.get.mockReset();
        mockInstance.get.mockResolvedValue({ data: [] });
        localStorage.clear();
        vi.spyOn(console, 'warn').mockImplementation(() => { });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('AC-S4-01:localStorage 有資料時仍必定呼叫 API,且後端列出現在畫面上', async () => {
        localStorage.setItem('productionHistory', JSON.stringify([local()]));
        mockInstance.get.mockResolvedValue({ data: [dto()] });

        renderPage();

        await waitFor(() => expect(mockInstance.get).toHaveBeenCalled());
        expect(mockInstance.get.mock.calls[0][0]).toBe('/production/completions');
        expect(await screen.findByText('BACKEND-001')).toBeTruthy();
    });

    it('AC-S4-16 UI:本機列與後端列同時顯示,且以來源欄區分', async () => {
        localStorage.setItem('productionHistory', JSON.stringify([local()]));
        mockInstance.get.mockResolvedValue({ data: [dto()] });

        renderPage();

        expect(await screen.findByText('BACKEND-001')).toBeTruthy();
        expect(screen.getByText('LOCAL-900')).toBeTruthy();
        expect(screen.getAllByText(tw.reportView.source.backend).length).toBeGreaterThan(0);
        expect(screen.getAllByText(tw.reportView.source.local).length).toBeGreaterThan(0);
        // 「N 筆僅存在本機快取」提示
        expect(screen.getByTestId('alert-local-only').textContent).toContain(tw.reportView.state.localOnly);
    });

    it('AC-S4-06:班別變更不觸發新的 API 請求(仍由 filterByShift 前端處理)', async () => {
        mockInstance.get.mockResolvedValue({ data: [] });

        renderPage();
        await waitFor(() => expect(mockInstance.get).toHaveBeenCalledTimes(1));

        // 切到日報分頁(班別下拉在該頁)
        fireEvent.click(screen.getByText(tw.reportView.tab.daily));
        await waitFor(() => expect(screen.getByDisplayValue(tw.reportView.shift.all)).toBeTruthy());
        const callsAfterTabSwitch = mockInstance.get.mock.calls.length;

        fireEvent.change(screen.getByDisplayValue(tw.reportView.shift.all), { target: { value: 'A' } });

        await act(async () => { });
        expect(mockInstance.get).toHaveBeenCalledTimes(callsAfterTabSwitch);
    });

    it('AC-S4-28:切到月報並選 2026 年 9 月後,API 請求區間為當月首末日', async () => {
        mockInstance.get.mockResolvedValue({ data: [] });

        renderPage();
        await waitFor(() => expect(mockInstance.get).toHaveBeenCalledTimes(1));

        fireEvent.click(screen.getByText(tw.reportView.tab.monthly));

        const selects = await screen.findAllByRole('combobox');
        fireEvent.change(selects[0], { target: { value: '2026' } });
        fireEvent.change(selects[1], { target: { value: '9' } });

        await waitFor(() => {
            const last = mockInstance.get.mock.calls[mockInstance.get.mock.calls.length - 1][1];
            expect(last.params.from).toBe('2026-09-01');
            expect(last.params.to).toBe('2026-09-30');
        });
    });

    it('AC-S4-09:truncated 時渲染未取完警示,不靜默截斷', async () => {
        // 20 頁 × 500 筆 = 觸到硬上限。工廠日刻意設在明細分頁區間外,
        // 讓測試專注在警示列本身,不必渲染一萬列。
        const full = Array.from({ length: 500 }, (_, i) => dto({
            id: `g${i}`,
            clientRecordId: `k${i}`,
            productionDate: '2020-01-01',
            completedAt: '2020-01-01T00:00:00Z',
        }));
        mockInstance.get.mockResolvedValue({ data: full });

        renderPage();

        const alert = await screen.findByTestId('alert-truncated', {}, { timeout: 4000 });
        expect(alert.textContent).toContain(tw.reportView.state.truncated);
        // N 為實際筆數
        expect(alert.textContent).toContain('10000');
    });

    it('AC-S4-12:API 失敗時仍完成渲染(不拋出、不白畫面),並顯示降級警示', async () => {
        localStorage.setItem('productionHistory', JSON.stringify([local()]));
        mockInstance.get.mockRejectedValue(new Error('Network Error'));

        renderPage();

        expect(await screen.findByTestId('alert-degraded')).toBeTruthy();
        expect(screen.getByTestId('alert-degraded').textContent).toContain(tw.reportView.state.degraded);
        // 降級後仍看得到本機列(不是白畫面)
        expect(screen.getByText('LOCAL-900')).toBeTruthy();
    });

    it('AC-S4-13:API 失敗且本機快取為空 → 顯示錯誤與重試按鈕,點重試會再打 API', async () => {
        mockInstance.get.mockRejectedValue(new Error('Network Error'));

        renderPage();

        const errorBox = await screen.findByTestId('state-error');
        expect(errorBox.textContent).toContain(tw.reportView.state.error);

        const callsBefore = mockInstance.get.mock.calls.length;
        fireEvent.click(screen.getByText(tw.reportView.btn.retry));

        await waitFor(() => expect(mockInstance.get.mock.calls.length).toBeGreaterThan(callsBefore));
    });

    it('AC-S4-29:載入中 / 無資料 / 錯誤三種狀態措辭各自可辨識', async () => {
        // 載入中
        let resolveGet;
        mockInstance.get.mockImplementation(() => new Promise(res => { resolveGet = res; }));
        const loadingView = renderPage();
        expect(screen.getByTestId('state-loading').textContent).toBe(tw.reportView.state.loading);
        await act(async () => { resolveGet({ data: [] }); });
        loadingView.unmount();

        // 無資料(API 成功但回空)
        mockInstance.get.mockResolvedValue({ data: [] });
        const emptyView = renderPage();
        const emptyBox = await screen.findByTestId('state-empty');
        expect(emptyBox.textContent).toBe(tw.reportView.state.empty);
        emptyView.unmount();

        // 錯誤
        mockInstance.get.mockRejectedValue(new Error('Network Error'));
        renderPage();
        const errorBox = await screen.findByTestId('state-error');
        expect(errorBox.textContent).toContain(tw.reportView.state.error);

        // 三者措辭不得相同
        const texts = [tw.reportView.state.loading, tw.reportView.state.empty, tw.reportView.state.error];
        expect(new Set(texts).size).toBe(3);
    });

    it('E-16:對後端列按「手動上傳報工」會提示唯讀並中止,不寫任何儲存層', async () => {
        mockInstance.get.mockResolvedValue({ data: [dto()] });
        const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => { });
        const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');

        renderPage();
        fireEvent.click(await screen.findByText('BACKEND-001'));
        fireEvent.click(screen.getByText(tw.reportView.btn.manualUpload));

        expect(alertSpy).toHaveBeenCalledWith(tw.reportView.alert.backendRecordReadOnly);
        expect(setItemSpy).not.toHaveBeenCalledWith('productionHistory', expect.anything());
    });

    it('F4.1-5:對本機列手動上傳報工可存檔,寫回本機快取後重新抓取', async () => {
        localStorage.setItem('productionHistory', JSON.stringify([local()]));
        mockInstance.get.mockResolvedValue({ data: [] });

        renderPage();
        fireEvent.click(await screen.findByText('LOCAL-900'));
        fireEvent.click(screen.getByText(tw.reportView.btn.manualUpload));

        // 良品數改成 800 後按確定
        const goodInput = screen.getAllByRole('spinbutton')[0];
        fireEvent.change(goodInput, { target: { value: '800' } });

        const callsBefore = mockInstance.get.mock.calls.length;
        fireEvent.click(screen.getByText(tw.reportView.btn.ok));

        await waitFor(() => {
            const cached = JSON.parse(localStorage.getItem('productionHistory'));
            expect(cached[0].goodQty).toBe(800);
        });
        // 存檔後重取,不只改本地 state
        await waitFor(() => expect(mockInstance.get.mock.calls.length).toBeGreaterThan(callsBefore));
    });
});
