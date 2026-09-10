import { describe, it, expect } from 'vitest';
import { buildMmUrl, shouldShowMmEntry, MM_ENTRY_ROLES } from '../../utils/mmLink';

/**
 * P1 釘樁:MM 入口的網址組裝與可見性(`docs/spec20260910-1.md` §7.1、AC-04、AC-05)。
 */

const asRole = (...owned) => (...wanted) =>
    wanted.some(w => owned.includes(String(w).toUpperCase()));

describe('buildMmUrl', () => {
    it('帶上 machine 與 from 兩個參數', () => {
        const url = new URL(buildMmUrl('https://mms.ericchh.work', 'M20'));
        expect(url.origin).toBe('https://mms.ericchh.work');
        expect(url.searchParams.get('machine')).toBe('M20');
        expect(url.searchParams.get('from')).toBe('priiot');
    });

    it('沒有協定時補 https —— 現場常直接貼主機名', () => {
        expect(buildMmUrl('mms.ericchh.work', 'M20')).toMatch(/^https:\/\/mms\.ericchh\.work/);
    });

    it('http 保留不改成 https(廠內可能沒有憑證)', () => {
        expect(buildMmUrl('http://192.168.1.50:5301', 'M20')).toMatch(/^http:\/\/192\.168\.1\.50:5301/);
    });

    it('尾斜線與既有路徑不會被弄壞', () => {
        expect(buildMmUrl('https://mms.ericchh.work/', 'M20')).toContain('mms.ericchh.work/?');
        expect(buildMmUrl('https://host/mm', 'M20')).toContain('/mm?');
    });

    it('機台代號含空白或非 ASCII 時正確編碼', () => {
        const url = new URL(buildMmUrl('https://h', '印刷機 1'));
        expect(url.searchParams.get('machine')).toBe('印刷機 1');
        expect(url.toString()).not.toContain(' ');
    });

    it('未設定網址回 null —— 不留死連結(AC-04)', () => {
        for (const v of ['', '   ', null, undefined]) expect(buildMmUrl(v, 'M20')).toBeNull();
    });

    it('設定裡是亂碼時回 null,而不是給一個打不開的連結', () => {
        expect(buildMmUrl('http://', 'M20')).toBeNull();
    });

    it('沒有機台代號時仍給網址,只是不帶 machine —— 入口本身仍有價值', () => {
        const url = buildMmUrl('https://mms.ericchh.work', '');
        expect(url).toBeTruthy();
        expect(new URL(url).searchParams.has('machine')).toBe(false);
        expect(new URL(url).searchParams.get('from')).toBe('priiot');
    });
});

describe('shouldShowMmEntry', () => {
    const base = 'https://mms.ericchh.work';

    it('ADMIN / ENGINEER / SUPERVISOR 看得到', () => {
        for (const r of MM_ENTRY_ROLES) {
            expect(shouldShowMmEntry({ baseUrl: base, hasRole: asRole(r) })).toBe(true);
        }
    });

    it('OPERATOR 看不到(AC-05)', () => {
        expect(shouldShowMmEntry({ baseUrl: base, hasRole: asRole('OPERATOR') })).toBe(false);
    });

    it('未設定網址時誰都看不到(AC-04)', () => {
        expect(shouldShowMmEntry({ baseUrl: '', hasRole: asRole('ADMIN') })).toBe(false);
    });

    it('沒有 hasRole(未登入)一律不顯示 —— 預設拒絕', () => {
        expect(shouldShowMmEntry({ baseUrl: base, hasRole: undefined })).toBe(false);
        expect(shouldShowMmEntry({ baseUrl: base, hasRole: asRole() })).toBe(false);
    });
});
