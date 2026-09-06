import React, { useState, useRef, useEffect } from 'react';
import { useLanguage } from './LanguageContext';

// 語言切換 nav 選單:點導覽列「語言」展開下拉,選任一語言即時同步切換全站
// (與右上角 <select> 共用同一個 LanguageContext,故所有頁面即時同步更換)。
const LANGS = [
    { code: 'tw', label: '繁體中文' },
    { code: 'cn', label: '简体中文' },
    { code: 'en', label: 'English' },
    { code: 'vn', label: 'Tiếng Việt' },
    { code: 'th', label: 'ไทย' },
];

const LanguageNavMenu = ({ className }) => {
    const { language, setLanguage, t } = useLanguage();
    const [open, setOpen] = useState(false);
    const ref = useRef(null);

    // 點選單以外處即關閉
    useEffect(() => {
        const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
        document.addEventListener('mousedown', onDoc);
        return () => document.removeEventListener('mousedown', onDoc);
    }, []);

    return (
        <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
            <button
                type="button"
                className={className}
                onClick={() => setOpen(o => !o)}
                aria-haspopup="listbox"
                aria-expanded={open}
                data-testid="language-nav-button"
                style={{ background: 'none', border: 'none', cursor: 'pointer', font: 'inherit', color: 'inherit' }}
            >
                🌐 {t('nav.language')} ▾
            </button>
            {open && (
                <ul
                    role="listbox"
                    style={{
                        position: 'absolute', top: '100%', right: 0, margin: '4px 0 0', padding: '4px 0',
                        listStyle: 'none', background: '#fff', border: '1px solid #ccc', borderRadius: '6px',
                        boxShadow: '0 4px 12px rgba(0,0,0,.15)', zIndex: 1000, minWidth: '150px',
                    }}
                >
                    {LANGS.map((l) => (
                        <li
                            key={l.code}
                            role="option"
                            aria-selected={language === l.code}
                            onClick={() => { setLanguage(l.code); setOpen(false); }}
                            style={{
                                padding: '8px 16px', cursor: 'pointer', whiteSpace: 'nowrap',
                                fontWeight: language === l.code ? 700 : 400,
                                background: language === l.code ? '#eef4ff' : 'transparent', color: '#1d2833',
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = '#f0f4f9'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = language === l.code ? '#eef4ff' : 'transparent'; }}
                        >
                            {l.label}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

export default LanguageNavMenu;
