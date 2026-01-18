import React, { useState, useEffect } from 'react';
import styles from '../modals/ModalStyles.module.css';

/**
 * 故障回報 Modal
 * @param {boolean} isOpen - 是否開啟
 * @param {function} onClose - 關閉回調
 * @param {Array} parts - 可選零件列表 (來自現有排程任務)
 * @param {function} onSubmit - 提交回調
 * @param {object} currentUser - 當前登入者
 */
const BreakdownReportingModal = ({ isOpen, onClose, parts = [], onSubmit, currentUser }) => {
    // Basic Info
    const [selectedPartId, setSelectedPartId] = useState('');
    const [maintenanceType, setMaintenanceType] = useState('internal'); // internal | external
    const [repairOrderNo, setRepairOrderNo] = useState(''); // Only for external

    // Outcome
    const [status, setStatus] = useState('completed'); // completed | observation
    const [isAccepted, setIsAccepted] = useState(false); // Acceptance Checkbox

    // Replacement Logic
    const [replacementType, setReplacementType] = useState('none'); // none | new | refurbished
    const [refurbishedRate, setRefurbishedRate] = useState(80); // Default 80% for refurbished
    const [partSerialNo, setPartSerialNo] = useState('');

    // Evidence
    const [photos, setPhotos] = useState([]); // Array of simulated file objects or URLs

    // Executor
    const [executor, setExecutor] = useState('');

    // Acceptor (驗收人) - 新增
    const [acceptor, setAcceptor] = useState('');

    // Reset Form when opened
    useEffect(() => {
        if (isOpen) {
            setSelectedPartId('');
            setMaintenanceType('internal');
            setRepairOrderNo('');
            setStatus('completed');
            setIsAccepted(false);
            setReplacementType('none');
            setRefurbishedRate(80);
            setPartSerialNo('');
            setPhotos([]);
            setExecutor(currentUser?.name || '');
            setAcceptor(currentUser?.name || ''); // 預設為當前登錄人
        }
    }, [isOpen, currentUser]);

    if (!isOpen) return null;

    const handlePhotoUpload = (e) => {
        // Simulation: Just store the file name or create a fake URL
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const fakeUrl = URL.createObjectURL(file);
            setPhotos([...photos, { name: file.name, url: fakeUrl }]);
        }
    };

    const handleSubmit = () => {
        // Validation
        if (!selectedPartId) {
            alert('請選擇故障零件');
            return;
        }
        if (maintenanceType === 'external' && !repairOrderNo.trim()) {
            alert('外修請輸入維修單號');
            return;
        }
        if (!isAccepted) {
            alert('請確認驗收項目');
            return;
        }
        if (!executor.trim()) {
            alert('請輸入執行人');
            return;
        }
        if (!acceptor.trim()) {
            alert('請輸入驗收人');
            return;
        }

        const selectedPart = parts.find(p => p.id == selectedPartId);

        const reportData = {
            partId: selectedPartId,
            partName: selectedPart?.partName || 'Unknown',
            partCode: selectedPart?.partId || 'Unknown', // The real ID string e.g. 'BEARING-001'
            maintenanceType,
            repairOrderNo: maintenanceType === 'external' ? repairOrderNo : null,
            status,
            replacementType,
            refurbishedRate: replacementType === 'refurbished' ? refurbishedRate : 100, // New is 100% effectively
            partSerialNo,
            photos,
            executor,
            acceptor, // 新增驗收人
            reportedAt: new Date().toISOString()
        };

        onSubmit(reportData);
        onClose();
    };

    return (
        <div className={styles.overlay} style={{ zIndex: 1100 }}> {/* Higher Z-index */}
            <div className={styles.modal} style={{ width: '650px', maxHeight: '90vh', overflowY: 'auto' }}>
                <div className={styles.header} style={{ background: '#d32f2f', color: 'white' }}>
                    <h2 style={{ margin: 0 }}>⚠️ 故障維修回報</h2>
                    <button className={styles.closeBtn} onClick={onClose} style={{ color: 'white' }}>×</button>
                </div>

                <div className={styles.body} style={{ padding: '20px' }}>
                    {/* 1. Part Selection */}
                    <div className={styles.formGroup}>
                        <label className={styles.label}>故障零件 <span style={{ color: 'red' }}>*</span></label>
                        <select
                            className={styles.select}
                            value={selectedPartId}
                            onChange={e => setSelectedPartId(e.target.value)}
                        >
                            <option value="">-- 請選擇 --</option>
                            {parts.map(part => (
                                <option key={part.id} value={part.id}>
                                    {part.partName} ({part.partId}) - {part.location || '其他'}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* 2. Maintenance Type */}
                    <div className={styles.formGroup}>
                        <label className={styles.label}>維修類型</label>
                        <div style={{ display: 'flex', gap: '20px', marginBottom: '10px' }}>
                            <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                                <input
                                    type="radio"
                                    name="mType"
                                    checked={maintenanceType === 'internal'}
                                    onChange={() => setMaintenanceType('internal')}
                                    style={{ marginRight: '6px' }}
                                />
                                廠內維修 (內修)
                            </label>
                            <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                                <input
                                    type="radio"
                                    name="mType"
                                    checked={maintenanceType === 'external'}
                                    onChange={() => setMaintenanceType('external')}
                                    style={{ marginRight: '6px' }}
                                />
                                委外維修 (外修)
                            </label>
                        </div>

                        {maintenanceType === 'external' && (
                            <div style={{ marginTop: '8px' }}>
                                <input
                                    type="text"
                                    placeholder="請輸入維修單號 (Repair Order No.)"
                                    className={styles.input}
                                    value={repairOrderNo}
                                    onChange={e => setRepairOrderNo(e.target.value)}
                                />
                            </div>
                        )}
                    </div>

                    {/* 3. Replacement Info */}
                    <div className={styles.formGroup} style={{ background: '#fafafa', padding: '15px', borderRadius: '6px', border: '1px solid #eee' }}>
                        <label className={styles.label}>零件更換狀況</label>
                        <select
                            className={styles.select}
                            value={replacementType}
                            onChange={e => setReplacementType(e.target.value)}
                            style={{ marginBottom: '10px' }}
                        >
                            <option value="none">無更換零件 (僅調整/修復)</option>
                            <option value="new">更換新品 (歸零計算)</option>
                            <option value="refurbished">更換整修品 (依比例重置)</option>
                        </select>

                        {replacementType !== 'none' && (
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                                <div>
                                    <label style={{ fontSize: '0.85rem', color: '#666', display: 'block', marginBottom: '4px' }}>
                                        零部件序號 (S/N)
                                    </label>
                                    <input
                                        type="text"
                                        className={styles.input}
                                        value={partSerialNo}
                                        onChange={e => setPartSerialNo(e.target.value)}
                                        placeholder="輸入序號"
                                    />
                                </div>
                                {replacementType === 'refurbished' && (
                                    <div>
                                        <label style={{ fontSize: '0.85rem', color: '#666', display: 'block', marginBottom: '4px' }}>
                                            剩餘壽命比例 (%)
                                        </label>
                                        <input
                                            type="number"
                                            className={styles.input}
                                            value={refurbishedRate}
                                            onChange={e => setRefurbishedRate(Number(e.target.value))}
                                            min="1" max="100"
                                        />
                                        <div style={{ fontSize: '0.75rem', color: '#999', marginTop: '4px' }}>
                                            * 預設 80%，代表已消耗 20%
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* 4. Evidence Upload */}
                    <div className={styles.formGroup}>
                        <label className={styles.label}>照片上傳</label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <label style={{
                                padding: '6px 12px',
                                background: '#f5f5f5',
                                border: '1px solid #ddd',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontSize: '0.9rem'
                            }}>
                                📷 選擇照片...
                                <input type="file" accept="image/*" onChange={handlePhotoUpload} style={{ display: 'none' }} />
                            </label>
                            <span style={{ fontSize: '0.85rem', color: '#666' }}>
                                已選 {photos.length} 張
                            </span>
                        </div>
                        {photos.length > 0 && (
                            <div style={{ display: 'flex', gap: '8px', marginTop: '8px', overflowX: 'auto' }}>
                                {photos.map((p, idx) => (
                                    <div key={idx} style={{
                                        width: '60px', height: '60px',
                                        backgroundImage: `url(${p.url})`, backgroundSize: 'cover',
                                        borderRadius: '4px', border: '1px solid #ddd'
                                    }} />
                                ))}
                            </div>
                        )}
                    </div>

                    {/* 5. Result & Acceptance */}
                    <div className={styles.formGroup}>
                        <label className={styles.label}>處理結果 & 驗收</label>
                        <div style={{ display: 'flex', gap: '20px', marginBottom: '10px' }}>
                            <label style={{ cursor: 'pointer' }}>
                                <input
                                    type="radio"
                                    checked={status === 'completed'}
                                    onChange={() => setStatus('completed')}
                                    style={{ marginRight: '6px' }}
                                />
                                處理完成
                            </label>
                            <label style={{ cursor: 'pointer' }}>
                                <input
                                    type="radio"
                                    checked={status === 'observation'}
                                    onChange={() => setStatus('observation')}
                                    style={{ marginRight: '6px' }}
                                />
                                持續觀察中
                            </label>
                        </div>

                        <div style={{
                            background: '#e8f5e9',
                            padding: '10px',
                            borderRadius: '4px',
                            border: '1px solid #a5d6a7',
                            display: 'flex',
                            alignItems: 'center'
                        }}>
                            <input
                                type="checkbox"
                                id="acceptanceCheck"
                                checked={isAccepted}
                                onChange={e => setIsAccepted(e.target.checked)}
                                style={{ width: '18px', height: '18px', marginRight: '10px', cursor: 'pointer' }}
                            />
                            <label htmlFor="acceptanceCheck" style={{ cursor: 'pointer', fontWeight: 600, color: '#2e7d32' }}>
                                我已確認設備修復並通過功能驗收
                            </label>
                        </div>
                    </div>

                    {/* 6. Executor */}
                    <div className={styles.formGroup}>
                        <label className={styles.label}>執行人 <span style={{ color: 'red' }}>*</span></label>
                        <input
                            type="text"
                            value={executor}
                            onChange={e => setExecutor(e.target.value)}
                            className={styles.input}
                            placeholder="輸入執行維修的人員姓名"
                        />
                    </div>

                    {/* 7. Acceptor (驗收人) - 新增 */}
                    <div className={styles.formGroup}>
                        <label className={styles.label}>驗收人 <span style={{ color: 'red' }}>*</span></label>
                        <input
                            type="text"
                            value={acceptor}
                            onChange={e => setAcceptor(e.target.value)}
                            className={styles.input}
                            placeholder="預設為當前登錄人"
                        />
                        <div style={{ fontSize: '0.75rem', color: '#666', marginTop: '4px' }}>
                            💡 驗收人負責最終確認維修品質與設備功能
                        </div>
                    </div>

                </div>

                <div className={styles.footer} style={{
                    padding: '16px 20px',
                    borderTop: '1px solid #e0e0e0',
                    display: 'flex',
                    justifyContent: 'flex-end',
                    gap: '12px',
                    background: '#f9f9f9',
                    borderRadius: '0 0 8px 8px'
                }}>
                    <button className={styles.btnCancel} onClick={onClose} style={{
                        padding: '10px 24px',
                        border: '1px solid #ccc',
                        background: 'white',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontWeight: 500
                    }}>取消</button>
                    <button className={styles.btnConfirm} onClick={handleSubmit} style={{
                        padding: '10px 24px',
                        background: '#d32f2f', // Red for Alert
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontWeight: 500,
                        boxShadow: '0 2px 4px rgba(211, 47, 47, 0.3)'
                    }}>確認並歸檔</button>
                </div>
            </div>
        </div>
    );
};

export default BreakdownReportingModal;
