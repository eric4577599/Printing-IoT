import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LanguageProvider } from '../../modules/language/LanguageContext';

/**
 * B22:通訊設定分頁只對 ADMIN / ENGINEER 顯示(與後端 SystemConfig 政策一致)。
 * 原本一律可見,作業員也能開啟並改動畫面上的值。
 */
let mockRoles = [];
vi.mock('../../modules/auth/AuthContext', () => ({
    useAuth: () => ({ hasRole: (...wanted) => wanted.some(w => mockRoles.includes(w)) }),
}));
// 各分頁內容與本測試無關,換成空元件避免連到後端
vi.mock('../../components/settings/FormulaTab', () => ({ default: () => <div>formula</div> }));
vi.mock('../../components/settings/BoxTypeTab', () => ({ default: () => <div>boxtype</div> }));
vi.mock('../../components/settings/ReportTab', () => ({ default: () => <div>report</div> }));
vi.mock('../../components/settings/GeneralTab', () => ({ default: () => <div>general</div> }));
vi.mock('../../components/settings/UnitTab', () => ({ default: () => <div>unit</div> }));
vi.mock('../../components/settings/MachineTab', () => ({ default: () => <div>machine</div> }));
vi.mock('../../components/settings/CommunicationTab', () => ({ default: () => <div>comm-tab</div> }));

const SettingsPage = (await import('../../pages/SettingsPage')).default;

const renderAs = (...roles) => {
    mockRoles = roles;
    return render(<LanguageProvider><SettingsPage /></LanguageProvider>);
};

describe('設定頁:通訊設定分頁的可見性', () => {
    it('作業員看不到「通訊設定」選單', () => {
        renderAs('OPERATOR');
        expect(screen.queryByText('通訊設定')).toBeNull();
        expect(screen.getByText('一般設定')).toBeTruthy();
    });

    it('ADMIN 看得到', () => {
        renderAs('ADMIN');
        expect(screen.getByText('通訊設定')).toBeTruthy();
    });

    it('ENGINEER 看得到', () => {
        renderAs('ENGINEER');
        expect(screen.getByText('通訊設定')).toBeTruthy();
    });

    it('SUPERVISOR 看不到(後端 SystemConfig 也不給)', () => {
        renderAs('SUPERVISOR');
        expect(screen.queryByText('通訊設定')).toBeNull();
    });
});
