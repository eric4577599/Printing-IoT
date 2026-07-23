import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { LanguageProvider } from '../../modules/language/LanguageContext';
import FinishOrderModal from '../../components/modals/FinishOrderModal';

/**
 * FinishOrderModal 完工視窗回歸測試
 *
 * 驗證重點(對應 UI 對抗性稽核缺陷):
 * 1. #4 — 開啟後父層每秒重建 initialData 不應覆寫使用者已編輯的欄位;
 *         僅在 closed→open 邊緣以最新 initialData 初始化一次。
 * 2. #6 生產端 — 送出時回傳 defects 陣列(供 Dashboard 加總不良數),而非單一 defectQty。
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
});
