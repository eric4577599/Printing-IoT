
import puppeteer from 'puppeteer';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Constants
const TARGET_URL = 'http://localhost:5600';
// Updated path to point to frontend/public/help/assets
// We are in frontend/scripts (presumably), so ../public/help/assets
const OUTPUT_DIR = path.join(__dirname, '../public/help/assets');

async function delay(time) {
    return new Promise(function (resolve) {
        setTimeout(resolve, time)
    });
}

(async () => {
    // Launch browser
    const browser = await puppeteer.launch({
        headless: "new",
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        defaultViewport: { width: 1280, height: 800 }
    });

    const page = await browser.newPage();

    console.log('--- Starting Screenshot Capture ---');

    try {
        // 1. Go to Login Page (Root)
        await page.goto(TARGET_URL);
        console.log('Navigated to ' + TARGET_URL);

        // Wait for overlay to appear
        await page.waitForSelector('button', { timeout: 5000 });

        // 2. Perform Login
        // Click on the first user row in the table (OP1)
        // LoginModal.jsx: tr onClick => handleUserRowClick
        console.log('Attempting to select user OP1...');
        const userRow = await page.waitForSelector('table tbody tr:first-child');
        if (userRow) {
            await userRow.click();
            await delay(500);

            // Click "Select" (Login) button
            // It has text "選取 (Select)"
            const buttons = await page.$$('button');
            for (const btn of buttons) {
                const text = await page.evaluate(el => el.textContent, btn);
                if (text.includes('選取')) {
                    await btn.click();
                    console.log('Clicked Login button.');
                    break;
                }
            }
        } else {
            console.error('User row not found!');
        }

        // Wait for Dashboard to load (checking for "Monitor" or F1 button)
        await page.waitForNavigation({ waitUntil: 'networkidle0' }).catch(() => { });
        await delay(2000); // Wait for animations

        // 3. CAPTURE DASHBOARD
        console.log('Capturing Dashboard...');
        await page.screenshot({ path: path.join(OUTPUT_DIR, 'dashboard.png') });

        // 4. CAPTURE SCHEDULE
        // Click "Production Schedule" Link/Button. 
        // In MainLayout, it's usually in the sidebar. url: /schedule
        console.log('Navigating to Schedule...');
        await page.goto(`${TARGET_URL}/schedule`);
        await delay(2000);
        console.log('Capturing Schedule...');
        await page.screenshot({ path: path.join(OUTPUT_DIR, 'schedule.png') });

        // 5. CAPTURE MAINTENANCE
        // url: /maintenance
        console.log('Navigating to Maintenance...');
        await page.goto(`${TARGET_URL}/maintenance`);
        await delay(2000);

        // Switch to "Schedule" tab (Text: ⏰ 保養排程)
        const tabs = await page.$$('button');
        for (const tab of tabs) {
            const text = await page.evaluate(el => el.textContent, tab);
            if (text.includes('保養排程')) {
                await tab.click();
                console.log('Switched to Schedule Tab.');
                await delay(500);
                break;
            }
        }

        // In this tab, we should see the form "MaintenanceScheduleForm" immediately 
        // OR we see a list and "Save Schedule".
        // MaintenancePage.jsx logic: Case 'schedule': renders MaintenanceScheduleForm directly?
        // Let's check MachineMaintenance.jsx logic:
        // case 'schedule': returns <MaintenanceScheduleForm ... />
        // So the form IS visible.

        console.log('Capturing Maintenance Form...');
        // We might want to capture just the form area, but user asked for "screen". Full page is fine.
        await page.screenshot({ path: path.join(OUTPUT_DIR, 'maintenance.png') });

        console.log('--- All Screenshots Captured Automatically ---');

    } catch (e) {
        console.error('Error capturing screenshots:', e);
    } finally {
        await browser.close();
    }
})();
