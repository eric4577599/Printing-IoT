import React, { useState, useEffect } from 'react';
import styles from '../modals/ModalStyles.module.css';

/**
 * 維修執行回報 Modal
 * @param {boolean} isOpen - 是否開啟
 * @param {function} onClose - 關閉回調
 * @param {object} task - 任務資料
 * @param {function} onConfirm - 確認回調
 */
const MaintenanceExecutionModal = ({ isOpen, onClose, task, onConfirm, currentUser }) => {
    const [executor, setExecutor] = useState('');
    const [results, setResults] = useState({});

    // 模擬使用者列表 (實際應從 API 或 Context 取得)
    const userOptions = [
        { id: 'u1', name: '王小明' },
        { id: 'u2', name: '李大華' },
        { id: 'u3', name: '張三' },
        { id: 'u4', name: 'Admin' },
        { id: 'u5', name: 'Operator' }
    ];

    // 初始化狀態
    useEffect(() => {
        if (isOpen && task) {
            // 預設選中當前登入者，若無則選列表第一個，或留空
            const defaultUser = currentUser?.name || '';
            setExecutor(defaultUser);

            // 初始化 checklist 結果
            const initialResults = {};
            if (task.maintenanceItems) {
                task.maintenanceItems.forEach(item => {
                    initialResults[item.id] = { checked: false, note: '' };
                });
            }
            setResults(initialResults);
        }
    }, [isOpen, task, currentUser]);

    if (!isOpen || !task) return null;

    // 處理檢查項目變更
    const handleCheckToggle = (itemId) => {
        setResults(prev => ({
            ...prev,
            [itemId]: {
                ...prev[itemId],
                checked: !prev[itemId]?.checked
            }
        }));
    };

    // 處理檢查備註
    const handleNoteChange = (itemId, note) => {
        setResults(prev => ({
            ...prev,
            [itemId]: {
                ...prev[itemId],
                note
            }
        }));
    };

    // 確認提交
    const handleSubmit = () => {
        if (!executor.trim()) {
            alert('請選擇執行人');
            return;
        }

        // 檢查是否所有項目都已確認 (選用邏輯，這裡先不強制)
        // const allChecked = task.maintenanceItems?.every(item => results[item.id]?.checked);

        const executionData = {
            taskId: task.id,
            executor,
            results,
            completedAt: new Date().toISOString()
        };
        onConfirm(executionData);
        onClose();
    };

    return (
        <div className={styles.overlay}>
            <div className={styles.modal} style={{ width: '600px', maxHeight: '90vh' }}>
                {/* Header */}
                <div className={styles.header} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h2 style={{ margin: 0 }}>🛠️ 保養執行回報</h2>
                    <button className={styles.closeBtn} onClick={onClose}>×</button>
                </div>

                <div className={styles.body} style={{ padding: '20px' }}>
                    {/* 任務資訊摘要 */}
                    <div style={{ background: '#f5f5f5', padding: '12px', borderRadius: '6px', marginBottom: '20px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                            <div><strong>零件名稱:</strong> {task.partName}</div>
                            <div><strong>料號:</strong> {task.partId}</div>
                            <div><strong>維修類型:</strong> {task.period}保養</div>
                            <div><strong>到期日:</strong> {task.dueDate}</div>
                        </div>
                    </div>

                    {/* 執行人 */}
                    <div style={{ marginBottom: '24px' }}>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>執行人 <span style={{ color: 'red' }}>*</span></label>
                        <select
                            value={executor}
                            onChange={e => setExecutor(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '10px',
                                border: '1px solid #ccc',
                                borderRadius: '4px',
                                fontSize: '1rem',
                                background: 'white'
                            }}
                        >
                            <option value="">-- 請選擇執行人 --</option>
                            {userOptions.map(u => (
                                <option key={u.id} value={u.name}>{u.name}</option>
                            ))}
                            {/* 如果當前使用者不在列表中，額外顯示 (確保預設值顯示正確) */}
                            {currentUser?.name && !userOptions.find(u => u.name === currentUser.name) && (
                                <option value={currentUser.name}>{currentUser.name}</option>
                            )}
                        </select>
                    </div>

                    {/* 保養重點 Checklist */}
                    <div>
                        <h4 style={{ margin: '0 0 12px 0', borderBottom: '1px solid #eee', paddingBottom: '8px' }}>
                            📋 保養重點確認
                        </h4>

                        {!task.maintenanceItems || task.maintenanceItems.length === 0 ? (
                            <div style={{ color: '#999', textAlign: 'center', padding: '20px' }}>無指定保養重點</div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                {task.maintenanceItems.map(item => (
                                    <div key={item.id} style={{
                                        padding: '12px',
                                        border: '1px solid #e0e0e0',
                                        borderRadius: '6px',
                                        background: results[item.id]?.checked ? '#e8f5e9' : 'white'
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                                            <input
                                                type="checkbox"
                                                id={`item-${item.id}`}
                                                checked={results[item.id]?.checked || false}
                                                onChange={() => handleCheckToggle(item.id)}
                                                style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                                            />
                                            <label htmlFor={`item-${item.id}`} style={{ fontSize: '1rem', fontWeight: 500, cursor: 'pointer', flex: 1 }}>
                                                {item.text}
                                            </label>
                                            <span style={{
                                                fontSize: '0.8rem',
                                                padding: '2px 8px',
                                                borderRadius: '10px',
                                                background: results[item.id]?.checked ? '#4caf50' : '#bdbdbd',
                                                color: 'white'
                                            }}>
                                                {results[item.id]?.checked ? 'OK' : 'Pending'}
                                            </span>
                                        </div>

                                        {/* 備註欄 (選填) */}
                                        <input
                                            type="text"
                                            placeholder="備註 (異常狀況說明...)"
                                            value={results[item.id]?.note || ''}
                                            onChange={e => handleNoteChange(item.id, e.target.value)}
                                            style={{
                                                width: '100%',
                                                padding: '6px 8px',
                                                fontSize: '0.9rem',
                                                border: '1px solid #eee',
                                                borderRadius: '4px',
                                                background: '#fafafa'
                                            }}
                                        />
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div style={{
                    padding: '16px 20px',
                    borderTop: '1px solid #e0e0e0',
                    display: 'flex',
                    justifyContent: 'flex-end',
                    gap: '12px',
                    background: '#f9f9f9',
                    borderRadius: '0 0 8px 8px'
                }}>
                    <button
                        onClick={onClose}
                        style={{
                            padding: '10px 24px',
                            border: '1px solid #ccc',
                            background: 'white',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontWeight: 500
                        }}
                    >
                        取消
                    </button>
                    <button
                        onClick={handleSubmit}
                        style={{
                            padding: '10px 24px',
                            background: '#2196f3',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontWeight: 500,
                            boxShadow: '0 2px 4px rgba(33, 150, 243, 0.3)'
                        }}
                    >
                        確認完成
                    </button>
                </div>
            </div>
        </div>
    );
};

export default MaintenanceExecutionModal;
