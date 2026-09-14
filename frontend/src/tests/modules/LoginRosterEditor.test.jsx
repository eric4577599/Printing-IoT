import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider } from '../../modules/language/LanguageContext';

/**
 * S12 回歸釘樁:名冊編輯列的位置與可用性。
 *
 * 背景:代碼 / 班別 / 操作員 是**名冊表的編輯欄**,卻和帳號 / 密碼一起塞在登入 infoBar。
 * `.windowContainer` 是固定 640px 而 `.infoBar` 沒有 flex-wrap,六欄放不下,
 * 最後兩欄(代碼、Default)溢位到卡片外的灰底上 —— 使用者點不到,
 * 於是 handleAddUser 永遠缺代碼,「新增」實質不可用。
 *
 * 本檔釘住三件事:
 *  1. 三個編輯欄集中在同一列,且**不與帳號 / 密碼同層**(語意分離)
 *  2. 新增 / 刪除真的能改動名冊
 *  3. 條件不足時按鈕是 disabled,而不是按下去才跳 alert
 */

const loginApi = vi.fn();
vi.mock('../../services/api', () => ({
    login: (...args) => loginApi(...args),
}));

const { AuthProvider } = await import('../../modules/auth/AuthContext');
const LoginModal = (await import('../../modules/auth/LoginModal')).default;

const renderLogin = () => render(
    <LanguageProvider>
        <MemoryRouter>
            <AuthProvider>
                <LoginModal isOpen onClose={() => { }} />
            </AuthProvider>
        </MemoryRouter>
    </LanguageProvider>
);

/** 取得某個欄位標籤(LABEL,非表頭 TH)右邊的輸入框 */
const fieldInput = (labelText) => {
    const label = screen.getAllByText(labelText).find(el => el.tagName === 'LABEL');
    expect(label, `找不到標籤 ${labelText}`).toBeTruthy();
    return label.parentElement.querySelector('input');
};

/** 該欄位所屬的那一列容器(infoField 的父層) */
const fieldRow = (labelText) => {
    const label = screen.getAllByText(labelText).find(el => el.tagName === 'LABEL');
    return label.parentElement.parentElement;
};

const storedRoster = () => JSON.parse(localStorage.getItem('appUsers') ?? '[]');

/**
 * 取名冊表格右側的兩顆按鈕。
 * 畫面上有**兩個**「刪除」(名冊一個、班別時段一個),必須先鎖定名冊那一組,
 * 否則斷言會打到班別表的刪除鈕。以唯一的「新增」反推它所在的 sideButtons 容器。
 */
const rosterButtons = () => {
    const addBtn = screen.getByText('新增');
    const group = addBtn.parentElement;
    return {
        add: addBtn,
        remove: [...group.querySelectorAll('button')].find(b => b.textContent === '刪除'),
    };
};

describe('S12 名冊編輯列的位置', () => {
    beforeEach(() => {
        localStorage.clear();
        loginApi.mockReset();
        vi.spyOn(window, 'alert').mockImplementation(() => { });
        vi.spyOn(window, 'confirm').mockImplementation(() => true);
    });

    afterEach(() => {
        localStorage.clear();
        vi.restoreAllMocks();
    });

    it('代碼 / 班別 / 操作員 三欄在同一列', () => {
        renderLogin();
        const row = fieldRow('代碼');
        expect(fieldRow('班別')).toBe(row);
        expect(fieldRow('操作員')).toBe(row);
    });

    it('編輯欄不與帳號 / 密碼同層 —— 名冊編輯不是登入憑證', () => {
        renderLogin();
        const editorRow = fieldRow('代碼');
        expect(editorRow.contains(fieldInput('帳號 (Username)'))).toBe(false);
        expect(editorRow.contains(fieldInput('密碼 (Password)'))).toBe(false);
    });

    it('班別欄的標籤是「班別」,與表頭一致(原本寫死英文 Default)', () => {
        renderLogin();
        expect(fieldInput('班別')).toBeTruthy();
        expect(screen.queryByText('Default')).toBeNull();
    });

    it('三個編輯欄都在畫面上、都可輸入', () => {
        renderLogin();
        for (const [label, value] of [['代碼', 'OP7'], ['班別', 'A'], ['操作員', '張三']]) {
            const input = fieldInput(label);
            fireEvent.change(input, { target: { value } });
            expect(input.value).toBe(value);
        }
    });
});

