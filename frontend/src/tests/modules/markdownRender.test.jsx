import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MarkdownView } from '../../modules/docs/markdownRender';
import { parseBlocks, slugify } from '../../modules/docs/markdownParse';
import { resolveDocImage } from '../../modules/docs/docRegistry';

/**
 * 文件頁輕量 Markdown 渲染器。重點是兩件事:
 *  ① 文件實際用到的語法(標題、表格、清單、程式碼、圖片)都畫得出來
 *  ② 安全:文件內的 HTML 不被執行、不放行 javascript: 連結、不載入外部圖片
 */

const view = (md, resolveImage) => render(<MarkdownView source={md} resolveImage={resolveImage} />);

describe('區塊解析', () => {
    it('標題、段落、分隔線', () => {
        const b = parseBlocks('# 標題\n\n第一行\n第二行\n\n---\n');
        expect(b.map(x => x.type)).toEqual(['heading', 'paragraph', 'hr']);
        expect(b[1].text).toBe('第一行\n第二行');
    });

    it('GFM 表格含對齊', () => {
        const b = parseBlocks('| a | b | c |\n|:--|:-:|--:|\n| 1 | 2 | 3 |\n');
        expect(b[0].type).toBe('table');
        expect(b[0].header).toEqual(['a', 'b', 'c']);
        expect(b[0].aligns).toEqual(['left', 'center', 'right']);
        expect(b[0].rows).toEqual([['1', '2', '3']]);
    });

    it('清單可巢狀,有序與無序分開', () => {
        const b = parseBlocks('- 甲\n  - 乙\n- 丙\n');
        expect(b[0].items.entries).toHaveLength(2);
        expect(b[0].items.entries[0].sub.entries[0].text).toBe('乙');
        expect(parseBlocks('1. 一\n2. 二')[0].items.ordered).toBe(true);
    });

    it('圍欄程式碼內的內容不被當成 Markdown', () => {
        const b = parseBlocks('```js\n# 不是標題\n| x | y |\n```\n後面');
        expect(b[0]).toMatchObject({ type: 'code', lang: 'js', text: '# 不是標題\n| x | y |' });
        expect(b[1].type).toBe('paragraph');
    });

    it('引用區塊可含內層區塊', () => {
        const b = parseBlocks('> **注意**\n> - 一\n> - 二');
        expect(b[0].type).toBe('quote');
        expect(b[0].children.map(x => x.type)).toEqual(['paragraph', 'list']);
    });
});

describe('錨點', () => {
    it('slugify 對應既有文件的目錄連結', () => {
        expect(slugify('1. 即時監控 (Monitor)')).toBe('1-即時監控-monitor');
        expect(slugify('系統概覽')).toBe('系統概覽');
    });
});

describe('行內語法與安全', () => {
    it('粗體、斜體、行內程式碼', () => {
        const { container } = view('**粗** 與 *斜* 與 `code`');
        expect(container.querySelector('strong').textContent).toBe('粗');
        expect(container.querySelector('em').textContent).toBe('斜');
        expect(container.querySelector('code').textContent).toBe('code');
    });

    it('文件內的 HTML 當純文字,不會變成元素', () => {
        const { container } = view('<script>alert(1)</script> <img src=x onerror=alert(1)>');
        expect(container.querySelector('script')).toBeNull();
        expect(container.querySelector('img')).toBeNull();
        expect(container.textContent).toContain('<script>alert(1)</script>');
    });

    it('javascript: 連結不產生 <a href>', () => {
        const { container } = view('[點我](javascript:alert(1)) 與 [正常](https://example.com)');
        const hrefs = [...container.querySelectorAll('a')].map(a => a.getAttribute('href'));
        expect(hrefs).toEqual(['https://example.com']);
        expect(container.textContent).toContain('點我');
    });

    it('外部連結一律 noopener', () => {
        const { container } = view('[x](https://example.com)');
        const a = container.querySelector('a');
        expect(a.getAttribute('rel')).toContain('noopener');
        expect(a.getAttribute('target')).toBe('_blank');
    });

    it('表格儲存格內的行內語法照常運作', () => {
        const { container } = view('| 欄 |\n|---|\n| **粗** |');
        expect(container.querySelector('td strong').textContent).toBe('粗');
    });
});

describe('圖片', () => {
    it('resolveImage 有回網址就畫圖,單獨一行的圖帶圖說', () => {
        const { container } = view('![登入畫面](pic/ui/x.png)', () => '/assets/x.png');
        const img = container.querySelector('img');
        expect(img.getAttribute('src')).toBe('/assets/x.png');
        expect(container.querySelector('figcaption').textContent).toBe('登入畫面');
    });

    it('resolveImage 回 null(找不到或外部網址)→ 不載入圖,顯示替代文字', () => {
        const { container } = view('![外部](https://evil.example/a.png)', () => null);
        expect(container.querySelector('img')).toBeNull();
        expect(screen.getByText(/\[圖片:外部\]/)).toBeTruthy();
    });

    it('未提供 resolveImage 時一律不載入圖片', () => {
        const { container } = view('![x](pic/a.png)');
        expect(container.querySelector('img')).toBeNull();
    });
});

describe('resolveDocImage(只認 doc/pic 內的建置檔)', () => {
    it('外部網址、協定相對網址、路徑穿越一律 null', () => {
        expect(resolveDocImage('https://example.com/a.png')).toBeNull();
        expect(resolveDocImage('//example.com/a.png')).toBeNull();
        expect(resolveDocImage('data:image/png;base64,AAAA')).toBeNull();
        expect(resolveDocImage('pic/../../secret.png')).toBeNull();
    });

    it('doc/pic 內既有的圖可解析,不存在的回 null', () => {
        expect(resolveDocImage('pic/A.png')).toMatch(/A.*\.png$/);
        expect(resolveDocImage('./pic/A.png')).toBe(resolveDocImage('pic/A.png'));
        expect(resolveDocImage('pic/not-exist.png')).toBeNull();
    });
});
