import React, { useState, useEffect, useRef } from 'react';
import mqtt from 'mqtt';
import './DebugDashboard.css';

const DebugDashboard = () => {
    // Column 1: Frontend Direct (WISE -> Broker -> Frontend)
    const [directMessages, setDirectMessages] = useState([]);
    const [useLocalBroker, setUseLocalBroker] = useState(false); // Default to Real Device (External)
    const directClientRef = useRef(null);

    // Column 2: Backend Received (Internal Broker -> Frontend)
    const [backendRawMessages, setBackendRawMessages] = useState([]);
    const internalClientRef = useRef(null);

    // Column 3: Backend Processed (Polling API)
    const [processedMessages, setProcessedMessages] = useState([]);

    // Helper to format timestamp
    const formatTime = () => new Date().toLocaleTimeString('en-GB', { hour12: false, fractionalSecondDigits: 2 });

    // Helper: Get MQTT Broker URL
    const getBrokerUrl = (local) => {
        const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
        const host = window.location.hostname;
        const port = 9001; // Port exposed in docker-compose
        // If local simulation selected, force localhost for dev, or same host for remote
        // But 'useLocalBroker' implies a different source? 
        // Actually, let's keep it simple: 
        // If "Use Local Broker" checked -> localhost:9001 (for dev)
        // If NOT checked -> try window.location.hostname:9001

        if (local) return 'ws://localhost:9001';
        return `${protocol}://${host}:${port}`;
    };

    // 1. Setup Direct MQTT Connection (WISE Source)
    useEffect(() => {
        // Disconnect previous if any
        if (directClientRef.current) {
            directClientRef.current.end();
        }

        const brokerUrl = getBrokerUrl(useLocalBroker);
        console.log(`🔌 [Direct] Connecting to ${brokerUrl}...`);

        const client = mqtt.connect(brokerUrl, {
            clientId: `debug_direct_${Math.random().toString(16).substring(2, 8)}`,
            keepalive: 60,
        });

        client.on('connect', () => {
            console.log('✅ [Direct] Connected');
            client.subscribe('Advantech/+/data', (err) => {
                if (!err) console.log('📡 [Direct] Subscribed to Advantech/+/data');
            });
        });

        client.on('error', (err) => {
            console.error('❌ [Direct] Connection Error', err);
        });

        client.on('message', (topic, message) => {
            try {
                const payload = JSON.parse(message.toString());
                const newData = {
                    key: Math.random().toString(36),
                    time: formatTime(),
                    topic,
                    di1: payload.di1,
                    t: payload.t,
                    raw: payload
                };
                setDirectMessages(prev => [newData, ...prev].slice(0, 50));
            } catch (e) {
                console.error('[Direct] Parse Error', e);
            }
        });

        directClientRef.current = client;

        return () => {
            if (client) client.end();
        };
    }, [useLocalBroker]);

    // 2. Setup Internal MQTT Connection (Backend Received)
    // NOTE: In a real remote scenario, "Internal" broker might strictly be internal. 
    // But we are using the same public broker port 9001 to spy on 'factory/debug/raw'.
    useEffect(() => {
        const brokerUrl = getBrokerUrl(false); // Always try remote/relative
        const client = mqtt.connect(brokerUrl, {
            clientId: `debug_internal_${Math.random().toString(16).substring(2, 8)}`
        });

        client.on('connect', () => {
            console.log('✅ [Internal] Connected');
            client.subscribe('factory/debug/raw', (err) => {
                if (!err) console.log('📡 [Internal] Subscribed to factory/debug/raw');
            });
        });

        client.on('message', (topic, message) => {
            try {
                const rawStr = message.toString();
                let payload;
                try {
                    payload = JSON.parse(rawStr);
                } catch {
                    payload = { raw: rawStr };
                }

                const newData = {
                    key: Math.random().toString(36),
                    time: formatTime(),
                    di1: payload.di1,
                    t: payload.t,
                    raw: payload
                };
                setBackendRawMessages(prev => [newData, ...prev].slice(0, 50));
            } catch (e) {
                console.error('[Internal] Error', e);
            }
        });

        internalClientRef.current = client;

        return () => {
            if (client) client.end();
        };
    }, []);

    // 3. Backend Processed (Polling API)
    useEffect(() => {
        // Polling interval
        const interval = setInterval(async () => {
            try {
                // Using fetch directly or api wrapper
                // Use relative path directly to ensure it works with proxy
                // Or use the API_URL from env if available, but for simplicity:
                // We will import getRealtimeData from api.js if possible, or just fetch
                const { getRealtimeData } = await import('../services/api');
                const data = await getRealtimeData();

                if (data) {
                    const newData = {
                        key: Math.random().toString(36),
                        time: formatTime(),
                        total_length: data.TotalLength || data.totalLength, // Handle case
                        line_speed: data.Speed || data.speed,
                        raw: data
                    };

                    // Deduplicate logic: Only add if changed? Or just log stream?
                    // Debug dashboard usually logs stream.
                    setProcessedMessages(prev => {
                        // Simple optimization: don't flood if identical? 
                        // But for debug we might want to see the heartbeat.
                        // Let's limit duplicate visual noise: only add if timestamp changed or every X
                        return [newData, ...prev].slice(0, 50);
                    });
                }

            } catch (e) {
                // console.error('[Polling] Error', e); // Silent fail to avoid console spam
            }
        }, 1000); // 1s polling

        return () => clearInterval(interval);
    }, []);

    const MessageCard = ({ data, type }) => (
        <div className={`msg-card ${type}`}>
            <div className="msg-header">
                <span className="msg-time">{data.time}</span>
            </div>
            <div className="msg-body">
                {type === 'direct' && (
                    <>
                        <div><strong>DI1:</strong> {data.di1}</div>
                        <div className="msg-raw">T: {data.t}</div>
                    </>
                )}
                {type === 'internal' && (
                    <>
                        <div><strong>DI1:</strong> {data.di1}</div>
                        <div className="msg-raw">Raw Forwarded</div>
                    </>
                )}
                {type === 'processed' && (
                    <>
                        <div className="highlight-val">Qty: {data.total_length}</div>
                        <div className="highlight-val">Speed: {data.line_speed}</div>
                    </>
                )}
            </div>
        </div>
    );

    return (
        <div className="debug-dashboard">
            <div className="debug-header">
                <h1>🐞 System Data Flow Debugger v2.0 (WSS Fix)</h1>
                <div className="controls">
                    <label>
                        <input
                            type="checkbox"
                            checked={useLocalBroker}
                            onChange={(e) => setUseLocalBroker(e.target.checked)}
                        />
                        Force Localhost:9001 (Dev)
                    </label>
                </div>
            </div>

            <div className="debug-grid">
                {/* Column 1 */}
                <div className="debug-col">
                    <h2>1. Frontend Direct</h2>
                    <div className="col-desc">Source: MQTT {useLocalBroker ? 'Local' : 'Window Host'} :9001</div>
                    <div className="msg-list">
                        {directMessages.map(msg => (
                            <MessageCard key={msg.key} data={msg} type="direct" />
                        ))}
                    </div>
                </div>

                {/* Column 2 */}
                <div className="debug-col">
                    <h2>2. Backend Received</h2>
                    <div className="col-desc">Source: MQTT Spy (factory/debug/raw)</div>
                    <div className="msg-list">
                        {backendRawMessages.map(msg => (
                            <MessageCard key={msg.key} data={msg} type="internal" />
                        ))}
                    </div>
                </div>

                {/* Column 3 */}
                <div className="debug-col">
                    <h2>3. Backend Processed</h2>
                    <div className="col-desc">Source: API Polling (/monitor/realtime)</div>
                    <div className="msg-list">
                        {processedMessages.map(msg => (
                            <MessageCard key={msg.key} data={msg} type="processed" />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DebugDashboard;
