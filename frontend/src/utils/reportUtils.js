/**
 * 報表工具函式庫
 * 提供日期處理、統計計算等共用功能
 */

/**
 * 格式化日期
 * @param {string|Date} date - 日期物件或 ISO 字串
 * @param {string} format - 格式 ('YYYY-MM-DD', 'YYYY/MM/DD', 'YYYY-MM-DD HH:mm:ss')
 * @returns {string} 格式化後的日期字串
 */
export function formatDate(date, format = 'YYYY-MM-DD') {
    const d = typeof date === 'string' ? new Date(date) : date;
    if (!(d instanceof Date) || isNaN(d)) return '-';

    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const seconds = String(d.getSeconds()).padStart(2, '0');

    return format
        .replace('YYYY', year)
        .replace('MM', month)
        .replace('DD', day)
        .replace('HH', hours)
        .replace('mm', minutes)
        .replace('ss', seconds);
}

/**
 * 依日期範圍篩選記錄
 * @param {Array} records - 生產記錄陣列
 * @param {string} startDate - 開始日期 (YYYY-MM-DD)
 * @param {string} endDate - 結束日期 (YYYY-MM-DD)
 * @returns {Array} 篩選後的記錄
 */
export function filterByDateRange(records, startDate, endDate) {
    if (!startDate || !endDate) return records;

    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999); // 包含結束日期整天

    return records.filter(record => {
        const recordDate = new Date(record.date);
        return recordDate >= start && recordDate <= end;
    });
}

/**
 * 依班別篩選記錄
 * @param {Array} records - 生產記錄陣列
 * @param {string} shift - 班別 ('全部', 'A', 'B', 'C', 'Day', 'Night')
 * @returns {Array} 篩選後的記錄
 */
export function filterByShift(records, shift) {
    if (!shift || shift === '全部') return records;
    return records.filter(record => record.shift === shift);
}

/**
 * 依日期分組記錄
 * @param {Array} records - 生產記錄陣列
 * @returns {Object} 以日期為 key 的分組物件
 */
export function groupByDate(records) {
    return records.reduce((groups, record) => {
        const date = record.date;
        if (!groups[date]) groups[date] = [];
        groups[date].push(record);
        return groups;
    }, {});
}

/**
 * 計算陣列欄位總和
 * @param {Array} array - 資料陣列
 * @param {string} field - 欄位名稱
 * @returns {number} 總和
 */
export function sum(array, field) {
    return array.reduce((total, item) => total + (Number(item[field]) || 0), 0);
}

/**
 * 計算陣列欄位平均值
 * @param {Array} array - 資料陣列
 * @param {string} field - 欄位名稱
 * @returns {number} 平均值
 */
export function average(array, field) {
    if (array.length === 0) return 0;
    return sum(array, field) / array.length;
}

/**
 * 計算良率
 * @param {number} goodQty - 良品數量
 * @param {number} defectQty - 不良品數量
 * @returns {number} 良率百分比 (0-100)
 */
export function calculateYieldRate(goodQty, defectQty) {
    const total = goodQty + defectQty;
    if (total === 0) return 0;
    return (goodQty / total) * 100;
}

/**
 * 計算達成率
 * @param {number} actualQty - 實際數量
 * @param {number} targetQty - 目標數量
 * @returns {number} 達成率百分比 (0-100+)
 */
export function calculateAchievementRate(actualQty, targetQty) {
    if (targetQty === 0) return 0;
    return (actualQty / targetQty) * 100;
}

/**
 * 計算稼動率
 * @param {number} runTime - 運轉時間（分鐘）
 * @param {number} stopTime - 停車時間（分鐘）
 * @returns {number} 稼動率百分比 (0-100)
 */
export function calculateUtilization(runTime, stopTime) {
    const total = runTime + stopTime;
    if (total === 0) return 0;
    return (runTime / total) * 100;
}

/**
 * 將分鐘數轉換為 HH:MM 格式
 * @param {number} minutes - 分鐘數
 * @returns {string} HH:MM 格式字串
 */
