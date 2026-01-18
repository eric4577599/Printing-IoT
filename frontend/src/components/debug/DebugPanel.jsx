import React, { useState } from 'react';
import styles from './DebugPanel.module.css';

const DebugPanel = ({ logs = [], componentInfo = '' }) => {
    const [isMinimized, setIsMinimized] = useState(false);

    return (
        <div className={`${styles.container} ${isMinimized ? styles.minimized : ''}`}>
            {/* Header with Minimize Control */}
            <div className={styles.header}>
                {!isMinimized && <span>Debug Log (Admin)</span>}
                <button
                    className={styles.controlBtn}
                    onClick={() => setIsMinimized(!isMinimized)}
                    title={isMinimized ? "Expand" : "Minimize"}
                >
                    {isMinimized ? '&lt;' : '&gt;'}
                </button>
            </div>

            {isMinimized ? (
                /* Minimized Content */
                <div className={styles.minimizedTitle} onClick={() => setIsMinimized(false)} style={{ cursor: 'pointer' }}>
                    DEBUG LOG
                </div>
            ) : (
                <>
                    {/* Log Content */}
                    <div className={styles.logPanel}>
                        <div className={styles.logList}>
                            {logs.length === 0 ? <div className={styles.logItem}>Waiting for actions...</div> : null}
                            {logs.map((log, index) => (
                                <div key={index} className={styles.logItem}>
                                    <span className={styles.timestamp}>{log.time}</span>
                                    <span className={styles.message}>{log.message}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Footer Content (Merged) */}
                    <div className={styles.footerPanel}>
                        <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>Component Graph</div>
                        <div className={styles.footerContent}>
                            MainLayout &rarr; Dashboard<br />
                            ├── Header (Nav)<br />
                            ├── Content (Grid/Monitor)<br />
                            └── DebugPanel (Overlay)
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default DebugPanel;
