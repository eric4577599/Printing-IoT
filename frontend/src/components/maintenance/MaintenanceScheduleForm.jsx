import React, { useState } from 'react';
import styles from './MaintenanceScheduleForm.module.css';
import TriggerTypeSelector from './TriggerTypeSelector';
import TimeBasedConfig from './TimeBasedConfig';
import CounterBasedConfig from './CounterBasedConfig';
import PLCBasedConfig from './PLCBasedConfig';
import HybridConfig from './HybridConfig';
import AcceptanceModal from './AcceptanceModal';
import PhotoModal from './PhotoModal';

/**
 * 保養排程設定表單主元件
 * @param {object} initialData - 初始資料
 * @param {function} onSave - 儲存回調
 * @param {function} onCancel - 取消回調
 */
const MaintenanceScheduleForm = ({ initialData = {}, onSave, onCancel }) => {
    // Modal 狀態
    const [showAcceptanceModal, setShowAcceptanceModal] = useState(false);
    const [showPhotoModal, setShowPhotoModal] = useState(false);

    // 表單狀態
    const [formData, setFormData] = useState({
        // === 基本資訊 ===
        // 保養類型
        maintenanceType: initialData.maintenanceType || 'part_based', // part_based | non_part

        partId: initialData.partId || '',
        partName: initialData.partName || '',
        partType: initialData.partType || 'consumable',
        partLocation: initialData.partLocation || 'printing_unit',
        triggerType: initialData.triggerType || 'time',

        // 照片
        photos: initialData.photos || [],

        // 備註
        notes: initialData.notes || '',

        // === 全局通例設定 ===
        globalRequirements: initialData.globalRequirements || {
            supportType: 'maintenance',        // maintenance | vendor
            requiresMeasurement: false,        // 需要量測值
            requiresPhoto: false,              // 需要照片
            requiresAcceptance: false,         // 需要驗收
        },

        // 週期觸發設定 (改為多重排程)
        timeConfig: initialData.timeConfig || {
            schedules: [
                {
                    id: Date.now(),
                    frequencyUnit: 'month',
                    frequencyValue: 1,
                    lastDate: new Date().toISOString().split('T')[0],
                    aiEnabled: false,
                    maintenanceItems: []
                }
            ]
        },

        // 張數觸發設定
        counterConfig: initialData.counterConfig || {
            source: 'plc',
            threshold: 500000,
            currentCount: 0,
            plcAddress: 'D1002',
            plcDataType: 'DWORD'
        },

        // PLC 觸發設定
        plcConfig: initialData.plcConfig || {
            signalType: 'motor_hours',
            threshold: 10000,
            currentValue: 0,
            plcAddress: 'D1000',
            plcDataType: 'DWORD',
            connected: true,
            lastSync: new Date().toLocaleString('zh-TW'),
            warningEnabled: true,
            warningThreshold: 9000,
            avgDaily: 50
        },

        // 混合觸發設定
        hybridConfig: initialData.hybridConfig || {
            logic: 'OR',
            conditions: []
        },

        // SOP 設定
        sopUrl: initialData.sopUrl || '',
        acceptanceItems: initialData.acceptanceItems || [
            { id: 1, text: '安裝正確', checked: true },
            { id: 2, text: '扭力符合', checked: true },
            { id: 3, text: '無異音', checked: true },
            { id: 4, text: '運轉正常', checked: true }
        ]
    });

    // 處理照片上傳
    const handlePhotoUpload = (e) => {
        const files = Array.from(e.target.files);
        files.forEach(file => {
            const reader = new FileReader();
            reader.onload = (event) => {
                setFormData(prev => ({
                    ...prev,
                    photos: [...prev.photos, {
                        id: Date.now(),
                        name: file.name,
                        dataUrl: event.target.result,
                        uploadedAt: new Date().toLocaleString('zh-TW')
                    }]
                }));
            };
            reader.readAsDataURL(file);
        });
        e.target.value = ''; // Reset input
    };

    // 刪除照片
    const handleDeletePhoto = (photoId) => {
        setFormData(prev => ({
            ...prev,
            photos: prev.photos.filter(p => p.id !== photoId)
        }));
    };

    // 處理儲存
    const handleSave = () => {
        if (onSave) {
            onSave(formData);
        }
    };

    // 處理取消
    const handleCancel = () => {
        if (onCancel) {
            onCancel();
        }
    };

    // 更新特定觸發設定
    const updateConfig = (configKey, newConfig) => {
        setFormData(prev => ({
            ...prev,
            [configKey]: newConfig
        }));
    };

    // 更新驗收項目 (從 Modal 回傳)
    const handleAcceptanceSave = (items) => {
        setFormData(prev => ({
            ...prev,
            acceptanceItems: items
        }));
    };

    return (
        <div className={styles.formContainer}>
            {/* 標題 */}
            <div className={styles.header}>
                <h2>保養排程設定 (Maintenance Schedule)</h2>
            </div>

            {/* 保養類型選擇 */}
            <div style={{
                padding: '20px',
                background: '#f0f7ff',
                borderRadius: '12px',
                border: '2px solid #2196f3',
                marginBottom: '24px'
            }}>
                <h4 style={{ margin: '0 0 16px 0', color: '#1565c0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    🔧 保養類型
                </h4>
                <div style={{ display: 'flex', gap: '24px' }}>
                    <label style={{
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        padding: '12px 20px',
                        background: formData.maintenanceType === 'non_part' ? '#2196f3' : 'white',
                        color: formData.maintenanceType === 'non_part' ? 'white' : '#333',
                        borderRadius: '8px',
                        border: '2px solid #2196f3',
                        fontWeight: 500,
                        transition: 'all 0.2s'
                    }}>
                        <input
                            type="radio"
                            name="maintenanceType"
                            value="non_part"
                            checked={formData.maintenanceType === 'non_part'}
                            onChange={e => setFormData(prev => ({ ...prev, maintenanceType: e.target.value }))}
                            style={{ marginRight: '8px', width: '18px', height: '18px' }}
                        />
                        🧹 無零件保養
                    </label>
                    <label style={{
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        padding: '12px 20px',
                        background: formData.maintenanceType === 'part_based' ? '#2196f3' : 'white',
                        color: formData.maintenanceType === 'part_based' ? 'white' : '#333',
                        borderRadius: '8px',
                        border: '2px solid #2196f3',
                        fontWeight: 500,
                        transition: 'all 0.2s'
                    }}>
                        <input
                            type="radio"
                            name="maintenanceType"
                            value="part_based"
                            checked={formData.maintenanceType === 'part_based'}
                            onChange={e => setFormData(prev => ({ ...prev, maintenanceType: e.target.value }))}
                            style={{ marginRight: '8px', width: '18px', height: '18px' }}
                        />
                        🔩 零件保養
                    </label>
                </div>
                <div style={{ marginTop: '12px', fontSize: '0.85rem', color: '#666', paddingLeft: '4px' }}>
                    {formData.maintenanceType === 'non_part'
                        ? '📌 清潔、檢查、校正等不涉及零件更換的保養作業'
                        : '📌 涉及零件更換、維修或整修的保養作業'
                    }
                </div>

            </div>

            {/* 設備部位選擇 (共通) */}
            <div className={styles.section}>
                <h4 className={styles.sectionTitle}>📍 設備部位 (Part / Location)</h4>
                <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: '#555' }}>
                        請選擇保養或維修的目標部位 (可選):
                    </label>
                    <select
                        value={formData.partLocation || ''}
                        onChange={e => setFormData(prev => ({ ...prev, partLocation: e.target.value }))}
                        style={{ padding: '8px 12px', border: '1px solid #ccc', borderRadius: '4px', minWidth: '250px' }}
                    >
                        <option value="">-- 不指定 (None) --</option>
                        <option value="feeder">給紙部 (Feeder)</option>
                        <option value="printing_unit">印刷單元 (Printing Unit)</option>
                        <option value="die_cutter">模切部 (Die Cutter)</option>
                        <option value="delivery">收紙部 (Delivery)</option>
                        <option value="other">其他 (Other)</option>
                    </select>
                </div>
            </div>

            {/* 零件資訊 - 只在零件保養時顯示 */}
            {formData.maintenanceType === 'part_based' && (
                <div className={styles.section}>
                    <h4 className={styles.sectionTitle}>零件資訊</h4>
                    <div className={styles.partInfo}>
                        <div className={styles.partInfoItem}>
                            <label>零件名稱:</label>
                            <input
                                type="text"
                                value={formData.partName}
                                onChange={e => setFormData(prev => ({ ...prev, partName: e.target.value }))}
                                placeholder="Ex: 主軸承"
                                style={{ padding: '6px 10px', border: '1px solid #ccc', borderRadius: '4px' }}
                            />
                        </div>
                        <div className={styles.partInfoItem}>
                            <label>料號:</label>
                            <input
                                type="text"
                                value={formData.partId}
                                onChange={e => setFormData(prev => ({ ...prev, partId: e.target.value }))}
                                placeholder="Ex: BEARING-001"
                                style={{ padding: '6px 10px', border: '1px solid #ccc', borderRadius: '4px' }}
                            />
                        </div>
                        <div className={styles.partInfoItem}>
                            <select
                                value={formData.partType}
                                onChange={e => setFormData(prev => ({ ...prev, partType: e.target.value }))}
                                style={{ padding: '6px 10px', border: '1px solid #ccc', borderRadius: '4px' }}
                            >
                                <option value="main">主零件</option>
                                <option value="consumable">耗材</option>
                            </select>
                        </div>

                        <div className={styles.partInfoItem}>
                            {/* Part Location Moved Out */}
                        </div>

                        {/* 照片按鈕 */}
                        <div className={styles.partInfoItem}>
                            <button
                                type="button"
                                onClick={() => setShowPhotoModal(true)}
                                style={{
                                    padding: '8px 16px',
                                    background: '#2196f3',
                                    color: 'white',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    fontWeight: 500,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    border: 'none'
                                }}
                            >
                                📷 照片 {formData.photos.length > 0 && `(${formData.photos.length})`}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 保養支援與需求設定 (全局通例) - 始終顯示 */}
            <div style={{ marginTop: '24px', padding: '20px', background: '#f0f4ff', borderRadius: '12px', border: '2px solid #c5d9ff' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h4 style={{ margin: 0, fontSize: '1rem', color: '#1565c0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        🌐 保養支援與需求設定 (全局通例)
                    </h4>
                    <span style={{ fontSize: '0.75rem', color: '#666', fontStyle: 'italic' }}>
                        ℹ️ 適用於所有週期，可在個別週期中覆蓋
                    </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                    {/* 支援選項 */}
                    <div>
                        <label style={{ fontSize: '0.9rem', fontWeight: 500, marginBottom: '10px', display: 'block', color: '#333' }}>支援單位 (可選)</label>
                        <div style={{ display: 'flex', gap: '16px' }}>
                            <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                                <input
                                    type="radio"
                                    name="globalSupportType"
                                    value="none"
                                    checked={formData.globalRequirements.supportType === 'none' || !formData.globalRequirements.supportType}
                                    onChange={e => setFormData(prev => ({
                                        ...prev,
                                        globalRequirements: { ...prev.globalRequirements, supportType: 'none' } // Set to none explicitly
                                    }))}
                                    style={{ marginRight: '6px' }}
                                />
                                ❌ 無 / 自行處理
                            </label>
                            <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                                <input
                                    type="radio"
                                    name="globalSupportType"
                                    value="maintenance"
                                    checked={formData.globalRequirements.supportType === 'maintenance'}
                                    onChange={e => setFormData(prev => ({
                                        ...prev,
                                        globalRequirements: { ...prev.globalRequirements, supportType: e.target.value }
                                    }))}
                                    style={{ marginRight: '6px' }}
                                />
                                🔧 工務
                            </label>
                            <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                                <input
                                    type="radio"
                                    name="globalSupportType"
                                    value="vendor"
                                    checked={formData.globalRequirements.supportType === 'vendor'}
                                    onChange={e => setFormData(prev => ({
                                        ...prev,
                                        globalRequirements: { ...prev.globalRequirements, supportType: e.target.value }
                                    }))}
                                    style={{ marginRight: '6px' }}
                                />
                                🏢 廠商
                            </label>
                        </div>
                    </div>

                    {/* 需求核取方塊 */}
                    <div>
                        <label style={{ fontSize: '0.9rem', fontWeight: 500, marginBottom: '10px', display: 'block', color: '#333' }}>執行需求</label>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                                <input
                                    type="checkbox"
                                    checked={formData.globalRequirements.requiresMeasurement}
                                    onChange={e => setFormData(prev => ({
                                        ...prev,
                                        globalRequirements: { ...prev.globalRequirements, requiresMeasurement: e.target.checked }
                                    }))}
                                    style={{ marginRight: '8px', width: '16px', height: '16px' }}
                                />
                                📏 需要記錄量測值
                            </label>
                            <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                                <input
                                    type="checkbox"
                                    checked={formData.globalRequirements.requiresPhoto}
                                    onChange={e => setFormData(prev => ({
                                        ...prev,
                                        globalRequirements: { ...prev.globalRequirements, requiresPhoto: e.target.checked }
                                    }))}
                                    style={{ marginRight: '8px', width: '16px', height: '16px' }}
                                />
                                📸 需要上傳照片
                            </label>
                            <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                                <input
                                    type="checkbox"
                                    checked={formData.globalRequirements.requiresAcceptance}
                                    onChange={e => setFormData(prev => ({
                                        ...prev,
                                        globalRequirements: { ...prev.globalRequirements, requiresAcceptance: e.target.checked }
                                    }))}
                                    style={{ marginRight: '8px', width: '16px', height: '16px' }}
                                />
                                ✅ 需要驗收
                            </label>
                        </div>
                    </div>
                </div>
            </div>

            {/* 備註區塊 */}
            <div className={styles.section} style={{ background: '#fff8e1' }}>
                <h4 className={styles.sectionTitle}>📝 備註</h4>
                <textarea
                    value={formData.notes}
                    onChange={e => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="輸入備註內容..."
                    style={{
                        width: '100%',
                        minHeight: '80px',
                        padding: '12px',
                        border: '1px solid #e0e0e0',
                        borderRadius: '4px',
                        resize: 'vertical',
                        fontFamily: 'inherit',
                        fontSize: '0.9rem'
                    }}
                />
            </div>

            {/* 觸發類型選擇器 */}
            <TriggerTypeSelector
                value={formData.triggerType}
                onChange={(type) => setFormData(prev => ({ ...prev, triggerType: type }))}
            />

            {/* 設定面板 (依選擇顯示) */}
            {formData.triggerType === 'time' && (
                <TimeBasedConfig
                    config={formData.timeConfig}
                    onChange={(config) => updateConfig('timeConfig', config)}
                />
            )}

            {formData.triggerType === 'counter' && (
                <CounterBasedConfig
                    config={formData.counterConfig}
                    onChange={(config) => updateConfig('counterConfig', config)}
                />
            )}

            {formData.triggerType === 'plc' && (
                <PLCBasedConfig
                    config={formData.plcConfig}
                    onChange={(config) => updateConfig('plcConfig', config)}
                />
            )}

            {formData.triggerType === 'hybrid' && (
                <HybridConfig
                    config={formData.hybridConfig}
                    onChange={(config) => updateConfig('hybridConfig', config)}
                />
            )}

            {/* SOP 與驗收 */}
            <div className={styles.section + ' ' + styles.sopSection}>
                <h4 className={styles.sectionTitle}>SOP & 驗收</h4>

                <div className={styles.inputRow}>
                    <label>SOP 連結 URL</label>
                    <input
                        type="url"
                        value={formData.sopUrl}
                        onChange={e => setFormData(prev => ({ ...prev, sopUrl: e.target.value }))}
                        placeholder="https://company.com/sop/bearing-001"
                        style={{ flex: 1, padding: '8px 12px', border: '1px solid #ccc', borderRadius: '4px' }}
                    />
                </div>

                {/* 驗收項目 */}
                <div style={{ marginTop: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                        <span style={{ fontSize: '0.85rem', color: '#666' }}>
                            驗收項目 ({formData.acceptanceItems.length} 項)
                        </span>
                        <button
                            type="button"
                            onClick={() => setShowAcceptanceModal(true)}
                            style={{
                                padding: '6px 16px',
                                border: '1px solid #2196f3',
                                borderRadius: '4px',
                                background: 'white',
                                color: '#2196f3',
                                cursor: 'pointer',
                                fontSize: '0.85rem',
                                fontWeight: 500
                            }}
                        >
                            + 新增項目
                        </button>
                    </div>

                    {/* 驗收項目預覽 */}
                    <div className={styles.checklistItems}>
                        {formData.acceptanceItems.map(item => (
                            <span
                                key={item.id}
                                style={{
                                    padding: '6px 12px',
                                    background: '#e3f2fd',
                                    borderRadius: '16px',
                                    fontSize: '0.85rem',
                                    color: '#1565c0'
                                }}
                            >
                                ✓ {item.text}
                            </span>
                        ))}
                    </div>
                </div>
            </div>

            {/* 表單操作 */}
            <div className={styles.formActions}>
                <button
                    type="button"
                    className={styles.secondaryBtn}
                    onClick={handleCancel}
                >
                    取消
                </button>
                <button
                    type="button"
                    className={styles.primaryBtn}
                    onClick={handleSave}
                >
                    儲存
                </button>
            </div>

            {/* 驗收項目 Modal */}
            <AcceptanceModal
                isOpen={showAcceptanceModal}
                onClose={() => setShowAcceptanceModal(false)}
                items={formData.acceptanceItems}
                onSave={handleAcceptanceSave}
            />

            {/* 照片管理 Modal */}
            <PhotoModal
                isOpen={showPhotoModal}
                onClose={() => setShowPhotoModal(false)}
                photos={formData.photos}
                onSave={(photos) => setFormData(prev => ({ ...prev, photos }))}
            />
        </div>
    );
};

export default MaintenanceScheduleForm;
