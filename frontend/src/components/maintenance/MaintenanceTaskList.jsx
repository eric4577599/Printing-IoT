import React, { useState } from 'react';
import MaintenanceExecutionModal from './MaintenanceExecutionModal';
import BreakdownReportingModal from './BreakdownReportingModal';

/**
 * 維修清單總表
 * 顯示所有零部件的保養任務，支援週期篩選
 */
const MaintenanceTaskList = ({ tasks = [], onExecute, onViewDetail, onBreakdownReport, currentUser }) => {
    const [periodFilter, setPeriodFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');
    const [searchText, setSearchText] = useState('');

    // Execution Modal State
    const [showExecutionModal, setShowExecutionModal] = useState(false);
    const [selectedTask, setSelectedTask] = useState(null);

    // Breakdown Modal State
    const [showBreakdownModal, setShowBreakdownModal] = useState(false);

    // 週期選項
    const periodOptions = [
        { id: 'all', label: '全部週期' },
        { id: 'day', label: '日保養' },
        { id: 'week', label: '週保養' },
        { id: 'month', label: '月保養' },
        { id: 'quarter', label: '季保養' },
        { id: 'semi-annual', label: '半年保養' },
        { id: 'year', label: '年保養' }
    ];

    // 狀態選項
    const statusOptions = [
        { id: 'all', label: '全部狀態' },
        { id: 'pending', label: '待執行' },
        { id: 'inProgress', label: '進行中' },
        { id: 'overdue', label: '逾期' }
    ];

    // 模擬資料 (實際應從 API 取得)
    const mockTasks = tasks.length > 0 ? tasks : [
        {
            id: 1,
            partName: '主軸承',
            partId: 'BEARING-001',
            triggerType: 'counter',
            period: 'month',
            status: 'pending',
            dueDate: '2026-01-15',
            remaining: '15,000 張',
            maintenanceItems: [
                { id: 101, text: '檢查軸承間隙' },
                { id: 102, text: '補充潤滑油 (Grease)' },
                { id: 103, text: '確認溫度感測器讀值' }
            ]
        },
        {
            id: 2,
            partName: '皮帶',
            partId: 'BELT-001',
            triggerType: 'plc',
            period: 'quarter',
            status: 'normal',
            dueDate: '2026-03-01',
            remaining: '1,500 小時',
            maintenanceItems: [
                { id: 201, text: '檢查皮帶張力' },
                { id: 202, text: '目視檢查是否有裂痕' }
            ]
        },
        {
            id: 3,
            partName: '刮墨刀',
            partId: 'BLADE-001',
            triggerType: 'time',
            period: 'week',
            status: 'overdue',
            dueDate: '2026-01-10',
            remaining: '已逾期 2 天',
            maintenanceItems: [
                { id: 301, text: '檢查刀口磨損情形' },
                { id: 302, text: '清潔刀座' }
            ]
        },
        {
            id: 4,
            partName: '墨輥',
            partId: 'ROLLER-001',
            triggerType: 'time',
            period: 'day',
            status: 'pending',
            dueDate: '2026-01-13',
            remaining: '1 天後',
            maintenanceItems: [
                { id: 401, text: '表面清潔' },
                { id: 402, text: '檢查是否有硬物刮痕' }
            ]
        },
        {
            id: 5,
            partName: '馬達',
            partId: 'MOTOR-001',
            triggerType: 'plc',
            period: 'semi-annual',
            status: 'normal',
            dueDate: '2026-06-01',
            remaining: '4,500 小時',
            maintenanceItems: [
                { id: 501, text: '測量絕緣電阻' },
                { id: 502, text: '清潔散熱風扇' }
            ]
        },
        {
            id: 6,
            partName: '機台清潔',
            partId: 'CLEAN-001',
            triggerType: 'time',
            period: 'year',
            status: 'normal',
            dueDate: '2027-01-01',
            remaining: '354 天',
            maintenanceItems: [
                { id: 601, text: '全機大保養' },
                { id: 602, text: '重新校正水平' }
            ]
        }
    ];

    const finalTasks = tasks.length > 0 ? tasks : mockTasks;

    // 處理點擊執行
    const handleExecuteClick = (task) => {
        setSelectedTask(task);
        setShowExecutionModal(true);
    };

    // 處理確認執行
    const handleConfirmExecution = (data) => {
        console.log('Execution Data:', data);
        alert('維修紀錄已保存！');
        // 這裡未來會串接 API 提交資料
        // 並更新列表狀態
        if (onExecute) onExecute(data);
    };

    // 處理故障回報提交
    const handleBreakdownSubmit = (data) => {
        if (onBreakdownReport) onBreakdownReport(data);
        setShowBreakdownModal(false);
    };

    // 篩選任務
    const filteredTasks = finalTasks.filter(task => {
        const matchPeriod = periodFilter === 'all' || task.period === periodFilter;
        const matchStatus = statusFilter === 'all' || task.status === statusFilter;
        const matchSearch = !searchText ||
            task.partName.toLowerCase().includes(searchText.toLowerCase()) ||
            task.partId.toLowerCase().includes(searchText.toLowerCase());
        return matchPeriod && matchStatus && matchSearch;
    });

    // 取得觸發類型圖示
    const getTriggerIcon = (type) => {
        switch (type) {
            case 'time': return '📅';
            case 'counter': return '🔢';
            case 'plc': return '⚙️';
            case 'hybrid': return '🔀';
            default: return '📋';
        }
    };

    // 取得週期標籤
    const getPeriodLabel = (period) => {
        const opt = periodOptions.find(p => p.id === period);
        return opt ? opt.label.replace('保養', '') : period;
    };

    // 取得狀態樣式
    const getStatusStyle = (status) => {
        switch (status) {
            case 'overdue':
                return { bg: '#ffebee', color: '#c62828', icon: '🔴', label: '逾期' };
            case 'pending':
                return { bg: '#fff8e1', color: '#f57c00', icon: '🟡', label: '即將到期' };
            case 'inProgress':
                return { bg: '#e3f2fd', color: '#1565c0', icon: '🔵', label: '進行中' };
            default:
                return { bg: '#e8f5e9', color: '#2e7d32', icon: '🟢', label: '正常' };
        }
    };

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* Header */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '16px'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <h3 style={{ margin: 0, color: '#333' }}>
                        📋 維修清單總表
                    </h3>
                    <button
                        onClick={() => setShowBreakdownModal(true)}
                        style={{
                            padding: '6px 14px',
                            background: '#d32f2f',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px',
                            fontWeight: 600
                        }}
                    >
                        ⚠️ 故障回報
                    </button>
                </div>

                <button
                    onClick={() => window.location.reload()}
                    style={{
                        padding: '8px 16px',
                        background: '#f5f5f5',
                        border: '1px solid #e0e0e0',
                        borderRadius: '4px',
                        cursor: 'pointer'
                    }}
                >
                    🔄 重整
                </button>
            </div>

            {/* Filters */}
            <div style={{
                display: 'flex',
                gap: '12px',
                marginBottom: '16px',
                flexWrap: 'wrap',
                alignItems: 'center'
            }}>
                {/* 週期篩選 */}
                <select
                    value={periodFilter}
                    onChange={e => setPeriodFilter(e.target.value)}
                    style={{
                        padding: '8px 12px',
                        border: '1px solid #ccc',
                        borderRadius: '4px',
                        fontSize: '0.9rem'
                    }}
                >
                    {periodOptions.map(opt => (
                        <option key={opt.id} value={opt.id}>{opt.label}</option>
                    ))}
                </select>

                {/* 狀態篩選 */}
                <select
                    value={statusFilter}
                    onChange={e => setStatusFilter(e.target.value)}
                    style={{
                        padding: '8px 12px',
                        border: '1px solid #ccc',
                        borderRadius: '4px',
                        fontSize: '0.9rem'
                    }}
                >
                    {statusOptions.map(opt => (
                        <option key={opt.id} value={opt.id}>{opt.label}</option>
                    ))}
                </select>

                {/* 搜尋 */}
                <input
                    type="text"
                    placeholder="🔍 搜尋零件名稱或料號..."
                    value={searchText}
                    onChange={e => setSearchText(e.target.value)}
                    style={{
                        padding: '8px 12px',
                        border: '1px solid #ccc',
                        borderRadius: '4px',
                        fontSize: '0.9rem',
                        flex: 1,
                        minWidth: '200px'
                    }}
                />

                <span style={{ color: '#666', fontSize: '0.85rem' }}>
                    共 {filteredTasks.length} 項
                </span>
            </div>

            {/* Table */}
            <div style={{
                flex: 1,
                overflow: 'auto',
                background: 'white',
                borderRadius: '8px',
                border: '1px solid #e0e0e0'
            }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ background: '#f5f5f5', position: 'sticky', top: 0 }}>
                            <th style={{ padding: '12px', textAlign: 'center', borderBottom: '1px solid #e0e0e0', width: '60px' }}>序號</th>
                            <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e0e0e0' }}>零件名稱</th>
                            <th style={{ padding: '12px', textAlign: 'center', borderBottom: '1px solid #e0e0e0', width: '100px' }}>週期</th>
                            <th style={{ padding: '12px', textAlign: 'center', borderBottom: '1px solid #e0e0e0', width: '80px' }}>觸發類型</th>
                            <th style={{ padding: '12px', textAlign: 'center', borderBottom: '1px solid #e0e0e0', width: '100px' }}>狀態</th>
                            <th style={{ padding: '12px', textAlign: 'center', borderBottom: '1px solid #e0e0e0', width: '100px' }}>到期日</th>
                            <th style={{ padding: '12px', textAlign: 'center', borderBottom: '1px solid #e0e0e0', width: '120px' }}>剩餘</th>
                            <th style={{ padding: '12px', textAlign: 'center', borderBottom: '1px solid #e0e0e0', width: '140px' }}>操作</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredTasks.map((task, index) => {
                            const statusStyle = getStatusStyle(task.status);
                            return (
                                <tr key={task.id} style={{
                                    background: index % 2 === 0 ? 'white' : '#fafafa',
                                    borderBottom: '1px solid #f0f0f0'
                                }}>
                                    <td style={{ padding: '12px', textAlign: 'center', color: '#999' }}>
                                        {index + 1}
                                    </td>
                                    <td style={{ padding: '12px' }}>
                                        <div style={{ fontWeight: 500 }}>{task.partName}</div>
                                        <div style={{ fontSize: '0.8rem', color: '#999' }}>{task.partId}</div>
                                    </td>
                                    <td style={{ padding: '12px', textAlign: 'center' }}>
                                        <span style={{
                                            padding: '4px 10px',
                                            background: '#e3f2fd',
                                            borderRadius: '12px',
                                            fontSize: '0.8rem',
                                            color: '#1565c0'
                                        }}>
                                            {getPeriodLabel(task.period)}
                                        </span>
                                    </td>
                                    <td style={{ padding: '12px', textAlign: 'center' }}>
                                        {getTriggerIcon(task.triggerType)}
                                    </td>
                                    <td style={{ padding: '12px', textAlign: 'center' }}>
                                        <span style={{
                                            padding: '4px 10px',
                                            background: statusStyle.bg,
                                            color: statusStyle.color,
                                            borderRadius: '12px',
                                            fontSize: '0.8rem'
                                        }}>
                                            {statusStyle.icon} {statusStyle.label}
                                        </span>
                                    </td>
                                    <td style={{ padding: '12px', textAlign: 'center', fontSize: '0.9rem' }}>
                                        {task.dueDate}
                                    </td>
                                    <td style={{ padding: '12px', textAlign: 'center', fontSize: '0.85rem', color: '#666' }}>
                                        {task.remaining}
                                    </td>
                                    <td style={{ padding: '12px', textAlign: 'center' }}>
                                        <button
                                            onClick={() => handleExecuteClick(task)}
                                            style={{
                                                padding: '6px 12px',
                                                background: '#4CAF50',
                                                color: 'white',
                                                border: 'none',
                                                borderRadius: '4px',
                                                cursor: 'pointer',
                                                marginRight: '6px',
                                                fontSize: '0.8rem'
                                            }}
                                        >
                                            執行
                                        </button>
                                        <button
                                            onClick={() => onViewDetail && onViewDetail(task)}
                                            style={{
                                                padding: '6px 12px',
                                                background: 'white',
                                                color: '#2196f3',
                                                border: '1px solid #2196f3',
                                                borderRadius: '4px',
                                                cursor: 'pointer',
                                                fontSize: '0.8rem'
                                            }}
                                        >
                                            詳情
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                        {filteredTasks.length === 0 && (
                            <tr>
                                <td colSpan={8} style={{ padding: '48px', textAlign: 'center', color: '#999' }}>
                                    無符合條件的維修任務
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Execution Modal */}
            <MaintenanceExecutionModal
                isOpen={showExecutionModal}
                onClose={() => setShowExecutionModal(false)}
                task={selectedTask}
                onConfirm={handleConfirmExecution}
                currentUser={currentUser}
            />

            {/* Breakdown Reporting Modal */}
            <BreakdownReportingModal
                isOpen={showBreakdownModal}
                onClose={() => setShowBreakdownModal(false)}
                parts={finalTasks}
                onSubmit={handleBreakdownSubmit}
                currentUser={currentUser}
            />
        </div>
    );
};

export default MaintenanceTaskList;
