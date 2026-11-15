/**
 * markdownParse — 文件頁 Markdown 的純解析函式(不含 React)
 *
 * 與 markdownRender.jsx 分開:渲染元件檔只匯出元件(fast refresh 的要求),
 * 純函式放這裡也比較好測。
 */

/**
 * 標題轉錨點 id(貼近 GitHub 的規則,讓既有文件的目錄連結可用)
 * @param {string} text - 標題文字
 * @returns {string} 小寫、去標點、空白轉 '-' 的 id
 */
export function slugify(text) {
    return String(text)
        .trim()
        .toLowerCase()
        .replace(/[^\p{L}\p{N}\s_-]/gu, '')
        .replace(/\s/g, '-');
}

// ───────────────────────── 區塊語法 ─────────────────────────

const RE = {
    fence: /^\s*(```+|~~~+)\s*([\w-]*)\s*$/,
    heading: /^(#{1,6})\s+(.*?)\s*#*\s*$/,
    hr: /^\s*([-*_])(\s*\1){2,}\s*$/,
    quote: /^\s*>\s?(.*)$/,
    list: /^(\s*)([-*+]|\d+[.)])\s+(.*)$/,
    tableSep: /^\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|?\s*$/,
};

/** 把一列表格拆成儲存格(去掉頭尾的 |) */
function splitRow(line) {
    let s = line.trim();
    if (s.startsWith('|')) s = s.slice(1);
    if (s.endsWith('|') && !s.endsWith('\\|')) s = s.slice(0, -1);
    return s.split(/(?<!\\)\|/).map(c => c.trim().replace(/\\\|/g, '|'));
}

/**
 * 把 Markdown 切成區塊樹
 * @param {string} source - Markdown 原文
 * @returns {Array<Object>} 區塊陣列,type 為 heading / paragraph / code / quote / list / table / hr
 */
export function parseBlocks(source) {
    const lines = String(source ?? '').replace(/\r\n?/g, '\n').split('\n');
    const blocks = [];
    let i = 0;

    const isBlockStart = (line, next) =>
        RE.fence.test(line) || RE.heading.test(line) || RE.hr.test(line) || RE.quote.test(line) ||
        RE.list.test(line) || (line.includes('|') && next !== undefined && RE.tableSep.test(next));

    while (i < lines.length) {
        const line = lines[i];

        if (!line.trim()) { i++; continue; }

        let m = line.match(RE.fence);
        if (m) {
            const marker = m[1][0];
            const buf = [];
            i++;
            while (i < lines.length && !new RegExp(`^\\s*${marker}{${m[1].length},}\\s*$`).test(lines[i])) {
                buf.push(lines[i]);
                i++;
            }
            i++; // 吃掉結尾圍欄(沒結尾就讀到檔尾)
            blocks.push({ type: 'code', lang: m[2], text: buf.join('\n') });
            continue;
        }

        m = line.match(RE.heading);
        if (m) {
            blocks.push({ type: 'heading', level: m[1].length, text: m[2] });
            i++;
            continue;
        }

        if (RE.hr.test(line)) { blocks.push({ type: 'hr' }); i++; continue; }

        if (RE.quote.test(line)) {
            const buf = [];
            while (i < lines.length && RE.quote.test(lines[i])) {
                buf.push(lines[i].match(RE.quote)[1]);
                i++;
            }
            blocks.push({ type: 'quote', children: parseBlocks(buf.join('\n')) });
            continue;
        }

        if (line.includes('|') && i + 1 < lines.length && RE.tableSep.test(lines[i + 1])) {
            const header = splitRow(line);
            const aligns = splitRow(lines[i + 1]).map(c => (c.startsWith(':') && c.endsWith(':') ? 'center' : c.endsWith(':') ? 'right' : 'left'));
            i += 2;
            const rows = [];
            while (i < lines.length && lines[i].trim() && lines[i].includes('|')) {
                rows.push(splitRow(lines[i]));
                i++;
            }
            blocks.push({ type: 'table', header, aligns, rows });
            continue;
        }

        if (RE.list.test(line)) {
            const items = [];
            while (i < lines.length && (RE.list.test(lines[i]) || (lines[i].trim() && /^\s{2,}\S/.test(lines[i]) && items.length))) {
                const lm = lines[i].match(RE.list);
                if (lm) {
                    items.push({ indent: lm[1].replace(/\t/g, '    ').length, ordered: /\d/.test(lm[2]), text: lm[3] });
                } else {
                    items[items.length - 1].text += `\n${lines[i].trim()}`; // 項目內的續行
                }
                i++;
            }
            blocks.push({ type: 'list', items: nestItems(items) });
            continue;
        }

        // 段落:讀到空行或下一個區塊開頭為止
        const buf = [line];
        i++;
        while (i < lines.length && lines[i].trim() && !isBlockStart(lines[i], lines[i + 1])) {
            buf.push(lines[i]);
            i++;
        }
        blocks.push({ type: 'paragraph', text: buf.join('\n') });
    }
    return blocks;
}

/** 依縮排把平坦的清單項目堆成樹:輸出 { ordered, entries: [{ text, sub }] } */
function nestItems(items) {
    const root = { ordered: items[0].ordered, entries: [], indent: items[0].indent };
    const stack = [root];
    for (const it of items) {
        let top = stack[stack.length - 1];
        while (stack.length > 1 && it.indent < top.indent) { stack.pop(); top = stack[stack.length - 1]; }
        if (it.indent > top.indent && top.entries.length) {
            const parent = top.entries[top.entries.length - 1];
            const sub = { ordered: it.ordered, entries: [], indent: it.indent };
            parent.sub = sub;
            stack.push(sub);
            top = sub;
        }
        top.entries.push({ text: it.text });
    }
    return root;
}
