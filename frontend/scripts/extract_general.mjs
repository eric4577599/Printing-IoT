import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const targetFile = path.join(__dirname, '../src/pages/SettingsPage.jsx');
let content = fs.readFileSync(targetFile, 'utf8');

const startTag = '    // --- 公司抬頭設定 State ---';
const endTag = '    // --- Box Type State ---';

const startIndex = content.indexOf(startTag);
const endIndex = content.indexOf(endTag);

if (startIndex === -1 || endIndex === -1) {
    console.error("Tags not found");
    process.exit(1);
}

const generalBlock = content.slice(startIndex, endIndex);

const renderStart = '    const renderGeneralTab = () => (';
const renderEndIndex = generalBlock.indexOf('    // --- Reason State (Kept here) ---');

if (generalBlock.indexOf(renderStart) === -1) {
    console.error("renderGeneralTab not found");
    process.exit(1);
}

const blockA = generalBlock.slice(0, generalBlock.indexOf(renderStart));
const renderBlock = generalBlock.slice(generalBlock.indexOf(renderStart), renderEndIndex);
const blockB = generalBlock.slice(renderEndIndex);

const generalTabCode = `import React, { useState } from 'react';
import { useLanguage } from '../../modules/language/LanguageContext';
import styles from '../SettingsPage.module.css';

const GeneralTab = () => {
    const { t } = useLanguage();

${blockA}
${blockB}

    // --- Render Logic ---
${renderBlock.replace('    const renderGeneralTab = () => (', '    return (')}
};

export default GeneralTab;
`;

fs.writeFileSync(path.join(__dirname, '../src/components/settings/GeneralTab.jsx'), generalTabCode);

let newContent = content.slice(0, startIndex) + content.slice(endIndex);

const importPos = newContent.indexOf("import UnitTab");
if (importPos !== -1) {
    newContent = newContent.slice(0, importPos) + "import GeneralTab from '../components/settings/GeneralTab';\n" + newContent.slice(importPos);
}

newContent = newContent.replace(/{activeTab === 'general' && renderGeneralTab\\(\\)}/g, "{activeTab === 'general' && <GeneralTab />}");

fs.writeFileSync(targetFile, newContent, 'utf8');
console.log("GeneralTab extracted securely!");
