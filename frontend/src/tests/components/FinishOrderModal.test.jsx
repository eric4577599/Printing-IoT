import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, fireEvent, waitFor } from '@testing-library/react';
import { LanguageProvider } from '../../modules/language/LanguageContext';

// S3 / F8:不良原因清單改由後端主檔供應,以 mock 取代 api 模組
const getReasonCodes = vi.fn();
vi.mock('../../services/api', () => ({
    getReasonCodes: (...args) => getReasonCodes(...args),
}));

const FinishOrderModal = (await import('../../components/modals/FinishOrderModal')).default;

/**
 * FinishOrderModal 完工視窗回歸測試
 *
 * 驗證重點(對應 UI 對抗性稽核缺陷):
 * 1. #4 — 開啟後父層每秒重建 initialData 不應覆寫使用者已編輯的欄位;
 *         僅在 closed→open 邊緣以最新 initialData 初始化一次。
 * 2. #6 生產端 — 送出時回傳 defects 陣列(供 Dashboard 加總不良數),而非單一 defectQty。
 * 3. S3 / AC-30 — defects 每項形狀為 { code, reason, qty },列數跟隨 useReasonCodes;
 *                 既有的短缺門檻 alert 行為不變。
 */

/**
 * 以 LanguageProvider 包裹渲染
 * 輸入:ui - 要渲染的 React 元素
 * 輸出:@testing-library render 結果(含 rerender)
 * 邏輯:視窗文字採 i18n,測試需提供語言 context
 */
const renderWithLang = (ui) => render(<LanguageProvider>{ui}</LanguageProvider>);

/**
 * 取得完工視窗中「良品數」輸入框
 * 輸入:baseElement - render 回傳的 baseElement(portal 掛 body)
 * 輸出:name="goodQty" 的 input 元素
 * 邏輯:表單以 name 標示欄位,goodQty 對應良品數
 */
const getGoodQtyInput = (baseElement) =>
    baseElement.querySelector('input[name="goodQty"]');

