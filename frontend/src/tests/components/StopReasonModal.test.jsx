import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, fireEvent, waitFor } from '@testing-library/react';
import { LanguageProvider } from '../../modules/language/LanguageContext';

// 以 mock 取代 api 模組:StopReasonModal 透過 useReasonCodes 讀後端原因主檔
const getReasonCodes = vi.fn();
vi.mock('../../services/api', () => ({
    getReasonCodes: (...args) => getReasonCodes(...args),
}));

const StopReasonModal = (await import('../../components/modals/StopReasonModal')).default;

/**
 * StopReasonModal 測試(S3 / F8,對應 AC-29)。
 *
 * 驗證重點:清單改由 useReasonCodes 供應(設定頁的異動現場立即看得到),
 * API 失敗時仍渲染六筆內建預設 —— 現場永遠有原因可選。
 */
const renderWithLang = (ui) => render(<LanguageProvider>{ui}</LanguageProvider>);

/**
 * 取得原因清單的資料列
 * 輸入:baseElement - render 回傳的 baseElement
 * 輸出:所有原因列的文字陣列
 * 邏輯:每一列由 colCode + colReason 兩格組成,以 CSS module 的 row class 前綴比對
 */
const getReasonRows = (baseElement) =>
    [...baseElement.querySelectorAll('div')].filter(el => /(^|\s)_?row/.test(el.className));

describe('StopReasonModal(S3 / F8,AC-29)', () => {
    beforeEach(() => {
        getReasonCodes.mockReset();
        localStorage.clear();
        vi.spyOn(console, 'warn').mockImplementation(() => { });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('渲染的列數與內容來自 useReasonCodes 的回傳', async () => {
        getReasonCodes.mockResolvedValue([
            { id: 'g1', code: 'Z1', name: '自訂原因一', category: 'A' },
            { id: 'g2', code: 'Z2', name: '自訂原因二', category: 'B' },
            { id: 'g3', code: 'Z3', name: '自訂原因三', category: 'C' },
        ]);

        const { baseElement } = renderWithLang(
            <StopReasonModal isOpen={true} onClose={() => { }} onSelect={() => { }} />
        );

        await waitFor(() => expect(baseElement.textContent).toContain('自訂原因一'));

        expect(getReasonRows(baseElement)).toHaveLength(3);
        expect(baseElement.textContent).toContain('Z1');
        expect(baseElement.textContent).toContain('自訂原因三');
        // 內建預設的六筆不應同時出現
        expect(baseElement.textContent).not.toContain('送紙歪斜');
    });

    it('API 失敗時仍渲染六筆內建預設', async () => {
        getReasonCodes.mockRejectedValue(new Error('Network Error'));

        const { baseElement } = renderWithLang(
            <StopReasonModal isOpen={true} onClose={() => { }} onSelect={() => { }} />
        );

        await waitFor(() => expect(getReasonRows(baseElement)).toHaveLength(6));

        expect(baseElement.textContent).toContain('001');
        expect(baseElement.textContent).toContain('006');
    });

    it('選取後點確定會把 { code, name } 交給 onSelect,並關閉視窗', async () => {
        getReasonCodes.mockResolvedValue([
            { id: 'g1', code: 'Z1', name: '自訂原因一', category: 'A' },
            { id: 'g2', code: 'Z2', name: '自訂原因二', category: 'B' },
        ]);

        const onSelect = vi.fn();
        const onClose = vi.fn();

        const { baseElement } = renderWithLang(
            <StopReasonModal isOpen={true} onClose={onClose} onSelect={onSelect} />
        );

        await waitFor(() => expect(getReasonRows(baseElement)).toHaveLength(2));

        // 點第二列選取
        fireEvent.click(getReasonRows(baseElement)[1]);

        const confirmBtn = [...baseElement.querySelectorAll('button')]
            .filter(b => b.textContent && b.textContent.trim() !== '×')
            .pop();
        fireEvent.click(confirmBtn);

        expect(onSelect).toHaveBeenCalledTimes(1);
        expect(onSelect.mock.calls[0][0]).toMatchObject({ code: 'Z2', name: '自訂原因二' });
        expect(onClose).toHaveBeenCalled();
    });

    it('未選取任何列時點確定不會呼叫 onSelect', async () => {
        getReasonCodes.mockResolvedValue([{ id: 'g1', code: 'Z1', name: '自訂原因一', category: 'A' }]);

        const onSelect = vi.fn();
        const { baseElement } = renderWithLang(
            <StopReasonModal isOpen={true} onClose={() => { }} onSelect={onSelect} />
        );

        await waitFor(() => expect(getReasonRows(baseElement)).toHaveLength(1));

        const confirmBtn = [...baseElement.querySelectorAll('button')]
            .filter(b => b.textContent && b.textContent.trim() !== '×')
            .pop();
        fireEvent.click(confirmBtn);

        expect(onSelect).not.toHaveBeenCalled();
    });

    it('isOpen 為 false 時不渲染任何內容', () => {
        getReasonCodes.mockResolvedValue([]);

        const { baseElement } = renderWithLang(
            <StopReasonModal isOpen={false} onClose={() => { }} onSelect={() => { }} />
        );

        expect(getReasonRows(baseElement)).toHaveLength(0);
    });
});
