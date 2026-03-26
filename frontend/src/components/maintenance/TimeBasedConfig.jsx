import React from 'react';
import styles from './MaintenanceScheduleForm.module.css';
import StatusIndicator from './StatusIndicator';

/**
 * 週期觸發設定面板 (多重排程版)
 * @param {object} config - 設定資料 (含 schedules 陣列)
 * @param {function} onChange - 變更事件
 */
const TimeBasedConfig = ({ config, onChange }) => {
    const frequencyOptions = [
        { id: 'day', label: '日' },
        { id: 'week', label: '週' },
        { id: 'month', label: '月' },
        { id: 'quarter', label: '季' },
        { id: 'semi-annual', label: '半年' },
        { id: 'year', label: '年' },
        { id: 'custom', label: '自訂' }
    ];

    const schedules = config.schedules || [];

    // 切換週期類型 (新增或移除排程)
    const toggleFrequency = (freqId) => {
        const exists = schedules.find(s => s.frequencyUnit === freqId);
        let newSchedules;

        if (exists) {
            newSchedules = schedules.filter(s => s.frequencyUnit !== freqId);
        } else {
            newSchedules = [...schedules, {
                id: Date.now(),
                frequencyUnit: freqId,
                frequencyValue: 1,
                lastDate: new Date().toISOString().split('T')[0],
                aiEnabled: false
            }];
        }
        onChange({ ...config, schedules: newSchedules });
    };

    // 更新特定排程
    const updateSchedule = (scheduleId, updates) => {
        const newSchedules = schedules.map(s =>
            s.id === scheduleId ? { ...s, ...updates } : s
        );
        onChange({ ...config, schedules: newSchedules });
    };

    // 計算下次保養日期 (Helper)
    const calculateNextDate = (schedule) => {
        if (!schedule.lastDate) return null;
        const lastDate = new Date(schedule.lastDate);
        const value = parseInt(schedule.frequencyValue) || 1;

        switch (schedule.frequencyUnit) {
            case 'day': lastDate.setDate(lastDate.getDate() + value); break;
            case 'week': lastDate.setDate(lastDate.getDate() + value * 7); break;
            case 'month': lastDate.setMonth(lastDate.getMonth() + value); break;
            case 'quarter': lastDate.setMonth(lastDate.getMonth() + value * 3); break;
            case 'semi-annual': lastDate.setMonth(lastDate.getMonth() + value * 6); break;
            case 'year': lastDate.setFullYear(lastDate.getFullYear() + value); break;
            default: lastDate.setDate(lastDate.getDate() + value);
        }
        return lastDate;
    };

    const getStatus = (schedule) => {
        const nextDate = calculateNextDate(schedule);
        if (!nextDate) return { status: 'normal', days: null, dateStr: '' };

        const today = new Date();
        const daysRemaining = Math.ceil((nextDate - today) / (1000 * 60 * 60 * 24));

        let status = 'normal';
        if (daysRemaining <= 0) status = 'danger';
        else if (daysRemaining <= 7) status = 'warning';

        return { status, days: daysRemaining, dateStr: nextDate.toLocaleDateString('zh-TW') };
    };

    return (
        <div className={styles.configPanel}>
            <h5 className={styles.configTitle}>週期觸發設定 (可多選)</h5>

            {/* 週期類型選擇器 */}
            <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', color: '#666' }}>
                    啟用的週期 (點擊切換)
                </label>
                <div className={styles.frequencyButtons}>
                    {frequencyOptions.map(opt => {
                        const isActive = schedules.some(s => s.frequencyUnit === opt.id);
                        return (
                            <button
                                key={opt.id}
                                type="button"
                                className={`${styles.frequencyBtn} ${isActive ? styles.active : ''}`}
                                onClick={() => toggleFrequency(opt.id)}
                            >
                                {opt.label} {isActive && '✓'}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* 排程列表 */}
            {schedules.length === 0 ? (
                <div style={{ padding: '20px', textAlign: 'center', color: '#999', background: '#f9f9f9', borderRadius: '4px' }}>
                    請選擇至少一個週期類型
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {schedules.map((schedule, index) => {
                        const { status, days, dateStr } = getStatus(schedule);
                        const label = frequencyOptions.find(o => o.id === schedule.frequencyUnit)?.label;

                        return (
                            <div key={schedule.id} style={{
                                border: '1px solid #e0e0e0',
                                borderRadius: '8px',
                                padding: '16px',
                                background: '#fff'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                    <span style={{ fontWeight: 600, color: '#1565c0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        ⏰ {label}保養計畫
                                    </span>
                                    <button
                                        onClick={() => toggleFrequency(schedule.frequencyUnit)}
                                        style={{ color: '#f44336', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem' }}
                                        title="移除此排程"
                                    >
                                        ×
                                    </button>
                                </div>

                                {/* 設定內容 */}
                                <div className={styles.inputRow}>
                                    <label>每</label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={schedule.frequencyValue}
                                        onChange={e => updateSchedule(schedule.id, { frequencyValue: e.target.value })}
                                        style={{ width: '80px', textAlign: 'center' }}
                                    />
                                    <span>
                                        {label} 執行一次
                                    </span>
                                </div>

                                <div className={styles.inputRow}>
                                    <label>上次保養</label>
                                    <input
                                        type="date"
                                        value={schedule.lastDate}
                                        onChange={e => updateSchedule(schedule.id, { lastDate: e.target.value })}
                                    />
                                </div>

                                {/* 週期級別的保養支援與需求設定 */}
                                <div style={{
                                    marginTop: '16px',
                                    padding: '14px',
                                    background: schedule.customRequirements?.enabled ? '#fff3e0' : '#f5f5f5',
                                    borderRadius: '8px',
                                    border: schedule.customRequirements?.enabled ? '2px solid #ff9800' : '1px solid #e0e0e0'
                                }}>
                                    <label style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        cursor: 'pointer',
                                        fontWeight: 500,
                                        color: schedule.customRequirements?.enabled ? '#e65100' : '#666',
                                        marginBottom: schedule.customRequirements?.enabled ? '12px' : 0
                                    }}>
                                        <input
                                            type="checkbox"
                                            checked={schedule.customRequirements?.enabled || false}
                                            onChange={e => updateSchedule(schedule.id, {
                                                customRequirements: {
                                                    ...(schedule.customRequirements || {}),
                                                    enabled: e.target.checked,
                                                    supportType: schedule.customRequirements?.supportType || 'maintenance',
                                                    requiresMeasurement: schedule.customRequirements?.requiresMeasurement || false,
                                                    requiresPhoto: schedule.customRequirements?.requiresPhoto || false,
                                                    requiresAcceptance: schedule.customRequirements?.requiresAcceptance || false
                                                }
                                            })}
                                            style={{ marginRight: '8px', width: '16px', height: '16px' }}
                                        />
                                        🔄 自訂此週期的支援與需求設定
                                        <span style={{ fontSize: '0.75rem', color: '#999', marginLeft: '8px', fontWeight: 400 }}>
                                            {schedule.customRequirements?.enabled ? '（覆蓋全局設定）' : '（使用全局設定）'}
                                        </span>
                                    </label>

                                    {schedule.customRequirements?.enabled && (
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                            {/* 支援單位 */}
                                            <div>
                                                <label style={{ fontSize: '0.85rem', color: '#555', display: 'block', marginBottom: '6px' }}>支援單位</label>
                                                <div style={{ display: 'flex', gap: '12px' }}>
                                                    <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', fontSize: '0.9rem' }}>
                                                        <input
                                                            type="radio"
                                                            name={`supportType_${schedule.id}`}
                                                            value="maintenance"
                                                            checked={schedule.customRequirements?.supportType === 'maintenance'}
                                                            onChange={e => updateSchedule(schedule.id, {
                                                                customRequirements: { ...schedule.customRequirements, supportType: e.target.value }
                                                            })}
                                                            style={{ marginRight: '4px' }}
                                                        />
                                                        🔧 工務
                                                    </label>
                                                    <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', fontSize: '0.9rem' }}>
                                                        <input
                                                            type="radio"
                                                            name={`supportType_${schedule.id}`}
                                                            value="vendor"
                                                            checked={schedule.customRequirements?.supportType === 'vendor'}
                                                            onChange={e => updateSchedule(schedule.id, {
                                                                customRequirements: { ...schedule.customRequirements, supportType: e.target.value }
                                                            })}
                                                            style={{ marginRight: '4px' }}
                                                        />
                                                        🏢 廠商
                                                    </label>
                                                </div>
                                            </div>

                                            {/* 執行需求 */}
                                            <div>
                                                <label style={{ fontSize: '0.85rem', color: '#555', display: 'block', marginBottom: '6px' }}>執行需求</label>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                    <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', fontSize: '0.85rem' }}>
                                                        <input
                                                            type="checkbox"
                                                            checked={schedule.customRequirements?.requiresMeasurement || false}
                                                            onChange={e => updateSchedule(schedule.id, {
                                                                customRequirements: { ...schedule.customRequirements, requiresMeasurement: e.target.checked }
                                                            })}
                                                            style={{ marginRight: '6px', width: '14px', height: '14px' }}
                                                        />
                                                        📏 量測值
                                                    </label>
                                                    <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', fontSize: '0.85rem' }}>
                                                        <input
                                                            type="checkbox"
                                                            checked={schedule.customRequirements?.requiresPhoto || false}
                                                            onChange={e => updateSchedule(schedule.id, {
                                                                customRequirements: { ...schedule.customRequirements, requiresPhoto: e.target.checked }
                                                            })}
                                                            style={{ marginRight: '6px', width: '14px', height: '14px' }}
                                                        />
                                                        📸 照片
                                                    </label>
                                                    <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', fontSize: '0.85rem' }}>
                                                        <input
                                                            type="checkbox"
                                                            checked={schedule.customRequirements?.requiresAcceptance || false}
                                                            onChange={e => updateSchedule(schedule.id, {
                                                                customRequirements: { ...schedule.customRequirements, requiresAcceptance: e.target.checked }
                                                            })}
                                                            style={{ marginRight: '6px', width: '14px', height: '14px' }}
                                                        />
                                                        ✅ 驗收
                                                    </label>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* 狀態顯示 */}
                                {dateStr && (
                                    <div className={`${styles.statusDisplay} ${styles[status]}`} style={{ marginTop: '8px', padding: '8px 12px' }}>
                                        <span>📅 下次: {dateStr}</span>
                                        <span style={{ fontSize: '0.85rem' }}>(剩 {days} 天)</span>
                                        <StatusIndicator status={status} />
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default TimeBasedConfig;
