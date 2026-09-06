import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const targetFile = path.join(__dirname, '../src/pages/Dashboard.jsx');
let content = fs.readFileSync(targetFile, 'utf8');

// Find the start of Schedule Panel (skip the first comment if it's a duplicate)
const schedulePanelTag = '{/* Schedule Panel */}';
let scheduleStart = content.indexOf(schedulePanelTag);
// Check if there's another one immediately after
let nextSchedule = content.indexOf(schedulePanelTag, scheduleStart + schedulePanelTag.length);
if (nextSchedule !== -1 && (nextSchedule - scheduleStart) < 50) {
    scheduleStart = nextSchedule; 
}

const statusPanelTag = '{/* Status Panel (with Auto Next Toggle) */}';
const statusStart = content.indexOf(statusPanelTag);

const modalTag = '<OrderDetailsModal';
const modalStart = content.indexOf(modalTag);

if (scheduleStart === -1 || statusStart === -1 || modalStart === -1) {
    console.error(`Panels not found: scheduleStart=${scheduleStart}, statusStart=${statusStart}, modalStart=${modalStart}`);
    process.exit(1);
}

// Find the closing div of the status panel before OrderDetailsModal
// It should be the end of the machineStatusPanel div and the splitSection div
const statusBlockRaw = content.slice(statusStart, modalStart);
const lastClosingDiv = statusBlockRaw.lastIndexOf('</div>');
const splitSectionClosingDiv = statusBlockRaw.lastIndexOf('</div>', lastClosingDiv - 1);

if (splitSectionClosingDiv === -1) {
    console.error("Could not find closing divs for StatusPanel");
    process.exit(1);
}

const scheduleBlock = content.slice(scheduleStart, statusStart).trim();
const statusBlock = statusBlockRaw.slice(0, splitSectionClosingDiv + 6).trim();

const scheduleCode = `import React from 'react';
import { useLanguage } from '../../modules/language/LanguageContext';
import styles from '../../pages/Dashboard.module.css';

const SchedulePanel = ({ 
    orders, selectedOrderId, setSelectedOrderId, 
    isContinuousProduction, prepTimeSeconds, thresholdSettings, getPrepTimeColor,
    currentData, resetOffset 
}) => {
    const { t } = useLanguage();

    return (
        <div className={styles.schedulePanel} style={{ position: 'relative' }}>
            ${scheduleBlock.replace('{/* Schedule Panel */}', '').trim()}
        </div>
    );
};

export default SchedulePanel;
`;

const statusCode = `import React from 'react';
import { useLanguage } from '../../modules/language/LanguageContext';
import styles from '../../pages/Dashboard.module.css';

const StatusPanel = ({ 
    autoNext, activeTab, setActiveTab, machineSections,
    currentData, isPlcConnected, isMotorOn, stopReasons 
}) => {
    const { t } = useLanguage();

    return (
        <div className={styles.machineStatusPanel}>
            ${statusBlock.replace(statusPanelTag, '').trim()}
        </div>
    );
};

export default StatusPanel;
`;

fs.mkdirSync(path.join(__dirname, '../src/components/dashboard'), { recursive: true });
fs.writeFileSync(path.join(__dirname, '../src/components/dashboard/SchedulePanel.jsx'), scheduleCode);
fs.writeFileSync(path.join(__dirname, '../src/components/dashboard/StatusPanel.jsx'), statusCode);

// Replace in Dashboard.jsx
// We want to replace from the first Schedule Panel comment to the end of the splitSection div
const firstScheduleStart = content.indexOf(schedulePanelTag);
const replacementEnd = scheduleStart + splitSectionClosingDiv + 6;

let newContent = content.slice(0, firstScheduleStart) + 
`                {/* Schedule Panel - Extracted */}
                <SchedulePanel 
                    orders={orders} selectedOrderId={selectedOrderId} setSelectedOrderId={setSelectedOrderId}
                    isContinuousProduction={isContinuousProduction} prepTimeSeconds={prepTimeSeconds} 
                    thresholdSettings={thresholdSettings} getPrepTimeColor={getPrepTimeColor}
                    currentData={currentData} resetOffset={resetOffset} 
                />
                
                {/* Status Panel - Extracted */}
                <StatusPanel 
                    autoNext={autoNext} activeTab={activeTab} setActiveTab={setActiveTab} 
                    machineSections={machineSections} currentData={currentData} 
                    isPlcConnected={isPlcConnected} isMotorOn={isMotorOn} stopReasons={stopReasons} 
                />
            </div>` + content.slice(modalStart - (statusBlockRaw.length - (splitSectionClosingDiv + 6)));
// Wait, the slice logic above is a bit complex. Let's simplify.
// I want to keep everything from <OrderDetailsModal onwards.

const finalContent = content.slice(0, firstScheduleStart) + 
`                <SchedulePanel 
                    orders={orders} selectedOrderId={selectedOrderId} setSelectedOrderId={setSelectedOrderId}
                    isContinuousProduction={isContinuousProduction} prepTimeSeconds={prepTimeSeconds} 
                    thresholdSettings={thresholdSettings} getPrepTimeColor={getPrepTimeColor}
                    currentData={currentData} resetOffset={resetOffset} 
                />
                
                <StatusPanel 
                    autoNext={autoNext} activeTab={activeTab} setActiveTab={setActiveTab} 
                    machineSections={machineSections} currentData={currentData} 
                    isPlcConnected={isPlcConnected} isMotorOn={isMotorOn} stopReasons={stopReasons} 
                />
            </div>
` + content.slice(modalStart);

// Add imports
if (!finalContent.includes("import SchedulePanel")) {
    const importPos = finalContent.indexOf("import OrderDetailsModal");
    const updatedWithImports = finalContent.slice(0, importPos) + 
        "import SchedulePanel from '../components/dashboard/SchedulePanel';\n" +
        "import StatusPanel from '../components/dashboard/StatusPanel';\n" +
        finalContent.slice(importPos);
    fs.writeFileSync(targetFile, updatedWithImports, 'utf8');
} else {
    fs.writeFileSync(targetFile, finalContent, 'utf8');
}

console.log("Dashboard Panels Extracted Successfully!");
