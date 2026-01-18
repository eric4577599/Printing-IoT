import React from 'react';
import { useLanguage } from './LanguageContext';

const LanguageSwitcher = ({ style }) => {
    const { language, setLanguage } = useLanguage();

    return (
        <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            style={{ padding: '5px', borderRadius: '4px', border: '1px solid #ccc', ...style }}
        >
            <option value="tw">繁體中文</option>
            <option value="cn">简体中文</option>
            <option value="en">English</option>
            <option value="vn">Tiếng Việt</option>
            <option value="th">ไทย</option>
        </select>
    );
};

export default LanguageSwitcher;
