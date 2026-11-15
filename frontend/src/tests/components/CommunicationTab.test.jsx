import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LanguageProvider } from '../../modules/language/LanguageContext';

/**
 * 通訊設定頁:PLC(WISE)與 ERP 的啟用開關、WISE 協定說明列、ERP 的 Mitsubishi Evol 協定與
 * 序列埠(RS-232)連線方式。重點是「操作畫面後,送給後端的 payload 真的變了」。
 */

const getCommunicationSettings = vi.fn();
const updateCommunicationSettings = vi.fn();
vi.mock('../../services/api', () => ({
    getCommunicationSettings: (...a) => getCommunicationSettings(...a),
    updateCommunicationSettings: (...a) => updateCommunicationSettings(...a),
    testMqttConnection: vi.fn(),
}));
vi.mock('react-router-dom', () => ({ useOutletContext: () => ({}) }));

const CommunicationTab = (await import('../../components/settings/CommunicationTab')).default;

const backendSettings = {
    plc_enabled: true, plc_simulate: false, plc_device_type: 'wise', plc_ip: '1.1.1.1', plc_port: 502,
    plc_motor_signal: 'DI-0', plc_count_signal: 'DI-1', mqtt_broker_url: 'b', mqtt_topic: 'Advantech/+/data',
    erp_enabled: true, erp_protocol: 'lmc_flexo', erp_connection_type: 'tcp', erp_host: 'h', erp_port: 3000,
    erp_input_dir: '', erp_output_dir: '', data_log_interval: 300, machine_id: 'M1', mm_base_url: '',
};

const lastPayload = () => updateCommunicationSettings.mock.calls.at(-1)[0];

beforeEach(() => {
    vi.clearAllMocks();
    getCommunicationSettings.mockResolvedValue(backendSettings);
    updateCommunicationSettings.mockResolvedValue({});
    localStorage.clear();
});

const renderTab = async () => {
    render(<LanguageProvider><CommunicationTab /></LanguageProvider>);
    await waitFor(() => expect(getCommunicationSettings).toHaveBeenCalled());
};

describe('CommunicationTab', () => {
    it('WISE 時顯示協定說明列', async () => {
        await renderTab();
        expect(await screen.findByText('MQTT · Advantech WISE-4000')).toBeTruthy();
    });

    it('兩個啟用開關:點 PLC 開關送出 plc_enabled=false,點 ERP 開關送出 erp_enabled=false', async () => {
        await renderTab();
        const switches = await screen.findAllByRole('switch');
        expect(switches).toHaveLength(2);
        expect(switches.map(s => s.getAttribute('aria-checked'))).toEqual(['true', 'true']);

        fireEvent.click(switches[0]);
        await waitFor(() => expect(lastPayload().plc_enabled).toBe(false));
        expect(lastPayload().erp_enabled).toBe(true);

        fireEvent.click(switches[1]);
        await waitFor(() => expect(lastPayload().erp_enabled).toBe(false));
        expect(lastPayload().plc_enabled).toBe(false);
    });

    it('ERP 協定可選 Mitsubishi Evol,並送出 mhi_evol', async () => {
        await renderTab();
        const select = (await screen.findByDisplayValue('LMC Flexo Protocol (@doc/20190323)'));
        fireEvent.change(select, { target: { value: 'mhi_evol' } });
        await waitFor(() => expect(lastPayload().erp_protocol).toBe('mhi_evol'));
    });

    it('連線方式選序列埠:出現參數欄位,預設 9600/8/偶/1,並送出 serial', async () => {
        await renderTab();
        const radios = await screen.findAllByRole('radio');
        const serial = radios.find(r => r.parentElement.textContent.includes('RS-232') || r.parentElement.textContent.includes('序列埠'));
        expect(serial).toBeTruthy();
        fireEvent.click(serial);
        await waitFor(() => expect(lastPayload().erp_connection_type).toBe('serial'));
        const p = lastPayload();
        expect([p.erp_baud_rate, p.erp_data_bits, p.erp_parity, p.erp_stop_bits]).toEqual([9600, 8, 'even', 1]);
        expect(screen.getByPlaceholderText('/dev/ttyUSB0 或 COM1')).toBeTruthy();
    });
});
