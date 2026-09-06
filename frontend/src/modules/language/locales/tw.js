// Auto-extracted from LanguageContext.jsx — Task 2.5
// Traditional Chinese translations
export default {
  nav: { monitor: '即時監控', schedule: '排程', reports: '報表', settings: '設定', docs: '文件' },
  fkeys: {
    f1: '上移', f2: '下移', f3: '送單', f4: '完工', f5: '良品', f6: '不良',
    f7: '訂單', f8: '下一筆', f9: '班別', f10: '退回', f12: '離開'
  },
  common: { orderNo: '訂單號碼', customer: '客戶名稱', qty: '數量', speed: '車速' },
  settings: {
    tabs: { general: '一般設定', unit: '單位設定', machine: '機台設定', communication: '通訊設定', formula: '計算公式', boxType: '盒型設定', report: '報表設定' },
    comm: { title: '通訊設定', desc: '設定 PLC 控制器連線與 ERP 資料交換協定', plcTitle: 'PLC 控制設定', erpTitle: 'ERP 整合設定', deviceType: '裝置類型', ip: 'IP 位址', port: '通訊埠', connTest: '測試連線', simulateSignal: '模擬訊號', protocol: '協定', connType: '連線模式', svrPath: '伺服器路徑' },
    machine: { title: '機台設定', desc: '設定機台極速與機台部位', maxSpeed: '機台極速', sections: '部位設定', sectionName: '部位名稱', add: '新增', delete: '刪除' },
    unit: { title: '單位設定', select: '單位選擇', mm: '公厘 (mm)', inch: '英吋 (inch)', fluteSettings: '楞別設定', flute: '楞別', thickness: '厚度', addFlute: '新增楞別', flute_single: '楞' },
    formula: { title: '計算公式參數設定', desc: '依據文件設定之標準參數', coreEff: '核心生產效率', timeAvail: '時間利用率', continuous: '連續生產定義', targets: '目標設定', stdAvgSpeed: '標準平均車速', stdPrepTime: '標準準備時間', splitPrintCredit: '分印作業補償', targetOEE: 'OEE 目標', targetPrepSuccess: '試車成功率目標' },
    report: { title: '報表參數設定', desc: '設定後端報表生成邏輯參數', timeBoundary: '時間邊界', smallBatch: '小量產定義', exceptionFilters: '異常過濾' }
  },
  dashboard: {
    monitor: { productionQty: '生產數量', qty: 'Qty', speed: '車速', standard: '標準', maxSpeed: '極速', idle: '待機中 (Idle)', waitForF3: '等待 F3 開始生產', running: 'Running' },
    stats: { squareMeter: '平方米', total: '總數', count: '計件數', remaining: '剩餘', defect: '不良', avgSpeed: '平均車速', runTime: '生產時間', stopTime: '停車時間', stopCount: '停次', today: '本日', currentJob: '本筆' },
    schedule: { seqNo: '序號', customer: '客戶名稱', orderNo: '訂單號碼', boxNo: '紙箱編號', qty: '數量', productName: '品名', boxType: '盒型', noQueuedOrders: '無排程訂單', autoNextOn: '【 自動下一筆 ON 】', autoNextOff: '【 自動下一筆 OFF 】', sheets: '張數' },
    machineStatus: { title: '機器狀態', stopReason: '停車原因', normal: '正常', warning: '警告', error: '異常' },
    alerts: { plcDisconnected: 'PLC 連線中斷，無法開始生產！', selectOrderFirst: '請先選擇工單', selectQueuedOrder: '請先選擇下方排程工單', speedNotZero: '車速不為 0，無法完工！請先停止機台。', speedNotZeroReturn: '車速不為 0，無法退回！請先停止機台。', confirmDelete: '確認刪除工單', confirmReorder: '確認重整工單順序?', confirmExit: '確定離開?', startProduction: '開始生產' },
    logs: { f1Pressed: 'F1: 按下 (上移)', f2Pressed: 'F2: 按下 (下移)', f3Start: 'F3: 開始生產', f4Finish: 'F4: 完工', f5GoodQty: 'F5: 生產數量 +1', f6DefectQty: 'F6: 生產數量 -1', f7OrderModal: 'F7: 開啟訂單視窗', f8AutoNext: 'F8: 自動下一筆切換', f9SwitchShift: 'F9: 班別切換', f10Return: 'F10: 退回', f12Exit: 'F12: 離開系統' }
  },
  orders: {
    tabs: { schedule: '排程管理', products: '產品庫' },
    schedule: { title: '生產排程', moveUp: '上移', moveDown: '下移', delete: '刪除排程', reorder: '順序重置', addToSchedule: '新增排程' },
    products: { title: '產品庫', add: '新增產品', edit: '修改', delete: '刪除', boxNo: '紙箱編號', productName: '品名', boxType: '盒型', customer: '客戶', maintenance_title: '資料庫維護' },
    alerts: { selectOrder: '請先選擇工單', confirmDeleteRunning: '確認刪除執行中的工單？請確認車速和生產量為 0', confirmDelete: '確認刪除工單', confirmReorder: '確認重整工單順序?' }
  },
  reports: {
    tabs: { daily: '生產日報表', monthly: '生產月報表', stopReasons: '停車原因' },
    filters: { dateRange: '日期範圍', shift: '班別', allShifts: '全部班別', shiftA: 'A班', shiftB: 'B班', shiftC: 'C班' },
    table: { id: '序號', client: '客戶', orderNo: '訂單號碼', product: '產品', shift: '班別', speed: '車速', qty: '數量', count: '計數', good: '良品', bad: '不良', start: '開始時間', test: '試車時間', status: '狀態' },
    stopReasons: { startTime: '開始時間', endTime: '結束時間', duration: '時長', code: '代碼', reason: '原因' },
    summary: { totalOrders: '總訂單數', totalQty: '總數量', totalGood: '總良品', totalBad: '總不良', avgSpeed: '平均車速', totalRunTime: '總生產時間', totalStopTime: '總停車時間' }
  },
  analysis: {
    title: '生產分析',
    charts: { oee: 'OEE 趨勢', speedTrend: '車速趨勢', defectRate: '不良率分析', stopReasons: '停車原因分析' },
    metrics: { oee: 'OEE', availability: '時間稼動率', performance: '性能稼動率', quality: '良品率', avgSpeed: '平均車速', defectRate: '不良率' },
    filters: { timePeriod: '時間區間', today: '今日', week: '本週', month: '本月', custom: '自訂' }
  },
  modals: {
    finishOrder: { title: '完工確認', goodQty: '良品數量', defectQty: '不良數量', operator: '操作員', notes: '備註', confirm: '確認完工', cancel: '取消' },
    orderDetails: { title: '訂單詳情', orderNo: '訂單號碼', customer: '客戶名稱', boxNo: '紙箱編號', productName: '品名', boxType: '盒型', qty: '數量', status: '狀態', close: '關閉' },
    productForm: { title: '產品表單', addProduct: '新增產品', editProduct: '修改產品', boxNo: '紙箱編號', productName: '品名', boxType: '盒型', customer: '客戶', length: '長度', width: '寬度', height: '高度', save: '儲存', cancel: '取消' },
    stopReason: { title: '停車原因', selectReason: '選擇停車原因', customReason: '自訂原因', startTime: '開始時間', duration: '時長', confirm: '確認', cancel: '取消' },
    help: { title: '操作說明', fkeys: '功能鍵說明', close: '關閉' }
  },
  ui: {
    buttons: { save: '儲存', cancel: '取消', delete: '刪除', edit: '修改', add: '新增', confirm: '確認', close: '關閉', search: '搜尋', reset: '重置', export: '匯出', import: '匯入', upload: '上傳', download: '下載' },
    status: { idle: '待機', running: '執行中', stopped: '已停止', completed: '已完成', error: '錯誤', warning: '警告', normal: '正常' },
    messages: { saveSuccess: '儲存成功', saveFailed: '儲存失敗', deleteSuccess: '刪除成功', deleteFailed: '刪除失敗', updateSuccess: '更新成功', updateFailed: '更新失敗', loading: '載入中...', noData: '無資料', confirmDelete: '確認刪除?', confirmAction: '確認執行此操作?' }
  }
};
