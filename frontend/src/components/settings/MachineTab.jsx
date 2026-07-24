import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../modules/language/LanguageContext';
import styles from '../../pages/SettingsPage.module.css';
import {
    getMachineSections,
    createMachineSection,
    updateMachineSection as apiUpdateSection,
    deleteMachineSection as apiDeleteSection,
    getCommunicationSettings, updateCommunicationSettings
} from '../../services/api';

// 預設機台部位:四色瓦楞印刷線(送止步 → 第1-4色 → 開槽 → 摺貼 → 計數)。
// 用於機台狀態顯示與保養維修的部位選項;首次無部位時種入,亦為「重置為預設」的內容。
const DEFAULT_SECTIONS = [
    { name: '送止步 (Feed-stop)', displayOrder: 1, errorSignal: 'di3', errorValue: '1' },
    { name: '第1色 (Color 1)', displayOrder: 2, errorSignal: 'di4', errorValue: '1' },
    { name: '第2色 (Color 2)', displayOrder: 3, errorSignal: 'di5', errorValue: '1' },
    { name: '第3色 (Color 3)', displayOrder: 4, errorSignal: 'di6', errorValue: '1' },
    { name: '第4色 (Color 4)', displayOrder: 5, errorSignal: 'di7', errorValue: '1' },
    { name: '開槽部 (Slotter)', displayOrder: 6, errorSignal: 'di8', errorValue: '1' },
    { name: '摺貼部 (Folder-Gluer)', displayOrder: 7, errorSignal: 'di9', errorValue: '1' },
    { name: '計數部 (Counter)', displayOrder: 8, errorSignal: 'di10', errorValue: '1' },
];

