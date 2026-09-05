import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LanguageProvider } from '../../modules/language/LanguageContext';

/**
 * 設定頁使用者名冊測試。
 *
 * S6 v3 的原始意圖(AC-66 / AC-67)—— 寫進 localStorage.appUsers 的 username 必須是
 * **後端帳號(代碼)**而非顯示名稱 —— 在 S7 把名冊改接後端之後依然成立,只是資料來源換了:
 * 快取現在由後端回應改寫,不再由表單直接寫入。
 *
 * S7 另外釘住四件事:名冊改讀 /api/v1/auth/users、新增走 createUser 且密碼必填、
 * 「刪除」語意改為停用(updateUser isActive)、非 ADMIN(403)轉唯讀。
 */

const getReasonCodes = vi.fn();
const createReasonCode = vi.fn();
const deleteReasonCode = vi.fn();
const getUsers = vi.fn();
const createUser = vi.fn();
const updateUser = vi.fn();
vi.mock('../../services/api', () => ({
    getReasonCodes: (...args) => getReasonCodes(...args),
    createReasonCode: (...args) => createReasonCode(...args),
    deleteReasonCode: (...args) => deleteReasonCode(...args),
    getUsers: (...args) => getUsers(...args),
    createUser: (...args) => createUser(...args),
    updateUser: (...args) => updateUser(...args),
}));

const GeneralTab = (await import('../../components/settings/GeneralTab')).default;

const renderGeneralTab = () => render(
    <LanguageProvider>
        <GeneralTab />
    </LanguageProvider>
);

/**
 * 取得使用者名冊編輯列的主要按鈕(新增 / 修改)。
 * 輸入:無;輸出:該列的最後一顆 button;
 * 邏輯:「新增」在本頁出現四次(使用者 / 班別 / 停車原因 / 不良原因),
 *       故以代碼欄輸入框的父層 editRow 為錨點。S7 起該列多了密碼與角色欄,
 *       按鈕仍是該列唯一的 actionButton(未進編輯模式時)。
 */
const rosterActionButton = () =>
    screen.getByPlaceholderText('代碼').parentElement.querySelectorAll('button')[0];

/** 讀回目前寫入 localStorage 的名冊。 */
const storedRoster = () => JSON.parse(localStorage.getItem('appUsers') ?? '[]');

/** 造一筆後端 UserSummary。 */
const summary = (over = {}) => ({
    id: '11111111-1111-1111-1111-111111111111',
    username: 'OP1',
    displayName: '王小明',
    shift: '',
    roles: ['OPERATOR'],
    isActive: true,
    createdAt: '2026-09-06T00:00:00Z',
    ...over,
});

