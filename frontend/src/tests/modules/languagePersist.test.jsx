/**
 * 語言選擇保存 + 分析頁單位翻譯齊全
 * 輸入:localStorage 內容 / 切換語言;輸出:重新掛載後仍是上次選擇,壞值退回繁中。
 */
import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { LanguageProvider, useLanguage, translations } from '../../modules/language/LanguageContext';

const KEY = 'printingiot.language';
const Probe = () => {
    const { language, setLanguage } = useLanguage();
    return (
        <>
            <span data-testid="lang">{language}</span>
            <button onClick={() => setLanguage('en')}>to-en</button>
        </>
    );
};
const mount = () => render(<LanguageProvider><Probe /></LanguageProvider>);

describe('語言選擇保存', () => {
    beforeEach(() => { localStorage.clear(); });

    it('沒有保存值時預設繁體中文', () => {
        mount();
        expect(screen.getByTestId('lang').textContent).toBe('tw');
    });

    it('切換語言後寫入,重新掛載仍是該語言', () => {
        const first = mount();
        act(() => { screen.getByText('to-en').click(); });
        expect(localStorage.getItem(KEY)).toBe('en');
        first.unmount();
        mount();
        expect(screen.getByTestId('lang').textContent).toBe('en');
    });

    it('保存值不是支援的語言時退回繁體中文', () => {
        localStorage.setItem(KEY, 'xx');
        mount();
        expect(screen.getByTestId('lang').textContent).toBe('tw');
    });
});

describe('分析頁單位與日期標籤', () => {
    it.each(Object.keys(translations))('%s 具備 startLabel / endLabel / units 全部鍵', (lang) => {
        const a = translations[lang].analysis;
        expect(a.startLabel).toBeTruthy();
        expect(a.endLabel).toBeTruthy();
        for (const k of ['sheets', 'sheetsPerMin', 'records', 'hours', 'minShort', 'minLong']) {
            expect(a.units[k], `${lang}.analysis.units.${k}`).toBeTruthy();
        }
    });
});
