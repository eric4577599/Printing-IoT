import { describe, it, expect } from 'vitest';
import {
    allDocFileNames,
    canRead,
    listDocs,
    loadDoc,
    CURATED_INDEX,
    CATEGORY,
} from '../../modules/docs/docRegistry';

/**
 * S14 回歸釘樁:文件改為建置時收檔 + 角色分權。
 *
 * 背景:原本走 `/api/docs/:filename`,而 `doc/` 從來沒進過 API 容器
 * (compose 建置脈絡是 ./backend,doc/ 在專案根),於是整個文件頁一律 404。
 * 改為不經 API 之後,最要緊的兩件事是:
 *  ① 清單必須由**實際存在的檔案**產生(手寫清單會列出不存在的檔)
 *  ② 角色分權要在取得內容的唯一入口收斂,不能只靠側欄不畫出來
 */

const asRole = (...owned) => (...wanted) =>
    wanted.some(w => owned.includes(String(w).toUpperCase()));

const admin = asRole('ADMIN');
const operator = asRole('OPERATOR');
const engineer = asRole('ENGINEER');
const supervisor = asRole('SUPERVISOR');
const noRole = asRole();

describe('文件清單由實際存在的檔案產生', () => {
    it('掃得到 doc/ 底下的 Markdown', () => {
        const files = allDocFileNames();
        expect(files.length).toBeGreaterThan(10);
        expect(files).toContain('操作說明書.md');
        expect(files).toContain('SASD說明書.md');
    });

    it('手寫索引漏掉的檔也會出現 —— 清單不再由人維護', () => {
        const files = allDocFileNames();
        // 這三個檔實際存在於 doc/,但原本的手寫索引完全沒列到,畫面上等於不存在
        expect(files).toContain('業務推廣企劃書.md');
        expect(files).toContain('ERROR_TEST_MATRIX.md');
        expect(files).toContain('高中生簡報.md');
    });

    it('分類表裡的每一筆都對應到真的存在的檔案(沒有殭屍項)', () => {
        const files = new Set(allDocFileNames());
        const stale = Object.keys(CURATED_INDEX).filter(f => !files.has(f));
        expect(stale, `分類表指向不存在的檔案:${stale.join(', ')}`).toEqual([]);
    });
});

describe('角色分權', () => {
    it('ADMIN 看得到全部', () => {
        for (const f of allDocFileNames()) expect(canRead(f, admin)).toBe(true);
    });

    it('ENGINEER 與 SUPERVISOR 比照 ADMIN', () => {
        expect(canRead('業務推廣企劃書.md', engineer)).toBe(true);
        expect(canRead('業務推廣企劃書.md', supervisor)).toBe(true);
    });

    it('OPERATOR 只看得到操作手冊(中英兩版)', () => {
        expect(canRead('操作說明書.md', operator)).toBe(true);
        expect(canRead('Operator Manual.md', operator)).toBe(true);
        expect(canRead('Supervisor_Manual.md', operator)).toBe(false);
        expect(canRead('業務推廣企劃書.md', operator)).toBe(false);
        expect(canRead('DEPLOYMENT_GUIDE_v1.md', operator)).toBe(false);
    });

    it('沒有角色一律看不到 —— 預設拒絕', () => {
        for (const f of allDocFileNames()) expect(canRead(f, noRole)).toBe(false);
        expect(canRead('操作說明書.md', undefined)).toBe(false);
    });
});

describe('側欄清單', () => {
    it('OPERATOR 只拿到一個分類、兩份文件', () => {
        const index = listDocs({ hasRole: operator, t: k => k });
        expect(index).toHaveLength(1);
        expect(index[0].categoryKey).toBe(CATEGORY.WORKFLOW);
        expect(index[0].files.map(f => f.path).sort())
            .toEqual(['Operator Manual.md', '操作說明書.md'].sort());
    });

    it('ADMIN 拿到多個分類,且不含空分類', () => {
        const index = listDocs({ hasRole: admin, t: k => k });
        expect(index.length).toBeGreaterThan(3);
        for (const cat of index) expect(cat.files.length).toBeGreaterThan(0);
    });

    it('沒有角色時清單是空的', () => {
        expect(listDocs({ hasRole: noRole, t: k => k })).toEqual([]);
    });

    it('未被分類的檔案歸到「其他」,不會消失', () => {
        const index = listDocs({ hasRole: admin, t: k => k });
        const listed = index.flatMap(c => c.files.map(f => f.path)).sort();
        expect(listed).toEqual(allDocFileNames().sort());
    });
});

describe('讀取內容', () => {
    it('讀得到 Markdown 原文', async () => {
        const text = await loadDoc('操作說明書.md', admin);
        expect(typeof text).toBe('string');
        expect(text.length).toBeGreaterThan(100);
    });

    it('OPERATOR 讀無權的檔會被擋下,不是靜默回空字串', async () => {
        await expect(loadDoc('業務推廣企劃書.md', operator)).rejects.toMatchObject({ code: 'FORBIDDEN' });
    });

    it('讀不存在的檔回 NOT_FOUND,與無權區分開', async () => {
        await expect(loadDoc('這個檔不存在.md', admin)).rejects.toMatchObject({ code: 'NOT_FOUND' });
    });
});
