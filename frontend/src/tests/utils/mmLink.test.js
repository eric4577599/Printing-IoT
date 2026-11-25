import { describe, it, expect, vi } from 'vitest';
import { buildMmUrl, shouldShowMmEntry, MM_ENTRY_ROLES, attachMmParams, openMmWithLoginCode } from '../../utils/mmLink';

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

/**
 * 整合契約 v1 §3:從主系統帶一次性登入代碼進 MM(`docs/spec20261116-1.md`)。
 */
describe('attachMmParams', () => {
    it('補上 from 與 machine,代碼留在網址片段不進 query', () => {
        const out = new URL(attachMmParams('https://mms.ericchh.work/#code=abc-_123', 'M20'));
        expect(out.hash).toBe('#code=abc-_123');
        expect(out.searchParams.get('from')).toBe('priiot');
        expect(out.searchParams.get('machine')).toBe('M20');
        expect(out.search).not.toContain('abc-_123');
    });

    it('沒有機台代號時不帶 machine', () => {
        const out = new URL(attachMmParams('https://mms.ericchh.work/#code=x', ''));
        expect(out.searchParams.has('machine')).toBe(false);
        expect(out.hash).toBe('#code=x');
    });

    it('不合法或非 http(s) 的網址回 null', () => {
        expect(attachMmParams('', 'M20')).toBeNull();
        expect(attachMmParams(undefined, 'M20')).toBeNull();
        expect(attachMmParams('javascript:alert(1)#code=x', 'M20')).toBeNull();
    });
});

describe('openMmWithLoginCode', () => {
    const plainUrl = 'https://mms.ericchh.work/?from=priiot&machine=M20';
    const fakeWin = (blocked = false) => {
        const tab = { opener: {}, location: { replace: vi.fn() } };
        return { tab, win: { open: vi.fn(() => (blocked ? null : tab)), location: { assign: vi.fn() } } };
    };

    it('取到代碼:同步開分頁、切斷 opener、導到帶代碼的網址', async () => {
        const { tab, win } = fakeWin();
        const issueCode = vi.fn().mockResolvedValue({ redirectUrl: 'https://mms.ericchh.work/#code=K1' });
        const pending = openMmWithLoginCode({ plainUrl, machineId: 'M20', issueCode, win });
        expect(win.open).toHaveBeenCalledWith('', '_blank'); // 尚未等到結果就已開出分頁
        expect(await pending).toBe('code');
        expect(tab.opener).toBeNull();
        const went = new URL(tab.location.replace.mock.calls[0][0]);
        expect(went.hash).toBe('#code=K1');
        expect(went.searchParams.get('machine')).toBe('M20');
    });

    it('簽發失敗(503、斷線)退回一般網址', async () => {
        const { tab, win } = fakeWin();
        const issueCode = vi.fn().mockRejectedValue(new Error('503'));
        expect(await openMmWithLoginCode({ plainUrl, machineId: 'M20', issueCode, win })).toBe('plain');
        expect(tab.location.replace).toHaveBeenCalledWith(plainUrl);
    });

    it('回應沒有可用的 redirectUrl 也退回一般網址', async () => {
        const { tab, win } = fakeWin();
        const issueCode = vi.fn().mockResolvedValue({});
        expect(await openMmWithLoginCode({ plainUrl, machineId: 'M20', issueCode, win })).toBe('plain');
        expect(tab.location.replace).toHaveBeenCalledWith(plainUrl);
    });

    it('分頁被瀏覽器擋下時改在原分頁前往', async () => {
        const { win } = fakeWin(true);
        const issueCode = vi.fn().mockResolvedValue({ redirectUrl: 'https://mms.ericchh.work/#code=K2' });
        expect(await openMmWithLoginCode({ plainUrl, machineId: '', issueCode, win })).toBe('code');
        expect(win.location.assign.mock.calls[0][0]).toContain('#code=K2');
    });

    it('沒有入口網址時不開分頁也不簽發', async () => {
        const { win } = fakeWin();
        const issueCode = vi.fn();
        expect(await openMmWithLoginCode({ plainUrl: null, machineId: 'M20', issueCode, win })).toBe('none');
        expect(win.open).not.toHaveBeenCalled();
        expect(issueCode).not.toHaveBeenCalled();
    });
});
