import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

// 以 mock 取代 axios(沿用既有寫法),讓分析頁走真正的 api 與 useProductionRecords。
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

// 圖表本身不是本輪的驗收對象,且 chart.js 在 jsdom 需要 canvas —— 以佔位元件取代。
vi.mock('../../pages/analysis/components/AnalysisChart', () => ({
    default: () => <div data-testid="analysis-chart" />,
}));

const { LanguageProvider, translations } = await import('../../modules/language/LanguageContext');
const { default: AnalysisPage } = await import('../../pages/analysis/AnalysisPage');

/**
 * 分析頁狀態呈現測試(AC-S4-29 分析頁側、AC-S4-12 同等要求、spec §5)。
 */

const tw = translations.tw;

const renderPage = () => render(
    <LanguageProvider>
        <AnalysisPage />
    </LanguageProvider>
);

describe('AnalysisPage 資料狀態呈現(S4 / F4.2)', () => {
    beforeEach(() => {
        mockInstance.get.mockReset();
        mockInstance.get.mockResolvedValue({ data: [] });
        localStorage.clear();
        vi.spyOn(console, 'warn').mockImplementation(() => { });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('載入中顯示載入文字', () => {
        mockInstance.get.mockImplementation(() => new Promise(() => { }));

        renderPage();

        expect(screen.getByTestId('analysis-state-loading').textContent).toBe(tw.analysis.state.loading);
    });

    it('API 成功但回空 → 顯示無資料(措辭與錯誤不同,isDegraded 為 false,E-17)', async () => {
        renderPage();

        const empty = await screen.findByTestId('analysis-state-empty');
        expect(empty.textContent).toBe(tw.analysis.state.empty);
        expect(screen.queryByTestId('analysis-state-error')).toBeNull();
    });

    it('API 失敗且無快取 → 顯示錯誤與重試按鈕,不白畫面', async () => {
        mockInstance.get.mockRejectedValue(new Error('Network Error'));

        renderPage();

        const error = await screen.findByTestId('analysis-state-error');
        expect(error.textContent).toContain(tw.analysis.state.error);
        expect(screen.getByText(tw.analysis.state.retry)).toBeTruthy();
        // 頁面本體仍在(不是白畫面)
        expect(screen.getByText(tw.analysis.title)).toBeTruthy();
    });

    it('API 失敗但本機有資料 → 降級警示與本機列提示並存', async () => {
        const today = new Date().toISOString().split('T')[0];
        localStorage.setItem('productionHistory', JSON.stringify([{
            id: 900, orderNo: 'LOCAL-900', customer: '老客戶', productName: '五層箱',
            targetQty: 1000, goodQty: 900, defectQty: 100, prepTime: 20, runTime: 90,
            stopTime: 30, stopCount: 1, avgSpeed: 110, oee: 99,
            date: today, finishedAt: `${today}T10:00:00Z`, stopReasons: [],
        }]));
        mockInstance.get.mockRejectedValue(new Error('Network Error'));

        renderPage();

        await waitFor(() => expect(screen.getByTestId('analysis-alert-degraded')).toBeTruthy());
        expect(screen.getByTestId('analysis-alert-degraded').textContent).toContain(tw.analysis.state.degraded);
        expect(screen.getByTestId('analysis-alert-local-only').textContent).toContain(tw.analysis.state.localOnly);
    });
});
