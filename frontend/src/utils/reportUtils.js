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
    return percent(goodQty, total);
}

/**
 * 計算達成率
 * @param {number} actualQty - 實際數量
 * @param {number} targetQty - 目標數量
 * @returns {number} 達成率百分比 (0-100+)
 */
export function calculateAchievementRate(actualQty, targetQty) {
    if (targetQty === 0) return 0;
    return percent(actualQty, targetQty);
}

/**
 * 四捨五入到小數 1 位
 * @param {number} value - 數值
 * @returns {number} 小數 1 位的數值
 * @description 與後端 C# 的 Math.Round(x, 1, MidpointRounding.AwayFromZero) 對齊,
 *              兩份實作必須輸出完全相同的數值(見 docs/spec20260903-s3-v1.md §5.1)。
 *
 *              本函式維持最單純的寫法是刻意的:S8 的黃金向量抓到的 x.x5 漂移,
 *              根因在**進來之前**的運算順序(見 percent()),不在這裡。
 *              修好順序之後,已驗證這個寫法在三個 x.x5 邊界與 OEE 乘積路徑上
 *              都與後端 decimal 完全一致,不需要額外的十進位移位技巧。
 *
 *              註:JS 的 Math.round 對負半數是往 +∞ 進位(-0.5 → -0),與 AwayFromZero 不同。
 *              本模組所有輸入都先經 clampNonNegative 夾到 0 以上,走不到負值分支。
 */
function round1(value) {
    return Math.round(value * 10) / 10;
}

/**
 * 把可能為負或非數值的輸入夾成 >= 0 的數字
 * @param {number} value - 原始值
 * @returns {number} 夾到 0 以上的數字
 * @description §5.1 的防呆:時間類與數量類的負值先夾到 0 再套公式,避免出現負率或 NaN。
 */
function clampNonNegative(value) {
    const n = Number(value);
    if (!Number.isFinite(n) || n < 0) return 0;
    return n;
}

/**
 * 計算百分比 numerator / denominator × 100
 * @param {number} numerator - 分子
 * @param {number} denominator - 分母(呼叫端須先確保 > 0)
 * @returns {number} 百分比
 * @description **先乘 100 再除,順序不可調換**(S8 的黃金向量抓到的實際漂移)。
 *              後端 C# 用 decimal 精確運算,前端用二進位浮點,先除會多一次捨入而分岔:
 *              6665 / 10000 = 0.66649999999999998…,再乘 100 得 66.649999999999991,
 *              比真值 66.65 小,四捨五入後變成 66.6 —— 後端卻是 66.7。
 *              先乘後除只有一次(正確捨入的)除法,結果是最接近真值的那個 double,
 *              round1 才與後端一致。這個順序由 tests/fixtures/oee-golden-vectors.json
 *              的「稼動率原始值剛好 66.65」釘住 —— 換回先除後乘,該筆立刻轉紅。
 */
function percent(numerator, denominator) {
    return (numerator * 100) / denominator;
}

/**
 * 計算負荷時間（稼動率的分母）
 * @param {number} runTime - 運轉時間（分鐘）
 * @param {number} stopTime - 停車時間（分鐘）
 * @param {number} prepTime - 準備時間（分鐘）
 * @returns {number} 負荷時間 L = max(0, R + S - P)
 * @description 準備時間與運轉/停車時間在計時器上是重疊累加的（見 useProductionTimer），
 *              沒有明細可拆,故從分母扣掉一次。
 */
function calculateLoadTime(runTime, stopTime, prepTime) {
    return Math.max(0, clampNonNegative(runTime) + clampNonNegative(stopTime) - clampNonNegative(prepTime));
}

/**
 * 計算稼動率
 * @param {number} runTime - 運轉時間（分鐘）
 * @param {number} stopTime - 停車時間（分鐘）
 * @param {number} [prepTime=0] - 準備時間（分鐘），省略時行為與加入本參數前完全一致
 * @returns {number} 稼動率百分比 (0-100)
 * @description §5.1 規則 2:A = min(R, L) / L × 100，L = max(0, R + S − P)；L ≤ 0 時回 0。
 *              min 的理由是準備時間與運轉/停車重疊，以 L 夾住上限確保不超過 100%。
 *
 *              本函式是 PrintingIoT.Core.Services.OeeCalculator 的 JS 孿生，規則見
 *              docs/spec20260903-s3-v1.md §5.1；僅用於本機列與彙總重算，後端列的率值一律採用後端回傳值。
 */
export function calculateUtilization(runTime, stopTime, prepTime = 0) {
    const run = clampNonNegative(runTime);
    const load = calculateLoadTime(runTime, stopTime, prepTime);
    if (load <= 0) return 0;
    return percent(Math.min(run, load), load);
}

