/**
 * Locale Index — 翻譯模組索引
 *
 * 集中管理所有語系，方便新增語言。
 * 完整翻譯內容已從 LanguageContext.jsx (原 1085 行) 分離至獨立模組。
 *
 * 新增語言步驟：
 * 1. 在 locales/ 目錄新增 xx.js (複製 tw.js 作為範本)
 * 2. 在此索引 import 並註冊
 * 3. LanguageSwitcher 會自動出現新選項
 */
import tw from './tw.js';

// cn, en, vn, th 仍維持在 LanguageContext.jsx 內的 translations 物件中
// 待完全遷移後可移除 LanguageContext 內的翻譯

export const locales = {
  tw,
  // Future: import and register cn, en, vn, th here
};

export const availableLanguages = [
  { code: 'tw', label: '繁體中文' },
  { code: 'cn', label: '简体中文' },
  { code: 'en', label: 'English' },
  { code: 'vn', label: 'Tiếng Việt' },
  { code: 'th', label: 'ภาษาไทย' },
];
