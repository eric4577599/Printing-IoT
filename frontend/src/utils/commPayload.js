// 通訊設定送出 payload 的單一來源(P1)。
//
// 為什麼需要它:後端 `UpdateCommunicationSettingsAsync` 是**整包覆寫** Redis 的字串,
// 送什麼就存什麼、沒送的鍵直接消失。而 CommunicationTab 原本有**四處**各自手寫 payload,
// 且四處遺漏的欄位還不一樣:
//
//   - 定時寫入間隔那處:少 mqtt_broker_url / mqtt_topic / machine_id
//   - PLC 欄位那處:少 machine_id
//   - 機台識別碼那處:少 mqtt_broker_url / mqtt_topic
//   - 「儲存」按鈕那處:少 plc_monitor_interval **與** 兩個 mqtt 欄位
//
// 也就是說按一次「儲存」就會把監控頻率與 MQTT 設定洗掉。
// 「修正 #9」修過其中一處,但沒有拿掉「同一份 payload 手寫四次」這個成因,於是復發。
//
// 本模組把它收斂成一個函式:**新增欄位只會有一個地方要改**。

/**
 * 由完整的通訊設定狀態產生送給後端的 payload
 * @param {Object} s - CommunicationTab 的 commSettings 完整狀態
 * @returns {Object} 後端 `/settings/communication` 的 payload(snake_case)
 * @description 一律送出**全部欄位**。後端整包覆寫,少送一個等於刪掉一個 ——
 *              所以這裡不做「只送有變的欄位」那種最佳化,那正是原本的災難來源。
 */
export function buildCommPayload(s) {
    const plc = s?.plc ?? {};
    const erp = s?.erp ?? {};

    return {
        plc_enabled: plc.enabled,
        plc_simulate: plc.simulate,
        plc_device_type: plc.deviceType,
        plc_ip: plc.ip,
        plc_port: plc.port,
        plc_motor_signal: plc.motorSignal,
        plc_count_signal: plc.countSignal,
        plc_monitor_interval: plc.monitor_interval,
        mqtt_broker_url: plc.mqttBroker,
        mqtt_topic: plc.mqttTopic,

        erp_enabled: erp.enabled,
        erp_protocol: erp.protocol,
        erp_connection_type: erp.connectionType,
        erp_host: erp.host,
        erp_port: erp.port,
        erp_input_dir: erp.inputDir,
        erp_output_dir: erp.outputDir,

        data_log_interval: s?.dataLogInterval,
        machine_id: s?.machineId,

        // P1:MM 維護模組的對外網址。空字串代表未設定,主系統不顯示入口。
        mm_base_url: s?.mmBaseUrl ?? '',
    };
}

/** payload 應有的鍵集合 —— 供測試釘住「不得再有人漏送欄位」 */
export const COMM_PAYLOAD_KEYS = Object.freeze(Object.keys(buildCommPayload({})));