describe('FinishOrderModal', () => {
    beforeEach(() => {
        getReasonCodes.mockReset();
        // 預設讓原因主檔不可用,既有測試沿用元件內建的四筆不良原因
        getReasonCodes.mockRejectedValue(new Error('Network Error'));
        localStorage.clear();
        vi.spyOn(console, 'warn').mockImplementation(() => { });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('#4 父層每秒重建 initialData 不覆寫使用者已修改的良品數', () => {
        const { baseElement, rerender } = renderWithLang(
            <FinishOrderModal
                isOpen={true}
                onClose={() => { }}
                onConfirm={() => { }}
                initialData={{ operator: 'Eric', qty: 100, targetQty: 500 }}
            />
        );

        // 開啟時以 initialData.qty 初始化良品數
        expect(getGoodQtyInput(baseElement).value).toBe('100');

        // 使用者手動改成 480
        fireEvent.change(getGoodQtyInput(baseElement), { target: { value: '480' } });
        expect(getGoodQtyInput(baseElement).value).toBe('480');

        // 父層(Dashboard)每秒以即時計數重建 initialData 物件並重新渲染
        rerender(
            <LanguageProvider>
                <FinishOrderModal
                    isOpen={true}
                    onClose={() => { }}
                    onConfirm={() => { }}
                    initialData={{ operator: 'Eric', qty: 101, targetQty: 500 }}
                />
            </LanguageProvider>
        );

        // 修正後:isOpen 未跨越 closed→open 邊緣,使用者輸入保留,不被 101 覆寫
        expect(getGoodQtyInput(baseElement).value).toBe('480');
    });

    it('#4 關閉後再次開啟會以最新 initialData 重新初始化', () => {
        const props = (isOpen, qty) => ({
            isOpen,
            onClose: () => { },
            onConfirm: () => { },
            initialData: { operator: 'Eric', qty, targetQty: 500 },
        });

        const { baseElement, rerender } = renderWithLang(
            <FinishOrderModal {...props(true, 100)} />
        );
        fireEvent.change(getGoodQtyInput(baseElement), { target: { value: '480' } });

        // 關閉
        rerender(<LanguageProvider><FinishOrderModal {...props(false, 100)} /></LanguageProvider>);
        // 再次開啟,帶入新的即時計數 250
        rerender(<LanguageProvider><FinishOrderModal {...props(true, 250)} /></LanguageProvider>);

        // closed→open 邊緣觸發重新初始化,顯示最新的 250
        expect(getGoodQtyInput(baseElement).value).toBe('250');
    });

    it('#6 送出時回傳 defects 陣列(而非單一 defectQty)', () => {
        const onConfirm = vi.fn();
        const { baseElement } = renderWithLang(
            <FinishOrderModal
                isOpen={true}
                onClose={() => { }}
                onConfirm={onConfirm}
                initialData={{ operator: 'Eric', qty: 500, targetQty: 500 }}
            />
        );

        // 點「確定」送出(良品=目標,無欠量,不觸發欠量原因驗證)
        const buttons = [...baseElement.querySelectorAll('button')];
        const confirmBtn = buttons.find(b => b.textContent && b.textContent.trim() !== '×');
        fireEvent.click(confirmBtn);

        expect(onConfirm).toHaveBeenCalledTimes(1);
        const payload = onConfirm.mock.calls[0][0];
        // 回傳含 defects 陣列,Dashboard 端據此加總不良數
        expect(Array.isArray(payload.defects)).toBe(true);
        expect(payload.defects.length).toBe(4);
        // 每項具備 qty 欄位
        payload.defects.forEach(d => expect(typeof d.qty).toBe('number'));
    });
    // AC-30:defects 每項形狀為 { code, reason, qty }
    it('AC-30 送出的 defects 每項形狀為 { code, reason, qty }', () => {
        const onConfirm = vi.fn();
        const { baseElement } = renderWithLang(
            <FinishOrderModal
                isOpen={true}
                onClose={() => { }}
                onConfirm={onConfirm}
                initialData={{ operator: 'Eric', qty: 500, targetQty: 500 }}
            />
        );

        const buttons = [...baseElement.querySelectorAll('button')];
        const confirmBtn = buttons.find(b => b.textContent && b.textContent.trim() !== '×');
        fireEvent.click(confirmBtn);

        const payload = onConfirm.mock.calls[0][0];
        expect(payload.defects).toHaveLength(4);
        payload.defects.forEach(d => {
            expect(Object.keys(d).sort()).toEqual(['code', 'qty', 'reason']);
            expect(typeof d.code).toBe('string');
            expect(typeof d.reason).toBe('string');
            expect(typeof d.qty).toBe('number');
        });
        expect(payload.defects.map(d => d.code)).toEqual(['A01', 'A02', 'A03', 'A04']);
    });

    // AC-30:列數跟隨 useReasonCodes 的回傳
    it('AC-30 不良列數與內容跟隨後端原因主檔', async () => {
        getReasonCodes.mockReset();
        getReasonCodes.mockResolvedValue([
            { id: 'd1', code: 'B01', name: '受潮', category: 'General' },
            { id: 'd2', code: 'B02', name: '缺角', category: 'General' },
        ]);

        const onConfirm = vi.fn();
        const { baseElement } = renderWithLang(
            <FinishOrderModal
                isOpen={true}
                onClose={() => { }}
                onConfirm={onConfirm}
                initialData={{ operator: 'Eric', qty: 500, targetQty: 500 }}
            />
        );

        await waitFor(() => expect(baseElement.textContent).toContain('受潮'));

        const rows = baseElement.querySelectorAll('tbody tr');
        expect(rows).toHaveLength(2);

        const buttons = [...baseElement.querySelectorAll('button')];
        fireEvent.click(buttons.find(b => b.textContent && b.textContent.trim() !== '×'));

        const payload = onConfirm.mock.calls[0][0];
        expect(payload.defects).toEqual([
            { code: 'B01', reason: '受潮', qty: 0 },
            { code: 'B02', reason: '缺角', qty: 0 },
        ]);
    });

    it('AC-30 輸入的不良數量會帶進 defects', () => {
        const onConfirm = vi.fn();
        const { baseElement } = renderWithLang(
            <FinishOrderModal
                isOpen={true}
                onClose={() => { }}
                onConfirm={onConfirm}
                initialData={{ operator: 'Eric', qty: 500, targetQty: 500 }}
            />
        );

        const qtyInputs = baseElement.querySelectorAll('tbody input[type="number"]');
        fireEvent.change(qtyInputs[0], { target: { value: '12' } });
        fireEvent.change(qtyInputs[2], { target: { value: '5' } });

        const buttons = [...baseElement.querySelectorAll('button')];
        fireEvent.click(buttons.find(b => b.textContent && b.textContent.trim() !== '×'));

        const payload = onConfirm.mock.calls[0][0];
        expect(payload.defects.map(d => d.qty)).toEqual([12, 0, 5, 0]);
    });

    // AC-30:既有的短缺門檻 alert 行為不變
    it('AC-30 短缺超過門檻且未填原因時仍 alert 並中止送出', () => {
        const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => { });
        const onConfirm = vi.fn();

        const { baseElement } = renderWithLang(
            <FinishOrderModal
                isOpen={true}
                onClose={() => { }}
                onConfirm={onConfirm}
                initialData={{ operator: 'Eric', qty: 100, targetQty: 500 }}
            />
        );

        const buttons = [...baseElement.querySelectorAll('button')];
        fireEvent.click(buttons.find(b => b.textContent && b.textContent.trim() !== '×'));

        expect(alertSpy).toHaveBeenCalledTimes(1);
        expect(onConfirm).not.toHaveBeenCalled();
    });

    it('AC-30 重新開啟時不良數量歸零,不殘留上一張工單的輸入', () => {
        const props = (isOpen) => ({
            isOpen,
            onClose: () => { },
            onConfirm: () => { },
            initialData: { operator: 'Eric', qty: 500, targetQty: 500 },
        });

        const { baseElement, rerender } = renderWithLang(<FinishOrderModal {...props(true)} />);

        const qtyInputs = baseElement.querySelectorAll('tbody input[type="number"]');
        fireEvent.change(qtyInputs[0], { target: { value: '30' } });
        expect(baseElement.querySelectorAll('tbody input[type="number"]')[0].value).toBe('30');

        rerender(<LanguageProvider><FinishOrderModal {...props(false)} /></LanguageProvider>);
        rerender(<LanguageProvider><FinishOrderModal {...props(true)} /></LanguageProvider>);

        expect(baseElement.querySelectorAll('tbody input[type="number"]')[0].value).toBe('0');
    });
});
