/**
 * markdownRender — 文件頁用的輕量 Markdown 渲染器
 *
 * 為什麼自寫:原本文件頁把 Markdown 原文塞進 <pre>,圖片、表格、清單全都看不到。
 * 專案紀律是不主動加相依套件,所以只實作文件實際用到的語法,輸出 **React 元素**
 * (不用 dangerouslySetInnerHTML),文件內容裡的 HTML 標籤一律當純文字顯示,不會被執行。
 *
 * 支援:標題、段落(換行保留為 <br>)、引用、有序/無序清單(可巢狀、任務清單)、
 *       GFM 表格、圍欄程式碼區塊、分隔線、圖片、連結、粗體、斜體、行內程式碼。
 * 安全:連結只放行 http(s) / mailto / 頁內錨點;圖片只接受 doc/pic 內由建置收進來的檔案
 *       (resolveImage 回傳 null 就顯示替代文字),不載入任何外部圖片。
 */
import React from 'react';
import { slugify, parseBlocks } from './markdownParse';

// ───────────────────────── 行內語法 ─────────────────────────

const SAFE_HREF = /^(https?:\/\/|mailto:|#)/i;

/**
 * 解析行內語法
 * @param {string} text - 一段行內文字
 * @param {Object} ctx - { resolveImage, keyPrefix }
 * @returns {Array<React.ReactNode>} React 節點陣列
 * @description 依序處理:行內程式碼 → 圖片 → 連結 → 粗體 → 斜體。
 *              以單一 regex 由左到右掃,避免後面的規則誤吃前面已處理的內容。
 */
function parseInline(text, ctx = {}) {
    const nodes = [];
    const re = /(`+)([\s\S]*?[^`])\1(?!`)|!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)|\[([^\]]+)\]\(([^)\s]+)(?:\s+"[^"]*")?\)|\*\*([\s\S]+?)\*\*|__([\s\S]+?)__|(?<![*\w])\*([^*\s][^*]*?)\*(?!\*)/g;
    let last = 0;
    let m;
    let i = 0;
    const kp = ctx.keyPrefix || 'i';
    while ((m = re.exec(text)) !== null) {
        if (m.index > last) nodes.push(text.slice(last, m.index));
        const key = `${kp}-${i++}`;
        if (m[2] !== undefined) {
            nodes.push(<code key={key} style={codeInlineStyle}>{m[2]}</code>);
        } else if (m[4] !== undefined) {
            const src = ctx.resolveImage ? ctx.resolveImage(m[4]) : null;
            nodes.push(src
                ? (
                    <a key={key} href={src} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-block', maxWidth: '100%' }}>
                        <img src={src} alt={m[3]} title={m[5] || m[3]} loading="lazy" style={imgStyle} />
                    </a>
                )
                : <span key={key} style={missingImgStyle}>[圖片:{m[3] || m[4]}]</span>);
        } else if (m[7] !== undefined) {
            const href = m[7];
            const inner = parseInline(m[6], { ...ctx, keyPrefix: key });
            nodes.push(SAFE_HREF.test(href)
                ? (
                    <a key={key} href={href}
                        {...(href.startsWith('#') ? { onClick: (e) => jumpToAnchor(e, href) } : { target: '_blank', rel: 'noopener noreferrer' })}
                        style={{ color: 'var(--primary-blue, #1976d2)' }}>
                        {inner}
                    </a>
                )
                : <span key={key}>{inner}</span>);
        } else if (m[8] !== undefined || m[9] !== undefined) {
            nodes.push(<strong key={key}>{parseInline(m[8] ?? m[9], { ...ctx, keyPrefix: key })}</strong>);
        } else if (m[10] !== undefined) {
            nodes.push(<em key={key}>{parseInline(m[10], { ...ctx, keyPrefix: key })}</em>);
        }
        last = re.lastIndex;
    }
    if (last < text.length) nodes.push(text.slice(last));
    return nodes;
}

/** 頁內錨點:捲到對應標題,不改網址(避免被路由吃掉) */
function jumpToAnchor(e, href) {
    e.preventDefault();
    const id = decodeURIComponent(href.slice(1));
    const el = document.getElementById(id) || document.getElementById(slugify(id));
    if (el && el.scrollIntoView) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ───────────────────────── 樣式 ─────────────────────────

const codeInlineStyle = { background: 'rgba(127,127,127,0.15)', padding: '1px 5px', borderRadius: '4px', fontSize: '0.9em', fontFamily: 'ui-monospace, Menlo, Consolas, monospace' };
const imgStyle = { maxWidth: '100%', height: 'auto', border: '1px solid var(--border-color, #e0e0e0)', borderRadius: '6px', display: 'block' };
const missingImgStyle = { color: '#b26a00', background: '#fff8e1', padding: '1px 6px', borderRadius: '4px' };
const cellStyle = { border: '1px solid var(--border-color, #d0d7de)', padding: '6px 10px', verticalAlign: 'top' };

// ───────────────────────── 渲染 ─────────────────────────

/** 任務清單:「[ ] 」「[x] 」換成方框符號 */
function withTaskMark(text) {
    const m = text.match(/^\[([ xX])\]\s+([\s\S]*)$/);
    return m ? `${m[1] === ' ' ? '☐' : '☑'} ${m[2]}` : text;
}

function renderList(list, ctx, key) {
    const Tag = list.ordered ? 'ol' : 'ul';
    return (
        <Tag key={key} style={{ margin: '0.4em 0', paddingLeft: '1.6em' }}>
            {list.entries.map((e, idx) => (
                <li key={`${key}-${idx}`} style={{ margin: '0.15em 0' }}>
                    {renderLines(withTaskMark(e.text), { ...ctx, keyPrefix: `${key}-${idx}` })}
                    {e.sub && renderList(e.sub, ctx, `${key}-${idx}s`)}
                </li>
            ))}
        </Tag>
    );
}

/** 含換行的行內文字:換行保留為 <br> */
function renderLines(text, ctx) {
    const out = [];
    text.split('\n').forEach((ln, idx) => {
        if (idx > 0) out.push(<br key={`br-${idx}`} />);
        out.push(...parseInline(ln, { ...ctx, keyPrefix: `${ctx.keyPrefix || 'l'}-${idx}` }));
    });
    return out;
}

function renderBlocks(blocks, ctx, kp = 'b') {
    return blocks.map((b, idx) => {
        const key = `${kp}-${idx}`;
        switch (b.type) {
            case 'heading': {
                const Tag = `h${Math.min(b.level + 1, 6)}`; // 頁面標題已佔 h2,內文 # 從 h3 起
                return (
                    <Tag key={key} id={slugify(b.text)} style={{ margin: '1.4em 0 0.5em', scrollMarginTop: '12px' }}>
                        {renderLines(b.text, { ...ctx, keyPrefix: key })}
                    </Tag>
                );
            }
            case 'paragraph': {
                // 只含單張圖片的段落 → 當圖說(figure)
                const only = b.text.trim().match(/^!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)$/);
                if (only && ctx.resolveImage) {
                    const src = ctx.resolveImage(only[2]);
                    if (src) {
                        return (
                            <figure key={key} style={{ margin: '1em 0' }}>
                                <a href={src} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-block', maxWidth: '100%' }}>
                                    <img src={src} alt={only[1]} loading="lazy" style={imgStyle} />
                                </a>
                                {(only[3] || only[1]) && (
                                    <figcaption style={{ fontSize: '0.85rem', color: 'var(--text-secondary, #666)', marginTop: '4px' }}>
                                        {only[3] || only[1]}
                                    </figcaption>
                                )}
                            </figure>
                        );
                    }
                }
                return <p key={key} style={{ margin: '0.6em 0' }}>{renderLines(b.text, { ...ctx, keyPrefix: key })}</p>;
            }
            case 'code':
                return (
                    <pre key={key} style={{ background: '#f6f8fa', border: '1px solid #e1e4e8', borderRadius: '6px', padding: '12px', overflowX: 'auto', fontSize: '0.85rem', lineHeight: 1.5, margin: '0.8em 0' }}>
                        <code style={{ fontFamily: 'ui-monospace, Menlo, Consolas, monospace' }}>{b.text}</code>
                    </pre>
                );
            case 'quote':
                return (
                    <blockquote key={key} style={{ margin: '0.8em 0', padding: '4px 14px', borderLeft: '4px solid #90caf9', background: 'rgba(25,118,210,0.05)', color: 'inherit' }}>
                        {renderBlocks(b.children, ctx, key)}
                    </blockquote>
                );
            case 'list':
                return renderList(b.items, ctx, key);
            case 'table':
                return (
                    <div key={key} style={{ overflowX: 'auto', margin: '0.8em 0' }}>
                        <table style={{ borderCollapse: 'collapse', fontSize: '0.92rem' }}>
                            <thead>
                                <tr>{b.header.map((h, c) => (
                                    <th key={c} style={{ ...cellStyle, background: 'rgba(25,118,210,0.08)', textAlign: b.aligns[c] || 'left' }}>
                                        {parseInline(h, { ...ctx, keyPrefix: `${key}-h${c}` })}
                                    </th>
                                ))}</tr>
                            </thead>
                            <tbody>
                                {b.rows.map((row, r) => (
                                    <tr key={r}>{row.map((cell, c) => (
                                        <td key={c} style={{ ...cellStyle, textAlign: b.aligns[c] || 'left' }}>
                                            {renderLines(cell.replace(/<br\s*\/?>/gi, '\n'), { ...ctx, keyPrefix: `${key}-${r}-${c}` })}
                                        </td>
                                    ))}</tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                );
            case 'hr':
                return <hr key={key} style={{ border: 0, borderTop: '1px solid var(--border-color, #e0e0e0)', margin: '1.4em 0' }} />;
            default:
                return null;
        }
    });
}

/**
 * 文件渲染元件
 * @param {Object} props
 * @param {string} props.source - Markdown 原文
 * @param {(src: string) => string|null} [props.resolveImage] - 把文件內的圖片路徑換成可載入的網址;
 *        回傳 null 表示不載入(顯示替代文字)。省略時一律不載入圖片。
 */
export function MarkdownView({ source, resolveImage }) {
    const blocks = React.useMemo(() => parseBlocks(source), [source]);
    return <div className="md-view">{renderBlocks(blocks, { resolveImage })}</div>;
}

export default MarkdownView;
