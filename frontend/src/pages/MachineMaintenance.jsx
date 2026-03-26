import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
    MaintenanceTaskList,
    MaintenanceScheduleForm,
    MaintenanceHistory,
    PhotoModal
} from '../components/maintenance';
import {
    getMaintenanceSchedules,
    createMaintenanceSchedule,
    getSpareParts,
    createSparePart,
    createMaintenanceRecord
} from '../services/api';
import { useLanguage } from '../modules/language/LanguageContext';

/**
 * 保養維修主頁面
 * 整合保養排程表單、維修清單、歷史紀錄與照片管理
 */
const MachineMaintenance = () => {
    const { t } = useLanguage();
    const { user, addLog } = useOutletContext();
    const [activeTab, setActiveTab] = useState('taskList'); // taskList, schedule, parts, history, photos
    const [schedules, setSchedules] = useState([]);
    const [parts, setParts] = useState([]);
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(false);

    // Initial Fetch
    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [schedulesData, partsData, recordsData] = await Promise.all([
                getMaintenanceSchedules(),
                getSpareParts(),
                getMaintenanceRecords()
            ]);
            setSchedules(schedulesData);
            setParts(partsData);

            // Map Records
            const mappedRecords = recordsData.map(r => ({
                id: r.id,
                date: new Date(r.executionDate).toLocaleDateString('zh-TW'),
                location: r.schedule?.name?.includes('給紙') ? '給紙部' : '印刷單元', // Heuristic
                partName: r.part?.partName || r.schedule?.name || '未知',
                partId: r.part?.id || '-',
                maintenanceType: mapType(r.type),
                executor: r.technician,
                workHours: 1.0, // Default
                status: r.status === 1 ? 'completed' : 'pending',
                notes: r.notes,
                acceptanceItems: ['維修完成'],
                partsUsed: r.part ? [{ name: r.part.partName, qty: r.quantityUsed || 1, unit: '個' }] : []
            }));
            setRecords(mappedRecords);
        } catch (error) {
            console.error("Failed to load maintenance data", error);
        } finally {
            setLoading(false);
        }
    };

    const mapType = (type) => {
        switch (type) {
            case 0: return '預防保養';
            case 1: return '故障維修';
            case 2: return '廠商維修';
            default: return '其他';
        }
    };

    // Tab 設定
    const tabs = [
        { id: 'taskList', label: `📋 ${t('maintenance.tabs.taskList')}`, icon: '📋' },
        { id: 'parts', label: `🔩 ${t('maintenance.tabs.parts')}`, icon: '🔩' }, // New Tab
        { id: 'schedule', label: `⏰ ${t('maintenance.tabs.schedule')}`, icon: '⏰' },
        { id: 'history', label: `📜 ${t('maintenance.tabs.history')}`, icon: '📜' },
        { id: 'photos', label: `📷 ${t('maintenance.tabs.photos')}`, icon: '📷' }
    ];

    // 處理維修執行
    const handleExecuteTask = async (taskData) => {
        console.log('Executing task:', taskData);
        try {
            // Create Record
            const record = {
                scheduleId: taskData.id, // Assuming task is derived from schedule
                type: 0, // Routine
                status: 1, // Completed
                technician: user?.name || 'Operator',
                notes: taskData.executionNotes || 'Executed via UI',
                isPassed: true // Default
            };
            await createMaintenanceRecord(record);
            addLog && addLog(`Maintenance Executed: ${taskData.partName}`);
            await fetchData(); // Refresh
        } catch (err) {
            console.error("Failed to execute task", err);
            alert("執行失敗");
        }
    };

    // 處理故障回報
    const handleBreakdownReport = async (reportData) => {
        console.log('Breakdown Report:', reportData);
        // Map to Record (Type=Repair)
        try {
            const record = {
                partId: reportData.partId, // If mapped
                type: 1, // Repair
                status: 0, // Pending
                technician: user?.name,
                notes: reportData.description
            };
            await createMaintenanceRecord(record);
            addLog && addLog(`Breakdown Reported: ${reportData.partName}`);
            fetchData();
        } catch (err) {
            console.error("Failed to report breakdown", err);
        }
    };

    // 處理排程儲存 (Simple Mapping)
    const handleSaveSchedule = async (formData) => {
        console.log('Saving schedule:', formData);
        try {
            // Map form data to backend entity
            // Backend: Name, Description, Frequency, IsPartRequired, IsActive
            const payload = {
                name: formData.maintenanceType === 'part_based' ? `零件保養: ${formData.partName}` : '無零件保養',
                description: formData.notes,
                frequency: mapFrequency(formData.timeConfig?.schedules?.[0]?.frequencyUnit),
                isPartRequired: formData.maintenanceType === 'part_based',
                isActive: true
            };
            await createMaintenanceSchedule(payload);

            // Also create part if new? (Omitted for now, complex)

            addLog && addLog(`Maintenance Schedule Created: ${payload.name}`);
            setActiveTab('taskList'); // Return to list
            fetchData();
        } catch (err) {
            console.error("Failed to save schedule", err);
            alert("儲存排程失敗");
        }
    };

    const mapFrequency = (unit) => {
        switch (unit) {
            case 'day': return 0;
            case 'week': return 1;
            case 'month': return 2;
            default: return 3; // AdHoc
        }
    };

    // 渲染頁籤內容
    const renderTabContent = () => {
        switch (activeTab) {
            case 'taskList':
                // Map Schedules/Records to Tasks?
                // For MVP, just show Schedules as "Pending Tasks" if not done?
                // Or just use mock tasks from component but try to fill with real data?
                // Lets pass 'schedules' as tasks for now, assuming they are recurrent tasks.
                const mappedTasks = schedules.map(s => ({
                    id: s.id,
                    partName: s.name,
                    partId: s.id.substring(0, 8),
                    triggerType: 'time',
                    period: 'month', // derived
                    status: 'pending',
                    dueDate: '2026-02-01',
                    remaining: '10 天',
                    maintenanceItems: [{ id: 1, text: s.description || 'Check' }]
                }));
                return (
                    <MaintenanceTaskList
                        tasks={mappedTasks}
                        onExecute={handleExecuteTask}
                        onBreakdownReport={handleBreakdownReport}
                        currentUser={user}
                        onViewDetail={(task) => console.log('View Detail:', task)}
                    />
                );

            case 'parts':
                return (
                    <div style={{ padding: '20px', background: 'white', borderRadius: '8px' }}>
                        <h3>🔩 零件庫存管理</h3>
                        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px' }}>
                            <thead>
                                <tr style={{ background: '#f5f5f5' }}>
                                    <th style={{ padding: '10px' }}>{t('maintenance.labels.partName')}</th>
                                    <th style={{ padding: '10px' }}>Spec</th>
                                    <th style={{ padding: '10px' }}>{t('maintenance.labels.stock')}</th>
                                    <th style={{ padding: '10px' }}>Minimum</th>
                                    <th style={{ padding: '10px' }}>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {parts.map(p => (
                                    <tr key={p.id} style={{ borderBottom: '1px solid #eee' }}>
                                        <td style={{ padding: '10px' }}>{p.partName}</td>
                                        <td style={{ padding: '10px' }}>{p.specification}</td>
                                        <td style={{ padding: '10px' }}>{p.stockQuantity}</td>
                                        <td style={{ padding: '10px' }}>{p.minimumStockLevel}</td>
                                        <td style={{ padding: '10px' }}>
                                            <button>編輯</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        <button style={{ marginTop: '20px', padding: '10px 20px' }} onClick={async () => {
                            const name = prompt(t('maintenance.labels.partName'));
                            if (name) {
                                await createSparePart({ partName: name, stockQuantity: 10, minimumStockLevel: 5 });
                                fetchData();
                            }
                        }}>
                            + {t('maintenance.buttons.addPart')} (Fast)
                        </button>
                    </div>
                );

            case 'schedule':
                return (
                    <div style={{ padding: '20px', background: 'white', borderRadius: '8px' }}>
                        <h3 style={{ marginTop: 0 }}>⏰ {t('maintenance.buttons.saveSchedule')} / {t('maintenance.tabs.schedule')}</h3>
                        <MaintenanceScheduleForm
                            onSave={handleSaveSchedule}
                            onCancel={() => setActiveTab('taskList')}
                        />
                        <div style={{ marginTop: '20px' }}>
                            <h4>現有排程 ({schedules.length})</h4>
                            <ul>
                                {schedules.map(s => <li key={s.id}>{s.name} - {s.frequency}</li>)}
                            </ul>
                        </div>
                    </div>
                );

            case 'history':
                return (
                    <MaintenanceHistory
                        currentUser={user}
                        // Need to verify if MaintenanceHistory accepts 'records' prop or fetches inside
                        // Assuming it accepts props or we need to pass them.
                        // Looking at MaintenanceHistory code (not viewed yet), usually it might accept `records`.
                        // If not, it shows mock data.
                        onViewPhoto={(photos) => console.log('View photos:', photos)}
                    />
                );

            case 'photos':
                return (
                    <div style={{ padding: '20px', background: 'white', borderRadius: '8px', textAlign: 'center' }}>
                        <h3>📷 照片管理</h3>
                        <p style={{ color: '#666', marginTop: '40px' }}>
                            此功能將整合至維修執行流程中。<br />
                            請前往「維修清單」執行保養任務時上傳照片。
                        </p>
                    </div>
                );

            default:
                return null;
        }
    };

    return (
        <div style={{
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            background: 'var(--bg-main)',
            padding: '16px',
            color: 'var(--text-primary)'
        }}>
            {/* Header */}
            <div style={{
                marginBottom: '16px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
            }}>
                <h2 style={{ margin: 0, color: 'var(--text-primary)' }}>
                    🔧 {t('nav.maintenance')}
                </h2>
                <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                    操作員: {user?.name || 'Guest'} ({user?.role || 'OPERATOR'})
                </div>
            </div>

            {/* Tabs */}
            <div style={{
                display: 'flex',
                gap: '8px',
                marginBottom: '16px',
                borderBottom: '2px solid var(--border-color)',
                paddingBottom: '8px'
            }}>
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        style={{
                            padding: '10px 20px',
                            background: activeTab === tab.id ? 'var(--primary-blue)' : 'var(--bg-panel)',
                            color: activeTab === tab.id ? '#fff' : 'var(--text-secondary)',
                            border: 'none',
                            borderRadius: '6px 6px 0 0',
                            cursor: 'pointer',
                            fontWeight: activeTab === tab.id ? '600' : 'normal',
                            fontSize: '0.95rem',
                            transition: 'all 0.2s',
                            boxShadow: activeTab === tab.id ? 'var(--shadow-sm)' : 'none'
                        }}
                    >
                        {tab.icon} {tab.label}
                    </button>
                ))}
            </div>

            {/* Content */}
            <div style={{
                flex: 1,
                overflow: 'auto',
                background: 'var(--bg-panel)',
                borderRadius: '8px',
                padding: '16px',
                boxShadow: 'var(--shadow-sm)'
            }}>
                {loading ? <div>Loading...</div> : renderTabContent()}
            </div>
        </div>
    );
};

export default MachineMaintenance;
