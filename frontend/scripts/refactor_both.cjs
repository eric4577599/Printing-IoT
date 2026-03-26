const fs = require('fs');
const path = require('path');

const targetFile = path.join(__dirname, '../src/pages/SettingsPage.jsx');
let content = fs.readFileSync(targetFile, 'utf8');

// === ADD IMPORTS ===
let importsToAdd = [];
if (!content.includes("import FormulaTab")) importsToAdd.push("import FormulaTab from '../components/settings/FormulaTab';");
if (!content.includes("import CommunicationTab")) importsToAdd.push("import CommunicationTab from '../components/settings/CommunicationTab';");

if (importsToAdd.length > 0) {
    const importPosition = content.indexOf('import styles from \'./SettingsPage.module.css\';');
    content = content.slice(0, importPosition) + importsToAdd.join('\n') + '\n' + content.slice(importPosition);
}

// === REMOVE FORMULA STATE ===
const fStateStart = content.indexOf('    // Formula Constants (Defaults entirely or from localStorage)');
const fStateEnd = content.indexOf('    // --- Communication Settings State ---');
if (fStateStart !== -1 && fStateEnd !== -1) {
    content = content.slice(0, fStateStart) + content.slice(fStateEnd);
}

// === REMOVE COMM STATE ===
// Need to recalculate indexOf because content length changed
const cStateStart = content.indexOf('    // --- Communication Settings State ---');
const cStateEnd = content.indexOf('    // Get global context for simulation');
if (cStateStart !== -1 && cStateEnd !== -1) {
    content = content.slice(0, cStateStart) + content.slice(cStateEnd);
}

// === REMOVE COMM HANDLERS & renderCommunicationTab ===
// I will just use regex to match from "const handleCommChange" to "// --- 公司抬頭設定 State ---"
// BUT wait, isPlcConnected, togglePlcConnection, simulatePlcCount are used BEFORE handleCommChange?
// Actually, they are extracted BEFORE handleCommChange: "const { isPlcConnected, togglePlcConnection, simulatePlcCount } = useOutletContext() || {};"
// This is NOT needed in SettingsPage if nothing else uses it. Wait, does MachineTab use simulatePlcCount?
// Let's just remove from "const { isPlcConnected" to "// --- 公司抬頭設定 State ---"
const commLogicStart = content.indexOf('    // Get global context for simulation');
const commLogicEnd = content.indexOf('    // --- 公司抬頭設定 State ---');
if (commLogicStart !== -1 && commLogicEnd !== -1) {
    content = content.slice(0, commLogicStart) + content.slice(commLogicEnd);
}

// === REMOVE RENDER FORMULA ===
// Since renderFormulaTab was between the states and renderCommunicationTab originally, but wait!
// In original, renderFormulaTab was defined before renderCommunicationTab. But wait! fStateStart removed lines up to cStateStart.
// Where was renderFormulaTab defined in ORIGINAL? It was actually ABOVE the communication state!
// Wait! In the original code (lines 60 to 301) renderFormulaTab WAS the formula state!
// Let's just use regex to replace the function calls in the render block:
content = content.replace(/renderFormulaTab\(\)/g, '<FormulaTab />');
content = content.replace(/renderCommunicationTab\(\)/g, '<CommunicationTab />');

// Remove unused API imports
content = content.replace('    getCommunicationSettings,\n', '');
content = content.replace('    updateCommunicationSettings,\n', '');
content = content.replace('    testMqttConnection, // New import\n', '');

fs.writeFileSync(targetFile, content, 'utf8');
console.log("SettingsPage updated safely.");
