import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const targetFile = path.join(__dirname, '../src/pages/SettingsPage.jsx');
let content = fs.readFileSync(targetFile, 'utf8');

const boxTypeStart = content.indexOf('    // --- Box Type State ---');
const reportStart = content.indexOf('    // --- Report Settings State ---');
const rbacStart = content.indexOf('    // RBAC: Check visibility');

const renderBoxStart = '    const renderBoxTypeTab = () => {';
const renderReportStart = '    const renderReportTab = () => (';

// --- Extract BoxTypeTab ---
const boxBlock = content.slice(boxTypeStart, reportStart);
const bState = boxBlock.slice(0, boxBlock.indexOf(renderBoxStart));
const bRender = boxBlock.slice(boxBlock.indexOf(renderBoxStart));

const boxTypeTabCode = `import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../modules/language/LanguageContext';
import styles from '../SettingsPage.module.css';
import { getBoxTypes, updateBoxTypes } from '../../services/api';

const BoxTypeTab = () => {
    const { t } = useLanguage();

${bState}
    // --- Render Logic ---
${bRender.replace('    const renderBoxTypeTab = () => {', '    // Render\\n').replace(/    }\\n?$/, '')}
    return renderBoxTypeTab();
};

export default BoxTypeTab;
`;
fs.writeFileSync(path.join(__dirname, '../src/components/settings/BoxTypeTab.jsx'), boxTypeTabCode);

// --- Extract ReportTab ---
const reportBlock = content.slice(reportStart, rbacStart);
const rState = reportBlock.slice(0, reportBlock.indexOf(renderReportStart));
const rRender = reportBlock.slice(reportBlock.indexOf(renderReportStart));

const reportTabCode = `import React, { useState } from 'react';
import { useLanguage } from '../../modules/language/LanguageContext';
import styles from '../SettingsPage.module.css';

const ReportTab = () => {
    const { t } = useLanguage();

${rState}
    // --- Render Logic ---
${rRender.replace('    const renderReportTab = () => (', '    return (')}
};

export default ReportTab;
`;
fs.writeFileSync(path.join(__dirname, '../src/components/settings/ReportTab.jsx'), reportTabCode);

// --- Update SettingsPage ---
let newContent = content.slice(0, boxTypeStart) + content.slice(rbacStart);

const importPos = newContent.indexOf("import GeneralTab");
if (importPos !== -1) {
    newContent = newContent.slice(0, importPos) + "import BoxTypeTab from '../components/settings/BoxTypeTab';\\nimport ReportTab from '../components/settings/ReportTab';\\n" + newContent.slice(importPos);
}

newContent = newContent.replace("{activeTab === 'boxType' && (canSeeBoxType ? renderBoxTypeTab() : <div className={styles.tabContent}>Access Denied</div>)}", "{activeTab === 'boxType' && (canSeeBoxType ? <BoxTypeTab /> : <div className={styles.tabContent}>Access Denied</div>)}");
newContent = newContent.replace("{activeTab === 'report' && renderReportTab()}", "{activeTab === 'report' && <ReportTab />}");

// remove unused api
newContent = newContent.replace(/    getBoxTypes, updateBoxTypes\\n/g, '');

fs.writeFileSync(targetFile, newContent, 'utf8');
console.log("BoxTypeTab & ReportTab extracted securely!");