/**
 * 計算 OEE 三因子與 OEE
 * @param {Object} params - 計算參數
 * @param {number} params.runTime - 運轉時間（分鐘）
 * @param {number} params.stopTime - 停車時間（分鐘）
 * @param {number} params.prepTime - 準備時間（分鐘）
 * @param {number} params.goodQty - 良品數
 * @param {number} params.defectQty - 不良品數
 * @param {number} params.targetQty - 目標數量
 * @returns {{ availability: number, performance: number, quality: number, oee: number }}
 *          四個值皆 0-100 且四捨五入到小數 1 位
 * @description 本函式是 PrintingIoT.Core.Services.OeeCalculator 的 JS 孿生，規則見
 *              docs/spec20260903-s3-v1.md §5.1，兩處實作由測試釘住相同數值；
 *              僅用於本機列與彙總重算，後端列的率值一律採用後端回傳值。
 *
 *              分母為零一律回 0，不以 1 假裝滿分 —— 顯示 0 是誠實的「無法評估」。
 *
 *              設計註記:規則 3(效能)依客戶要求以「良品數」當分子,與規則 4 的良率因子在數學上
 *              有部分重疊(良品被計入兩次),會使 OEE 略為保守。這是客戶明確指定的口徑,不是實作
 *              疏漏;若日後改回「總產出 / 目標」需同步改 JS 與 C# 兩處實作與測試。
 */
export function calculateOEE({ runTime = 0, stopTime = 0, prepTime = 0, goodQty = 0, defectQty = 0, targetQty = 0 } = {}) {
    const run = clampNonNegative(runTime);
    const good = clampNonNegative(goodQty);
    const defect = clampNonNegative(defectQty);
    const target = clampNonNegative(targetQty);

    // 規則 1 + 2:負荷時間與稼動率
    const load = calculateLoadTime(runTime, stopTime, prepTime);
    const availabilityRaw = load <= 0 ? 0 : percent(Math.min(run, load), load);

    // 規則 3:效能（分子用良品數，超產以 100% 封頂）
    const performanceRaw = target <= 0 ? 0 : Math.min(percent(good, target), 100);

    // 規則 4:良率
    const produced = good + defect;
    const qualityRaw = produced <= 0 ? 0 : percent(good, produced);

    const availability = round1(availabilityRaw);
    const performance = round1(performanceRaw);
    const quality = round1(qualityRaw);

    // 規則 5:三者皆為百分比 → 除以 10000 回到百分比。
    // 以「已四捨五入的三因子」相乘，讓 JS 與 C# 兩份實作得到完全相同的結果。
    const oee = round1((availability * performance * quality) / 10000);

    return { availability, performance, quality, oee };
}

/**
 * 計算依產量加權的平均 OEE
 * @param {Array} records - 生產記錄陣列（需含 oee、goodQty、defectQty）
 * @returns {number} 加權平均 OEE，四捨五入到小數 1 位
 * @description §5.1 規則 6:Σ(oeeᵢ × qtyᵢ) / Σ(qtyᵢ)，qtyᵢ = goodQtyᵢ + defectQtyᵢ；
 *              Σqty ≤ 0 時回 0（不得退回算術平均 —— 算術平均會讓 10 張小單稀釋掉 1 張大單）。
 */
export function calculateWeightedAvgOEE(records) {
    if (!records || records.length === 0) return 0;

    let weighted = 0;
    let totalQty = 0;

    records.forEach(record => {
        const qty = clampNonNegative(record.goodQty) + clampNonNegative(record.defectQty);
        weighted += (Number(record.oee) || 0) * qty;
        totalQty += qty;
    });

    if (totalQty <= 0) return 0;
    return round1(weighted / totalQty);
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
        avgOEE: calculateWeightedAvgOEE(records),   // GAP-05:改為依產量加權,不再用算術平均
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
            // GAP-05:準備時間要從稼動率分母扣掉,故一併彙總
            const prepTime = sum(dayRecords, 'prepTime') || sum(dayRecords, 'prepTimeMinutes') || 0;
            const targetQty = sum(dayRecords, 'targetQty');

            return {
                date,
                orderCount: dayRecords.length,
                totalQty: goodQty + defectQty,
                goodQty,
                defectQty,
                targetQty,
                yieldRate: calculateYieldRate(goodQty, defectQty),
                avgSpeed: average(dayRecords, 'avgSpeed'),
                runTime,
                stopTime,
                prepTime,
                utilizationRate: calculateUtilization(runTime, stopTime, prepTime),
                // GAP-05:以該日彙總數據重算 OEE(不是把各單的 OEE 平均掉)
                oee: calculateOEE({ runTime, stopTime, prepTime, goodQty, defectQty, targetQty }).oee
            };
        })
        .sort((a, b) => a.date.localeCompare(b.date));

    // 計算月度總計
    const totalGood = sum(dailyRows, 'goodQty');
    const totalDefect = sum(dailyRows, 'defectQty');
    const totalTarget = sum(dailyRows, 'targetQty');
    const totalRunTime = sum(dailyRows, 'runTime');
    const totalStopTime = sum(dailyRows, 'stopTime');
    const totalPrepTime = sum(dailyRows, 'prepTime');

    const totals = {
        orderCount: sum(dailyRows, 'orderCount'),
        totalQty: sum(dailyRows, 'totalQty'),
        goodQty: totalGood,
        defectQty: totalDefect,
        targetQty: totalTarget,
        yieldRate: calculateYieldRate(totalGood, totalDefect),
        avgSpeed: average(dailyRows, 'avgSpeed'),
        runTime: totalRunTime,
        stopTime: totalStopTime,
        prepTime: totalPrepTime,
        utilizationRate: calculateUtilization(totalRunTime, totalStopTime, totalPrepTime),
        // GAP-05:整月彙總數據重算 OEE
        oee: calculateOEE({
            runTime: totalRunTime,
            stopTime: totalStopTime,
            prepTime: totalPrepTime,
            goodQty: totalGood,
            defectQty: totalDefect,
            targetQty: totalTarget
        }).oee
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