describe('S12 名冊的新增與刪除', () => {
    beforeEach(() => {
        localStorage.clear();
        loginApi.mockReset();
        vi.spyOn(window, 'alert').mockImplementation(() => { });
        vi.spyOn(window, 'confirm').mockImplementation(() => true);
    });

    afterEach(() => {
        localStorage.clear();
        vi.restoreAllMocks();
    });

    it('填齊代碼與操作員後新增,該列進入名冊與表格', () => {
        renderLogin();

        fireEvent.change(fieldInput('代碼'), { target: { value: 'OP7' } });
        fireEvent.change(fieldInput('班別'), { target: { value: 'a' } });
        fireEvent.change(fieldInput('操作員'), { target: { value: '張三' } });
        fireEvent.click(screen.getByText('新增'));

        const row = storedRoster().find(u => u.id === 'OP7');
        expect(row).toMatchObject({ id: 'OP7', name: '張三', username: 'OP7', shift: 'A' });

        const table = document.querySelector('table');
        expect(within(table).getByText('張三')).toBeTruthy();
    });

    it('代碼或操作員沒填時,新增鈕是停用的', () => {
        renderLogin();
        expect(rosterButtons().add.disabled).toBe(true);

        fireEvent.change(fieldInput('代碼'), { target: { value: 'OP8' } });
        expect(rosterButtons().add.disabled).toBe(true); // 只有代碼還不夠

        fireEvent.change(fieldInput('操作員'), { target: { value: '李四' } });
        expect(rosterButtons().add.disabled).toBe(false);
    });

    it('只有空白字元不算填了', () => {
        renderLogin();
        fireEvent.change(fieldInput('代碼'), { target: { value: '   ' } });
        fireEvent.change(fieldInput('操作員'), { target: { value: '   ' } });
        expect(rosterButtons().add.disabled).toBe(true);
    });

    it('未選取任何一列時,刪除鈕是停用的', () => {
        localStorage.setItem('appUsers', JSON.stringify([
            { id: 'OP9', name: '王五', username: 'OP9', shift: 'B', role: 'OPERATOR' },
        ]));
        renderLogin();

        expect(rosterButtons().remove.disabled).toBe(true);
    });

    it('點選一列後可以刪除,該列從名冊消失', () => {
        localStorage.setItem('appUsers', JSON.stringify([
            { id: 'OP9', name: '王五', username: 'OP9', shift: 'B', role: 'OPERATOR' },
        ]));
        renderLogin();

        fireEvent.click(screen.getByText('王五'));

        const { remove } = rosterButtons();
        expect(remove.disabled).toBe(false);
        fireEvent.click(remove);

        expect(storedRoster().find(u => u.id === 'OP9')).toBeUndefined();
    });

    it('點選一列會把帳號填進登入欄,但密碼欄維持空白', () => {
        localStorage.setItem('appUsers', JSON.stringify([
            { id: 'OP9', name: '王五', username: 'OP9', shift: 'B', role: 'OPERATOR' },
        ]));
        renderLogin();

        fireEvent.click(screen.getByText('王五'));

        expect(fieldInput('帳號 (Username)').value).toBe('OP9');
        expect(fieldInput('密碼 (Password)').value).toBe('');
    });

    it('畫面明說新增名冊不等於建立帳號 —— 現場最容易誤會的一點', () => {
        renderLogin();
        expect(screen.getByText(/不會建立或停用後端帳號/)).toBeTruthy();
    });
});

describe('S13 點名冊列不得靜默覆寫已輸入的帳號', () => {
    beforeEach(() => {
        localStorage.setItem('appUsers', JSON.stringify([
            { id: 'OP1', name: '王五', username: 'OP1', shift: 'A', role: 'OPERATOR' },
            { id: 'OP2', name: '陳六', username: 'OP2', shift: 'B', role: 'OPERATOR' },
        ]));
        loginApi.mockReset();
        vi.spyOn(window, 'alert').mockImplementation(() => { });
        vi.spyOn(window, 'confirm').mockImplementation(() => true);
    });

    afterEach(() => {
        localStorage.clear();
        vi.restoreAllMocks();
    });

    it('帳號欄是空的 → 點列會填入該列的帳號', () => {
        renderLogin();
        fireEvent.click(screen.getByText('王五'));
        expect(fieldInput('帳號 (Username)').value).toBe('OP1');
    });

    it('使用者自己打了帳號 → 點列不覆寫,並明說有保留', () => {
        renderLogin();
        const username = fieldInput('帳號 (Username)');

        fireEvent.change(username, { target: { value: 'admin' } });
        fireEvent.click(screen.getByText('王五'));

        expect(username.value).toBe('admin');
        expect(screen.getByText(/已保留你輸入的帳號/)).toBeTruthy();
    });

    it('名冊列之間仍可正常切換 —— 判準是「誰打的」不是「有沒有值」', () => {
        renderLogin();
        const username = fieldInput('帳號 (Username)');

        fireEvent.click(screen.getByText('王五'));
        expect(username.value).toBe('OP1');

        fireEvent.click(screen.getByText('陳六'));
        expect(username.value).toBe('OP2');
        expect(screen.queryByText(/已保留你輸入的帳號/)).toBeNull();
    });

    it('清空帳號欄之後,點列又能填入了', () => {
        renderLogin();
        const username = fieldInput('帳號 (Username)');

        fireEvent.change(username, { target: { value: 'admin' } });
        fireEvent.click(screen.getByText('王五'));
        expect(username.value).toBe('admin');

        fireEvent.change(username, { target: { value: '' } });
        fireEvent.click(screen.getByText('王五'));
        expect(username.value).toBe('OP1');
    });

    it('改動帳號欄會收掉保留提示', () => {
        renderLogin();
        const username = fieldInput('帳號 (Username)');

        fireEvent.change(username, { target: { value: 'admin' } });
        fireEvent.click(screen.getByText('王五'));
        expect(screen.getByText(/已保留你輸入的帳號/)).toBeTruthy();

        fireEvent.change(username, { target: { value: 'admin2' } });
        expect(screen.queryByText(/已保留你輸入的帳號/)).toBeNull();
    });

    it('被擋下覆寫時,名冊編輯欄仍然照常填入(選取本身有生效)', () => {
        renderLogin();
        fireEvent.change(fieldInput('帳號 (Username)'), { target: { value: 'admin' } });
        fireEvent.click(screen.getByText('王五'));

        expect(fieldInput('代碼').value).toBe('OP1');
        expect(fieldInput('操作員').value).toBe('王五');
        expect(rosterButtons().remove.disabled).toBe(false);
    });
});
