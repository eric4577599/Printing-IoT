import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { LanguageProvider } from '../../modules/language/LanguageContext';
import StatusPanel from '../../components/dashboard/StatusPanel';

/**
 * StatusPanel 機台部位狀態燈回歸測試
 *
 * 對應 UI 稽核 #5 + Eric 指示(WISE DI 保留模擬、部位 DI 可設定、預設參數):
 * - 只配置故障訊號(errorSignal,如 di3~di10)且無 runSignal 的部位:
 *   未故障 + 機台運轉 → RUN;停機 → OFF;對應 DI 達故障值 → ERR。
 *   修正前:此類部位因 currentData 無該 DI 值,恆顯示灰色 OFF。
 */

/**
 * 以指定機台部位與即時資料渲染 StatusPanel(status 分頁)
 * 輸入:sections - 機台部位陣列;currentData - 即時訊號;isMotorOn/isPlcConnected - 機台狀態
 * 輸出:baseElement 供斷言狀態文字(RUN/ERR/OFF)
 * 邏輯:StatusPanel 文字採 i18n,需包 LanguageProvider;固定 activeTab='status'
 */
const renderPanel = (sections, currentData, { isMotorOn = true, isPlcConnected = true } = {}) =>
    render(
        <LanguageProvider>
            <StatusPanel
                autoNext={true}
                activeTab="status"
                setActiveTab={() => { }}
                machineSections={sections}
                currentData={currentData}
                isPlcConnected={isPlcConnected}
                isMotorOn={isMotorOn}
                stopReasons={[]}
            />
        </LanguageProvider>
    );

// 預設部位:只配置故障訊號 di3=1(等同 MachineTab 種入的預設)
const faultOnlySection = { id: 's1', name: '送止步', displayOrder: 1, errorSignal: 'di3', errorValue: '1' };

describe('StatusPanel 機台部位狀態燈', () => {
    it('只配故障訊號的部位:未故障 + 運轉中 → RUN', () => {
        const { baseElement } = renderPanel([faultOnlySection], { di3: 0 }, { isMotorOn: true });
        expect(baseElement.textContent).toContain('RUN');
        expect(baseElement.textContent).not.toContain('ERR');
    });

    it('只配故障訊號的部位:停機 → OFF', () => {
        const { baseElement } = renderPanel([faultOnlySection], { di3: 0 }, { isMotorOn: false });
        expect(baseElement.textContent).toContain('OFF');
        expect(baseElement.textContent).not.toContain('RUN');
    });

    it('對應 DI 達故障值 → ERR(紅燈)', () => {
        const { baseElement } = renderPanel([faultOnlySection], { di3: 1 }, { isMotorOn: true });
        expect(baseElement.textContent).toContain('ERR');
    });

    it('PLC 斷線視同停機 → OFF', () => {
        const { baseElement } = renderPanel([faultOnlySection], { di3: 0 }, { isMotorOn: true, isPlcConnected: false });
        expect(baseElement.textContent).toContain('OFF');
    });

    it('未配置任何訊號的部位:跟隨全域 motor(運轉 → RUN)', () => {
        const plain = { id: 's2', name: '計數部', displayOrder: 1 };
        const { baseElement } = renderPanel([plain], {}, { isMotorOn: true });
        expect(baseElement.textContent).toContain('RUN');
    });
});
