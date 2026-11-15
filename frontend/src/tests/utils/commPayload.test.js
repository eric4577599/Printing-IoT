import { describe, it, expect } from 'vitest';
import { buildCommPayload, COMM_PAYLOAD_KEYS } from '../../utils/commPayload';

/**
 * 回歸釘樁:通訊設定 payload 不得再漏欄位。
 *
 * 後端 `UpdateCommunicationSettingsAsync` 是**整包覆寫** Redis ——
 * 送什麼存什麼、沒送的鍵直接消失。而原本有四處各自手寫 payload、
 * 各漏不同欄位:按一次「儲存」就會把 plc_monitor_interval 與兩個 mqtt 欄位洗掉。
 * 「修正 #9」修過其中一處但沒拿掉成因(手寫四次),於是復發。
 *
 * 本檔釘住:欄位集合固定,且每個欄位都真的從設定取值。
 */

const full = {
    plc: {
        enabled: true, simulate: false, deviceType: 'wise', ip: '192.168.1.1', port: 502,
        motorSignal: 'DI-0', countSignal: 'DI-1', monitor_interval: 1.5,
        mqttBroker: 'broker.example', mqttTopic: 'Advantech/+/data',
        serialPort: '/dev/ttyUSB0', baudRate: 9600, dataBits: 8, parity: 'even', stopBits: 1,
    },
    erp: {
        enabled: true, protocol: 'lmc_flexo', connectionType: 'tcp',
        host: '192.168.1.100', port: 3000, inputDir: '/in', outputDir: '/out',
    },
    dataLogInterval: 6,
    machineId: 'M20',
    mmBaseUrl: 'https://mms.ericchh.work',
};

describe('buildCommPayload', () => {
    it('送出全部欄位,一個都不漏', () => {
        expect(Object.keys(buildCommPayload(full)).sort()).toEqual([...COMM_PAYLOAD_KEYS].sort());
    });

    it('曾經被漏掉的三個欄位都在(這就是那個 bug)', () => {
        const p = buildCommPayload(full);
        expect(p.plc_monitor_interval).toBe(1.5);
        expect(p.mqtt_broker_url).toBe('broker.example');
        expect(p.mqtt_topic).toBe('Advantech/+/data');
    });

    it('設備類型選 Mitsubishi Evol(mhi_evol)時原樣送出,不被改寫', () => {
        const p = buildCommPayload({ ...full, plc: { ...full.plc, deviceType: 'mhi_evol' } });
        expect(p.plc_device_type).toBe('mhi_evol');
    });

    it('序列埠(RS-232)連線參數屬於設備(plc_*),ERP 不再帶這些鍵', () => {
        const p = buildCommPayload(full);
        expect(p.plc_serial_port).toBe('/dev/ttyUSB0');
        expect(p.plc_baud_rate).toBe(9600);
        expect(p.plc_data_bits).toBe(8);
        expect(p.plc_parity).toBe('even');
        expect(p.plc_stop_bits).toBe(1);
        expect(Object.keys(p).filter(k => k.startsWith('erp_') && /serial|baud|parity|stop_bits|data_bits/.test(k))).toEqual([]);
    });

    it('機台識別碼與 MM 網址都送得出去', () => {
        const p = buildCommPayload(full);
        expect(p.machine_id).toBe('M20');
        expect(p.mm_base_url).toBe('https://mms.ericchh.work');
    });

    it('每個欄位都取自設定,不是寫死的', () => {
        const p = buildCommPayload(full);
        expect(p.plc_ip).toBe('192.168.1.1');
        expect(p.erp_output_dir).toBe('/out');
        expect(p.data_log_interval).toBe(6);
    });

    it('殘缺的設定不會炸,鍵仍然齊全 —— 少送等於刪掉,所以鍵必須在', () => {
        for (const s of [{}, null, undefined, { plc: {} }]) {
            expect(Object.keys(buildCommPayload(s)).sort()).toEqual([...COMM_PAYLOAD_KEYS].sort());
        }
    });

    it('未設定 MM 網址時送空字串,不是 undefined(undefined 會被 JSON 丟掉)', () => {
        expect(buildCommPayload({}).mm_base_url).toBe('');
        expect(JSON.parse(JSON.stringify(buildCommPayload({})))).toHaveProperty('mm_base_url');
    });
});
