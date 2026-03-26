import React, { useState } from 'react';

/**
 * 維修履歷表
 * 顯示已完成的維修紀錄，支援日期查詢和 Excel 匯出
 */
const MaintenanceHistory = ({ records = [] }) => {
    // Filter State
    const [filterInputs, setFilterInputs] = useState({
        startDate: '',
        endDate: '',
        location: '',
        partName: ''
    });

    const [activeFilters, setActiveFilters] = useState({
        startDate: '',
        endDate: '',
        location: '',
        partName: ''
    });

    const [expandedId, setExpandedId] = useState(null);

    // 模擬資料 (實際應從 API 取得)
    const mockRecords = records.length > 0 ? records : [
        {
            id: 1,
            date: '2026-01-12',
            location: '印刷單元',
            partName: '主軸承',
            partId: 'BEARING-001',
            maintenanceType: '預防保養',
            executor: '王小明',
            workHours: 2.5,
            status: 'completed',
            notes: '更換軸承潤滑油，檢查軸承間隙正常',
            acceptanceItems: ['安裝正確', '扭力符合', '無異音', '運轉正常'],
            partsUsed: [{ name: '潤滑油', qty: 1, unit: '公升' }]
        },
        {
            id: 2,
            date: '2026-01-10',
            location: '印刷單元',
            partName: '刮墨刀',
            partId: 'BLADE-001',
            maintenanceType: '更換',
            executor: '李大華',
            workHours: 1.0,
            status: 'completed',
            notes: '刮墨刀磨損嚴重，已更換新品',
            acceptanceItems: ['安裝正確', '刮墨乾淨'],
            partsUsed: [{ name: '刮墨刀', qty: 1, unit: '支' }]
        },
        {
            id: 3,
            date: '2026-01-08',
            location: '收紙部',
            partName: '皮帶',
            partId: 'BELT-001',
            maintenanceType: '故障維修',
            executor: '張三',
            workHours: 3.5,
            status: 'completed',
            notes: '皮帶斷裂，緊急更換並調整張力',
            acceptanceItems: ['安裝正確', '張力正常', '運轉正常'],
            partsUsed: [{ name: 'V型皮帶', qty: 2, unit: '條' }]
        },
        {
            id: 4,
            date: '2026-01-05',
            location: '給紙部',
            partName: '墨輥',
            partId: 'ROLLER-001',
            maintenanceType: '定期清潔',
            executor: '王小明',
            workHours: 1.5,
            status: 'completed',
            notes: '清潔墨輥表面，檢查無損傷',
            acceptanceItems: ['表面乾淨', '無損傷'],
            partsUsed: []
        }
    ];

    // Handle Input Change
    const handleInputChange = (field, value) => {
        setFilterInputs(prev => ({ ...prev, [field]: value }));
    };

    // Confirm Search
    const handleSearch = () => {
        setActiveFilters(filterInputs);
    };

    // Clear Filters
    const handleClear = () => {
        const resetState = { startDate: '', endDate: '', location: '', partName: '' };
        setFilterInputs(resetState);
        setActiveFilters(resetState);
    };

    // 篩選紀錄
    const filteredRecords = mockRecords.filter(record => {
        if (activeFilters.startDate && record.date < activeFilters.startDate) return false;
        if (activeFilters.endDate && record.date > activeFilters.endDate) return false;
        if (activeFilters.location && !record.location.includes(activeFilters.location)) return false;
        if (activeFilters.partName && !record.partName.includes(activeFilters.partName) && !record.partId.includes(activeFilters.partName)) return false;
        return true;
    });

    // 計算統計
    const totalHours = filteredRecords.reduce((sum, r) => sum + r.workHours, 0);
    const totalParts = filteredRecords.reduce((sum, r) => sum + r.partsUsed.length, 0);

    // Excel 匯出
    const handleExportExcel = () => {
        // 建立 CSV 內容 (可用 xlsx 套件改為真正 Excel)
        const headers = ['日期', '部位', '零件名稱', '料號', '維修類型', '執行人', '工時', '狀態', '備註'];
        const rows = filteredRecords.map(r => [
            r.date,
            r.location,
            r.partName,
            r.partId,
            r.maintenanceType,
            r.executor,
            r.workHours,
            r.status === 'completed' ? '完成' : '其他',
            r.notes
        ]);

        // 加入 BOM 以支援中文
        const BOM = '\uFEFF';
        const csvContent = BOM + [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n');

        // 下載
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `維修履歷_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        URL.revokeObjectURL(url);

        alert('已匯出 CSV 檔案 (可用 Excel 開啟)');
    };

    // 取得維修類型樣式
    const getTypeStyle = (type) => {
        switch (type) {
            case '預防保養':
                return { bg: '#e8f5e9', color: '#2e7d32' };
            case '更換':
                return { bg: '#fff3e0', color: '#e65100' };
            case '故障維修':
                return { bg: '#ffebee', color: '#c62828' };
            case '定期清潔':
                return { bg: '#e3f2fd', color: '#1565c0' };
            default:
                return { bg: '#f5f5f5', color: '#666' };
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
                <h3 style={{ margin: 0, color: '#333' }}>
                    📜 維修履歷表
                </h3>
                <button
                    onClick={handleExportExcel}
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
                    📥 匯出 Excel
                </button>
            </div>

            {/* Filter Bar */}
            <div style={{
                display: 'flex',
                gap: '12px',
                marginBottom: '16px',
                alignItems: 'center',
                flexWrap: 'wrap',
                background: '#fff',
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid #e0e0e0'
            }}>
                {/* Date Range */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ color: '#666', fontSize: '0.9rem' }}>日期:</span>
                    <input
                        type="date"
                        value={filterInputs.startDate}
                        onChange={e => handleInputChange('startDate', e.target.value)}
                        style={{ padding: '6px 10px', border: '1px solid #ccc', borderRadius: '4px' }}
                    />
                    <span>~</span>
                    <input
                        type="date"
                        value={filterInputs.endDate}
                        onChange={e => handleInputChange('endDate', e.target.value)}
                        style={{ padding: '6px 10px', border: '1px solid #ccc', borderRadius: '4px' }}
                    />
                </div>

                {/* Filters */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input
                        type="text"
                        placeholder="部位 (e.g. 印刷單元)"
                        value={filterInputs.location}
                        onChange={e => handleInputChange('location', e.target.value)}
                        style={{ padding: '6px 10px', border: '1px solid #ccc', borderRadius: '4px', width: '140px' }}
                    />
                    <input
                        type="text"
                        placeholder="零部件名稱/料號"
                        value={filterInputs.partName}
                        onChange={e => handleInputChange('partName', e.target.value)}
                        style={{ padding: '6px 10px', border: '1px solid #ccc', borderRadius: '4px', width: '160px' }}
                    />
                </div>

                {/* Actions */}
                <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
                    <button
                        onClick={handleSearch}
                        style={{
                            padding: '6px 16px',
                            background: '#2196f3',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontWeight: 500
                        }}
                    >
                        確認
                    </button>
                    <button
                        onClick={handleClear}
                        style={{
                            padding: '6px 16px',
                            background: '#f5f5f5',
                            border: '1px solid #e0e0e0',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            color: '#666'
                        }}
                    >
                        清除
                    </button>
                </div>
            </div>

            {/* Statistics */}
            <div style={{
                display: 'flex',
                gap: '24px',
                marginBottom: '16px',
                padding: '16px',
                background: '#f5f5f5',
                borderRadius: '8px'
            }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: 600, color: '#1565c0' }}>
                        {filteredRecords.length}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: '#666' }}>筆紀錄</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: 600, color: '#2e7d32' }}>
                        {totalHours.toFixed(1)}h
                    </div>
                    <div style={{ fontSize: '0.85rem', color: '#666' }}>總工時</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: 600, color: '#e65100' }}>
                        {totalParts}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: '#666' }}>使用零件</div>
                </div>
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
                            <th style={{ padding: '12px', textAlign: 'center', borderBottom: '1px solid #e0e0e0', width: '100px' }}>日期</th>
                            <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e0e0e0', width: '100px' }}>部位</th>
                            <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e0e0e0' }}>零件名稱</th>
                            <th style={{ padding: '12px', textAlign: 'center', borderBottom: '1px solid #e0e0e0', width: '100px' }}>維修類型</th>
                            <th style={{ padding: '12px', textAlign: 'center', borderBottom: '1px solid #e0e0e0', width: '80px' }}>執行人</th>
                            <th style={{ padding: '12px', textAlign: 'center', borderBottom: '1px solid #e0e0e0', width: '70px' }}>工時</th>
                            <th style={{ padding: '12px', textAlign: 'center', borderBottom: '1px solid #e0e0e0', width: '80px' }}>狀態</th>
                            <th style={{ padding: '12px', textAlign: 'center', borderBottom: '1px solid #e0e0e0', width: '60px' }}>展開</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredRecords.map((record, index) => {
                            const typeStyle = getTypeStyle(record.maintenanceType);
                            const isExpanded = expandedId === record.id;
                            return (
                                <React.Fragment key={record.id}>
                                    <tr style={{
                                        background: index % 2 === 0 ? 'white' : '#fafafa',
                                        borderBottom: isExpanded ? 'none' : '1px solid #f0f0f0',
                                        cursor: 'pointer'
                                    }}
                                        onClick={() => setExpandedId(isExpanded ? null : record.id)}
                                    >
                                        <td style={{ padding: '12px', textAlign: 'center' }}>
                                            {record.date}
                                        </td>
                                        <td style={{ padding: '12px' }}>
                                            {record.location}
                                        </td>
                                        <td style={{ padding: '12px' }}>
                                            <div style={{ fontWeight: 500 }}>{record.partName}</div>
                                            <div style={{ fontSize: '0.8rem', color: '#999' }}>{record.partId}</div>
                                        </td>
                                        <td style={{ padding: '12px', textAlign: 'center' }}>
                                            <span style={{
                                                padding: '4px 10px',
                                                background: typeStyle.bg,
                                                color: typeStyle.color,
                                                borderRadius: '12px',
                                                fontSize: '0.8rem'
                                            }}>
                                                {record.maintenanceType}
                                            </span>
                                        </td>
                                        <td style={{ padding: '12px', textAlign: 'center' }}>
                                            {record.executor}
                                        </td>
                                        <td style={{ padding: '12px', textAlign: 'center' }}>
                                            {record.workHours}h
                                        </td>
                                        <td style={{ padding: '12px', textAlign: 'center' }}>
                                            <span style={{
                                                padding: '4px 10px',
                                                background: '#e8f5e9',
                                                color: '#2e7d32',
                                                borderRadius: '12px',
                                                fontSize: '0.8rem'
                                            }}>
                                                ✅ 完成
                                            </span>
                                        </td>
                                        <td style={{ padding: '12px', textAlign: 'center' }}>
                                            <span style={{ fontSize: '0.9rem' }}>
                                                {isExpanded ? '▲' : '▼'}
                                            </span>
                                        </td>
                                    </tr>
                                    {/* Expanded Detail */}
                                    {isExpanded && (
                                        <tr>
                                            <td colSpan={8} style={{
                                                padding: '16px 24px',
                                                background: '#f9f9f9',
                                                borderBottom: '1px solid #e0e0e0'
                                            }}>
                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                                    <div>
                                                        <strong>維修備註:</strong>
                                                        <p style={{ margin: '8px 0', color: '#666' }}>{record.notes}</p>
                                                    </div>
                                                    <div>
                                                        <strong>驗收項目:</strong>
                                                        <div style={{ display: 'flex', gap: '8px', marginTop: '8px', flexWrap: 'wrap' }}>
                                                            {record.acceptanceItems.map((item, i) => (
                                                                <span key={i} style={{
                                                                    padding: '4px 10px',
                                                                    background: '#e3f2fd',
                                                                    borderRadius: '12px',
                                                                    fontSize: '0.8rem',
                                                                    color: '#1565c0'
                                                                }}>
                                                                    ✓ {item}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                    {record.partsUsed.length > 0 && (
                                                        <div>
                                                            <strong>使用零件:</strong>
                                                            <ul style={{ margin: '8px 0', paddingLeft: '20px', color: '#666' }}>
                                                                {record.partsUsed.map((part, i) => (
                                                                    <li key={i}>{part.name} x {part.qty} {part.unit}</li>
                                                                ))}
                                                            </ul>
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            );
                        })}
                        {filteredRecords.length === 0 && (
                            <tr>
                                <td colSpan={8} style={{ padding: '48px', textAlign: 'center', color: '#999' }}>
                                    無符合條件的維修紀錄
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default MaintenanceHistory;
