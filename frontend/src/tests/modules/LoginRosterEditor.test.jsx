import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider } from '../../modules/language/LanguageContext';

/**
 * 名冊編輯的回歸釘樁(S12 → S13 → S17)。
 *
 * S12 背景:代碼 / 班別 / 操作員 原本和帳號 / 密碼一起塞在登入 infoBar,
 * 六欄放不進 640px 的卡片而溢位到卡片外,使用者點不到,「新增」實質不可用。
 * 當時的修法是拆成表格上方獨立一列。
 *
 * S17 再往前一步:編輯就發生在**它要改的那一列上** ——
 * 表格上方那排欄位與表格列的對應關係只能靠猜,現場常見的誤解是
 * 「上面填一填、下面就會多一列」。本檔因此改以列上的編輯欄斷言。
 *
 * 釘住的東西沒有變:
 *  1. 編輯欄與登入憑證分離(名冊編輯不是登入)
 *  2. 新增 / 刪除真的能改動名冊
 *  3. 條件不足時按鈕是 disabled,而不是按下去才跳 alert
 *  4. S13:點列不得靜默覆寫使用者自己打的帳號
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

/** 名冊列上的就地編輯欄(草稿列或選取中的列),同時間只會有一組。 */
const cellInput = (labelText) => screen.getByLabelText(labelText);

/** 登入欄(帳號 / 密碼)—— 這兩個是 infoBar 的 label + input。 */
const fieldInput = (labelText) => {
    const label = screen.getAllByText(labelText).find(el => el.tagName === 'LABEL');
    expect(label, `找不到標籤 ${labelText}`).toBeTruthy();
    return label.parentElement.querySelector('input');
};

/** S17:按名冊表底部的「+」長出一列空白可編輯列。 */
const startDraft = () => fireEvent.click(screen.getByLabelText('新增一列'));

/** 進入管理者模式(密碼欄只在這個模式渲染)。 */
const enterAdminMode = () => fireEvent.click(screen.getByText('管理者 (Admin)'));

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

describe('S17 名冊編輯就地發生在列上', () => {
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

    it('預設沒有編輯欄 —— 名冊平時是唯讀的觸控清單', () => {
        renderLogin();
        expect(screen.queryByLabelText('代碼')).toBeNull();
        expect(screen.queryByLabelText('操作員')).toBeNull();
    });

    it('按「+」長出一列空白可編輯列,三欄都在表格內且可輸入', () => {
        renderLogin();
        startDraft();

        const table = document.querySelector('table');
        for (const [label, value] of [['代碼', 'OP7'], ['班別', 'A'], ['操作員', '張三']]) {
            const input = cellInput(label);
            expect(table.contains(input), `${label} 不在名冊表格內`).toBe(true);
            fireEvent.change(input, { target: { value } });
            expect(input.value).toBe(value);
        }
    });

    it('編輯欄不與帳號 / 密碼同層 —— 名冊編輯不是登入憑證', () => {
        renderLogin();
        enterAdminMode();
        startDraft();

        const table = document.querySelector('table');
        expect(table.contains(fieldInput('帳號 (Username)'))).toBe(false);
        expect(table.contains(fieldInput('密碼 (Password)'))).toBe(false);
    });

    it('班別欄的標籤是「班別」,與表頭一致(原本寫死英文 Default)', () => {
        renderLogin();
        startDraft();
        expect(cellInput('班別')).toBeTruthy();
        expect(screen.queryByText('Default')).toBeNull();
    });

    it('點選既有列會就地變成可編輯,改完按新增即回寫該列', () => {
        localStorage.setItem('appUsers', JSON.stringify([
            { id: 'OP9', name: '王五', username: 'OP9', shift: 'B', role: 'OPERATOR' },
        ]));
        renderLogin();

        fireEvent.click(screen.getByText('王五'));
        expect(cellInput('代碼').value).toBe('OP9');

        fireEvent.change(cellInput('班別'), { target: { value: 'a' } });
        fireEvent.click(rosterButtons().add);

        expect(storedRoster().find(u => u.id === 'OP9').shift).toBe('A');
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

        startDraft();
        fireEvent.change(cellInput('代碼'), { target: { value: 'OP7' } });
        fireEvent.change(cellInput('班別'), { target: { value: 'a' } });
        fireEvent.change(cellInput('操作員'), { target: { value: '張三' } });
        fireEvent.click(screen.getByText('新增'));

        const row = storedRoster().find(u => u.id === 'OP7');
        expect(row).toMatchObject({ id: 'OP7', name: '張三', username: 'OP7', shift: 'A' });

        const table = document.querySelector('table');
        expect(within(table).getByText('張三')).toBeTruthy();
    });

    it('儲存後草稿列收起來,不會留一列空白在表上', () => {
        renderLogin();

        startDraft();
        fireEvent.change(cellInput('代碼'), { target: { value: 'OP7' } });
        fireEvent.change(cellInput('操作員'), { target: { value: '張三' } });
        fireEvent.click(screen.getByText('新增'));

        expect(screen.getByLabelText('新增一列')).toBeTruthy(); // 「+」回來了
        expect(storedRoster().filter(u => !u.id).length).toBe(0);
    });

    it('代碼或操作員沒填時,新增鈕是停用的', () => {
        renderLogin();
        startDraft();
        expect(rosterButtons().add.disabled).toBe(true);

        fireEvent.change(cellInput('代碼'), { target: { value: 'OP8' } });
        expect(rosterButtons().add.disabled).toBe(true); // 只有代碼還不夠

        fireEvent.change(cellInput('操作員'), { target: { value: '李四' } });
        expect(rosterButtons().add.disabled).toBe(false);
    });

    it('只有空白字元不算填了', () => {
        renderLogin();
        startDraft();
        fireEvent.change(cellInput('代碼'), { target: { value: '   ' } });
        fireEvent.change(cellInput('操作員'), { target: { value: '   ' } });
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

    it('畫面明說新增名冊不等於建立帳號 —— 現場最容易誤會的一點', () => {
        renderLogin();
        expect(screen.getByText(/不會建立或停用後端帳號/)).toBeTruthy();
    });

    it('草稿列展開時,那行提示仍然看得到', () => {
        renderLogin();
        startDraft();
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
        fireEvent.click(screen.getByText('陳六')); // 換一列點,避免踩到「同一列已選取」
        expect(username.value).toBe('OP2');
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

    it('被擋下覆寫時,該列仍然進入編輯狀態(選取本身有生效)', () => {
        renderLogin();
        fireEvent.change(fieldInput('帳號 (Username)'), { target: { value: 'admin' } });
        fireEvent.click(screen.getByText('王五'));

        expect(cellInput('代碼').value).toBe('OP1');
        expect(cellInput('操作員').value).toBe('王五');
        expect(rosterButtons().remove.disabled).toBe(false);
    });
});
