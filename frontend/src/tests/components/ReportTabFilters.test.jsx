import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LanguageProvider } from '../../modules/language/LanguageContext';
import ReportTab from '../../components/settings/ReportTab';
import { normalizeFilters } from '../../utils/reportFilters';

/**
 * 報表設定「異常過濾」:預設的「休息 / 點心 / 支援」是可勾選的選項,
 * 存語言無關的代號;舊資料(中文字串)自動對應;自訂關鍵字改用行內輸入框(不再用 window.prompt)。
 */
const saved = () => JSON.parse(localStorage.getItem('reportSettings'));
const renderTab = () => render(<LanguageProvider><ReportTab /></LanguageProvider>);

beforeEach(() => localStorage.clear());

describe('normalizeFilters', () => {
    it('舊的中文字串對應到代號,自訂關鍵字原樣保留,並去重', () => {
        expect(normalizeFilters(['休息', '點心', '午餐', '休息'])).toEqual(['rest', 'snack', '午餐']);
    });
    it('非陣列時回預設三項', () => {
        expect(normalizeFilters(undefined)).toEqual(['rest', 'snack', 'support']);
    });
});

describe('ReportTab 異常過濾選項', () => {
    it('預設三個選項皆勾選,以核取方塊呈現', () => {
        renderTab();
        const boxes = screen.getAllByRole('checkbox');
        expect(boxes).toHaveLength(3);
        expect(boxes.every(b => b.checked)).toBe(true);
        expect(screen.getByLabelText('休息')).toBeTruthy();
    });

    it('取消勾選會寫入代號(不是中文字串)', () => {
        renderTab();
        fireEvent.click(screen.getByLabelText('點心'));
        expect(saved().exceptionFilters).toEqual(['rest', 'support']);
    });

    it('舊資料(中文字串)載入後仍正確勾選,且存回時已轉成代號', () => {
        localStorage.setItem('reportSettings', JSON.stringify({ dayCutoffTime: '07:30:00', smallBatchQty: 500, exceptionFilters: ['休息'] }));
        renderTab();
        expect(screen.getByLabelText('休息').checked).toBe(true);
        expect(screen.getByLabelText('點心').checked).toBe(false);
        fireEvent.click(screen.getByLabelText('支援'));
        expect(saved().exceptionFilters).toEqual(['rest', 'support']);
    });

    it('新增自訂關鍵字:行內輸入框 + 按鈕,可刪除', () => {
        renderTab();
        const input = screen.getByPlaceholderText(/關鍵字/);
        fireEvent.change(input, { target: { value: '午餐' } });
        fireEvent.click(screen.getByText(/新增關鍵字|Add/, { selector: 'button' }));
        expect(saved().exceptionFilters).toContain('午餐');
        fireEvent.click(screen.getByLabelText(/午餐/, { selector: 'button' }));
        expect(saved().exceptionFilters).not.toContain('午餐');
    });
});
