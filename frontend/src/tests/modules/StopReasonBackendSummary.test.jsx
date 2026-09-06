import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';

// 以 mock 取代 axios(沿用專案既有寫法),讓元件走真正的 api.js 與 hook。
const mockInstance = {
    get: vi.fn(() => Promise.resolve({ data: [] })),
    post: vi.fn(() => Promise.resolve({ data: null })),
    put: vi.fn(() => Promise.resolve({ data: null })),
    delete: vi.fn(() => Promise.resolve({ data: null })),
    interceptors: {
        request: { use: vi.fn() },
        response: { use: vi.fn() },
    },
};

vi.mock('axios', () => ({
    default: { create: () => mockInstance },
}));

const { LanguageProvider } = await import('../../modules/language/LanguageContext');
const StopReasonView = (await import('../../modules/reports/StopReasonView')).default;

/**
 * S8 / §1.3、AC-19:停機分析改讀後端彙總之後,展開列的訂單明細仍須顯示得出來。
 *
 * 這是切換到後端彙總時最容易掉的東西:彙總端點**刻意不回下鑽明細**
 * (回了會讓回應大小隨區間內訂單數無上限成長),明細必須從逐筆清單接回去。
 * 沒有這條測試,改壞了畫面只是「展開後空白」,不會有任何東西轉紅。
 */

const today = new Date().toISOString().split('T')[0];

/** 造一筆前端形狀的生產紀錄(含停機明細)。 */
const record = (over = {}) => ({
    id: 'r1',
    orderNo: 'WO-0001',
    customer: '大同紙器',
    productName: 'A 楞箱',
    date: `${today}T10:00:00`,
    stopReasons: [{ code: 'ST01', reason: '換版', time: '10:05', duration: 12 }],
    ...over,
});

const renderView = (props = {}) => render(
    <LanguageProvider>
        <StopReasonView productionHistory={[record()]} localOnlyCount={0} {...props} />
    </LanguageProvider>
);

describe('StopReasonView 改讀後端彙總', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockInstance.get.mockResolvedValue({
            data: [{ reason: '換版', code: 'ST01', count: 9, totalDurationMinutes: 108 }],
        });
    });

    it('AC-19 採用後端的次數,展開後仍顯示得出訂單明細', async () => {
        renderView();

        // 後端說 9 次(前端的逐筆資料只有 1 次)—— 畫面必須採用後端的數字
        const header = await screen.findByText('換版');
        await waitFor(() => expect(screen.getByText(/^9\s/)).toBeTruthy());

        // 展開:明細來自逐筆清單,不是彙總端點
        fireEvent.click(header);

        expect(screen.getByText('WO-0001')).toBeTruthy();
        expect(screen.getByText('大同紙器')).toBeTruthy();
    });

    it('AC-16 採用後端彙總時,畫面標示資料來源', async () => {
        renderView();

        await waitFor(() => expect(screen.getByTestId('summary-source-backend')).toBeTruthy());
    });

    it('AC-17 有本機殘留時不採用後端數字,也不打彙總端點', async () => {
        renderView({ localOnlyCount: 2 });

        await waitFor(() => expect(screen.getByTestId('summary-source-local')).toBeTruthy());

        // 前端自己分組的結果是 1 次,不是後端說的 9 次
        expect(screen.getByText(/^1\s/)).toBeTruthy();
        expect(mockInstance.get).not.toHaveBeenCalled();
    });

    it('AC-18 後端失敗時退回前端計算並標示降級', async () => {
        mockInstance.get.mockRejectedValue(new Error('boom'));

        renderView();

        await waitFor(() => expect(screen.getByTestId('summary-source-degraded')).toBeTruthy());
        expect(screen.getByText(/^1\s/)).toBeTruthy();
    });
});
