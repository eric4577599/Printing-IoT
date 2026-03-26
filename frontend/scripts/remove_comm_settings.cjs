const fs = require('fs');
const path = require('path');

const targetFile = path.join(__dirname, '../src/pages/SettingsPage.jsx');
let content = fs.readFileSync(targetFile, 'utf8');

// 1. imports to remove/add
if (!content.includes("import CommunicationTab")) {
    const importPos = content.indexOf('import FormulaTab');
    content = content.slice(0, importPos) + "import CommunicationTab from '../components/settings/CommunicationTab';\n" + content.slice(importPos);
}

// 2. Remove states
const stateStart = content.indexOf('    // --- Communication Settings State ---');
const stateEnd = content.indexOf('    // Get global context for simulation');

if (stateStart !== -1 && stateEnd !== -1) {
    content = content.slice(0, stateStart) + content.slice(stateEnd);
}

// 3. Remove handleCommChange
const handleStart = content.indexOf('    const handleCommChange = async (section, key, value) => {');
const renderStart = content.indexOf('    const renderCommunicationTab = () => (');
if (handleStart !== -1 && renderStart !== -1) {
    // There is a '    const { isPlcConnected...' before handleCommChange that we must keep?
    // In SettingsPage.jsx, it looks like:
    // const { isPlcConnected, togglePlcConnection, simulatePlcCount } = useOutletContext() || {};
    // const handleCommChange = async...
    content = content.slice(0, handleStart) + content.slice(renderStart);
}

// 4. Remove renderCommunicationTab
const renderEnd = content.indexOf('    // --- 公司抬頭設定 State ---');
if (renderStart !== -1 && renderEnd !== -1) {
    content = content.slice(0, renderStart) + content.slice(renderEnd);
}

// 5. Replace usage
content = content.replace(/renderCommunicationTab\(\)/g, '<CommunicationTab />');

// 6. Remove unused API imports from SettingsPage
content = content.replace('    getCommunicationSettings,\n', '');
content = content.replace('    updateCommunicationSettings,\n', '');
content = content.replace('    testMqttConnection, // New import\n', '');

fs.writeFileSync(targetFile, content, 'utf8');
console.log("SettingsPage updated successfully - CommunicationTab extracted.");