export function minutesToHHMM(minutes) {
    if (!minutes || isNaN(minutes)) return '00:00';
    const h = Math.floor(minutes / 60);
    const m = Math.floor(minutes % 60);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * 將 MM:SS 格式轉換為分鐘數
 * @param {string} duration - MM:SS 格式字串
 * @returns {number} 分鐘數
 */
export function durationToMinutes(duration) {
    if (!duration || typeof duration !== 'string') return 0;
    const parts = duration.split(':');
    if (parts.length !== 2) return 0;
    const minutes = parseInt(parts[0]) || 0;
    const seconds = parseInt(parts[1]) || 0;
    return minutes + (seconds / 60);
}

/**
 * 分析停車原因統計
 * @param {Array} records - 生產記錄陣列
 * @returns {Array} 停車原因統計陣列，依次數排序
 */
export function analyzeStopReasons(records) {
    const reasonStats = {};

    // 統計每個停車原因
    records.forEach(record => {
        if (!record.stopReasons || !Array.isArray(record.stopReasons)) return;

        record.stopReasons.forEach(stop => {
            const reason = stop.reason || '未分類';
            if (!reasonStats[reason]) {
                reasonStats[reason] = {
                    reason,
                    count: 0,
                    totalMinutes: 0,
                    durations: []
                };
            }

            reasonStats[reason].count++;
            const minutes = durationToMinutes(stop.duration);
            reasonStats[reason].totalMinutes += minutes;
            reasonStats[reason].durations.push(minutes);
        });
    });

    // 轉換為陣列並計算統計值
    const totalCount = Object.values(reasonStats).reduce((sum, stat) => sum + stat.count, 0);
    const totalTime = Object.values(reasonStats).reduce((sum, stat) => sum + stat.totalMinutes, 0);

    const result = Object.values(reasonStats).map(stat => ({
        reason: stat.reason,
        count: stat.count,
        countPercent: totalCount > 0 ? (stat.count / totalCount) * 100 : 0,
        totalMinutes: stat.totalMinutes,
        timePercent: totalTime > 0 ? (stat.totalMinutes / totalTime) * 100 : 0,
        avgMinutes: stat.count > 0 ? stat.totalMinutes / stat.count : 0
    }));

    // 依次數排序
    return result.sort((a, b) => b.count - a.count);
}

/**
 * 計算日報表統計彙總
 * @param {Array} records - 當日生產記錄陣列
 * @returns {Object} 統計彙總物件
 */
export function calculateDailySummary(records) {
    if (!records || records.length === 0) {
        return {
            totalOrders: 0,
            totalTarget: 0,
            totalGood: 0,
            totalDefect: 0,
            avgYieldRate: 0,
            avgAchievementRate: 0,
            totalRunTime: 0,
            totalStopTime: 0,
            totalStopCount: 0,
            avgOEE: 0,
            utilization: 0
        };
    }

    const totalTarget = sum(records, 'targetQty');
    const totalGood = sum(records, 'goodQty');
    const totalDefect = sum(records, 'defectQty');
    const totalRunTime = sum(records, 'runTime');
    const totalStopTime = sum(records, 'stopTime');
    const totalStopCount = sum(records, 'stopCount');

    return {
        totalOrders: records.length,
        totalTarget,
        totalGood,
        totalDefect,
        avgYieldRate: calculateYieldRate(totalGood, totalDefect),
        avgAchievementRate: calculateAchievementRate(totalGood, totalTarget),
        totalRunTime,
        totalStopTime,
        totalStopCount,
        avgOEE: average(records, 'oee'),
        utilization: calculateUtilization(totalRunTime, totalStopTime)
    };
}

/**
 * 格式化數字（加千分位）
 * @param {number} num - 數字
 * @param {number} decimals - 小數位數
 * @returns {string} 格式化後的字串
 */
export function formatNumber(num, decimals = 0) {
    if (num === null || num === undefined || isNaN(num)) return '-';
    return num.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/**
 * 格式化百分比
 * @param {number} value - 數值
 * @param {number} decimals - 小數位數
 * @returns {string} 格式化後的百分比字串
 */
export function formatPercent(value, decimals = 1) {
    if (value === null || value === undefined || isNaN(value)) return '-';
    return `${value.toFixed(decimals)}%`;
}

/**
 * 依月份分組記錄
 * @param {Array} records - 生產記錄陣列
 * @returns {Object} 以 YYYY-MM 為 key 的分組物件
 */
export function groupByMonth(records) {
    return records.reduce((groups, record) => {
        const date = record.date || record.startTime;
        if (!date) return groups;
        const d = new Date(date);
        const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        if (!groups[monthKey]) groups[monthKey] = [];
        groups[monthKey].push(record);
        return groups;
    }, {});
}

/**
 * 計算月報表統計彙總
 * @param {Array} records - 當月生產記錄陣列
 * @returns {Object} { dailyRows: Array, totals: Object }
 */
export function calculateMonthlySummary(records) {
    if (!records || records.length === 0) {
        return { dailyRows: [], totals: {} };
    }

    // 依日期分組
    const byDate = groupByDate(records);

    // 計算每日統計
    const dailyRows = Object.entries(byDate)
        .map(([date, dayRecords]) => {
            const goodQty = sum(dayRecords, 'goodQty');
            const defectQty = sum(dayRecords, 'defectQty');
            const runTime = sum(dayRecords, 'runTime') || sum(dayRecords, 'runTimeMinutes') || 0;
            const stopTime = sum(dayRecords, 'stopTime') || sum(dayRecords, 'stopTimeMinutes') || 0;

            return {
                date,
                orderCount: dayRecords.length,
                totalQty: goodQty + defectQty,
                goodQty,
                defectQty,
                yieldRate: calculateYieldRate(goodQty, defectQty),
                avgSpeed: average(dayRecords, 'avgSpeed'),
                runTime,
                stopTime,
                utilizationRate: calculateUtilization(runTime, stopTime)
            };
        })
        .sort((a, b) => a.date.localeCompare(b.date));

    // 計算月度總計
    const totals = {
        orderCount: sum(dailyRows, 'orderCount'),
        totalQty: sum(dailyRows, 'totalQty'),
        goodQty: sum(dailyRows, 'goodQty'),
        defectQty: sum(dailyRows, 'defectQty'),
        yieldRate: calculateYieldRate(sum(dailyRows, 'goodQty'), sum(dailyRows, 'defectQty')),
        avgSpeed: average(dailyRows, 'avgSpeed'),
        runTime: sum(dailyRows, 'runTime'),
        stopTime: sum(dailyRows, 'stopTime'),
        utilizationRate: calculateUtilization(sum(dailyRows, 'runTime'), sum(dailyRows, 'stopTime'))
    };

    return { dailyRows, totals };
}

/**
 * 依停車原因分組，並包含訂單細節（用於可展開顯示）
 * @param {Array} records - 生產記錄陣列
 * @returns {Array} 停車原因彙總陣列，每項包含該原因下的所有訂單細節
 */
export function groupStopReasonsByReason(records) {
    const reasonMap = new Map();

    records.forEach(record => {
        const stopReasons = record.stopReasons || [];
        stopReasons.forEach(stop => {
            const reason = stop.reason || '未分類';

            if (!reasonMap.has(reason)) {
                reasonMap.set(reason, {
                    reason,
                    code: stop.code || '',
                    count: 0,
                    totalDuration: 0,
                    records: []
                });
            }

            const group = reasonMap.get(reason);
            group.count++;
            group.totalDuration += durationToMinutes(stop.duration);
            group.records.push({
                orderId: record.id,
                orderNo: record.orderNo,
                customer: record.customer,
                productName: record.productName || record.product || '',
                time: stop.time,
                duration: stop.duration,
                date: record.date || record.startTime
            });
        });
    });

    // 轉換為陣列並依次數排序
    return Array.from(reasonMap.values())
        .sort((a, b) => b.count - a.count);
}
