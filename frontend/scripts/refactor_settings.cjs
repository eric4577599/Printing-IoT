const fs = require('fs');
const path = require('path');

const targetFile = path.join(__dirname, '../src/pages/SettingsPage.jsx');
let content = fs.readFileSync(targetFile, 'utf8');

// 1. Remove formula states and renderFormulaTab
const formulaStart = content.indexOf('    // Formula Constants (Defaults entirely or from localStorage)');
const formulaEnd = content.indexOf('    // --- Communication Settings State ---');
if (formulaStart !== -1 && formulaEnd !== -1) {
    content = content.slice(0, formulaStart) + content.slice(formulaEnd);
}

// 2. Add import FormulaTab
if (!content.includes("import FormulaTab")) {
    const importPosition = content.indexOf('import styles from \'./SettingsPage.module.css\';');
    content = content.slice(0, importPosition) + "import FormulaTab from '../components/settings/FormulaTab';\n" + content.slice(importPosition);
}

// 3. Replace renderFormulaTab() with <FormulaTab />
content = content.replace(/renderFormulaTab\(\)/g, '<FormulaTab />');

fs.writeFileSync(targetFile, content, 'utf8');
console.log("SettingsPage.jsx updated successfully - FormulaTab extracted.");
