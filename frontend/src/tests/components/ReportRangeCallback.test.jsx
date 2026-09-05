import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LanguageProvider } from '../../modules/language/LanguageContext';
import MonthlyReportView from '../../modules/reports/MonthlyReportView';
import StopReasonView from '../../modules/reports/StopReasonView';

/**
 * 檢視元件自持區間的回報測試(AC-S4-26、AC-S4-27)。
 *
 * 月報與停車原因頁的日期區間在元件內部,父層不知道使用者選了哪個月 / 哪段期間;
 * 若不往上回報,父層只會抓明細分頁的區間,那兩頁會顯示不出資料(spec §1.2 的坑)。
 *
 * onRangeChange 是「選用」新 prop:未傳入時行為必須與加入本參數前完全相同。
 */

const renderWith = (ui) => render(<LanguageProvider>{ui}</LanguageProvider>);

describe('MonthlyReportView 區間回報(AC-S4-26)', () => {
    it('未傳 onRangeChange 時不拋出,行為與現況相同', () => {
        expect(() => renderWith(<MonthlyReportView productionHistory={[]} />)).not.toThrow();
        expect(screen.getByText(/生產月報表/)).toBeTruthy();
    });

    it('選定 2026 年 9 月 → 回報 { startDate: 2026-09-01, endDate: 2026-09-30 }', async () => {
        const onRangeChange = vi.fn();
        renderWith(<MonthlyReportView productionHistory={[]} onRangeChange={onRangeChange} />);

        const selects = screen.getAllByRole('combobox');
        fireEvent.change(selects[0], { target: { value: '2026' } });
        fireEvent.change(selects[1], { target: { value: '9' } });

        await waitFor(() => {
            expect(onRangeChange).toHaveBeenLastCalledWith({ startDate: '2026-09-01', endDate: '2026-09-30' });
        });
    });

    it('2 月份的月底日正確(閏年 29 日)', async () => {
        const onRangeChange = vi.fn();
        renderWith(<MonthlyReportView productionHistory={[]} onRangeChange={onRangeChange} />);

        const selects = screen.getAllByRole('combobox');
        fireEvent.change(selects[0], { target: { value: '2024' } });
        fireEvent.change(selects[1], { target: { value: '2' } });

        await waitFor(() => {
            expect(onRangeChange).toHaveBeenLastCalledWith({ startDate: '2024-02-01', endDate: '2024-02-29' });
        });
    });
});

describe('StopReasonView 區間回報(AC-S4-27)', () => {
    it('未傳 onRangeChange 時不拋出', () => {
        expect(() => renderWith(<StopReasonView productionHistory={[]} />)).not.toThrow();
    });

    it('掛載時以預設近 7 天區間回報一次', async () => {
        const onRangeChange = vi.fn();
        const today = new Date().toISOString().split('T')[0];
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        const defaultStart = weekAgo.toISOString().split('T')[0];

        renderWith(<StopReasonView productionHistory={[]} onRangeChange={onRangeChange} />);

        await waitFor(() => {
            expect(onRangeChange).toHaveBeenCalledWith({ startDate: defaultStart, endDate: today });
        });
    });

    it('使用者改起始日後會回報新的區間', async () => {
        const onRangeChange = vi.fn();
        const { container } = renderWith(<StopReasonView productionHistory={[]} onRangeChange={onRangeChange} />);

        const dateInputs = container.querySelectorAll('input[type="date"]');
        fireEvent.change(dateInputs[0], { target: { value: '2026-09-01' } });

        await waitFor(() => {
            expect(onRangeChange.mock.calls[onRangeChange.mock.calls.length - 1][0].startDate).toBe('2026-09-01');
        });
    });
});
