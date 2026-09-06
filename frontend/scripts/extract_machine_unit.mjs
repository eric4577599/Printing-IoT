import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const targetFile = path.join(__dirname, '../src/pages/SettingsPage.jsx');
let content = fs.readFileSync(targetFile, 'utf8');

// The blocks to extract
const unitStateStart = content.indexOf('    // --- Unit Settings State ---');
const machineStateStart = content.indexOf('    // --- Machine Settings State ---');
const reportStateStart = content.indexOf('    // --- Report Settings State ---');

const renderMachineStart = content.indexOf('    const renderMachineTab = () => {');
const renderUnitStart = content.indexOf('    const renderUnitTab = () => (');
const rbacStart = content.indexOf('    // RBAC: Check visibility');

// We will just do a simpler approach:
// 1. Copy out the text needed for UnitTab.jsx and MachineTab.jsx.
// 2. We can just write them by hardcoding the generic wrapper and dumping the state + render chunks.
// Since it's safer to just do string manipulation:

const unitStateCode = content.slice(unitStateStart, machineStateStart);
const machineStateCode = content.slice(machineStateStart, renderMachineStart);
const renderMachineCode = content.slice(renderMachineStart, renderUnitStart);
const renderUnitCode = content.slice(renderUnitStart, reportStateStart);

// Build UnitTab.jsx
const unitTabCode = `import React, { useState } from 'react';
import { useLanguage } from '../../modules/language/LanguageContext';
import styles from '../SettingsPage.module.css';

const UnitTab = () => {
    const { t } = useLanguage();
${unitStateCode}
${renderUnitCode.replace('const renderUnitTab = () => (', 'return (').replace(/;\n$/, '\n;')}
};

export default UnitTab;
`;

// Build MachineTab.jsx
const machineTabCode = `import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../modules/language/LanguageContext';
import styles from '../SettingsPage.module.css';
import {
    getMachineSections,
    createMachineSection,
    updateMachineSection as apiUpdateSection,
    deleteMachineSection as apiDeleteSection,
    getCommunicationSettings, updateCommunicationSettings
} from '../../services/api';

const MachineTab = () => {
    const { t } = useLanguage();
${machineStateCode}
${renderMachineCode.replace('const renderMachineTab = () => {', 'return (').replace(/    return \(/, '        (').replace(/    \};\n$/, '\n')}
};

export default MachineTab;
`;

// It might be a bit misformatted but ESLint/Prettier will fix it. Actually wait, renderMachineTab returns JSX, let's just make it a normal function component:
const machineTabBetterCode = `import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../modules/language/LanguageContext';
import styles from '../SettingsPage.module.css';
import {
    getMachineSections,
    createMachineSection,
    updateMachineSection as apiUpdateSection,
    deleteMachineSection as apiDeleteSection,
    getCommunicationSettings, updateCommunicationSettings
} from '../../services/api';

const MachineTab = () => {
    const { t } = useLanguage();
${machineStateCode}
    // We kept the inner function definition format
${renderMachineCode.replace('const renderMachineTab = () => {', '    // Render block').replace(/    };\n$/, '')}
    return renderMachineTab ? renderMachineTab() : null; // Quick hack if we didn't regex properly
}
// Let's actually just replace it properly:
`;

fs.writeFileSync(path.join(__dirname, '../src/components/settings/UnitTab.jsx'), unitTabCode);
// Re-do MachineTab
const cleanMachine = `import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../modules/language/LanguageContext';
import styles from '../SettingsPage.module.css';
import {
    getMachineSections,
    createMachineSection,
    updateMachineSection as apiUpdateSection,
    deleteMachineSection as apiDeleteSection,
    getCommunicationSettings, updateCommunicationSettings
} from '../../services/api';

const MachineTab = () => {
    const { t } = useLanguage();
${machineStateCode}
${renderMachineCode}
    return renderMachineTab();
};

export default MachineTab;
`;
fs.writeFileSync(path.join(__dirname, '../src/components/settings/MachineTab.jsx'), cleanMachine);

// Update SettingsPage.jsx
let newContent = content;
// Add imports
const importPos = newContent.indexOf("import CommunicationTab");
newContent = newContent.slice(0, importPos) + "import UnitTab from '../components/settings/UnitTab';\nimport MachineTab from '../components/settings/MachineTab';\n" + newContent.slice(importPos);

// Cut out states
newContent = newContent.replace(unitStateCode, '');
newContent = newContent.replace(machineStateCode, '');
newContent = newContent.replace(renderMachineCode, '');
newContent = newContent.replace(renderUnitCode, '');

// Replace renders
newContent = newContent.replace(/{activeTab === 'unit' && renderUnitTab\(\)}/g, "{activeTab === 'unit' && <UnitTab />}");
newContent = newContent.replace(/{activeTab === 'machine' && renderMachineTab\(\)}/g, "{activeTab === 'machine' && <MachineTab />}");

// Remove API imports
newContent = newContent.replace(/    getMachineSections,\n/g, '');
newContent = newContent.replace(/    createMachineSection,\n/g, '');
newContent = newContent.replace(/    updateMachineSection as apiUpdateSection,\n/g, '');
newContent = newContent.replace(/    deleteMachineSection as apiDeleteSection,\n/g, '');

fs.writeFileSync(targetFile, newContent, 'utf8');
console.log("Extraction complete!");
