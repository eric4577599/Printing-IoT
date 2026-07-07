import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { LanguageProvider } from '../../modules/language/LanguageContext';
import ProductDetailModal from '../../components/modals/ProductDetailModal';

/**
 * ProductDetailModal 產品規格詳情視窗測試
 *
 * 驗證重點:
 * 1. 開啟且有產品資料時,完整顯示基本資料、機械參數、印刷部與紙箱展開圖(SVG)
 * 2. 所有輸入欄位皆為唯讀(readOnly),不可修改
 * 3. 未開啟或無產品資料時不渲染任何內容
 * 4. 點「×」與「關閉」按鈕會呼叫 onClose
 */

/**
 * 建立測試用產品資料
 * 輸入:無
 * 輸出:含基本資料、尺寸、機械參數與印刷單元的產品物件
 * 邏輯:欄位結構與 ProductFormModal 一致,RSC 盒型 + 4 段尺寸
 */
const makeProduct = () => ({
    boxNo: 'RSC-B-001',
    customer: 'QA測試',
    productName: 'RSC B楞 中型箱',
    boxType: 'RSC',
    flute: 'B',
    thickness: 3.6,
    bundleCount: 20,
    remarks: '測試備註',
    dimL1: 300, dimL2: 200, dimL3: 300, dimL4: 200,
    dimW1: 100, dimW2: 200, dimW3: 100,
    px1: 11, gapFeedFront: 5.5,
    printUnits: [
        { id: 1, ink: 1, pos: 2, gap: 3, press: 4 },
        { id: 2, ink: 0, pos: 0, gap: 0, press: 0 },
        { id: 3, ink: 0, pos: 0, gap: 0, press: 0 },
        { id: 4, ink: 0, pos: 0, gap: 0, press: 0 },
    ],
});

/**
 * 以 LanguageProvider 包裹渲染
 * 輸入:ui - 要渲染的 React 元素
 * 輸出:@testing-library render 結果
 * 邏輯:視窗內文字採 i18n,測試需提供語言 context
 */
const renderWithLang = (ui) => render(<LanguageProvider>{ui}</LanguageProvider>);

describe('ProductDetailModal', () => {
    it('開啟時顯示標題、基本資料與展開圖', () => {
        const { baseElement } = renderWithLang(
            <ProductDetailModal isOpen={true} onClose={() => { }} product={makeProduct()} />
        );

        // 標題含產品編號(portal 掛在 body,需查 baseElement)
        expect(baseElement.textContent).toContain('RSC-B-001');
        // 基本資料欄位值
        const inputs = [...baseElement.querySelectorAll('input')];
        const values = inputs.map(i => i.value);
        expect(values).toContain('RSC-B-001');
        expect(values).toContain('QA測試');
        expect(values).toContain('RSC B楞 中型箱');
        // 紙箱展開圖(BoxDiagram 以 SVG 呈現)
        expect(baseElement.querySelector('svg')).not.toBeNull();
        // 印刷部表格
        expect(baseElement.textContent).toContain('印刷部');
    });

    it('所有輸入欄位皆為唯讀', () => {
        const { baseElement } = renderWithLang(
            <ProductDetailModal isOpen={true} onClose={() => { }} product={makeProduct()} />
        );
        // BoxDiagram 內的尺寸欄本身即 readOnly;此處驗證視窗內全部 input/textarea 不可編輯
        const editables = [...baseElement.querySelectorAll('input, textarea')];
        expect(editables.length).toBeGreaterThan(0);
        editables.forEach(el => expect(el.readOnly).toBe(true));
    });

    it('未開啟或無產品資料時不渲染', () => {
        const closed = renderWithLang(
            <ProductDetailModal isOpen={false} onClose={() => { }} product={makeProduct()} />
        );
        expect(closed.baseElement.querySelectorAll('input').length).toBe(0);

        const noData = renderWithLang(
            <ProductDetailModal isOpen={true} onClose={() => { }} product={null} />
        );
        expect(noData.baseElement.querySelectorAll('input').length).toBe(0);
    });

    it('點 × 與關閉按鈕會呼叫 onClose', () => {
        const onClose = vi.fn();
        const { baseElement } = renderWithLang(
            <ProductDetailModal isOpen={true} onClose={onClose} product={makeProduct()} />
        );
        const buttons = [...baseElement.querySelectorAll('button')];
        const xBtn = buttons.find(b => b.textContent === '×');
        const closeBtn = buttons.find(b => b.textContent !== '×');
        fireEvent.click(xBtn);
        fireEvent.click(closeBtn);
        expect(onClose).toHaveBeenCalledTimes(2);
    });
});