const MachineTab = () => {
    const { t } = useLanguage();
    // --- Machine Settings State ---
    const [machineSettings, setMachineSettings] = useState(() => {
        const saved = localStorage.getItem('machineSettings');
        // Keep maxSpeed from local, but sections will be fetched
        return saved ? JSON.parse(saved) : {
            maxSpeed: 350, // 機台極速 (張/分)
            sections: []
        };
    });

    // Fetch Machine Sections on Mount
    useEffect(() => {
        const fetchSections = async () => {
            try {
                let sections = await getMachineSections();
                // 首次無部位時種入預設 8 部位(以旗標確保只種一次,避免刪除後又被塞回)
                if ((!sections || sections.length === 0) && !localStorage.getItem('machineSectionsSeeded')) {
                    const created = [];
                    for (const d of DEFAULT_SECTIONS) {
                        created.push(await createMachineSection({ ...d, isActive: true }));
                    }
                    sections = created;
                    localStorage.setItem('machineSectionsSeeded', '1');
                }
                setMachineSettings(prev => ({
                    ...prev,
                    sections: sections || []
                }));
            } catch (error) {
                console.error("Failed to fetch machine sections:", error);
            }
        };
        fetchSections();
    }, []);

    const [selectedSectionId, setSelectedSectionId] = useState(null);
    const [newSectionName, setNewSectionName] = useState('');

    /**
     * 更新機台設定
     * @param {string} key - 設定項目鍵值
            * @param {any} value - 新的值
            */
    const handleMachineChange = (key, value) => {
        setMachineSettings(prev => {
            const newSettings = { ...prev, [key]: value };
            localStorage.setItem('machineSettings', JSON.stringify(newSettings));

            // If maxSpeed changed, sync to Redis for Worker
            if (key === 'maxSpeed') {
                getCommunicationSettings().then(data => {
                    const payload = { ...data, max_speed: value };
                    updateCommunicationSettings(payload).catch(console.error);
                }).catch(console.error);
            }

            return newSettings;
        });
    };

    /**
     * 新增機台部位
     */
    const handleAddSection = async () => {
        if (!newSectionName) {
            alert('請輸入部位名稱 (Please enter Section Name)');
            return;
        }
        const name = newSectionName;

        const maxOrder = machineSettings.sections.length > 0
            ? Math.max(...machineSettings.sections.map(s => s.order))
            : 0;

        const newSectionPayload = {
            name,
            order: maxOrder + 1,
            is_active: true
        };

        try {
            const createdSection = await createMachineSection(newSectionPayload); // API Call returns the created object

            const newSections = [...machineSettings.sections, createdSection];
            // setMachineSettings UPDATE: Don't overwrite whole object, just sections
            setMachineSettings(prev => ({ ...prev, sections: newSections }));
            localStorage.setItem('machineSettings', JSON.stringify({ ...machineSettings, sections: newSections }));

            setSelectedSectionId(createdSection.id);
            setNewSectionName('');
        } catch (error) {
            console.error("Failed to create section:", error);
            alert("新增失敗 (Failed to create section)");
        }
    };

    /**
     * 刪除機台部位
     * @param {string} sectionId - 部位ID
            */
    /**
     * 刪除機台部位
     * @param {string} sectionId - 部位ID
            */
    const handleDeleteSection = async (sectionId) => {
        if (!confirm('確定刪除此部位? (Delete Section?)')) return;

        try {
            await apiDeleteSection(sectionId); // API Call

            const newSections = machineSettings.sections
                .filter(s => s.id !== sectionId)
            // .map((s, idx) => ({...s, order: idx + 1 })); // Skip re-ordering DB for now to avoid multiple requests
            // Just keep local order consistent for display if needed, but 'order' field in DB won't match idx+1 exactly unless we update all.
            // For simplicity, just remove it. The order sorting still works.

            handleMachineChange('sections', newSections);
            if (selectedSectionId === sectionId) {
                setSelectedSectionId(null);
            }
        } catch (error) {
            console.error("Failed to delete section:", error);
            alert("刪除失敗 (Failed to delete section)");
        }
    };

    /**
     * 移動機台部位順序
     * @param {string} sectionId - 部位ID
            * @param {'up' | 'down'} direction - 移動方向
            */
    const handleMoveSection = async (sectionId, direction) => {
        const sections = [...machineSettings.sections].sort((a, b) => a.order - b.order);
        const idx = sections.findIndex(s => s.id === sectionId);

        if (idx === -1) return;
        if (direction === 'up' && idx === 0) return;
        if (direction === 'down' && idx === sections.length - 1) return;

        const targetIdx = direction === 'up' ? idx - 1 : idx + 1;

        // Swap targets
        const currentSection = sections[idx];
        const targetSection = sections[targetIdx];

        // Store new orders
        const newCurrentOrder = targetSection.displayOrder;
        const newTargetOrder = currentSection.displayOrder;

        // Optimistic Update
        const updatedSections = [...sections];
        updatedSections[idx] = { ...currentSection, displayOrder: newCurrentOrder };
        updatedSections[targetIdx] = { ...targetSection, displayOrder: newTargetOrder };

        const sortedSections = updatedSections.sort((a, b) => a.displayOrder - b.displayOrder);
        handleMachineChange('sections', sortedSections);

        // API Update
        try {
            await Promise.all([
                apiUpdateSection(currentSection.id, { displayOrder: newCurrentOrder }),
                apiUpdateSection(targetSection.id, { displayOrder: newTargetOrder })
            ]);
        } catch (error) {
            console.error("Failed to update section order:", error);
            alert("順序更新失敗 (Failed to update order)");
        }
    };

    /**
     * 重置為預設部位
     */
    const handleResetDefaults = async () => {
        if (!confirm('確定重置? 這將刪除現有部位並建立預設值。 (Reset to Defaults?)')) return;

        try {
            // Delete all existing
            for (const s of machineSettings.sections) {
                await apiDeleteSection(s.id);
            }

            // Create defaults
            const created = [];
            for (const d of DEFAULT_SECTIONS) {
                const res = await createMachineSection({ ...d, isActive: true });
                created.push(res);
            }

            setMachineSettings(prev => ({ ...prev, sections: created }));
            localStorage.setItem('machineSettings', JSON.stringify({ ...machineSettings, sections: created }));
            setSelectedSectionId(created.length > 0 ? created[0].id : null);
            alert('已重置為預設值 (Reset Complete)');
        } catch (err) {
            console.error(err);
            alert('重置失敗 (Reset Failed)');
        }
    };

    /**
     * 通用更新部位欄位
     */
    const handleUpdateSectionField = async (sectionId, key, value) => {
        // Optimistic
        const newSections = machineSettings.sections.map(s =>
            s.id === sectionId ? { ...s, [key]: value } : s
        );
        handleMachineChange('sections', newSections); // Save local

        // API
        const section = newSections.find(s => s.id === sectionId);
        try {
            await apiUpdateSection(section);
        } catch (e) { console.error("Update failed", e); }
    };

    /**
     * 渲染機台設定分頁
     */

    const renderMachineTab = () => {
        const sortedSections = [...machineSettings.sections].sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
        const selectedSection = machineSettings.sections.find(s => s.id === selectedSectionId);

        // DI 訊號選項:涵蓋預設部位使用的 di1~di10(原僅到 di8,導致預設 di9/di10 無法選取)
        const signals = [
            { value: '', label: '(None)' },
            ...Array.from({ length: 10 }, (_, i) => ({ value: `di${i + 1}`, label: `DI ${i + 1}` })),
            ...Array.from({ length: 8 }, (_, i) => ({ value: `do${i + 1}`, label: `DO ${i + 1}` })),
            { value: 'status_code', label: 'Status Code' }
        ];

        return (
            <div className={styles.tabContent} style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <h3>{t('settings.machine.title')}</h3>
                <p className={styles.description}>{t('settings.machine.desc')}</p>

                {/* 機台極速設定 */}
                <div className={styles.settingGroup}>
                    <h4>{t('settings.machine.maxSpeed')}</h4>
                    <div className={styles.inputRow}>
                        <label>{t('settings.machine.maxSpeed')}:</label>
                        <input
                            type="number"
                            value={machineSettings.maxSpeed}
                            onChange={e => handleMachineChange('maxSpeed', Number(e.target.value))}
                            style={{ width: '100px' }}
                        />
                        <span>張/分 ({t('common.speed')} unit)</span>
                    </div>
                </div>

                {/* 部位設定 */}
                <div className={styles.settingGroup}>
                    <h4>{t('settings.machine.sections')}</h4>
                    <p style={{ fontSize: '0.85rem', color: '#666', marginBottom: '10px' }}>
                        這些部位將用於機器狀態顯示和保養維修的部位選項
                    </p>

                    <div className={styles.twoColumnLayout}>
                        {/* 左側：部位列表 */}
                        <div className={styles.leftPanel}>
                            <div className={styles.buttonGroup} style={{ marginBottom: '10px', display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                                <input
                                    placeholder={t('settings.machine.sectionName')}
                                    value={newSectionName}
                                    onChange={e => setNewSectionName(e.target.value)}
                                    style={{ padding: '5px', width: '120px' }}
                                />
                                <button className={styles.actionButton} onClick={handleAddSection}>{t('settings.machine.add')}</button>
                                <button
                                    className={styles.actionButton}
                                    onClick={() => handleResetDefaults()}
                                    style={{ backgroundColor: '#666', borderColor: '#666' }}
                                >預設 (Defaults)</button>
                            </div>
                            <div style={{ marginBottom: '5px' }}>
                                <button className={styles.actionButton} onClick={() => handleMoveSection(selectedSectionId, 'up')} disabled={!selectedSectionId}>▲</button>
                                <button className={styles.actionButton} onClick={() => handleMoveSection(selectedSectionId, 'down')} disabled={!selectedSectionId}>▼</button>
                                <button className={styles.actionButton} onClick={() => handleDeleteSection(selectedSectionId)} disabled={!selectedSectionId} style={{ color: 'red' }}>刪除 (Del)</button>
                            </div>

                            <div className={styles.listBox} style={{ minHeight: '300px' }}>
                                {sortedSections.map((section, idx) => (
                                    <div
                                        key={section.id}
                                        className={`${styles.listItem} ${selectedSectionId === section.id ? styles.active : ''}`}
                                        onClick={() => setSelectedSectionId(section.id)}
                                    >
                                        <span style={{ marginRight: '8px', color: '#888', fontSize: '0.85rem' }}>
                                            {idx + 1}.
                                        </span>
                                        <span>{section.name}</span>
                                    </div>
                                ))}
                                {sortedSections.length === 0 && (
                                    <div style={{ padding: '20px', color: '#999', textAlign: 'center' }}>
                                        尚無部位，請點擊「新增」按鈕
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* 右側：選中部位詳情 */}
                        <div className={styles.rightPanel}>
                            {selectedSection ? (
                                <div className={styles.settingGroup}>
                                    <h4>部位詳情 (Section Details)</h4>
                                    <div className={styles.inputRow}>
                                        <label>{t('settings.machine.sectionName')}:</label>
                                        <input
                                            value={selectedSection.name}
                                            onChange={(e) => handleUpdateSectionField(selectedSection.id, 'name', e.target.value)}
                                            style={{ flex: 1 }}
                                        />
                                    </div>
                                    <div className={styles.inputRow}>
                                        <label>順序 (Order):</label>
                                        <span style={{ fontWeight: 'bold' }}>{selectedSection.displayOrder}</span>
                                    </div>
                                    <div className={styles.inputRow}>
                                        <label>故障訊號 (Fault Signal):</label>
                                        <select
                                            value={selectedSection.errorSignal || ''}
                                            onChange={(e) => handleUpdateSectionField(selectedSection.id, 'errorSignal', e.target.value)}
                                            style={{ width: '120px' }}>
                                            {signals.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                                        </select>
                                        <span style={{ margin: '0 5px' }}>Value:</span>
                                        <input
                                            value={selectedSection.errorValue || ''}
                                            onChange={(e) => handleUpdateSectionField(selectedSection.id, 'errorValue', e.target.value)}
                                            placeholder="1"
                                            style={{ width: '60px' }}
                                        />
                                    </div>
                                    <div className={styles.inputRow}>
                                        <label>運作訊號 (Run Signal):</label>
                                        <select
                                            value={selectedSection.runSignal || ''}
                                            onChange={(e) => handleUpdateSectionField(selectedSection.id, 'runSignal', e.target.value)}
                                            style={{ width: '120px' }}>
                                            {signals.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                                        </select>
                                        <span style={{ margin: '0 5px' }}>Value:</span>
                                        <input
                                            value={selectedSection.runValue || ''}
                                            onChange={(e) => handleUpdateSectionField(selectedSection.id, 'runValue', e.target.value)}
                                            placeholder="1"
                                            style={{ width: '60px' }}
                                        />
                                    </div>
                                    <div className={styles.inputRow}>
                                        <label>ID:</label>
                                        <span style={{ color: '#888', fontSize: '0.85rem' }}>{selectedSection.id}</span>
                                    </div>
                                </div>
                            ) : (
                                <div style={{ padding: '40px', color: '#999', textAlign: 'center' }}>
                                    請從左側選擇一個部位以查看詳情
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    };




    return renderMachineTab();
};

export default MachineTab;
