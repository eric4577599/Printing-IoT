import React, { useState } from 'react';
import styles from '../modals/ModalStyles.module.css';

/**
 * 驗收項目管理 Modal
 * @param {boolean} isOpen - 是否開啟
 * @param {function} onClose - 關閉回調
 * @param {array} items - 驗收項目列表
 * @param {function} onSave - 儲存回調
 */
const AcceptanceModal = ({ isOpen, onClose, items = [], onSave }) => {
    const [localItems, setLocalItems] = useState(items);
    const [newItemText, setNewItemText] = useState('');

    // 切換選取狀態
    const toggleItem = (id) => {
        setLocalItems(prev => prev.map(item =>
            item.id === id ? { ...item, checked: !item.checked } : item
        ));
    };

    // 新增項目
    const handleAddItem = () => {
        if (!newItemText.trim()) return;
        const newItem = {
            id: Date.now(),
            text: newItemText.trim(),
            checked: true
        };
        setLocalItems(prev => [...prev, newItem]);
        setNewItemText('');
    };

    // 刪除選中的項目
    const handleDeleteSelected = () => {
        const selectedCount = localItems.filter(i => i.checked).length;
        if (selectedCount === 0) {
            alert('請先選取要刪除的項目');
            return;
        }
        if (confirm(`確定要刪除 ${selectedCount} 個選取的項目嗎？`)) {
            setLocalItems(prev => prev.filter(item => !item.checked));
        }
    };

    // 儲存
    const handleSave = () => {
        onSave(localItems);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className={styles.overlay}>
            <div className={styles.modal} style={{ width: '500px', maxHeight: '80vh' }}>
                {/* Header */}
                <div className={styles.header} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h2 style={{ margin: 0 }}>驗收項目管理</h2>
                    <button className={styles.closeBtn} onClick={onClose}>×</button>
                </div>

                {/* Toolbar */}
                <div style={{
                    display: 'flex',
                    gap: '10px',
                    padding: '12px 20px',
                    borderBottom: '1px solid #e0e0e0',
                    background: '#f9f9f9'
                }}>
                    <button
                        onClick={handleSave}
                        style={{
                            padding: '8px 16px',
                            background: '#4CAF50',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontWeight: 500
                        }}
                    >
                        儲存
                    </button>
                    <button
                        onClick={handleDeleteSelected}
                        style={{
                            padding: '8px 16px',
                            background: '#f44336',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontWeight: 500
                        }}
                    >
                        刪除
                    </button>
                </div>

                {/* Table */}
                <div className={styles.body} style={{ padding: 0, maxHeight: '400px', overflow: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ background: '#e3f2fd', position: 'sticky', top: 0 }}>
                                <th style={{ width: '60px', padding: '12px', textAlign: 'center', borderBottom: '1px solid #e0e0e0' }}>
                                    選取
                                </th>
                                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e0e0e0' }}>
                                    項目
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {localItems.map(item => (
                                <tr
                                    key={item.id}
                                    style={{
                                        background: item.checked ? '#fff8e1' : 'white',
                                        cursor: 'pointer'
                                    }}
                                    onClick={() => toggleItem(item.id)}
                                >
                                    <td style={{ padding: '12px', textAlign: 'center', borderBottom: '1px solid #f0f0f0' }}>
                                        <input
                                            type="checkbox"
                                            checked={item.checked}
                                            onChange={() => toggleItem(item.id)}
                                            style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                                        />
                                    </td>
                                    <td style={{ padding: '12px', borderBottom: '1px solid #f0f0f0' }}>
                                        {item.text}
                                    </td>
                                </tr>
                            ))}
                            {localItems.length === 0 && (
                                <tr>
                                    <td colSpan={2} style={{ padding: '24px', textAlign: 'center', color: '#999' }}>
                                        尚無驗收項目
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Add New Item */}
                <div style={{
                    padding: '16px 20px',
                    borderTop: '1px solid #e0e0e0',
                    display: 'flex',
                    gap: '10px'
                }}>
                    <input
                        type="text"
                        value={newItemText}
                        onChange={e => setNewItemText(e.target.value)}
                        placeholder="輸入新驗收項目..."
                        onKeyPress={e => e.key === 'Enter' && handleAddItem()}
                        style={{
                            flex: 1,
                            padding: '10px 12px',
                            border: '1px solid #ccc',
                            borderRadius: '4px',
                            fontSize: '0.9rem'
                        }}
                    />
                    <button
                        onClick={handleAddItem}
                        style={{
                            padding: '10px 20px',
                            background: '#2196f3',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontWeight: 500
                        }}
                    >
                        + 新增
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AcceptanceModal;