describe('設定頁使用者名冊(S6 AC-66/67,S7 接後端)', () => {
    beforeEach(() => {
        localStorage.clear();
        getReasonCodes.mockReset().mockResolvedValue([]);
        createReasonCode.mockReset().mockResolvedValue({});
        deleteReasonCode.mockReset().mockResolvedValue({});
        getUsers.mockReset().mockResolvedValue([]);
        createUser.mockReset().mockResolvedValue(summary());
        updateUser.mockReset().mockResolvedValue(undefined);
        vi.spyOn(window, 'alert').mockImplementation(() => { });
        vi.spyOn(window, 'confirm').mockImplementation(() => true);
        vi.spyOn(console, 'warn').mockImplementation(() => { });
    });

    afterEach(() => {
        localStorage.clear();
        vi.restoreAllMocks();
    });

    // S7:掛載即向後端要名冊,並以回應改寫本機快取
    it('掛載後以 /api/v1/auth/users 的回應改寫本機快取', async () => {
        getUsers.mockResolvedValue([summary()]);

        renderGeneralTab();

        await waitFor(() => expect(getUsers).toHaveBeenCalled());
        await waitFor(() => expect(storedRoster()).toHaveLength(1));

        const row = storedRoster()[0];
        expect(row.id).toBe('OP1');
        expect(row.username).toBe('OP1');
        expect(row.name).toBe('王小明');
        expect('password' in row).toBe(false); // AC-61 / AC-68 的順帶保護
    });

    // AC-66(S7 版):新增走後端 createUser,送出的 username 是代碼而非顯示名稱
    it('新增使用者時送給後端的 username 是代碼 OP1 而不是顯示名稱', async () => {
        renderGeneralTab();
        await waitFor(() => expect(getUsers).toHaveBeenCalled());

        fireEvent.change(screen.getByPlaceholderText('使用者'), { target: { value: '王小明' } });
        fireEvent.change(screen.getByPlaceholderText('代碼'), { target: { value: 'OP1' } });
        fireEvent.change(screen.getByPlaceholderText('密碼'), { target: { value: 'CorrectHorse123!' } });

        getUsers.mockResolvedValue([summary()]);
        fireEvent.click(rosterActionButton());

        await waitFor(() => expect(createUser).toHaveBeenCalledTimes(1));
        const payload = createUser.mock.calls[0][0];
        expect(payload.username).toBe('OP1');
        expect(payload.username).not.toBe('王小明');
        expect(payload.displayName).toBe('王小明');
        expect(payload.role).toBe('OPERATOR');

        // 快取由後端回應改寫,username 仍是代碼
        await waitFor(() => expect(storedRoster()[0]?.username).toBe('OP1'));
    });

    // S7:新增時沒填密碼 → 不打後端(後端沒有密碼建不了帳號,靜默失敗會長出登不進去的幽靈列)
    it('新增使用者未填密碼時不呼叫後端', async () => {
        renderGeneralTab();
        await waitFor(() => expect(getUsers).toHaveBeenCalled());

        fireEvent.change(screen.getByPlaceholderText('使用者'), { target: { value: '王小明' } });
        fireEvent.change(screen.getByPlaceholderText('代碼'), { target: { value: 'OP1' } });
        fireEvent.click(rosterActionButton());

        expect(createUser).not.toHaveBeenCalled();
        expect(window.alert).toHaveBeenCalled();
    });

    // S7:「刪除」語意改為停用 —— 後端沒有刪除端點,帳號要留稽核軌跡
    it('停用按鈕送出的是 isActive: false 而不是刪除', async () => {
        getUsers.mockResolvedValue([summary()]);
        renderGeneralTab();
        await waitFor(() => expect(storedRoster()).toHaveLength(1));

        fireEvent.click(screen.getByText('停用'));

        await waitFor(() => expect(updateUser).toHaveBeenCalledTimes(1));
        expect(updateUser.mock.calls[0][0]).toBe(summary().id);
        expect(updateUser.mock.calls[0][1]).toEqual({ isActive: false });
    });

    // S7:已停用的帳號不進登入視窗的觸控清單(點了只會拿到「帳號或密碼錯誤」)
    it('已停用的帳號不寫進本機快取', async () => {
        getUsers.mockResolvedValue([summary(), summary({
            id: '22222222-2222-2222-2222-222222222222',
            username: 'OP2',
            displayName: '李小華',
            isActive: false,
        })]);

        renderGeneralTab();

        await waitFor(() => expect(storedRoster()).toHaveLength(1));
        expect(storedRoster()[0].username).toBe('OP1');
    });

    // S7:非 ADMIN(403)→ 名冊轉唯讀,不得讓現場以為存得起來
    it('後端回 403 時名冊轉唯讀', async () => {
        getUsers.mockRejectedValue({ response: { status: 403 } });

        renderGeneralTab();

        // 本專案未把 @testing-library/jest-dom 掛進 setupFiles,故以原生屬性判斷
        await waitFor(() => expect(screen.getByPlaceholderText('代碼').disabled).toBe(true));
        expect(rosterActionButton().disabled).toBe(true);
    });

    // AC-67:後端不可達時沿用本機快取,舊列缺 username 以代碼遞補(不得用顯示名稱)
    it('後端不可達時沿用快取,舊列缺 username 以代碼遞補', async () => {
        localStorage.setItem('appUsers', JSON.stringify([{ id: 'OP2', name: '李小華' }]));
        getUsers.mockRejectedValue({ response: { status: 503 } });

        renderGeneralTab();

        await waitFor(() => expect(getUsers).toHaveBeenCalled());

        const row = storedRoster().find(u => u.id === 'OP2');
        expect(row.username).toBe('OP2');
        expect(row.username).not.toBe('李小華');
        expect(screen.getByText('李小華')).toBeTruthy(); // 清單沒有被清空
    });
});
