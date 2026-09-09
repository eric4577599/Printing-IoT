import React, { createContext, useState, useContext } from 'react';

const LanguageContext = createContext();

export const translations = {
    tw: {
        modalExt: {
            params: {
                gapFeedFront: '送紙前擋板間隙', gapFeedProg: '送紙進紙輪間隙', gapFeedRubber: '送紙皮帶輪間隙',
                gapFormFront: '成型部前導間隙', dieCutPhase: '模切部相位', dieCutFeedGap: '模切部送紙輪間隙',
                slotGuide: '開槽導紙輪', slotFront: '開槽部壓線', slotAux: '開槽部輔助壓線', midKnife: '中刀位置',
                printSection: '印刷部', press: '印壓', pos: '位置', beltGap: '皮帶間隙', plateGap: '版座間隙',
                ink: '印墨', belt: '皮帶', crease: '壓線', unit1: '一', unit2: '二', unit3: '三', unit4: '四'
            },
            finishOrder: {
                defectFlat: '不良平板', defectPrint: '不良印製', defectSelf: '不良本身', defectOver: '超製',
                reasonA: '原因 A', reasonB: '原因 B', typeA: '類別 A', typeB: '類別 B', pleaseSelect: '請選擇',
                shortageAlertPre: '未達目標產量', shortageAlertMid: '且差異大於', shortageAlertPost: '，請輸入欠量原因'
            },
            productForm: {
                title: '產品資料', flute: '楞', thicknessHint: '厚度依據楞別自動設定', bundleCount: '捆個數',
                uploadHint: '請在設定頁面上傳盒型圖片並設定欄位位置'
            },
            addSchedule: {
                title: '新增排程', orderNoPlaceholder: '12碼, 不可重複', useOptimized: '是否使用最佳化參數',
                alertOrderNoRequired: '請輸入訂單號碼', alertQtyRequired: '請輸入有效數量', alertDuplicate: '訂單號碼重複'
            },
            orderDetails: {
                foldSheets: '張摺數'
            },
            ordersAlert: { cannotMoveRunning: '無法移動正在生產中的工單！', cannotDeleteSpeedNotZero: '❌ 無法刪除：車速不為 0\n當前車速: {speed} m/min\n\n請先停止生產後再試。', cannotDeleteQtyRemaining: '❌ 無法刪除：未生產量不為 0\n剩餘數量: {qty} 張\n\n請完成生產後再試。', selectToShowDiagram: '請選取左側排程以顯示紙箱展開圖', confirmDeleteProduct: '確認刪除此產品資料？' },
            help: { title: '操作說明', items: { monitor: '1. 即時監控', schedule: '2. 生產排程', reports: '3. 生產報表', analysis: '4. 生產分析', settings: '5. 系統設定' } }
        },
        docs: { category: { workflow: '作業流程', design: '設計文件', deploy: '部署與運維', refactor: '重構紀錄', testing: '測試與品質', meeting: '會議紀錄', other: '其他' }, file: { manual: '操作說明書', sasd: 'SASD 說明書', dev: '開發說明書', mqtt: 'MQTT 訊息處理流程', maintenance: '維護保養開發設計書', handover: '移交文件 (Handover)', projectStatus: '專案狀態', refactorLog: '重構變更紀錄', testCases: '測試案例', stressTest: '壓力測試報告', review: '專案審查', meeting1: '維修管理系統分離', meeting2: '苗栗保養計劃' }, header: { title: '文件入口' }, tab: { liveLog: '即時操作紀錄' }, liveLog: { title: '即時操作紀錄 (Live Operation Logs)', desc: '顯示來自 Dashboard 的即時操作記錄,包含 F-Key 操作、訂單異動、系統事件等。', empty: '尚無操作紀錄 — 開始使用 Dashboard 後紀錄會自動產生' }, welcome: { title: 'Printing IoT 文件系統', subtitle: '從左側選擇文件開始瀏覽', desc: '包含作業流程、設計文件、操作紀錄、重構日誌與測試報告' }, loading: '載入中...', error: { label: '錯誤:', hint: '提示:此功能將在 Phase 3 後端整合時完成,需要後端 API 端點', loadFail: '無法載入文件', forbidden: '你的角色沒有這份文件的權限', notFound: '這份文件不在本次建置中' } },
        fix: { monitorOperator: '操作員', monitorShift: '班別', splitCount: '分印張數', shortageWen: '欠量A', shortageWu: '欠量B', shortageReason: '欠量原因', processType: '製程類別', isSplit: '是否分印', isFinished: '是否完工', saveOptimized: '儲存最佳化參數', tableReason: '原因', unsavedWarning: '有未儲存的變更,確定關閉?', modified: '已修改', editNote: '提示:可直接編輯欄位後儲存', stop001: '送紙歪斜', stop002: '印刷不清', stop003: '紙張破裂', stop004: '油墨不足', stop005: '機械故障', stop006: '其他' },
        nav: { monitor: '即時監控', schedule: '排程', reports: '報表', settings: '設定', analysis: '生產分析', docs: '文件', language: '語言' },
        authGuard: { forbidden: '權限不足 (Forbidden)', forbiddenHint: '此頁面需要其他角色的權限,請聯絡系統管理者。', backHome: '回首頁', sessionExpired: '連線階段已過期,請重新登入。' },
        layout: { sim: { label: '模擬生產:', modeTitle: '選擇模擬模式: 本地(直接顯示) vs 遠端(經由 MQTT 迴路)', stop: '停止', standard: '標準', max: '極速', stopShort: '停', speed: '速度' }, help: { title: '操作說明', button: '說明' }, logout: '登出', status: { state: '狀態: Idle', connected: '連線', disconnected: '斷線', disabled: '未啟用' } },
        boxDiagram: { empty: '請選取左側排程以顯示紙箱展開圖', unit: '尺寸單位: mm', hsc: '半槽箱(無上蓋)', rsc: '常規開槽箱' },
        login: { btn: { admin: '管理者 (Admin)', select: '選取 (Select)', exit: '離開 (Exit)', add: '新增', delete: '刪除', addPeriod: '新增時段', customPeriod: '自訂時段', cancel: '取消', login: '登入' }, label: { currentShift: '當前班別 (Current Shift)', operator: '操作員', workPeriod: '工作時段', code: '代碼', people: '人數:' }, placeholder: { auto: '自動', username: '帳號 (Username)', password: '密碼 (Password)' }, col: { code: '代碼', shift: '班別', operator: '操作員', startTime: '開始時間', endTime: '結束時間', people: '人數' }, admin: { title: '管理者登入 (Admin Login)' }, alert: { selectOperator: '請選擇操作員 (Please select an operator)', enterCodeName: '請輸入代碼與名稱', invalidCredentials: '帳號或密碼錯誤 (Invalid Credentials)' }, confirm: { delete: '確定刪除?' }, hint: { rosterLocal: '名冊是這台機器的觸控快捷清單:點一列只會填入帳號,仍須輸入密碼。新增或刪除名冊列不會建立或停用後端帳號 —— 帳號請由管理者在設定頁維護。', usernameKept: '已保留你輸入的帳號,未以名冊覆寫。要改用該列的帳號請先清空欄位。' } },
        backfill: { title: '本機舊實績回填', expand: '展開', collapse: '收合', hint: '筆紀錄只存在這台瀏覽器,尚未回填後端', explain: '掃描是唯讀的,會先算出要送幾筆、有幾筆轉換有損失。確認之後才會寫入後端;可以重複執行。', scan: '掃描', scanning: '掃描中…', run: '開始回填', cancel: '中止', scanFailed: '掃描失敗,請確認已登入且後端可連線', waitingRateLimit: '撞到流量上限,等候中', summary: { localTotal: '本機紀錄總數', alreadySynced: '後端已有', pending: '待回填', duplicateKeys: '本機重複編號(只送先出現者)', blocked: '無法回填' }, issues: { title: '有損轉換(仍會回填,但與原紀錄略有出入)', approximatedTime: '完工時刻由工廠日推補(原紀錄只有日期)', orderLinkLost: '工單關聯遺失(僅保留訂單編號文字)', truncated: '欄位過長已截斷', negativeClamped: '負值已夾為 0', notANumber: '數值欄位無法解析,以 0 計', unparsableFinishedAt: '完工時間格式無法解析', unparsableDuration: '停機時長格式無法解析,以 0 計' }, blockedTitle: '無法回填的紀錄', result: { created: '新增成功', alreadyExists: '後端已有(略過)', conflict: '編號衝突,需人工確認', failed: '失敗', rerunHint: '失敗與衝突的紀錄仍留在本機,修正後可再次掃描回填。' } },
        reportView: { tab: { details: '生產明細', daily: '生產日報表', monthly: '生產月報表', stop: '停車原因' }, alert: { selectOrder: '請先選擇一筆訂單', noExport: '查詢區間內無生產紀錄可匯出', exportWip: '匯出功能開發中...', backendRecordReadOnly: '此筆實績由後端管理,本輪尚未提供修改' }, btn: { confirm: '確認', export: '匯出', manualUpload: '手動上傳報工', leave: '離開', exportExcel: '匯出 Excel', print: '列印', ok: '確定', cancel: '取消', expandAll: '全部展開', collapseAll: '全部收合', retry: '重試' }, label: { date: '生產日期', good: '良品', defect: '不良', reportType: '報表類型', dateRange: '日期範圍', shift: '班別' }, col: { select: '選', seq: '序號', customer: '客戶名稱', orderNo: '訂單號碼', productName: '產品名稱', shift: '班別', speed: '車速', qty: '數量', countQty: '計件數', good: '良品', defect: '不良', finishedAt: '完工時間', boxNo: '紙箱編號', operator: '操作員', targetQty: '目標數量', goodQty: '良品數量', defectQty: '不良數量', yieldRate: '良率', achievementRate: '達成率', prepTime: '準備時間', runTime: '運轉時間', stopTime: '停車時間', stopCount: '停車次數', avgSpeed: '平均車速', stopStart: '停車開始', duration: '持續時間', stopReason: '停車原因', date: '日期', orderCount: '筆數', totalQty: '生產量', prodTime: '生產時間', utilization: '稼動率', time: '時間', durationShort: '時長', source: '資料來源' }, daily: { summaryTitle: '統計彙總', totalOrders: '總工單數', totalTarget: '總目標數量', totalGood: '總良品數量', totalDefect: '總不良數量', avgYield: '平均良率', avgAchievement: '平均達成率', totalRunTime: '總運轉時間', totalStopTime: '總停車時間', totalStopCount: '總停車次數', avgOEE: '平均 OEE', utilization: '稼動率' }, monthly: { selectMonth: '月份選擇', year: '年', month: '月', title: '生產月報表', total: '月度總計' }, stop: { timeRange: '時間區間', title: '停車原因分析', totalCount: '總停車次數', totalTime: '總停車時間' }, shift: { all: '全部', a: 'A班', b: 'B班', c: 'C班', day: '日班', night: '夜班' }, unit: { count: '筆', times: '次', minutes: '分', sheetsPerMin: '張/分' }, print: { printTime: '列印時間', statRange: '統計區間', shift: '班別' }, empty: { noRecords: '查詢區間內無生產紀錄', noStopRecords: '此筆紀錄無停車記錄', noData: '查無資料，請調整查詢條件', noMonth: '本月無生產記錄', noStopInRange: '此時間區間內無停車記錄' }, state: { loading: '生產紀錄載入中…', error: '無法取得生產紀錄,請稍後重試', empty: '此區間無生產紀錄', degraded: '無法連線後端,目前顯示本機離線快取,資料可能不完整', truncated: '資料量超過單次查詢上限,請縮小日期區間;目前僅顯示部分資料,已顯示筆數', localOnly: '筆紀錄僅存在本機快取,尚未同步至後端' , sourceBackend: '彙總數字由後端計算', sourceLocalOnly: '本區間有僅存在本機的紀錄,彙總改以本機計算', sourceDegraded: '無法取得後端彙總,改以本機計算,數字可能與後端不一致'}, source: { backend: '後端', local: '本機快取' } },
        settingsExt: { common: { add: '新增', edit: '修改', delete: '刪除', save: '儲存', cancel: '取消', update: '修改', import: '匯入', sheets: '張' }, general: { title: '一般設定', companyHeader: '公司抬頭設定', companyHeaderHint: '此設定將用於報表列印時的公司抬頭顯示', companyNameZh: '公司名稱 (中文):', companyNameZhPlaceholder: '例:台灣紙箱股份有限公司', companyNameEn: '公司名稱 (英文):', companyNameEnPlaceholder: '例:Taiwan Carton Co., Ltd.', companyAddress: '公司地址:', companyAddressPlaceholder: '例:台北市信義區信義路一段100號', phone: '電話:', phonePlaceholder: '例:02-1234-5678', fax: '傳真:', faxPlaceholder: '例:02-1234-5679', companyLogo: '公司標誌 (Logo)', noUpload: '尚未上傳', userSettings: '使用者設定', inheritRemoteIp: '繼承遠端 IP 設定', custom: '自訂', remoteIp: '遠端 IP:', remoteIpPlaceholder: '例:192.168.1.100', colUser: '使用者', colPassword: '密碼', colId: '代碼', colActions: '操作', userNamePlaceholder: '使用者', passwordPlaceholder: '密碼', idPlaceholder: '代碼', shiftSettings: '班別時間設定', colShift: '班別', colStart: '時間起', colEnd: '迄', shiftNamePlaceholder: '班別', stopReasonSettings: '停車原因設定', defectReasonSettings: '不良原因設定', colReason: '原因', colCategory: '類別', reasonPlaceholder: '原因', categoryPlaceholder: '類別', alertFillUser: '請完整輸入使用者資訊', alertDuplicateUser: '代碼 {code} 已存在於其他使用者', alertUserSaved: '使用者已儲存', confirmDeleteUser: '確定刪除此使用者?', alertFillShift: '請完整輸入班別資訊', alertShiftSaved: '班別已儲存', confirmDeleteShift: '確定刪除此班別?', alertEnterIdReason: '請輸入編號與原因', confirmDeleteReason: '確定刪除?', alertImportSuccess: '模擬由 Excel 匯入成功!', offlineModeNotice: '目前為離線模式,變更僅存在本機', colRole: '角色', colStatus: '狀態', statusActive: '啟用', statusInactive: '停用', btnDisableUser: '停用', btnEnableUser: '啟用', confirmDisableUser: '確定停用此使用者?停用後將無法登入。', userLoading: '使用者名冊載入中…', userLoadFailed: '無法連線後端,目前顯示本機快取的名冊,此時的新增與修改都會失敗', userReadOnly: '只有系統管理者可以維護使用者,目前為唯讀', alertPasswordRequired: '新增使用者必須設定密碼', alertUserSaveFailed: '使用者儲存失敗', alertUserOffline: '此列僅存在本機快取,沒有後端帳號可以修改;請先恢復後端連線', passwordKeepHint: '密碼(留空不變更)', usernameImmutableHint: '帳號建立後不可修改', roleAdmin: '系統管理者', roleSupervisor: '領班', roleEngineer: '工程師', roleOperator: '作業員' }, formula: { savedAlert: '設定已儲存', shortageThresholdLabel: '欠量強制輸入閾值', stdAvgSpeed: '標準平均車速', splitPrintCredit: '分印作業補償', continuousDef: '連續生產定義', continuousCriteria: '連續生產判定條件', criteriaPrefix: '在', criteriaMiddle: '秒內,生產', trialSuccessLabel: '一張試車成功判定', withinSheets: '張內', trialSuccessHint: '試車時在此張數內達成即為成功', prepTimeIndicator: '準備時間燈號管理', prepTimeDescPrefix: '影響即時監控「生產數量」欄位', bgColor: '底色', stdPrepTimeLabel: '標準準備時間', minUnit: '分', defaultPrefix: '預設', minuteWord: '分鐘', startTimeMode: '準備時間判斷', prevFinish: '前一筆完工時間', dataArrival: '資料送入時開始', yellowUpper: '黃燈上限', redLight: '紅燈', lightRule: '燈號規則', qtyFontColor: '生產數量字體顏色', controlledByShortage: '由「欠量強制輸入閾值」控制:', speedIndicator: '車速燈號管理', speedDescPrefix: '影響即時監控「車速」欄位', fontColor: '字體顏色', speedDescSuffix: ',基於「單位設定」中的機台極速計算', speedBaseType: '速度基準類型', standardSpeed: '標準車速', maximumSpeed: '極限速度', stdSpeedBase: '標準車速基準', machineMaxTimes: '機台極速 ×', maxSpeedNote: '使用極限速度作為基準時,速度燈號將以機台極速 (100%) 為標準計算', yellowRange: '黃燈範圍', greenLight: '綠燈', standardSpeedShort: '標準車速' }, boxType: { enterName: '請輸入盒型名稱:', renamePrompt: '修改盒型名稱:', deleteConfirm: '確定刪除此盒型?', title: '盒型設定', basicInfo: '基本資訊', nameLabel: '盒型名稱', erpAlias: 'ERP 別名', descLabel: '對應文字敘述', descPlaceholder: '例:長*寬*高 = S2*S3*H', formulasLabel: '對應公式', formulaSupport: '支援 +, -, *, /, ( ) 與欄位變數 (S1, L, W...)', lengthDef: '長度定義', labelLenPlaceholder: '標籤 (長/寬)', correction: '修正值', mmAddSub: 'mm (加減值)', formula: '公式', widthDef: '寬度定義', labelPlaceholder: '標籤', diagramPosSettings: '圖面欄位位置設定', diagramPosHint: '選取下方欄位,點擊圖面以設定顯示位置', imageLabel: '盒型圖示', selectFieldFirst: '請先選擇要設定位置的欄位', uploadImage: '請上傳圖片', selectOrAdd: '請選擇或新增盒型' }, comm: { monitorInterval: '監控更新頻率', secondsDefault: '秒（預設 1.0 秒）', monitorMsg: '監控訊息', simControlTitle: '模擬控制', simControlHintPre: '請使用畫面上方工具列的', simProduction: '模擬生產', simControlHintMid: '與', simControlHintPost: '開關進行測試。', erpDesc: '建立對應「生產排程的產品檔、訂單」的協定介面', connNone: '無連線', serverIp: '伺服器 IP', port: '連接埠', inputDir: '輸入路徑', outputDir: '輸出路徑', dataLogTitle: '數據記錄設定', dataLogDesc: '控制 MQTT 數據寫入資料庫的頻率;機台狀態改變時會立即寫入,其他時候依設定間隔定期寫入。', logInterval: '定時寫入間隔', minutes: '分鐘', seconds: '秒', current: '目前', note: '說明', noteItem1: '狀態改變時（RUN ↔ STOP ↔ JOG）會立即寫入資料庫', noteItem2: '非狀態改變期間,依此間隔定期寫入', noteItem3: '建議設定:180-600 秒(3-10 分鐘)', noteItem4: '有效範圍 1-3600 秒;超出範圍時後端會改用預設 300 秒', intervalOutOfRange: '需為 1-3600 之間的整數秒。超出範圍不會送出 —— 送出去也只會被後端換成預設的 300 秒。', machineId: '機台識別碼', machineIdHint: '用於識別本機台的唯一編碼,會記錄在生產日誌中', saveSuccess: '通訊設定已儲存至伺服器', saveFailed: '儲存失敗' }, machine: { enterSectionName: '請輸入部位名稱', addFailed: '新增失敗', confirmDeleteSection: '確定刪除此部位?', deleteFailed: '刪除失敗', orderUpdateFailed: '順序更新失敗', confirmReset: '確定重置?這將刪除現有部位並建立預設值。', resetComplete: '已重置為預設值', resetFailed: '重置失敗', sectionsHint: '這些部位將用於機台狀態顯示和保養維修的部位選項', defaults: '預設', noSections: '尚無部位,請點擊「新增」按鈕', sectionDetails: '部位詳情', order: '順序', faultSignal: '故障訊號', runSignal: '運作訊號', selectSectionHint: '請從左側選擇一個部位以查看詳情', sheetsPerMin: '張/分' }, report: { enterKeyword: '請輸入要排除的停機原因關鍵字', dayCutoff: '跨天判定基準時間', cutoffDefault: '預設 07:30:00', smallBatchTitle: '小量產定義', smallBatchQty: '小量產判定數量', smallBatchHint: '訂單數量小於此值將被標記為小量產,並獨立統計平均批量。', exceptionFilters: '異常過濾', addKeyword: '新增關鍵字', filterHint: '統計停機時間時,將自動排除包含以下關鍵字的紀錄:', noFilters: '無過濾關鍵字' }, unit: { enterFluteName: '請輸入楞別名稱', enterThicknessPre: '請輸入', enterThicknessPost: '楞厚度', confirmDeleteFlute: '確定刪除此楞別?' } },
        fkeys: {
            f1: '上移', f2: '下移', f3: '送單', f4: '完工', f5: '良品', f6: '不良',
            f7: '訂單', f8: '下一筆', f9: '班別', f10: '退回', f12: '離開'
        },
        common: { orderNo: '訂單號碼', customer: '客戶名稱', qty: '數量', speed: '車速' },
        settings: {
            tabs: { general: '一般設定', unit: '單位設定', machine: '機台設定', communication: '通訊設定', formula: '計算公式', boxType: '盒型設定', report: '報表設定' },
            comm: {
                title: '通訊設定',
                desc: '設定 PLC 控制器連線與 ERP 資料交換協定',
                plcTitle: 'PLC 控制設定',
                erpTitle: 'ERP 整合設定',
                deviceType: '裝置類型',
                ip: 'IP 位址',
                port: '通訊埠',
                connTest: '測試連線',
                simulateSignal: '模擬訊號',
                protocol: '協定',
                connType: '連線模式',
                svrPath: '伺服器路徑'
            },
            machine: {
                title: '機台設定',
                desc: '設定機台極速與機台部位',
                maxSpeed: '機台極速',
                sections: '部位設定',
                sectionName: '部位名稱',
                add: '新增',
                delete: '刪除'
            },
            unit: {
                title: '單位設定',
                select: '單位選擇',
                mm: '公厘 (mm)',
                inch: '英吋 (inch)',
                fluteSettings: '楞別設定',
                flute: '楞別',
                thickness: '厚度',
                addFlute: '新增楞別',
                flute_single: '楞'
            },
            formula: {
                title: '計算公式參數設定',
                desc: '依據文件設定之標準參數',
                coreEff: '核心生產效率',
                timeAvail: '時間利用率',
                continuous: '連續生產定義',
                targets: '目標設定',
                stdAvgSpeed: '標準平均車速',
                stdPrepTime: '標準準備時間',
                splitPrintCredit: '分印作業補償',
                targetOEE: 'OEE 目標',
                targetPrepSuccess: '試車成功率目標'
            },
            report: {
                title: '報表參數設定',
                desc: '設定後端報表生成邏輯參數',
                timeBoundary: '時間邊界',
                smallBatch: '小量產定義',
                exceptionFilters: '異常過濾'
            }
        },
        dashboard: {
            monitor: {
                productionQty: '生產數量',
                qty: 'Qty',
                speed: '車速',
                standard: '標準',
                maxSpeed: '極速',
                idle: '待機中 (Idle)',
                waitForF3: '等待 F3 開始生產',
                running: 'Running'
            },
            stats: {
                squareMeter: '平方米',
                total: '總數',
                count: '計件數',
                remaining: '剩餘',
                defect: '不良',
                avgSpeed: '平均車速',
                runTime: '生產時間',
                stopTime: '停車時間',
                stopCount: '停次',
                today: '本日',
                currentJob: '本筆'
            },
            schedule: {
                seqNo: '序號',
                customer: '客戶名稱',
                orderNo: '訂單號碼',
                boxNo: '紙箱編號',
                qty: '數量',
                productName: '品名',
                boxType: '盒型',
                noQueuedOrders: '無排程訂單',
                autoNextOn: '【 自動下一筆 ON 】',
                autoNextOff: '【 自動下一筆 OFF 】',
                sheets: '張數',
                notes: '備註'
            },
            machineStatus: {
                title: '機器狀態',
                stopReason: '停車原因',
                normal: '正常',
                warning: '警告',
                error: '異常'
            },
            stopReasons: {
                startTime: '開始時間',
                duration: '時長',
                reason: '原因'
            },
            alerts: {
                plcDisconnected: 'PLC 連線中斷，無法開始生產！',
                selectOrderFirst: '請先選擇工單',
                selectQueuedOrder: '請先選擇下方排程工單',
                speedNotZero: '車速不為 0，無法完工！請先停止機台。',
                speedNotZeroReturn: '車速不為 0，無法退回！請先停止機台。',
                confirmDelete: '確認刪除工單',
                confirmReorder: '確認重整工單順序?',
                confirmExit: '確定離開?',
                startProduction: '開始生產'
            },
            logs: {
                f1Pressed: 'F1: 按下 (上移)',
                f2Pressed: 'F2: 按下 (下移)',
                f3Start: 'F3: 開始生產',
                f4Finish: 'F4: 完工',
                f5GoodQty: 'F5: 生產數量 +1',
                f6DefectQty: 'F6: 生產數量 -1',
                f7OrderModal: 'F7: 開啟訂單視窗',
                f8AutoNext: 'F8: 自動下一筆切換',
                f9SwitchShift: 'F9: 班別切換',
                f10Return: 'F10: 退回',
                f12Exit: 'F12: 離開系統'
            }
        },
        orders: {
            tabs: {
                schedule: '排程管理',
                products: '產品庫'
            },
            schedule: {
                title: '生產排程',
                moveUp: '上移',
                moveDown: '下移',
                delete: '刪除排程',
                reorder: '順序重置',
                addToSchedule: '新增排程'
            },
            products: {
                title: '產品庫',
                add: '新增產品',
                edit: '修改',
                delete: '刪除',
                boxNo: '紙箱編號',
                productName: '品名',
                boxType: '盒型',
                customer: '客戶',
                maintenance_title: '資料庫維護'
            },
            alerts: {
                selectOrder: '請先選擇工單',
                confirmDeleteRunning: '確認刪除執行中的工單？請確認車速和生產量為 0',
                confirmDelete: '確認刪除工單',
                confirmReorder: '確認重整工單順序?'
            }
        },
        reports: {
            tabs: {
                daily: '生產日報表',
                monthly: '生產月報表',
                stopReasons: '停車原因'
            },
            filters: {
                dateRange: '日期範圍',
                shift: '班別',
                allShifts: '全部班別',
                shiftA: 'A班',
                shiftB: 'B班',
                shiftC: 'C班'
            },
            table: {
                id: '序號',
                client: '客戶',
                orderNo: '訂單號碼',
                product: '產品',
                shift: '班別',
                speed: '車速',
                qty: '數量',
                count: '計數',
                good: '良品',
                bad: '不良',
                start: '開始時間',
                test: '試車時間',
                status: '狀態'
            },
            stopReasons: {
                startTime: '開始時間',
                endTime: '結束時間',
                duration: '時長',
                code: '代碼',
                reason: '原因'
            },
            summary: {
                totalOrders: '總訂單數',
                totalQty: '總數量',
                totalGood: '總良品',
                totalBad: '總不良',
                avgSpeed: '平均車速',
                totalRunTime: '總生產時間',
                totalStopTime: '總停車時間'
            }
        },
        analysis: {
            title: '生產分析',
            controls: { chartView: '圖表視圖', tableView: '表格視圖', scrollStart: '開始', scrollEnd: '結束' },
            charts: {
                oee: 'OEE 趨勢',
                speedTrend: '車速趨勢',
                defectRate: '不良率分析',
                stopReasons: '停車原因分析'
            },
            metrics: {
                oee: 'OEE',
                availability: '時間稼動率',
                performance: '性能稼動率',
                quality: '良品率',
                avgSpeed: '平均車速',
                defectRate: '不良率'
            },
            filters: {
                timePeriod: '時間區間',
                today: '今日',
                week: '本週',
                month: '本月',
                custom: '自訂'
            },
            fields: {
                customer: '客戶', product: '品名', boxNo: '紙箱編號', boxType: '盒型',
                orderNo: '訂單號碼', qty: '數量', operator: '操作員', shift: '班別',
                stopReason: '停車原因', prepTime: '準備時間', date: '日期', runTime: '運轉時間',
                stopTime: '停車時間', avgSpeed: '平均車速', stopCount: '停車次數',
                defectQty: '不良數量', oee: 'OEE', goodQty: '良品數量'
            },
            chartType: { title: '圖表類型' },
            chartTypes: { pie: '圓餅圖', doughnut: '環圈圖', line: '折線圖', bar: '長條圖', radar: '雷達圖' },
            timeScale: { title: '時間刻度' },
            timeScales: { minute: '分', hour: '時', day: '日', week: '週', month: '月' },
            category: { title: '分類條件' },
            display: { title: '顯示欄位' },
            dateRange: '日期範圍',
            quickDate: { today: '今日', yesterday: '昨日', last7days: '近 7 日', last30days: '近 30 日', thisMonth: '本月' },
            actions: { clearFilters: '清除條件', downloadImage: '下載圖檔', exportExcel: '匯出 Excel', print: '列印' },
            summary: { totalQty: '總良品數', avgDailyQty: '日均產量', totalStopTime: '總停車時間', avgSpeed: '平均車速', recordsCount: '紀錄筆數' },
            state: { loading: '生產紀錄載入中…', error: '無法取得生產紀錄,請稍後重試', empty: '此區間無生產紀錄', degraded: '無法連線後端,目前顯示本機離線快取,資料可能不完整', truncated: '資料量超過單次查詢上限,請縮小日期區間;目前僅顯示部分資料,已顯示筆數', localOnly: '筆紀錄僅存在本機快取,尚未同步至後端', retry: '重試', exportWhileLoading: '資料尚在載入中,請稍候再匯出' }
        },
        modals: {
            finishOrder: {
                title: '完工確認',
                goodQty: '良品數量',
                defectQty: '不良數量',
                operator: '操作員',
                notes: '備註',
                confirm: '確認完工',
                cancel: '取消'
            },
            productDetail: {
                title: '產品規格詳情'
            },
            orderDetails: {
                title: '訂單詳情',
                orderNo: '訂單號碼',
                customer: '客戶名稱',
                boxNo: '紙箱編號',
                productName: '品名',
                boxType: '盒型',
                qty: '數量',
                status: '狀態',
                close: '關閉'
            },
            productForm: {
                title: '產品表單',
                addProduct: '新增產品',
                editProduct: '修改產品',
                boxNo: '紙箱編號',
                productName: '品名',
                boxType: '盒型',
                customer: '客戶',
                length: '長度',
                width: '寬度',
                height: '高度',
                save: '儲存',
                cancel: '取消'
            },
            stopReason: {
                title: '停車原因',
                selectReason: '選擇停車原因',
                customReason: '自訂原因',
                startTime: '開始時間',
                duration: '時長',
                confirm: '確認',
                cancel: '取消'
            },
            help: {
                title: '操作說明',
                fkeys: '功能鍵說明',
                close: '關閉'
            }
        },
        ui: {
            buttons: {
                save: '儲存',
                cancel: '取消',
                delete: '刪除',
                edit: '修改',
                add: '新增',
                confirm: '確認',
                close: '關閉',
                search: '搜尋',
                reset: '重置',
                export: '匯出',
                import: '匯入',
                upload: '上傳',
                download: '下載'
            },
            status: {
                idle: '待機',
                running: '執行中',
                stopped: '已停止',
                completed: '已完成',
                error: '錯誤',
                warning: '警告',
                normal: '正常'
            },
            messages: {
                saveSuccess: '儲存成功',
                saveFailed: '儲存失敗',
                deleteSuccess: '刪除成功',
                deleteFailed: '刪除失敗',
                updateSuccess: '更新成功',
                updateFailed: '更新失敗',
                loading: '載入中...',
                noData: '無資料',
                confirmDelete: '確認刪除?',
                confirmAction: '確認執行此操作?'
            }
        }
    },
    cn: {
        modalExt: {
            params: {
                gapFeedFront: '送纸前挡板间隙', gapFeedProg: '送纸进纸轮间隙', gapFeedRubber: '送纸皮带轮间隙',
                gapFormFront: '成型部前导间隙', dieCutPhase: '模切部相位', dieCutFeedGap: '模切部送纸轮间隙',
                slotGuide: '开槽导纸轮', slotFront: '开槽部压线', slotAux: '开槽部辅助压线', midKnife: '中刀位置',
                printSection: '印刷部', press: '印压', pos: '位置', beltGap: '皮带间隙', plateGap: '版座间隙',
                ink: '印墨', belt: '皮带', crease: '压线', unit1: '一', unit2: '二', unit3: '三', unit4: '四'
            },
            finishOrder: {
                defectFlat: '不良平板', defectPrint: '不良印制', defectSelf: '不良本身', defectOver: '超制',
                reasonA: '原因 A', reasonB: '原因 B', typeA: '类别 A', typeB: '类别 B', pleaseSelect: '请选择',
                shortageAlertPre: '未达目标产量', shortageAlertMid: '且差异大于', shortageAlertPost: '，请输入欠量原因'
            },
            productForm: {
                title: '产品资料', flute: '楞', thicknessHint: '厚度依据楞别自动设置', bundleCount: '捆个数',
                uploadHint: '请在设置页上传盒型图片并设置栏位位置'
            },
            addSchedule: {
                title: '新增排程', orderNoPlaceholder: '12码, 不可重复', useOptimized: '是否使用优化参数',
                alertOrderNoRequired: '请输入订单号码', alertQtyRequired: '请输入有效数量', alertDuplicate: '订单号码重复'
            },
            orderDetails: {
                foldSheets: '张折数'
            },
            ordersAlert: { cannotMoveRunning: '无法移动正在生产中的工单！', cannotDeleteSpeedNotZero: '❌ 无法删除：车速不为 0\n当前车速: {speed} m/min\n\n请先停止生产后再试。', cannotDeleteQtyRemaining: '❌ 无法删除：未生产量不为 0\n剩余数量: {qty} 张\n\n请完成生产后再试。', selectToShowDiagram: '请选取左侧排程以显示纸箱展开图', confirmDeleteProduct: '确认删除此产品资料？' },
            help: { title: '操作说明', items: { monitor: '1. 实时监控', schedule: '2. 生产排程', reports: '3. 生产报表', analysis: '4. 生产分析', settings: '5. 系统设定' } }
        },
        docs: { category: { workflow: '作业流程', design: '设计文件', deploy: '部署与运维', refactor: '重构记录', testing: '测试与质量', meeting: '会议记录', other: '其他' }, file: { manual: '操作说明书', sasd: 'SASD 说明书', dev: '开发说明书', mqtt: 'MQTT 消息处理流程', maintenance: '维护保养开发设计书', handover: '移交文件 (Handover)', projectStatus: '项目状态', refactorLog: '重构变更记录', testCases: '测试案例', stressTest: '压力测试报告', review: '项目审查', meeting1: '维修管理系统分离', meeting2: '苗栗保养计划' }, header: { title: '文件入口' }, tab: { liveLog: '实时操作记录' }, liveLog: { title: '实时操作记录 (Live Operation Logs)', desc: '显示来自 Dashboard 的实时操作记录,包含 F-Key 操作、订单异动、系统事件等。', empty: '尚无操作记录 — 开始使用 Dashboard 后记录会自动产生' }, welcome: { title: 'Printing IoT 文件系统', subtitle: '从左侧选择文件开始浏览', desc: '包含作业流程、设计文件、操作记录、重构日志与测试报告' }, loading: '加载中...', error: { label: '错误:', hint: '提示:此功能将在 Phase 3 后端集成时完成,需要后端 API 端点', loadFail: '无法加载文件', forbidden: '你的角色没有这份文件的权限', notFound: '这份文件不在本次构建中' } },
        fix: { monitorOperator: '操作员', monitorShift: '班次', splitCount: '分印张数', shortageWen: '欠量A', shortageWu: '欠量B', shortageReason: '欠量原因', processType: '制程类别', isSplit: '是否分印', isFinished: '是否完工', saveOptimized: '保存优化参数', tableReason: '原因', unsavedWarning: '有未保存的变更,确定关闭?', modified: '已修改', editNote: '提示:可直接编辑栏位后保存', stop001: '送纸歪斜', stop002: '印刷不清', stop003: '纸张破裂', stop004: '油墨不足', stop005: '机械故障', stop006: '其他' },
        nav: { monitor: '实时监控', schedule: '排程', reports: '报表', settings: '设置', analysis: '生产分析', docs: '文件', language: '语言' },
        authGuard: { forbidden: '权限不足 (Forbidden)', forbiddenHint: '此页面需要其他角色的权限,请联系系统管理员。', backHome: '回首页', sessionExpired: '连线阶段已过期,请重新登入。' },
        layout: { sim: { label: '模拟生产:', modeTitle: '选择模拟模式: 本地(直接显示) vs 远端(经由 MQTT 回路)', stop: '停止', standard: '标准', max: '极速', stopShort: '停', speed: '速度' }, help: { title: '操作说明', button: '说明' }, logout: '登出', status: { state: '状态: Idle', connected: '连线', disconnected: '断线', disabled: '未启用' } },
        boxDiagram: { empty: '请选取左侧排程以显示纸箱展开图', unit: '尺寸单位: mm', hsc: '半槽箱(无上盖)', rsc: '常规开槽箱' },
        login: { btn: { admin: '管理员', select: '选取', exit: '退出', add: '新增', delete: '删除', addPeriod: '新增时段', customPeriod: '自定义时段', cancel: '取消', login: '登录' }, label: { currentShift: '当前班别', operator: '操作员', workPeriod: '工作时段', code: '代码', people: '人数:' }, placeholder: { auto: '自动', username: '账号', password: '密码' }, col: { code: '代码', shift: '班别', operator: '操作员', startTime: '开始时间', endTime: '结束时间', people: '人数' }, admin: { title: '管理员登录' }, alert: { selectOperator: '请选择操作员', enterCodeName: '请输入代码与名称', invalidCredentials: '账号或密码错误' }, confirm: { delete: '确定删除?' }, hint: { rosterLocal: '名册是这台机器的触控快捷清单:点一行只会填入账号,仍须输入密码。新增或删除名册行不会建立或停用后端账号 —— 账号请由管理员在设置页维护。', usernameKept: '已保留你输入的账号,未以名册覆盖。要改用该行的账号请先清空栏位。' } },
        backfill: { title: '本机旧实绩回填', expand: '展开', collapse: '收合', hint: '笔记录只存在这台浏览器,尚未回填后端', explain: '扫描是只读的,会先算出要送几笔、有几笔转换有损失。确认之后才会写入后端;可以重复执行。', scan: '扫描', scanning: '扫描中…', run: '开始回填', cancel: '中止', scanFailed: '扫描失败,请确认已登录且后端可连线', waitingRateLimit: '撞到流量上限,等候中', summary: { localTotal: '本机记录总数', alreadySynced: '后端已有', pending: '待回填', duplicateKeys: '本机重复编号(只送先出现者)', blocked: '无法回填' }, issues: { title: '有损转换(仍会回填,但与原记录略有出入)', approximatedTime: '完工时刻由工厂日推补(原记录只有日期)', orderLinkLost: '工单关联遗失(仅保留订单编号文字)', truncated: '字段过长已截断', negativeClamped: '负值已夹为 0', notANumber: '数值字段无法解析,以 0 计', unparsableFinishedAt: '完工时间格式无法解析', unparsableDuration: '停机时长格式无法解析,以 0 计' }, blockedTitle: '无法回填的记录', result: { created: '新增成功', alreadyExists: '后端已有(略过)', conflict: '编号冲突,需人工确认', failed: '失败', rerunHint: '失败与冲突的记录仍留在本机,修正后可再次扫描回填。' } },
        reportView: { tab: { details: '生产明细', daily: '生产日报表', monthly: '生产月报表', stop: '停车原因' }, alert: { selectOrder: '请先选择一笔订单', noExport: '查询区间内无生产记录可导出', exportWip: '导出功能开发中...', backendRecordReadOnly: '此笔实绩由后端管理,本轮尚未提供修改' }, btn: { confirm: '确认', export: '导出', manualUpload: '手动上传报工', leave: '离开', exportExcel: '导出 Excel', print: '打印', ok: '确定', cancel: '取消', expandAll: '全部展开', collapseAll: '全部折叠', retry: '重试' }, label: { date: '生产日期', good: '良品', defect: '不良', reportType: '报表类型', dateRange: '日期范围', shift: '班别' }, col: { select: '选', seq: '序号', customer: '客户名称', orderNo: '订单号码', productName: '产品名称', shift: '班别', speed: '车速', qty: '数量', countQty: '计件数', good: '良品', defect: '不良', finishedAt: '完工时间', boxNo: '纸箱编号', operator: '操作员', targetQty: '目标数量', goodQty: '良品数量', defectQty: '不良数量', yieldRate: '良率', achievementRate: '达成率', prepTime: '准备时间', runTime: '运转时间', stopTime: '停车时间', stopCount: '停车次数', avgSpeed: '平均车速', stopStart: '停车开始', duration: '持续时间', stopReason: '停车原因', date: '日期', orderCount: '笔数', totalQty: '生产量', prodTime: '生产时间', utilization: '稼动率', time: '时间', durationShort: '时长', source: '数据来源' }, daily: { summaryTitle: '统计汇总', totalOrders: '总工单数', totalTarget: '总目标数量', totalGood: '总良品数量', totalDefect: '总不良数量', avgYield: '平均良率', avgAchievement: '平均达成率', totalRunTime: '总运转时间', totalStopTime: '总停车时间', totalStopCount: '总停车次数', avgOEE: '平均 OEE', utilization: '稼动率' }, monthly: { selectMonth: '月份选择', year: '年', month: '月', title: '生产月报表', total: '月度总计' }, stop: { timeRange: '时间区间', title: '停车原因分析', totalCount: '总停车次数', totalTime: '总停车时间' }, shift: { all: '全部', a: 'A班', b: 'B班', c: 'C班', day: '日班', night: '夜班' }, unit: { count: '笔', times: '次', minutes: '分', sheetsPerMin: '张/分' }, print: { printTime: '打印时间', statRange: '统计区间', shift: '班别' }, empty: { noRecords: '查询区间内无生产记录', noStopRecords: '此笔记录无停车记录', noData: '无数据，请调整查询条件', noMonth: '本月无生产记录', noStopInRange: '此时间区间内无停车记录' }, state: { loading: '生产记录加载中…', error: '无法取得生产记录,请稍后重试', empty: '此区间无生产记录', degraded: '无法连线后端,目前显示本机离线缓存,数据可能不完整', truncated: '数据量超过单次查询上限,请缩小日期区间;目前仅显示部分数据,已显示笔数', localOnly: '笔记录仅存在本机缓存,尚未同步至后端' , sourceBackend: '汇总数字由后端计算', sourceLocalOnly: '本区间有仅存在本机的记录,汇总改以本机计算', sourceDegraded: '无法取得后端汇总,改以本机计算,数字可能与后端不一致'}, source: { backend: '后端', local: '本机缓存' } },
        settingsExt: { common: { add: '新增', edit: '修改', delete: '删除', save: '保存', cancel: '取消', update: '修改', import: '导入', sheets: '张' }, general: { title: '常规设置', companyHeader: '公司抬头设置', companyHeaderHint: '此设置将用于报表打印时的公司抬头显示', companyNameZh: '公司名称 (中文):', companyNameZhPlaceholder: '例:台湾纸箱股份有限公司', companyNameEn: '公司名称 (英文):', companyNameEnPlaceholder: '例:Taiwan Carton Co., Ltd.', companyAddress: '公司地址:', companyAddressPlaceholder: '例:台北市信义区信义路一段100号', phone: '电话:', phonePlaceholder: '例:02-1234-5678', fax: '传真:', faxPlaceholder: '例:02-1234-5679', companyLogo: '公司标志 (Logo)', noUpload: '尚未上传', userSettings: '用户设置', inheritRemoteIp: '继承远端 IP 设置', custom: '自定义', remoteIp: '远端 IP:', remoteIpPlaceholder: '例:192.168.1.100', colUser: '用户', colPassword: '密码', colId: '代码', colActions: '操作', userNamePlaceholder: '用户', passwordPlaceholder: '密码', idPlaceholder: '代码', shiftSettings: '班次时间设置', colShift: '班次', colStart: '开始时间', colEnd: '结束', shiftNamePlaceholder: '班次', stopReasonSettings: '停机原因设置', defectReasonSettings: '不良原因设置', colReason: '原因', colCategory: '类别', reasonPlaceholder: '原因', categoryPlaceholder: '类别', alertFillUser: '请完整输入用户信息', alertDuplicateUser: '代码 {code} 已存在于其他用户', alertUserSaved: '用户已保存', confirmDeleteUser: '确定删除此用户?', alertFillShift: '请完整输入班次信息', alertShiftSaved: '班次已保存', confirmDeleteShift: '确定删除此班次?', alertEnterIdReason: '请输入编号与原因', confirmDeleteReason: '确定删除?', alertImportSuccess: '模拟由 Excel 导入成功!', offlineModeNotice: '当前为离线模式,变更仅保存在本机', colRole: '角色', colStatus: '状态', statusActive: '启用', statusInactive: '停用', btnDisableUser: '停用', btnEnableUser: '启用', confirmDisableUser: '确定停用此使用者?停用后将无法登入。', userLoading: '使用者名册载入中…', userLoadFailed: '无法连线后端,目前显示本机快取的名册,此时的新增与修改都会失败', userReadOnly: '只有系统管理员可以维护使用者,目前为唯读', alertPasswordRequired: '新增使用者必须设定密码', alertUserSaveFailed: '使用者储存失败', alertUserOffline: '此列仅存在本机快取,没有后端帐号可以修改;请先恢复后端连线', passwordKeepHint: '密码(留空不变更)', usernameImmutableHint: '帐号建立后不可修改', roleAdmin: '系统管理员', roleSupervisor: '领班', roleEngineer: '工程师', roleOperator: '作业员' }, formula: { savedAlert: '设置已保存', shortageThresholdLabel: '欠量强制输入阈值', stdAvgSpeed: '标准平均车速', splitPrintCredit: '分印作业补偿', continuousDef: '连续生产定义', continuousCriteria: '连续生产判定条件', criteriaPrefix: '在', criteriaMiddle: '秒内,生产', trialSuccessLabel: '一张试车成功判定', withinSheets: '张内', trialSuccessHint: '试车时在此张数内达成即为成功', prepTimeIndicator: '准备时间灯号管理', prepTimeDescPrefix: '影响实时监控「生产数量」栏位', bgColor: '底色', stdPrepTimeLabel: '标准准备时间', minUnit: '分', defaultPrefix: '预设', minuteWord: '分钟', startTimeMode: '准备时间判断', prevFinish: '前一笔完工时间', dataArrival: '数据送入时开始', yellowUpper: '黄灯上限', redLight: '红灯', lightRule: '灯号规则', qtyFontColor: '生产数量字体颜色', controlledByShortage: '由「欠量强制输入阈值」控制:', speedIndicator: '车速灯号管理', speedDescPrefix: '影响实时监控「车速」栏位', fontColor: '字体颜色', speedDescSuffix: ',基于「单位设置」中的机台极速计算', speedBaseType: '速度基准类型', standardSpeed: '标准车速', maximumSpeed: '极限速度', stdSpeedBase: '标准车速基准', machineMaxTimes: '机台极速 ×', maxSpeedNote: '使用极限速度作为基准时,速度灯号将以机台极速 (100%) 为标准计算', yellowRange: '黄灯范围', greenLight: '绿灯', standardSpeedShort: '标准车速' }, boxType: { enterName: '请输入盒型名称:', renamePrompt: '修改盒型名称:', deleteConfirm: '确定删除此盒型?', title: '盒型设置', basicInfo: '基本信息', nameLabel: '盒型名称', erpAlias: 'ERP 别名', descLabel: '对应文字描述', descPlaceholder: '例:长*宽*高 = S2*S3*H', formulasLabel: '对应公式', formulaSupport: '支持 +, -, *, /, ( ) 与栏位变量 (S1, L, W...)', lengthDef: '长度定义', labelLenPlaceholder: '标签 (长/宽)', correction: '修正值', mmAddSub: 'mm (加减值)', formula: '公式', widthDef: '宽度定义', labelPlaceholder: '标签', diagramPosSettings: '图面栏位位置设置', diagramPosHint: '选取下方栏位,点击图面以设置显示位置', imageLabel: '盒型图示', selectFieldFirst: '请先选择要设置位置的栏位', uploadImage: '请上传图片', selectOrAdd: '请选择或新增盒型' }, comm: { monitorInterval: '监控更新频率', secondsDefault: '秒（默认 1.0 秒）', monitorMsg: '监控消息', simControlTitle: '模拟控制', simControlHintPre: '请使用画面上方工具栏的', simProduction: '模拟生产', simControlHintMid: '与', simControlHintPost: '开关进行测试。', erpDesc: '建立对应「生产排程的产品档、订单」的协议接口', connNone: '无连接', serverIp: '服务器 IP', port: '端口', inputDir: '输入路径', outputDir: '输出路径', dataLogTitle: '数据记录设置', dataLogDesc: '控制 MQTT 数据写入数据库的频率;机台状态改变时会立即写入,其他时候依设置间隔定期写入。', logInterval: '定时写入间隔', minutes: '分钟', seconds: '秒', current: '当前', note: '说明', noteItem1: '状态改变时（RUN ↔ STOP ↔ JOG）会立即写入数据库', noteItem2: '非状态改变期间,依此间隔定期写入', noteItem3: '建议设置:180-600 秒(3-10 分钟)', noteItem4: '有效范围 1-3600 秒;超出范围时后端会改用默认 300 秒', intervalOutOfRange: '需为 1-3600 之间的整数秒。超出范围不会送出 —— 送出去也只会被后端换成默认的 300 秒。', machineId: '机台识别码', machineIdHint: '用于识别本机台的唯一编码,会记录在生产日志中', saveSuccess: '通讯设置已保存至服务器', saveFailed: '保存失败' }, machine: { enterSectionName: '请输入部位名称', addFailed: '新增失败', confirmDeleteSection: '确定删除此部位?', deleteFailed: '删除失败', orderUpdateFailed: '顺序更新失败', confirmReset: '确定重置?这将删除现有部位并建立默认值。', resetComplete: '已重置为默认值', resetFailed: '重置失败', sectionsHint: '这些部位将用于机台状态显示和保养维修的部位选项', defaults: '默认', noSections: '尚无部位,请点击「新增」按钮', sectionDetails: '部位详情', order: '顺序', faultSignal: '故障信号', runSignal: '运行信号', selectSectionHint: '请从左侧选择一个部位以查看详情', sheetsPerMin: '张/分' }, report: { enterKeyword: '请输入要排除的停机原因关键字', dayCutoff: '跨天判定基准时间', cutoffDefault: '默认 07:30:00', smallBatchTitle: '小批量定义', smallBatchQty: '小批量判定数量', smallBatchHint: '订单数量小于此值将被标记为小批量,并独立统计平均批量。', exceptionFilters: '异常过滤', addKeyword: '新增关键字', filterHint: '统计停机时间时,将自动排除包含以下关键字的记录:', noFilters: '无过滤关键字' }, unit: { enterFluteName: '请输入楞别名称', enterThicknessPre: '请输入', enterThicknessPost: '楞厚度', confirmDeleteFlute: '确定删除此楞别?' } },
        fkeys: {
            f1: '上移', f2: '下移', f3: '送单', f4: '完工', f5: '良品', f6: '不良',
            f7: '订单', f8: '下一笔', f9: '班别', f10: '退回', f12: '离开'
        },
        common: { orderNo: '订单号码', customer: '客户名称', qty: '数量', speed: '车速' },
        settings: {
            tabs: { general: '一般设置', unit: '单位设置', machine: '机台设置', communication: '通讯设置', formula: '计算公式', boxType: '盒型设置', report: '报表设置' },
            comm: {
                title: '通讯设置',
                desc: '设置 PLC 控制器连接与 ERP 数据交换协议',
                plcTitle: 'PLC 控制设置',
                erpTitle: 'ERP 整合设置',
                deviceType: '设备类型',
                ip: 'IP 地址',
                port: '端口',
                connTest: '测试连接',
                simulateSignal: '模拟信号',
                protocol: '协议',
                connType: '连接模式',
                svrPath: '服务器路径'
            },
            machine: {
                title: '机台设置',
                desc: '设置机台极速与机台部位',
                maxSpeed: '机台极速',
                sections: '部位设置',
                sectionName: '部位名称',
                add: '新增',
                delete: '删除'
            },
            unit: {
                title: '单位设置',
                select: '单位选择',
                mm: '毫米 (mm)',
                inch: '英寸 (inch)',
                fluteSettings: '楞型设置',
                flute: '楞型',
                thickness: '厚度',
                addFlute: '新增楞型',
                flute_single: '楞'
            },
            formula: {
                title: '计算公式参数设置',
                desc: '依据文件设置之标准参数',
                coreEff: '核心生产效率',
                timeAvail: '时间利用率',
                continuous: '连续生产定义',
                targets: '目标设置',
                stdAvgSpeed: '标准平均车速',
                stdPrepTime: '标准准备时间',
                splitPrintCredit: '分印作业补偿',
                targetOEE: 'OEE 目标',
                targetPrepSuccess: '试车成功率目标'
            },
            report: {
                title: '报表参数设置',
                desc: '设置后端报表生成逻辑参数',
                timeBoundary: '时间边界',
                smallBatch: '小批量定义',
                exceptionFilters: '异常过滤'
            }
        },
        dashboard: {
            monitor: {
                productionQty: '生产数量',
                qty: 'Qty',
                speed: '车速',
                standard: '标准',
                maxSpeed: '极速',
                idle: '待机中 (Idle)',
                waitForF3: '等待 F3 开始生产',
                running: 'Running'
            },
            stats: {
                squareMeter: '平方米',
                total: '总数',
                count: '计件数',
                remaining: '剩余',
                defect: '不良',
                avgSpeed: '平均车速',
                runTime: '生产时间',
                stopTime: '停车时间',
                stopCount: '停次',
                today: '本日',
                currentJob: '本笔'
            },
            schedule: {
                seqNo: '序号',
                customer: '客户名称',
                orderNo: '订单号码',
                boxNo: '纸箱编号',
                qty: '数量',
                productName: '品名',
                boxType: '盒型',
                noQueuedOrders: '无排程订单',
                autoNextOn: '【 自动下一笔 ON 】',
                autoNextOff: '【 自动下一笔 OFF 】',
                sheets: '张数',
                notes: '备注'
            },
            machineStatus: {
                title: '机器状态',
                stopReason: '停车原因',
                normal: '正常',
                warning: '警告',
                error: '异常'
            },
            stopReasons: {
                startTime: '开始时间',
                duration: '时长',
                reason: '原因'
            },
            alerts: {
                plcDisconnected: 'PLC 连接中断，无法开始生产！',
                selectOrderFirst: '请先选择工单',
                selectQueuedOrder: '请先选择下方排程工单',
                speedNotZero: '车速不为 0，无法完工！请先停止机台。',
                speedNotZeroReturn: '车速不为 0，无法退回！请先停止机台。',
                confirmDelete: '确认删除工单',
                confirmReorder: '确认重整工单顺序?',
                confirmExit: '确定离开?',
                startProduction: '开始生产'
            },
            logs: {
                f1Pressed: 'F1: 按下 (上移)',
                f2Pressed: 'F2: 按下 (下移)',
                f3Start: 'F3: 开始生产',
                f4Finish: 'F4: 完工',
                f5GoodQty: 'F5: 生产数量 +1',
                f6DefectQty: 'F6: 生产数量 -1',
                f7OrderModal: 'F7: 打开订单窗口',
                f8AutoNext: 'F8: 自动下一笔切换',
                f9SwitchShift: 'F9: 班别切换',
                f10Return: 'F10: 退回',
                f12Exit: 'F12: 离开系统'
            }
        },
        orders: {
            tabs: {
                schedule: '排程管理',
                products: '产品库'
            },
            schedule: {
                title: '生产排程',
                moveUp: '上移',
                moveDown: '下移',
                delete: '删除',
                reorder: '重整',
                addToSchedule: '加入排程'
            },
            products: {
                title: '产品库',
                add: '新增产品',
                edit: '修改',
                delete: '删除',
                boxNo: '纸箱编号',
                productName: '品名',
                boxType: '盒型',
                customer: '客户',
                maintenance_title: '数据库维护'
            },
            alerts: {
                selectOrder: '请先选择工单',
                confirmDeleteRunning: '确认删除执行中的工单？请确认车速和生产量为 0',
                confirmDelete: '确认删除工单',
                confirmReorder: '确认重整工单顺序?'
            }
        },
        reports: {
            tabs: {
                daily: '生产日报表',
                monthly: '生产月报表',
                stopReasons: '停车原因'
            },
            filters: {
                dateRange: '日期范围',
                shift: '班别',
                allShifts: '全部班别',
                shiftA: 'A班',
                shiftB: 'B班',
                shiftC: 'C班'
            },
            table: {
                id: '序号',
                client: '客户',
                orderNo: '订单号码',
                product: '产品',
                shift: '班别',
                speed: '车速',
                qty: '数量',
                count: '计数',
                good: '良品',
                bad: '不良',
                start: '开始时间',
                test: '试车时间',
                status: '状态'
            },
            stopReasons: {
                startTime: '开始时间',
                endTime: '结束时间',
                duration: '时长',
                code: '代码',
                reason: '原因'
            },
            summary: {
                totalOrders: '总订单数',
                totalQty: '总数量',
                totalGood: '总良品',
                totalBad: '总不良',
                avgSpeed: '平均车速',
                totalRunTime: '总生产时间',
                totalStopTime: '总停车时间'
            }
        },
        analysis: {
            title: '生产分析',
            controls: { chartView: '图表视图', tableView: '表格视图', scrollStart: '开始', scrollEnd: '结束' },
            charts: {
                oee: 'OEE 趋势',
                speedTrend: '车速趋势',
                defectRate: '不良率分析',
                stopReasons: '停车原因分析'
            },
            metrics: {
                oee: 'OEE',
                availability: '时间稼动率',
                performance: '性能稼动率',
                quality: '良品率',
                avgSpeed: '平均车速',
                defectRate: '不良率'
            },
            filters: {
                timePeriod: '时间区间',
                today: '今日',
                week: '本周',
                month: '本月',
                custom: '自定义'
            },
            fields: {
                customer: '客户', product: '品名', boxNo: '纸箱编号', boxType: '盒型',
                orderNo: '订单号码', qty: '数量', operator: '操作员', shift: '班别',
                stopReason: '停车原因', prepTime: '准备时间', date: '日期', runTime: '运转时间',
                stopTime: '停车时间', avgSpeed: '平均车速', stopCount: '停车次数',
                defectQty: '不良数量', oee: 'OEE', goodQty: '良品数量'
            },
            chartType: { title: '图表类型' },
            chartTypes: { pie: '饼图', doughnut: '环圈图', line: '折线图', bar: '柱状图', radar: '雷达图' },
            timeScale: { title: '时间刻度' },
            timeScales: { minute: '分', hour: '时', day: '日', week: '周', month: '月' },
            category: { title: '分类条件' },
            display: { title: '显示字段' },
            dateRange: '日期范围',
            quickDate: { today: '今日', yesterday: '昨日', last7days: '近 7 日', last30days: '近 30 日', thisMonth: '本月' },
            actions: { clearFilters: '清除条件', downloadImage: '下载图档', exportExcel: '导出 Excel', print: '打印' },
            summary: { totalQty: '总良品数', avgDailyQty: '日均产量', totalStopTime: '总停车时间', avgSpeed: '平均车速', recordsCount: '记录笔数' },
            state: { loading: '生产记录加载中…', error: '无法取得生产记录,请稍后重试', empty: '此区间无生产记录', degraded: '无法连线后端,目前显示本机离线缓存,数据可能不完整', truncated: '数据量超过单次查询上限,请缩小日期区间;目前仅显示部分数据,已显示笔数', localOnly: '笔记录仅存在本机缓存,尚未同步至后端', retry: '重试', exportWhileLoading: '数据尚在加载中,请稍候再导出' }
        },
        modals: {
            finishOrder: {
                title: '完工确认',
                goodQty: '良品数量',
                defectQty: '不良数量',
                operator: '操作员',
                notes: '备注',
                confirm: '确认完工',
                cancel: '取消'
            },
            productDetail: {
                title: '产品规格详情'
            },
            orderDetails: {
                title: '订单详情',
                orderNo: '订单号码',
                customer: '客户名称',
                boxNo: '纸箱编号',
                productName: '品名',
                boxType: '盒型',
                qty: '数量',
                status: '状态',
                close: '关闭'
            },
            productForm: {
                title: '产品表单',
                addProduct: '新增产品',
                editProduct: '修改产品',
                boxNo: '纸箱编号',
                productName: '品名',
                boxType: '盒型',
                customer: '客户',
                length: '长度',
                width: '宽度',
                height: '高度',
                save: '保存',
                cancel: '取消'
            },
            stopReason: {
                title: '停车原因',
                selectReason: '选择停车原因',
                customReason: '自定义原因',
                startTime: '开始时间',
                duration: '时长',
                confirm: '确认',
                cancel: '取消'
            },
            help: {
                title: '操作说明',
                fkeys: '功能键说明',
                close: '关闭'
            }
        },
        ui: {
            buttons: {
                save: '保存',
                cancel: '取消',
                delete: '删除',
                edit: '修改',
                add: '新增',
                confirm: '确认',
                close: '关闭',
                search: '搜索',
                reset: '重置',
                export: '导出',
                import: '导入',
                upload: '上传',
                download: '下载'
            },
            status: {
                idle: '待机',
                running: '执行中',
                stopped: '已停止',
                completed: '已完成',
                error: '错误',
                warning: '警告',
                normal: '正常'
            },
            messages: {
                saveSuccess: '保存成功',
                saveFailed: '保存失败',
                deleteSuccess: '删除成功',
                deleteFailed: '删除失败',
                updateSuccess: '更新成功',
                updateFailed: '更新失败',
                loading: '加载中...',
                noData: '无数据',
                confirmDelete: '确认删除?',
                confirmAction: '确认执行此操作?'
            }
        }
    },
    en: {
        modalExt: {
            params: {
                gapFeedFront: 'Feed Front Guard Gap', gapFeedProg: 'Feed Roller Gap', gapFeedRubber: 'Feed Belt Roller Gap',
                gapFormFront: 'Forming Lead Gap', dieCutPhase: 'Die-Cut Phase', dieCutFeedGap: 'Die-Cut Feed Roller Gap',
                slotGuide: 'Slotter Guide Roller', slotFront: 'Slotter Crease', slotAux: 'Slotter Aux Crease', midKnife: 'Center Knife Position',
                printSection: 'Print Section', press: 'Print Pressure', pos: 'Position', beltGap: 'Belt Gap', plateGap: 'Plate Base Gap',
                ink: 'Ink', belt: 'Belt', crease: 'Crease', unit1: '1', unit2: '2', unit3: '3', unit4: '4'
            },
            finishOrder: {
                defectFlat: 'Defective Blank', defectPrint: 'Defective Print', defectSelf: 'Defective Body', defectOver: 'Overproduction',
                reasonA: 'Reason A', reasonB: 'Reason B', typeA: 'Type A', typeB: 'Type B', pleaseSelect: 'Please select',
                shortageAlertPre: 'Target output not reached', shortageAlertMid: 'and gap exceeds', shortageAlertPost: ', please enter shortage reason'
            },
            productForm: {
                title: 'Product Specs', flute: 'Flute', thicknessHint: 'Thickness auto-set by flute type', bundleCount: 'Bundle Qty',
                uploadHint: 'Please upload box image and configure field positions in Settings'
            },
            addSchedule: {
                title: 'Add Schedule', orderNoPlaceholder: '12 digits, no duplicates', useOptimized: 'Use optimized parameters',
                alertOrderNoRequired: 'Order No. is required', alertQtyRequired: 'Valid Qty is required', alertDuplicate: 'Order No. already exists'
            },
            orderDetails: {
                foldSheets: 'Fold Sheets'
            },
            ordersAlert: { cannotMoveRunning: 'Cannot move the running order!', cannotDeleteSpeedNotZero: '❌ Cannot delete: line speed is not 0\nCurrent speed: {speed} m/min\n\nPlease stop production first.', cannotDeleteQtyRemaining: '❌ Cannot delete: unfinished quantity is not 0\nRemaining: {qty} sheets\n\nPlease finish production first.', selectToShowDiagram: 'Select a schedule on the left to display the box diagram', confirmDeleteProduct: 'Delete this product record?' },
            help: { title: 'User Guide', items: { monitor: '1. Live Monitor', schedule: '2. Production Schedule', reports: '3. Production Reports', analysis: '4. Production Analysis', settings: '5. System Settings' } }
        },
        docs: { category: { workflow: 'Workflows', design: 'Design Docs', deploy: 'Deployment & Ops', refactor: 'Refactoring Log', testing: 'Testing & Quality', meeting: 'Meeting Notes', other: 'Other' }, file: { manual: 'Operation Manual', sasd: 'SASD Guide', dev: 'Development Guide', mqtt: 'MQTT Message Flow', maintenance: 'Maintenance Design Doc', handover: 'Handover', projectStatus: 'Project Status', refactorLog: 'Refactoring Change Log', testCases: 'Test Cases', stressTest: 'Stress Test Report', review: 'Project Review', meeting1: 'Maintenance System Split', meeting2: 'Miaoli Maintenance Plan' }, header: { title: 'Document Portal' }, tab: { liveLog: 'Live Operation Logs' }, liveLog: { title: 'Live Operation Logs', desc: 'Shows real-time operation records from the Dashboard, including F-Key actions, order changes, and system events.', empty: 'No operation records yet — records are generated automatically once you start using the Dashboard.' }, welcome: { title: 'Printing IoT Document System', subtitle: 'Select a document on the left to start browsing', desc: 'Includes workflows, design docs, operation logs, refactoring logs, and test reports' }, loading: 'Loading...', error: { label: 'Error:', hint: 'Tip: This feature will be completed in Phase 3 backend integration. It requires the backend API endpoint', loadFail: 'Failed to load document', forbidden: 'Your role does not have access to this document', notFound: 'This document is not in the current build' } },
        fix: { monitorOperator: 'Operator', monitorShift: 'Shift', splitCount: 'Split Print Count', shortageWen: 'Shortage A', shortageWu: 'Shortage B', shortageReason: 'Shortage Reason', processType: 'Process Type', isSplit: 'Split Print', isFinished: 'Finished', saveOptimized: 'Save Optimized Params', tableReason: 'Reason', unsavedWarning: 'You have unsaved changes. Close anyway?', modified: 'Modified', editNote: 'Tip: edit fields directly then save', stop001: 'Feed Skew', stop002: 'Print Blurry', stop003: 'Paper Tear', stop004: 'Low Ink', stop005: 'Mechanical Failure', stop006: 'Other' },
        nav: { monitor: 'Monitor', schedule: 'Schedule', reports: 'Reports', settings: 'Settings', analysis: 'Analysis', docs: 'Docs', language: 'Language' },
        authGuard: { forbidden: 'Forbidden', forbiddenHint: 'This page requires a different role. Please contact your system administrator.', backHome: 'Back to home', sessionExpired: 'Your session has expired. Please sign in again.' },
        layout: { sim: { label: 'Simulate:', modeTitle: 'Select sim mode: Local (direct) vs Remote (via MQTT)', stop: 'Stop', standard: 'Standard', max: 'Max', stopShort: 'Stop', speed: 'Speed' }, help: { title: 'Help', button: 'Help' }, logout: 'Logout', status: { state: 'Status: Idle', connected: 'Connected', disconnected: 'Disconnected', disabled: 'Disabled' } },
        boxDiagram: { empty: 'Select an order on the left to display the box diagram', unit: 'Unit: mm', hsc: 'HSC (no top flap)', rsc: 'RSC (regular slotted)' },
        login: { btn: { admin: 'Admin', select: 'Select', exit: 'Exit', add: 'Add', delete: 'Delete', addPeriod: 'Add Period', customPeriod: 'Custom Period', cancel: 'Cancel', login: 'Login' }, label: { currentShift: 'Current Shift', operator: 'Operator', workPeriod: 'Work Period', code: 'Code', people: 'People:' }, placeholder: { auto: 'Auto', username: 'Username', password: 'Password' }, col: { code: 'Code', shift: 'Shift', operator: 'Operator', startTime: 'Start Time', endTime: 'End Time', people: 'People' }, admin: { title: 'Admin Login' }, alert: { selectOperator: 'Please select an operator', enterCodeName: 'Please enter code and name', invalidCredentials: 'Invalid Credentials' }, confirm: { delete: 'Confirm delete?' }, hint: { rosterLocal: 'The roster is this machine\u2019s touch shortcut list: tapping a row only fills in the username, a password is still required. Adding or removing a row does not create or disable a backend account \u2014 accounts are managed by an admin in Settings.', usernameKept: 'Kept the username you typed; the roster did not overwrite it. Clear the field to use that row instead.' } },
        backfill: { title: 'Backfill local records', expand: 'Expand', collapse: 'Collapse', hint: 'record(s) exist only in this browser and have not been sent to the server', explain: 'Scanning is read-only: it reports how many records would be sent and how many lose detail in conversion. Nothing is written until you confirm. Safe to run again.', scan: 'Scan', scanning: 'Scanning…', run: 'Start backfill', cancel: 'Stop', scanFailed: 'Scan failed. Check that you are signed in and the server is reachable.', waitingRateLimit: 'Rate limit reached, waiting', summary: { localTotal: 'Records in this browser', alreadySynced: 'Already on the server', pending: 'To be sent', duplicateKeys: 'Duplicate local ids (only the first is sent)', blocked: 'Cannot be sent' }, issues: { title: 'Lossy conversions (still sent, but they differ slightly from the original)', approximatedTime: 'Completion time inferred from the factory day (original had a date only)', orderLinkLost: 'Work-order link lost (order number kept as text)', truncated: 'Field too long, truncated', negativeClamped: 'Negative value clamped to 0', notANumber: 'Numeric field could not be read, counted as 0', unparsableFinishedAt: 'Completion timestamp could not be read', unparsableDuration: 'Stop duration could not be read, counted as 0' }, blockedTitle: 'Records that cannot be sent', result: { created: 'Created', alreadyExists: 'Already on the server (skipped)', conflict: 'Id conflict, needs a human check', failed: 'Failed', rerunHint: 'Failed and conflicting records stay in this browser; fix them and scan again.' } },
        reportView: { tab: { details: 'Production Details', daily: 'Daily Report', monthly: 'Monthly Report', stop: 'Stop Reasons' }, alert: { selectOrder: 'Please select an order first', noExport: 'No records to export in the selected range', exportWip: 'Export feature under development...', backendRecordReadOnly: 'This record is managed by the server; editing is not available in this release' }, btn: { confirm: 'Confirm', export: 'Export', manualUpload: 'Manual Upload', leave: 'Leave', exportExcel: 'Export Excel', print: 'Print', ok: 'OK', cancel: 'Cancel', expandAll: 'Expand All', collapseAll: 'Collapse All', retry: 'Retry' }, label: { date: 'Production Date', good: 'Good', defect: 'Defect', reportType: 'Report Type', dateRange: 'Date Range', shift: 'Shift' }, col: { select: 'Sel', seq: 'No.', customer: 'Customer', orderNo: 'Order No.', productName: 'Product Name', shift: 'Shift', speed: 'Speed', qty: 'Qty', countQty: 'Counted', good: 'Good', defect: 'Defect', finishedAt: 'Finished At', boxNo: 'Box No.', operator: 'Operator', targetQty: 'Target Qty', goodQty: 'Good Qty', defectQty: 'Defect Qty', yieldRate: 'Yield', achievementRate: 'Achievement', prepTime: 'Prep Time', runTime: 'Run Time', stopTime: 'Stop Time', stopCount: 'Stops', avgSpeed: 'Avg Speed', stopStart: 'Stop Start', duration: 'Duration', stopReason: 'Stop Reason', date: 'Date', orderCount: 'Orders', totalQty: 'Output', prodTime: 'Production Time', utilization: 'Utilization', time: 'Time', durationShort: 'Duration', source: 'Source' }, daily: { summaryTitle: 'Summary', totalOrders: 'Total Orders', totalTarget: 'Total Target', totalGood: 'Total Good', totalDefect: 'Total Defect', avgYield: 'Avg Yield', avgAchievement: 'Avg Achievement', totalRunTime: 'Total Run Time', totalStopTime: 'Total Stop Time', totalStopCount: 'Total Stops', avgOEE: 'Avg OEE', utilization: 'Utilization' }, monthly: { selectMonth: 'Month', year: 'Year', month: 'Month', title: 'Monthly Production Report', total: 'Monthly Total' }, stop: { timeRange: 'Time Range', title: 'Stop Reason Analysis', totalCount: 'Total Stops', totalTime: 'Total Stop Time' }, shift: { all: 'All', a: 'Shift A', b: 'Shift B', c: 'Shift C', day: 'Day Shift', night: 'Night Shift' }, unit: { count: 'records', times: 'times', minutes: 'min', sheetsPerMin: 'sheets/min' }, print: { printTime: 'Print Time', statRange: 'Stat Range', shift: 'Shift' }, empty: { noRecords: 'No production records in range', noStopRecords: 'No stop records for this order', noData: 'No data. Please adjust the filters.', noMonth: 'No production records this month', noStopInRange: 'No stop records in this time range' }, state: { loading: 'Loading production records…', error: 'Unable to load production records. Please try again.', empty: 'No production records in this range', degraded: 'Cannot reach the server. Showing the local offline cache; data may be incomplete.', truncated: 'Result exceeds the single-query limit. Narrow the date range; only part of the data is shown, records shown', localOnly: 'record(s) exist only in the local cache and are not yet synced to the server' , sourceBackend: 'Totals are computed on the server', sourceLocalOnly: 'Some records in this range exist only locally; totals are computed in the browser', sourceDegraded: 'Server totals unavailable; computed in the browser and may differ from the server'}, source: { backend: 'Server', local: 'Local cache' } },
        settingsExt: { common: { add: 'Add', edit: 'Edit', delete: 'Delete', save: 'Save', cancel: 'Cancel', update: 'Update', import: 'Import', sheets: 'Sheets' }, general: { title: 'General Settings', companyHeader: 'Company Header', companyHeaderHint: 'This setting is used for the company header shown when printing reports', companyNameZh: 'Company Name (Chinese):', companyNameZhPlaceholder: 'e.g. Taiwan Carton Co., Ltd.', companyNameEn: 'Company Name (English):', companyNameEnPlaceholder: 'e.g. Taiwan Carton Co., Ltd.', companyAddress: 'Company Address:', companyAddressPlaceholder: 'e.g. No.100, Sec.1, Xinyi Rd., Taipei', phone: 'Phone:', phonePlaceholder: 'e.g. 02-1234-5678', fax: 'Fax:', faxPlaceholder: 'e.g. 02-1234-5679', companyLogo: 'Company Logo', noUpload: 'Not uploaded', userSettings: 'User Settings', inheritRemoteIp: 'Inherit Remote IP', custom: 'Custom', remoteIp: 'Remote IP:', remoteIpPlaceholder: 'e.g. 192.168.1.100', colUser: 'User', colPassword: 'Password', colId: 'ID', colActions: 'Actions', userNamePlaceholder: 'Name', passwordPlaceholder: 'Password', idPlaceholder: 'ID', shiftSettings: 'Shift Time Settings', colShift: 'Shift', colStart: 'Start', colEnd: 'End', shiftNamePlaceholder: 'Name', stopReasonSettings: 'Stop Reason Settings', defectReasonSettings: 'Defect Reason Settings', colReason: 'Reason', colCategory: 'Category', reasonPlaceholder: 'Reason', categoryPlaceholder: 'Category', alertFillUser: 'Please fill in all user fields', alertDuplicateUser: 'Code {code} already exists for another user', alertUserSaved: 'User saved', confirmDeleteUser: 'Delete this user?', alertFillShift: 'Please fill in all shift fields', alertShiftSaved: 'Shift saved', confirmDeleteShift: 'Delete this shift?', alertEnterIdReason: 'Please enter ID and reason', confirmDeleteReason: 'Delete?', alertImportSuccess: 'Simulated import from Excel succeeded!', offlineModeNotice: 'Offline mode: changes are saved on this machine only', colRole: 'Role', colStatus: 'Status', statusActive: 'Active', statusInactive: 'Disabled', btnDisableUser: 'Disable', btnEnableUser: 'Enable', confirmDisableUser: 'Disable this user? They will no longer be able to sign in.', userLoading: 'Loading users…', userLoadFailed: 'Cannot reach the backend. Showing the local cached roster; adding or editing will fail until the connection is restored.', userReadOnly: 'Only a system administrator can manage users. This section is read-only.', alertPasswordRequired: 'A password is required when creating a user', alertUserSaveFailed: 'Failed to save the user', alertUserOffline: 'This row exists only in the local cache and has no backend account to update. Restore the backend connection first.', passwordKeepHint: 'Password (leave blank to keep)', usernameImmutableHint: 'The username cannot be changed after creation', roleAdmin: 'Administrator', roleSupervisor: 'Supervisor', roleEngineer: 'Engineer', roleOperator: 'Operator' }, formula: { savedAlert: 'Settings Saved', shortageThresholdLabel: 'Shortage Force Input Threshold', stdAvgSpeed: 'Standard Avg Speed', splitPrintCredit: 'Split Print Credit', continuousDef: 'Continuous Production Definition', continuousCriteria: 'Continuous Production Criteria', criteriaPrefix: 'Within', criteriaMiddle: 'sec, produce', trialSuccessLabel: 'Trial Success Sheets', withinSheets: 'sheets', trialSuccessHint: 'Reaching within this sheet count during trial counts as success', prepTimeIndicator: 'Prep Time Indicator', prepTimeDescPrefix: 'Affects live monitor Production Qty column ', bgColor: 'background color', stdPrepTimeLabel: 'Standard Prep Time', minUnit: 'min', defaultPrefix: 'Default', minuteWord: 'min', startTimeMode: 'Start Time Mode', prevFinish: 'Previous Order Finish', dataArrival: 'Data Arrival', yellowUpper: 'Yellow Upper Limit', redLight: 'Red', lightRule: 'Light Rule', qtyFontColor: 'Production Qty Font Color', controlledByShortage: ' controlled by Shortage Force Input Threshold:', speedIndicator: 'Speed Indicator', speedDescPrefix: 'Affects live monitor Speed column ', fontColor: 'font color', speedDescSuffix: ', based on machine max speed in Unit Settings', speedBaseType: 'Speed Base Type', standardSpeed: 'Standard Speed', maximumSpeed: 'Maximum Speed', stdSpeedBase: 'Standard Speed Base', machineMaxTimes: 'Machine Max Speed ×', maxSpeedNote: 'When using maximum speed as base, speed indicator uses machine max speed (100%) as standard', yellowRange: 'Yellow Range', greenLight: 'Green', standardSpeedShort: 'Standard Speed' }, boxType: { enterName: 'Enter Box Type Name:', renamePrompt: 'Rename Box Type:', deleteConfirm: 'Delete this Box Type?', title: 'Box Type Settings', basicInfo: 'Basic Info', nameLabel: 'Name', erpAlias: 'ERP Alias', descLabel: 'Description', descPlaceholder: 'e.g. L*W*H = S2*S3*H', formulasLabel: 'Formulas', formulaSupport: 'Supports +, -, *, /, ( ) and field variables (S1, L, W...)', lengthDef: 'Length Definition', labelLenPlaceholder: 'Label (L/W)', correction: 'Correction', mmAddSub: 'mm (offset)', formula: 'Formula', widthDef: 'Width Definition', labelPlaceholder: 'Label', diagramPosSettings: 'Diagram Position Settings', diagramPosHint: 'Select field below, then click image to set position', imageLabel: 'Image', selectFieldFirst: 'Please select a field first', uploadImage: 'Please upload image', selectOrAdd: 'Select or Add Box Type' }, comm: { monitorInterval: 'Monitor Interval', secondsDefault: 'sec (Default: 1.0s)', monitorMsg: 'Monitor Messages', simControlTitle: 'Simulation Controls', simControlHintPre: "Please use the toolbar's", simProduction: 'Simulate Production', simControlHintMid: 'and', simControlHintPost: 'switches to test.', erpDesc: 'Protocol interface mapping the ERP production schedule product files and orders', connNone: 'None', serverIp: 'Server IP', port: 'Port', inputDir: 'Input Dir', outputDir: 'Output Dir', dataLogTitle: 'Data Logging Settings', dataLogDesc: 'Controls how often MQTT data is written to the database. Writes immediately on machine status change, otherwise at the configured interval.', logInterval: 'Log Interval', minutes: 'minutes', seconds: 'sec', current: 'Current', note: 'Note', noteItem1: 'Writes to DB immediately on status change (RUN ↔ STOP ↔ JOG)', noteItem2: 'Writes periodically at this interval otherwise', noteItem3: 'Recommended: 180-600 sec (3-10 min)', noteItem4: 'Valid range 1-3600 sec; out-of-range values fall back to the backend default of 300 sec', intervalOutOfRange: 'Must be a whole number of seconds between 1 and 3600. Out-of-range values are not sent \u2014 the backend would replace them with the default 300 sec anyway.', machineId: 'Machine ID', machineIdHint: 'Unique code identifying this machine, recorded in production logs', saveSuccess: 'Communication settings saved to server', saveFailed: 'Save failed' }, machine: { enterSectionName: 'Please enter Section Name', addFailed: 'Failed to create section', confirmDeleteSection: 'Delete this section?', deleteFailed: 'Failed to delete section', orderUpdateFailed: 'Failed to update order', confirmReset: 'Reset? This will delete existing sections and create defaults.', resetComplete: 'Reset to defaults complete', resetFailed: 'Reset failed', sectionsHint: 'These sections are used for machine status display and maintenance section options', defaults: 'Defaults', noSections: 'No sections yet, click the Add button', sectionDetails: 'Section Details', order: 'Order', faultSignal: 'Fault Signal', runSignal: 'Run Signal', selectSectionHint: 'Select a section on the left to view details', sheetsPerMin: 'sheets/min' }, report: { enterKeyword: 'Enter downtime reason keyword to exclude', dayCutoff: 'Day Cutoff Time', cutoffDefault: 'Default 07:30:00', smallBatchTitle: 'Small Batch Definition', smallBatchQty: 'Small Batch Qty', smallBatchHint: 'Orders below this quantity are marked as small batch and averaged separately.', exceptionFilters: 'Exception Filters', addKeyword: 'Add Keyword', filterHint: 'When calculating downtime, records containing the following keywords are excluded:', noFilters: 'No filter keywords' }, unit: { enterFluteName: 'Enter Flute Name', enterThicknessPre: 'Enter', enterThicknessPost: 'flute thickness', confirmDeleteFlute: 'Delete this flute?' } },
        fkeys: {
            f1: 'Up', f2: 'Down', f3: 'Start', f4: 'Finish', f5: 'Good', f6: 'Bad',
            f7: 'Order', f8: 'Next', f9: 'Shift', f10: 'Return', f12: 'Exit'
        },
        common: { orderNo: 'Order No', customer: 'Customer', qty: 'Qty', speed: 'Speed' },
        settings: {
            tabs: { general: 'General', unit: 'Unit', machine: 'Machine', communication: 'Communication', formula: 'Formula', boxType: 'Box Type', report: 'Reports' },
            comm: {
                title: 'Communication Settings',
                desc: 'Configure PLC connection and ERP data exchange',
                plcTitle: 'PLC Control',
                erpTitle: 'ERP Integration',
                deviceType: 'Device Type',
                ip: 'IP Address',
                port: 'Port',
                connTest: 'Test Conn',
                simulateSignal: 'Simulate Signal',
                protocol: 'Protocol',
                connType: 'Connection Type',
                svrPath: 'Server Path'
            },
            machine: {
                title: 'Machine Settings',
                desc: 'Configure Max Speed and Machine Sections',
                maxSpeed: 'Max Speed',
                sections: 'Sections',
                sectionName: 'Section Name',
                add: 'Add',
                delete: 'Delete'
            },
            unit: {
                title: 'Unit Settings',
                select: 'Unit Selection',
                mm: 'Millimeter (mm)',
                inch: 'Inch',
                fluteSettings: 'Flute Settings',
                flute: 'Flute',
                thickness: 'Thickness',
                addFlute: 'Add Flute',
                flute_single: 'Flute'
            },
            formula: {
                title: 'Formula Settings',
                desc: 'Standard calculation parameters configuration',
                coreEff: 'Core Efficiency',
                timeAvail: 'Time Availability',
                continuous: 'Continuous Production',
                targets: 'Targets',
                stdAvgSpeed: 'Std Avg Speed',
                stdPrepTime: 'Std Prep Time',
                splitPrintCredit: 'Split Print Credit',
                targetOEE: 'Target OEE',
                targetPrepSuccess: 'Target Trial Success'
            },
            report: {
                title: 'Report Settings',
                desc: 'Backend report generation logic',
                timeBoundary: 'Time Boundary',
                smallBatch: 'Small Batch',
                exceptionFilters: 'Exception Filters'
            }
        },
        dashboard: {
            monitor: {
                productionQty: 'Production Qty',
                qty: 'Qty',
                speed: 'Speed',
                standard: 'Standard',
                maxSpeed: 'Max Speed',
                idle: 'Idle',
                waitForF3: 'Wait for F3 to Start',
                running: 'Running'
            },
            stats: {
                squareMeter: 'Sq.M',
                total: 'Total',
                count: 'Count',
                remaining: 'Remaining',
                defect: 'Defect',
                avgSpeed: 'Avg Speed',
                runTime: 'Run Time',
                stopTime: 'Stop Time',
                stopCount: 'Stops',
                today: 'Today',
                currentJob: 'Current'
            },
            schedule: {
                seqNo: 'Seq',
                customer: 'Customer',
                orderNo: 'Order No',
                boxNo: 'Box No',
                qty: 'Qty',
                productName: 'Product',
                boxType: 'Box Type',
                noQueuedOrders: 'No Queued Orders',
                autoNextOn: '【 Auto Next ON 】',
                autoNextOff: '【 Auto Next OFF 】',
                sheets: 'Sheets',
                notes: 'Notes'
            },
            machineStatus: {
                title: 'Machine Status',
                stopReason: 'Stop Reason',
                normal: 'Normal',
                warning: 'Warning',
                error: 'Error'
            },
            stopReasons: {
                startTime: 'Start Time',
                duration: 'Duration',
                reason: 'Reason'
            },
            alerts: {
                plcDisconnected: 'PLC Disconnected! Cannot start production.',
                selectOrderFirst: 'Please select an order first',
                selectQueuedOrder: 'Please select a queued order',
                speedNotZero: 'Speed must be 0 to finish. Please stop the machine first.',
                speedNotZeroReturn: 'Speed must be 0 to return. Please stop the machine first.',
                confirmDelete: 'Confirm delete order',
                confirmReorder: 'Confirm reorder sequence?',
                confirmExit: 'Confirm exit?',
                startProduction: 'Start Production'
            },
            logs: {
                f1Pressed: 'F1: Pressed (Move Up)',
                f2Pressed: 'F2: Pressed (Move Down)',
                f3Start: 'F3: Start Production',
                f4Finish: 'F4: Finish',
                f5GoodQty: 'F5: Production Qty +1',
                f6DefectQty: 'F6: Production Qty -1',
                f7OrderModal: 'F7: Open Order Modal',
                f8AutoNext: 'F8: Toggle Auto Next',
                f9SwitchShift: 'F9: Switch Shift',
                f10Return: 'F10: Return',
                f12Exit: 'F12: Exit System'
            }
        },
        orders: {
            tabs: {
                schedule: 'Schedule',
                products: 'Products'
            },
            schedule: {
                title: 'Production Schedule',
                moveUp: 'Move Up',
                moveDown: 'Move Down',
                delete: 'Delete',
                reorder: 'Reorder',
                addToSchedule: 'Add to Schedule'
            },
            products: {
                title: 'Product Library',
                add: 'Add Product',
                edit: 'Edit',
                delete: 'Delete',
                boxNo: 'Box No',
                productName: 'Product',
                boxType: 'Box Type',
                customer: 'Customer',
                maintenance_title: 'Database Maintenance'
            },
            alerts: {
                selectOrder: 'Please select an order',
                confirmDeleteRunning: 'Confirm delete running order? Please ensure speed and qty are 0',
                confirmDelete: 'Confirm delete order',
                confirmReorder: 'Confirm reorder sequence?'
            }
        },
        reports: {
            tabs: {
                daily: 'Daily Report',
                monthly: 'Monthly Report',
                stopReasons: 'Stop Reasons'
            },
            filters: {
                dateRange: 'Date Range',
                shift: 'Shift',
                allShifts: 'All Shifts',
                shiftA: 'Shift A',
                shiftB: 'Shift B',
                shiftC: 'Shift C'
            },
            table: {
                id: 'ID',
                client: 'Client',
                orderNo: 'Order No',
                product: 'Product',
                shift: 'Shift',
                speed: 'Speed',
                qty: 'Qty',
                count: 'Count',
                good: 'Good',
                bad: 'Bad',
                start: 'Start Time',
                test: 'Test Time',
                status: 'Status'
            },
            stopReasons: {
                startTime: 'Start Time',
                endTime: 'End Time',
                duration: 'Duration',
                code: 'Code',
                reason: 'Reason'
            },
            summary: {
                totalOrders: 'Total Orders',
                totalQty: 'Total Qty',
                totalGood: 'Total Good',
                totalBad: 'Total Bad',
                avgSpeed: 'Avg Speed',
                totalRunTime: 'Total Run Time',
                totalStopTime: 'Total Stop Time'
            }
        },
        analysis: {
            title: 'Production Analysis',
            controls: { chartView: 'Chart View', tableView: 'Table View', scrollStart: 'Start', scrollEnd: 'End' },
            charts: {
                oee: 'OEE Trend',
                speedTrend: 'Speed Trend',
                defectRate: 'Defect Rate Analysis',
                stopReasons: 'Stop Reasons Analysis'
            },
            metrics: {
                oee: 'OEE',
                availability: 'Availability',
                performance: 'Performance',
                quality: 'Quality',
                avgSpeed: 'Avg Speed',
                defectRate: 'Defect Rate'
            },
            filters: {
                timePeriod: 'Time Period',
                today: 'Today',
                week: 'This Week',
                month: 'This Month',
                custom: 'Custom'
            },
            fields: {
                customer: 'Customer', product: 'Product', boxNo: 'Box No', boxType: 'Box Type',
                orderNo: 'Order No', qty: 'Qty', operator: 'Operator', shift: 'Shift',
                stopReason: 'Stop Reason', prepTime: 'Prep Time', date: 'Date', runTime: 'Run Time',
                stopTime: 'Stop Time', avgSpeed: 'Avg Speed', stopCount: 'Stop Count',
                defectQty: 'Defect Qty', oee: 'OEE', goodQty: 'Good Qty'
            },
            chartType: { title: 'Chart Type' },
            chartTypes: { pie: 'Pie', doughnut: 'Doughnut', line: 'Line', bar: 'Bar', radar: 'Radar' },
            timeScale: { title: 'Time Scale' },
            timeScales: { minute: 'Minute', hour: 'Hour', day: 'Day', week: 'Week', month: 'Month' },
            category: { title: 'Group By' },
            display: { title: 'Display Fields' },
            dateRange: 'Date Range',
            quickDate: { today: 'Today', yesterday: 'Yesterday', last7days: 'Last 7d', last30days: 'Last 30d', thisMonth: 'This Month' },
            actions: { clearFilters: 'Clear Filters', downloadImage: 'Download Image', exportExcel: 'Export Excel', print: 'Print' },
            summary: { totalQty: 'Total Good', avgDailyQty: 'Daily Avg', totalStopTime: 'Total Stop Time', avgSpeed: 'Avg Speed', recordsCount: 'Records' },
            state: { loading: 'Loading production records…', error: 'Unable to load production records. Please try again.', empty: 'No production records in this range', degraded: 'Cannot reach the server. Showing the local offline cache; data may be incomplete.', truncated: 'Result exceeds the single-query limit. Narrow the date range; only part of the data is shown, records shown', localOnly: 'record(s) exist only in the local cache and are not yet synced to the server', retry: 'Retry', exportWhileLoading: 'Data is still loading. Please wait before exporting.' }
        },
        modals: {
            finishOrder: {
                title: 'Finish Confirmation',
                goodQty: 'Good Qty',
                defectQty: 'Defect Qty',
                operator: 'Operator',
                notes: 'Notes',
                confirm: 'Confirm Finish',
                cancel: 'Cancel'
            },
            productDetail: {
                title: 'Product Specification'
            },
            orderDetails: {
                title: 'Order Details',
                orderNo: 'Order No',
                customer: 'Customer',
                boxNo: 'Box No',
                productName: 'Product',
                boxType: 'Box Type',
                qty: 'Qty',
                status: 'Status',
                close: 'Close'
            },
            productForm: {
                title: 'Product Form',
                addProduct: 'Add Product',
                editProduct: 'Edit Product',
                boxNo: 'Box No',
                productName: 'Product',
                boxType: 'Box Type',
                customer: 'Customer',
                length: 'Length',
                width: 'Width',
                height: 'Height',
                save: 'Save',
                cancel: 'Cancel'
            },
            stopReason: {
                title: 'Stop Reason',
                selectReason: 'Select Reason',
                customReason: 'Custom Reason',
                startTime: 'Start Time',
                duration: 'Duration',
                confirm: 'Confirm',
                cancel: 'Cancel'
            },
            help: {
                title: 'Help',
                fkeys: 'Function Keys',
                close: 'Close'
            }
        },
        ui: {
            buttons: {
                save: 'Save',
                cancel: 'Cancel',
                delete: 'Delete',
                edit: 'Edit',
                add: 'Add',
                confirm: 'Confirm',
                close: 'Close',
                search: 'Search',
                reset: 'Reset',
                export: 'Export',
                import: 'Import',
                upload: 'Upload',
                download: 'Download'
            },
            status: {
                idle: 'Idle',
                running: 'Running',
                stopped: 'Stopped',
                completed: 'Completed',
                error: 'Error',
                warning: 'Warning',
                normal: 'Normal'
            },
            messages: {
                saveSuccess: 'Save successful',
                saveFailed: 'Save failed',
                deleteSuccess: 'Delete successful',
                deleteFailed: 'Delete failed',
                updateSuccess: 'Update successful',
                updateFailed: 'Update failed',
                loading: 'Loading...',
                noData: 'No data',
                confirmDelete: 'Confirm delete?',
                confirmAction: 'Confirm this action?'
            }
        }
    },
    vn: {
        modalExt: {
            params: {
                gapFeedFront: 'Khe chắn trước cấp giấy', gapFeedProg: 'Khe bánh cấp giấy', gapFeedRubber: 'Khe bánh đai cấp giấy',
                gapFormFront: 'Khe dẫn trước bộ tạo hình', dieCutPhase: 'Pha bộ bế', dieCutFeedGap: 'Khe bánh cấp giấy bộ bế',
                slotGuide: 'Bánh dẫn giấy bộ xẻ rãnh', slotFront: 'Đường lằn bộ xẻ rãnh', slotAux: 'Đường lằn phụ bộ xẻ rãnh', midKnife: 'Vị trí dao giữa',
                printSection: 'Bộ in', press: 'Áp lực in', pos: 'Vị trí', beltGap: 'Khe đai', plateGap: 'Khe đế bản',
                ink: 'Mực in', belt: 'Đai', crease: 'Đường lằn', unit1: '1', unit2: '2', unit3: '3', unit4: '4'
            },
            finishOrder: {
                defectFlat: 'Tấm lỗi', defectPrint: 'In lỗi', defectSelf: 'Thân lỗi', defectOver: 'Sản xuất dư',
                reasonA: 'Lý do A', reasonB: 'Lý do B', typeA: 'Loại A', typeB: 'Loại B', pleaseSelect: 'Vui lòng chọn',
                shortageAlertPre: 'Chưa đạt sản lượng mục tiêu', shortageAlertMid: 'và chênh lệch vượt quá', shortageAlertPost: ', vui lòng nhập lý do thiếu hụt'
            },
            productForm: {
                title: 'Thông tin sản phẩm', flute: 'Sóng', thicknessHint: 'Độ dày tự động theo loại sóng', bundleCount: 'Số lượng bó',
                uploadHint: 'Vui lòng tải ảnh hộp và cấu hình vị trí trường trong Cài đặt'
            },
            addSchedule: {
                title: 'Thêm lịch trình', orderNoPlaceholder: '12 ký tự, không trùng lặp', useOptimized: 'Sử dụng tham số tối ưu',
                alertOrderNoRequired: 'Vui lòng nhập số đơn hàng', alertQtyRequired: 'Vui lòng nhập số lượng hợp lệ', alertDuplicate: 'Số đơn hàng bị trùng'
            },
            orderDetails: {
                foldSheets: 'Số tờ gấp'
            },
            ordersAlert: { cannotMoveRunning: 'Không thể di chuyển lệnh đang sản xuất!', cannotDeleteSpeedNotZero: '❌ Không thể xóa: tốc độ chạy khác 0\nTốc độ hiện tại: {speed} m/min\n\nVui lòng dừng sản xuất trước.', cannotDeleteQtyRemaining: '❌ Không thể xóa: sản lượng chưa hoàn thành khác 0\nCòn lại: {qty} tờ\n\nVui lòng hoàn thành sản xuất trước.', selectToShowDiagram: 'Chọn một lịch bên trái để hiển thị sơ đồ khai triển thùng', confirmDeleteProduct: 'Xóa dữ liệu sản phẩm này?' },
            help: { title: 'Hướng dẫn sử dụng', items: { monitor: '1. Giám sát thời gian thực', schedule: '2. Lịch sản xuất', reports: '3. Báo cáo sản xuất', analysis: '4. Phân tích sản xuất', settings: '5. Cài đặt hệ thống' } }
        },
        docs: { category: { workflow: 'Quy trình vận hành', design: 'Tài liệu thiết kế', deploy: 'Triển khai & Vận hành', refactor: 'Nhật ký tái cấu trúc', testing: 'Kiểm thử & Chất lượng', meeting: 'Biên bản họp', other: 'Khác' }, file: { manual: 'Hướng dẫn vận hành', sasd: 'Tài liệu SASD', dev: 'Tài liệu phát triển', mqtt: 'Luồng xử lý tin nhắn MQTT', maintenance: 'Tài liệu thiết kế bảo trì', handover: 'Bàn giao', projectStatus: 'Trạng thái dự án', refactorLog: 'Nhật ký thay đổi tái cấu trúc', testCases: 'Trường hợp kiểm thử', stressTest: 'Báo cáo kiểm thử tải', review: 'Đánh giá dự án', meeting1: 'Tách hệ thống quản lý bảo trì', meeting2: 'Kế hoạch bảo trì Miêu Lật' }, header: { title: 'Cổng tài liệu' }, tab: { liveLog: 'Nhật ký thao tác thời gian thực' }, liveLog: { title: 'Nhật ký thao tác thời gian thực (Live Operation Logs)', desc: 'Hiển thị bản ghi thao tác thời gian thực từ Dashboard, bao gồm thao tác F-Key, thay đổi đơn hàng và sự kiện hệ thống.', empty: 'Chưa có bản ghi thao tác — bản ghi sẽ tự động tạo khi bắt đầu dùng Dashboard.' }, welcome: { title: 'Hệ thống tài liệu Printing IoT', subtitle: 'Chọn tài liệu ở bên trái để bắt đầu xem', desc: 'Bao gồm quy trình vận hành, tài liệu thiết kế, nhật ký thao tác, nhật ký tái cấu trúc và báo cáo kiểm thử' }, loading: 'Đang tải...', error: { label: 'Lỗi:', hint: 'Gợi ý: Tính năng này sẽ hoàn thành trong tích hợp backend Phase 3. Cần điểm cuối API backend', loadFail: 'Không thể tải tài liệu', forbidden: 'Vai trò của bạn không có quyền xem tài liệu này', notFound: 'Tài liệu này không có trong bản dựng hiện tại' } },
        fix: { monitorOperator: 'Người vận hành', monitorShift: 'Ca', splitCount: 'Số tờ in tách', shortageWen: 'Thiếu A', shortageWu: 'Thiếu B', shortageReason: 'Lý do thiếu hụt', processType: 'Loại quy trình', isSplit: 'In tách', isFinished: 'Đã hoàn thành', saveOptimized: 'Lưu tham số tối ưu', tableReason: 'Lý do', unsavedWarning: 'Có thay đổi chưa lưu. Vẫn đóng?', modified: 'Đã sửa', editNote: 'Mẹo: sửa trực tiếp các trường rồi lưu', stop001: 'Lệch cấp giấy', stop002: 'In mờ', stop003: 'Rách giấy', stop004: 'Thiếu mực', stop005: 'Lỗi cơ khí', stop006: 'Khác' },
        nav: { monitor: 'Giám sát', schedule: 'Lịch trình', reports: 'Báo cáo', settings: 'Cài đặt', analysis: 'Phân tích', docs: 'Tài liệu', language: 'Ngôn ngữ' },
        authGuard: { forbidden: 'Không đủ quyền (Forbidden)', forbiddenHint: 'Trang này yêu cầu vai trò khác. Vui lòng liên hệ quản trị viên hệ thống.', backHome: 'Về trang chủ', sessionExpired: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.' },
        layout: { sim: { label: 'Mô phỏng:', modeTitle: 'Chọn chế độ mô phỏng: Cục bộ (hiển thị trực tiếp) vs Từ xa (qua MQTT)', stop: 'Dừng', standard: 'Chuẩn', max: 'Tối đa', stopShort: 'Dừng', speed: 'Tốc độ' }, help: { title: 'Hướng dẫn', button: 'Trợ giúp' }, logout: 'Đăng xuất', status: { state: 'Trạng thái: Idle', connected: 'Đã kết nối', disconnected: 'Mất kết nối', disabled: 'Chưa bật' } },
        boxDiagram: { empty: 'Chọn một lệnh bên trái để hiển thị bản khai triển thùng', unit: 'Đơn vị: mm', hsc: 'Thùng nắp hở (không nắp trên)', rsc: 'Thùng khe thường' },
        login: { btn: { admin: 'Quản trị', select: 'Chọn', exit: 'Thoát', add: 'Thêm', delete: 'Xóa', addPeriod: 'Thêm ca', customPeriod: 'Ca tùy chỉnh', cancel: 'Hủy', login: 'Đăng nhập' }, label: { currentShift: 'Ca hiện tại', operator: 'Người vận hành', workPeriod: 'Thời gian làm việc', code: 'Mã', people: 'Số người:' }, placeholder: { auto: 'Tự động', username: 'Tài khoản', password: 'Mật khẩu' }, col: { code: 'Mã', shift: 'Ca', operator: 'Người vận hành', startTime: 'Giờ bắt đầu', endTime: 'Giờ kết thúc', people: 'Số người' }, admin: { title: 'Đăng nhập quản trị' }, alert: { selectOperator: 'Vui lòng chọn người vận hành', enterCodeName: 'Vui lòng nhập mã và tên', invalidCredentials: 'Tài khoản hoặc mật khẩu không đúng' }, confirm: { delete: 'Xác nhận xóa?' }, hint: { rosterLocal: 'Danh sách chỉ là lối tắt cảm ứng trên máy này: chạm một dòng chỉ điền tài khoản, vẫn phải nhập mật khẩu. Thêm hoặc xóa dòng không tạo hay vô hiệu hóa tài khoản trên máy chủ — tài khoản do quản trị viên quản lý trong Cài đặt.', usernameKept: 'Đã giữ tài khoản bạn nhập, danh sách không ghi đè. Xóa ô này nếu muốn dùng tài khoản của dòng đó.' } },
        backfill: { title: 'Chuyển dữ liệu cũ lên máy chủ', expand: 'Mở rộng', collapse: 'Thu gọn', hint: 'bản ghi chỉ có trên trình duyệt này, chưa được gửi lên máy chủ', explain: 'Quét là chỉ đọc: cho biết sẽ gửi bao nhiêu bản ghi và bao nhiêu bản bị mất chi tiết khi chuyển đổi. Chỉ ghi lên máy chủ sau khi bạn xác nhận; có thể chạy lại nhiều lần.', scan: 'Quét', scanning: 'Đang quét…', run: 'Bắt đầu chuyển', cancel: 'Dừng', scanFailed: 'Quét thất bại. Hãy kiểm tra bạn đã đăng nhập và máy chủ kết nối được.', waitingRateLimit: 'Đã chạm giới hạn lưu lượng, đang chờ', summary: { localTotal: 'Số bản ghi trên máy này', alreadySynced: 'Máy chủ đã có', pending: 'Sẽ được gửi', duplicateKeys: 'Mã trùng trên máy này (chỉ gửi bản đầu tiên)', blocked: 'Không thể gửi' }, issues: { title: 'Chuyển đổi có mất mát (vẫn gửi, nhưng khác đôi chút so với bản gốc)', approximatedTime: 'Thời điểm hoàn thành được suy ra từ ngày sản xuất (bản gốc chỉ có ngày)', orderLinkLost: 'Mất liên kết lệnh sản xuất (chỉ giữ số lệnh dạng văn bản)', truncated: 'Trường quá dài, đã cắt bớt', negativeClamped: 'Giá trị âm được đưa về 0', notANumber: 'Không đọc được trường số, tính là 0', unparsableFinishedAt: 'Không đọc được thời điểm hoàn thành', unparsableDuration: 'Không đọc được thời lượng dừng máy, tính là 0' }, blockedTitle: 'Các bản ghi không thể gửi', result: { created: 'Đã tạo mới', alreadyExists: 'Máy chủ đã có (bỏ qua)', conflict: 'Trùng mã, cần người kiểm tra', failed: 'Thất bại', rerunHint: 'Bản ghi thất bại hoặc trùng mã vẫn ở lại máy này; sửa xong có thể quét lại.' } },
        reportView: { tab: { details: 'Chi tiết sản xuất', daily: 'Báo cáo ngày', monthly: 'Báo cáo tháng', stop: 'Lý do dừng máy' }, alert: { selectOrder: 'Vui lòng chọn một đơn hàng trước', noExport: 'Không có bản ghi sản xuất để xuất trong khoảng đã chọn', exportWip: 'Tính năng xuất đang phát triển...', backendRecordReadOnly: 'Bản ghi này do máy chủ quản lý; phiên bản này chưa hỗ trợ chỉnh sửa' }, btn: { confirm: 'Xác nhận', export: 'Xuất', manualUpload: 'Tải lên thủ công', leave: 'Thoát', exportExcel: 'Xuất Excel', print: 'In', ok: 'OK', cancel: 'Hủy', expandAll: 'Mở rộng tất cả', collapseAll: 'Thu gọn tất cả', retry: 'Thử lại' }, label: { date: 'Ngày sản xuất', good: 'Đạt', defect: 'Lỗi', reportType: 'Loại báo cáo', dateRange: 'Khoảng ngày', shift: 'Ca' }, col: { select: 'Chọn', seq: 'STT', customer: 'Tên khách hàng', orderNo: 'Số đơn hàng', productName: 'Tên sản phẩm', shift: 'Ca', speed: 'Tốc độ', qty: 'Số lượng', countQty: 'Số đếm', good: 'Đạt', defect: 'Lỗi', finishedAt: 'Thời gian hoàn thành', boxNo: 'Mã thùng', operator: 'Người vận hành', targetQty: 'Số lượng mục tiêu', goodQty: 'Số lượng đạt', defectQty: 'Số lượng lỗi', yieldRate: 'Tỷ lệ đạt', achievementRate: 'Tỷ lệ hoàn thành', prepTime: 'Thời gian chuẩn bị', runTime: 'Thời gian chạy', stopTime: 'Thời gian dừng', stopCount: 'Số lần dừng', avgSpeed: 'Tốc độ TB', stopStart: 'Bắt đầu dừng', duration: 'Thời lượng', stopReason: 'Lý do dừng', date: 'Ngày', orderCount: 'Số đơn', totalQty: 'Sản lượng', prodTime: 'Thời gian sản xuất', utilization: 'Hiệu suất', time: 'Thời gian', durationShort: 'Thời lượng', source: 'Nguồn dữ liệu' }, daily: { summaryTitle: 'Tổng hợp thống kê', totalOrders: 'Tổng số đơn', totalTarget: 'Tổng mục tiêu', totalGood: 'Tổng số đạt', totalDefect: 'Tổng số lỗi', avgYield: 'Tỷ lệ đạt TB', avgAchievement: 'Tỷ lệ hoàn thành TB', totalRunTime: 'Tổng thời gian chạy', totalStopTime: 'Tổng thời gian dừng', totalStopCount: 'Tổng số lần dừng', avgOEE: 'OEE TB', utilization: 'Hiệu suất' }, monthly: { selectMonth: 'Chọn tháng', year: 'Năm', month: 'Tháng', title: 'Báo cáo sản xuất tháng', total: 'Tổng tháng' }, stop: { timeRange: 'Khoảng thời gian', title: 'Phân tích lý do dừng máy', totalCount: 'Tổng số lần dừng', totalTime: 'Tổng thời gian dừng' }, shift: { all: 'Tất cả', a: 'Ca A', b: 'Ca B', c: 'Ca C', day: 'Ca ngày', night: 'Ca đêm' }, unit: { count: 'đơn', times: 'lần', minutes: 'phút', sheetsPerMin: 'tờ/phút' }, print: { printTime: 'Thời gian in', statRange: 'Khoảng thống kê', shift: 'Ca' }, empty: { noRecords: 'Không có bản ghi sản xuất trong khoảng', noStopRecords: 'Đơn này không có bản ghi dừng máy', noData: 'Không có dữ liệu, vui lòng điều chỉnh điều kiện', noMonth: 'Tháng này không có bản ghi sản xuất', noStopInRange: 'Không có bản ghi dừng máy trong khoảng thời gian này' }, state: { loading: 'Đang tải bản ghi sản xuất…', error: 'Không lấy được bản ghi sản xuất, vui lòng thử lại sau', empty: 'Không có bản ghi sản xuất trong khoảng này', degraded: 'Không kết nối được máy chủ, đang hiển thị bộ nhớ đệm cục bộ, dữ liệu có thể không đầy đủ', truncated: 'Dữ liệu vượt giới hạn truy vấn một lần, hãy thu hẹp khoảng ngày; chỉ hiển thị một phần, số bản ghi hiển thị', localOnly: 'bản ghi chỉ tồn tại trong bộ nhớ đệm cục bộ, chưa đồng bộ lên máy chủ' , sourceBackend: 'Số liệu tổng hợp được tính trên máy chủ', sourceLocalOnly: 'Một số bản ghi trong khoảng này chỉ có trên máy này; tổng hợp được tính tại trình duyệt', sourceDegraded: 'Không lấy được tổng hợp từ máy chủ; tính tại trình duyệt và có thể khác máy chủ'}, source: { backend: 'Máy chủ', local: 'Bộ nhớ đệm cục bộ' } },
        settingsExt: { common: { add: 'Thêm', edit: 'Sửa', delete: 'Xóa', save: 'Lưu', cancel: 'Hủy', update: 'Cập nhật', import: 'Nhập', sheets: 'Tờ' }, general: { title: 'Cài đặt chung', companyHeader: 'Cài đặt tiêu đề công ty', companyHeaderHint: 'Cài đặt này dùng cho tiêu đề công ty khi in báo cáo', companyNameZh: 'Tên công ty (Tiếng Trung):', companyNameZhPlaceholder: 'VD: Taiwan Carton Co., Ltd.', companyNameEn: 'Tên công ty (Tiếng Anh):', companyNameEnPlaceholder: 'VD: Taiwan Carton Co., Ltd.', companyAddress: 'Địa chỉ công ty:', companyAddressPlaceholder: 'VD: Số 100, Đoạn 1, Đường Xinyi, Đài Bắc', phone: 'Điện thoại:', phonePlaceholder: 'VD: 02-1234-5678', fax: 'Fax:', faxPlaceholder: 'VD: 02-1234-5679', companyLogo: 'Logo công ty', noUpload: 'Chưa tải lên', userSettings: 'Cài đặt người dùng', inheritRemoteIp: 'Kế thừa IP từ xa', custom: 'Tùy chỉnh', remoteIp: 'IP từ xa:', remoteIpPlaceholder: 'VD: 192.168.1.100', colUser: 'Người dùng', colPassword: 'Mật khẩu', colId: 'Mã', colActions: 'Thao tác', userNamePlaceholder: 'Tên', passwordPlaceholder: 'Mật khẩu', idPlaceholder: 'Mã', shiftSettings: 'Cài đặt thời gian ca', colShift: 'Ca', colStart: 'Bắt đầu', colEnd: 'Kết thúc', shiftNamePlaceholder: 'Ca', stopReasonSettings: 'Cài đặt lý do dừng máy', defectReasonSettings: 'Cài đặt lý do lỗi', colReason: 'Lý do', colCategory: 'Loại', reasonPlaceholder: 'Lý do', categoryPlaceholder: 'Loại', alertFillUser: 'Vui lòng nhập đầy đủ thông tin người dùng', alertDuplicateUser: 'Mã {code} đã tồn tại ở người dùng khác', alertUserSaved: 'Đã lưu người dùng', confirmDeleteUser: 'Xóa người dùng này?', alertFillShift: 'Vui lòng nhập đầy đủ thông tin ca', alertShiftSaved: 'Đã lưu ca', confirmDeleteShift: 'Xóa ca này?', alertEnterIdReason: 'Vui lòng nhập mã và lý do', confirmDeleteReason: 'Xóa?', alertImportSuccess: 'Mô phỏng nhập từ Excel thành công!', offlineModeNotice: 'Chế độ ngoại tuyến: thay đổi chỉ được lưu trên máy này', colRole: 'Vai trò', colStatus: 'Trạng thái', statusActive: 'Đang bật', statusInactive: 'Đã tắt', btnDisableUser: 'Tắt', btnEnableUser: 'Bật', confirmDisableUser: 'Tắt người dùng này? Họ sẽ không thể đăng nhập nữa.', userLoading: 'Đang tải danh sách người dùng…', userLoadFailed: 'Không kết nối được máy chủ. Đang hiển thị danh sách lưu trên máy; thêm hoặc sửa sẽ thất bại cho tới khi kết nối được khôi phục.', userReadOnly: 'Chỉ quản trị viên hệ thống mới quản lý được người dùng. Phần này ở chế độ chỉ đọc.', alertPasswordRequired: 'Phải đặt mật khẩu khi tạo người dùng', alertUserSaveFailed: 'Lưu người dùng thất bại', alertUserOffline: 'Dòng này chỉ có trong bộ nhớ đệm cục bộ, không có tài khoản trên máy chủ để sửa. Hãy khôi phục kết nối trước.', passwordKeepHint: 'Mật khẩu (để trống nếu không đổi)', usernameImmutableHint: 'Không thể đổi tên đăng nhập sau khi tạo', roleAdmin: 'Quản trị viên', roleSupervisor: 'Tổ trưởng', roleEngineer: 'Kỹ sư', roleOperator: 'Người vận hành' }, formula: { savedAlert: 'Đã lưu cài đặt', shortageThresholdLabel: 'Ngưỡng bắt buộc nhập thiếu số lượng', stdAvgSpeed: 'Tốc độ trung bình chuẩn', splitPrintCredit: 'Bù trừ in tách', continuousDef: 'Định nghĩa sản xuất liên tục', continuousCriteria: 'Điều kiện xác định sản xuất liên tục', criteriaPrefix: 'Trong', criteriaMiddle: 'giây, sản xuất', trialSuccessLabel: 'Xác định chạy thử thành công', withinSheets: 'tờ', trialSuccessHint: 'Đạt trong số tờ này khi chạy thử là thành công', prepTimeIndicator: 'Quản lý đèn báo thời gian chuẩn bị', prepTimeDescPrefix: 'Ảnh hưởng cột「Số lượng sản xuất」khi giám sát ', bgColor: 'màu nền', stdPrepTimeLabel: 'Thời gian chuẩn bị chuẩn', minUnit: 'phút', defaultPrefix: 'Mặc định', minuteWord: 'phút', startTimeMode: 'Chế độ thời gian bắt đầu', prevFinish: 'Thời gian hoàn thành lệnh trước', dataArrival: 'Bắt đầu khi dữ liệu đến', yellowUpper: 'Giới hạn đèn vàng', redLight: 'Đèn đỏ', lightRule: 'Quy tắc đèn báo', qtyFontColor: 'Màu chữ số lượng sản xuất', controlledByShortage: ' điều khiển bởi Ngưỡng bắt buộc nhập thiếu:', speedIndicator: 'Quản lý đèn báo tốc độ', speedDescPrefix: 'Ảnh hưởng cột「Tốc độ」khi giám sát ', fontColor: 'màu chữ', speedDescSuffix: ', dựa trên tốc độ tối đa máy trong Cài đặt đơn vị', speedBaseType: 'Loại chuẩn tốc độ', standardSpeed: 'Tốc độ chuẩn', maximumSpeed: 'Tốc độ tối đa', stdSpeedBase: 'Chuẩn tốc độ chuẩn', machineMaxTimes: 'Tốc độ tối đa máy ×', maxSpeedNote: 'Khi dùng tốc độ tối đa làm chuẩn, đèn tốc độ tính theo tốc độ tối đa máy (100%)', yellowRange: 'Phạm vi đèn vàng', greenLight: 'Đèn xanh', standardSpeedShort: 'Tốc độ chuẩn' }, boxType: { enterName: 'Nhập tên loại thùng:', renamePrompt: 'Đổi tên loại thùng:', deleteConfirm: 'Xóa loại thùng này?', title: 'Cài đặt loại thùng', basicInfo: 'Thông tin cơ bản', nameLabel: 'Tên', erpAlias: 'Bí danh ERP', descLabel: 'Mô tả', descPlaceholder: 'vd. D*R*C = S2*S3*H', formulasLabel: 'Công thức', formulaSupport: 'Hỗ trợ +, -, *, /, ( ) và biến trường (S1, L, W...)', lengthDef: 'Định nghĩa chiều dài', labelLenPlaceholder: 'Nhãn (Dài/Rộng)', correction: 'Giá trị hiệu chỉnh', mmAddSub: 'mm (cộng trừ)', formula: 'Công thức', widthDef: 'Định nghĩa chiều rộng', labelPlaceholder: 'Nhãn', diagramPosSettings: 'Cài đặt vị trí trên sơ đồ', diagramPosHint: 'Chọn trường bên dưới, nhấp vào hình để đặt vị trí', imageLabel: 'Hình ảnh', selectFieldFirst: 'Vui lòng chọn trường trước', uploadImage: 'Vui lòng tải hình lên', selectOrAdd: 'Chọn hoặc thêm loại thùng' }, comm: { monitorInterval: 'Tần suất cập nhật giám sát', secondsDefault: 'giây (Mặc định: 1.0s)', monitorMsg: 'Thông báo giám sát', simControlTitle: 'Điều khiển mô phỏng', simControlHintPre: 'Vui lòng dùng thanh công cụ phía trên', simProduction: 'Mô phỏng sản xuất', simControlHintMid: 'và', simControlHintPost: 'công tắc để kiểm tra.', erpDesc: 'Giao diện giao thức ánh xạ tệp sản phẩm và đơn hàng của lịch sản xuất ERP', connNone: 'Không kết nối', serverIp: 'IP máy chủ', port: 'Cổng', inputDir: 'Đường dẫn vào', outputDir: 'Đường dẫn ra', dataLogTitle: 'Cài đặt ghi dữ liệu', dataLogDesc: 'Kiểm soát tần suất ghi dữ liệu MQTT vào cơ sở dữ liệu. Ghi ngay khi trạng thái máy thay đổi, các lúc khác ghi theo khoảng thời gian đã đặt.', logInterval: 'Khoảng thời gian ghi', minutes: 'phút', seconds: 'giây', current: 'Hiện tại', note: 'Ghi chú', noteItem1: 'Ghi ngay vào CSDL khi trạng thái thay đổi (RUN ↔ STOP ↔ JOG)', noteItem2: 'Ngoài ra ghi định kỳ theo khoảng thời gian này', noteItem3: 'Khuyến nghị: 180-600 giây (3-10 phút)', noteItem4: 'Phạm vi hợp lệ 1-3600 giây; ngoài phạm vi sẽ dùng mặc định 300 giây', intervalOutOfRange: 'Phải là số nguyên giây từ 1 đến 3600. Giá trị ngoài phạm vi sẽ không được gửi — backend cũng sẽ thay bằng mặc định 300 giây.', machineId: 'Mã nhận dạng máy', machineIdHint: 'Mã duy nhất nhận dạng máy này, được ghi trong nhật ký sản xuất', saveSuccess: 'Đã lưu cài đặt truyền thông vào máy chủ', saveFailed: 'Lưu thất bại' }, machine: { enterSectionName: 'Vui lòng nhập tên bộ phận', addFailed: 'Thêm thất bại', confirmDeleteSection: 'Xóa bộ phận này?', deleteFailed: 'Xóa thất bại', orderUpdateFailed: 'Cập nhật thứ tự thất bại', confirmReset: 'Đặt lại? Việc này sẽ xóa các bộ phận hiện có và tạo giá trị mặc định.', resetComplete: 'Đã đặt lại về mặc định', resetFailed: 'Đặt lại thất bại', sectionsHint: 'Các bộ phận này dùng để hiển thị trạng thái máy và tùy chọn bộ phận bảo trì', defaults: 'Mặc định', noSections: 'Chưa có bộ phận, nhấn nút Thêm', sectionDetails: 'Chi tiết bộ phận', order: 'Thứ tự', faultSignal: 'Tín hiệu lỗi', runSignal: 'Tín hiệu chạy', selectSectionHint: 'Chọn một bộ phận bên trái để xem chi tiết', sheetsPerMin: 'tờ/phút' }, report: { enterKeyword: 'Nhập từ khóa lý do dừng máy cần loại trừ', dayCutoff: 'Thời điểm phân định qua ngày', cutoffDefault: 'Mặc định 07:30:00', smallBatchTitle: 'Định nghĩa lô nhỏ', smallBatchQty: 'Số lượng lô nhỏ', smallBatchHint: 'Đơn hàng dưới số lượng này được đánh dấu là lô nhỏ và tính trung bình riêng.', exceptionFilters: 'Bộ lọc ngoại lệ', addKeyword: 'Thêm từ khóa', filterHint: 'Khi tính thời gian dừng máy, các bản ghi chứa từ khóa sau sẽ tự động bị loại trừ:', noFilters: 'Không có từ khóa lọc' }, unit: { enterFluteName: 'Nhập tên sóng', enterThicknessPre: 'Nhập', enterThicknessPost: 'độ dày sóng', confirmDeleteFlute: 'Xóa sóng này?' } },
        fkeys: {
            f1: 'Lên', f2: 'Xuống', f3: 'Bắt đầu', f4: 'Hoàn thành', f5: 'Tốt', f6: 'Xấu',
            f7: 'Đơn hàng', f8: 'Tiếp', f9: 'Ca', f10: 'Trở lại', f12: 'Thoát'
        },
        common: { orderNo: 'Số đơn', customer: 'Khách hàng', qty: 'Số lượng', speed: 'Tốc độ' },
        settings: {
            tabs: { general: 'Chung', unit: 'Đơn vị', machine: 'Máy móc', communication: 'Giao tiếp', formula: 'Công thức', boxType: 'Loại hộp', report: 'Báo cáo' },
            comm: {
                title: 'Cài đặt Giao tiếp',
                desc: 'Cấu hình kết nối PLC và trao đổi dữ liệu ERP',
                plcTitle: 'Điều khiển PLC',
                erpTitle: 'Tích hợp ERP',
                deviceType: 'Loại thiết bị',
                ip: 'Địa chỉ IP',
                port: 'Cổng',
                connTest: 'Kiểm tra',
                simulateSignal: 'Mô phỏng',
                protocol: 'Giao thức',
                connType: 'Loại kết nối',
                svrPath: 'Đường dẫn máy chủ'
            },
            machine: {
                title: 'Cài đặt Máy móc',
                desc: 'Cấu hình Tốc độ tối đa và Các bộ phận máy',
                maxSpeed: 'Tốc độ tối đa',
                sections: 'Các bộ phận',
                sectionName: 'Tên bộ phận',
                add: 'Thêm',
                delete: 'Xóa'
            },
            unit: {
                title: 'Cài đặt Đơn vị', select: 'Chọn đơn vị', mm: 'Milimét (mm)', inch: 'Inch',
                fluteSettings: 'Cài đặt sóng', flute: 'Loại sóng', thickness: 'Độ dày',
                addFlute: 'Thêm sóng', flute_single: 'Sóng'
            },
            formula: {
                title: 'Cài đặt Tham số Công thức', desc: 'Tham số chuẩn theo tài liệu',
                coreEff: 'Hiệu suất lõi', timeAvail: 'Khả dụng thời gian', continuous: 'Định nghĩa sản xuất liên tục',
                targets: 'Mục tiêu', stdAvgSpeed: 'Tốc độ TB chuẩn', stdPrepTime: 'Thời gian chuẩn bị chuẩn',
                splitPrintCredit: 'Bù trừ in tách', targetOEE: 'Mục tiêu OEE', targetPrepSuccess: 'Mục tiêu tỷ lệ chạy thử'
            },
            report: {
                title: 'Cài đặt Tham số Báo cáo', desc: 'Cấu hình logic tạo báo cáo backend',
                timeBoundary: 'Ranh giới thời gian', smallBatch: 'Định nghĩa lô nhỏ', exceptionFilters: 'Bộ lọc ngoại lệ'
            }
        },
        dashboard: {
            monitor: { productionQty: 'Số lượng sản xuất', qty: 'Qty', speed: 'Tốc độ', standard: 'Tiêu chuẩn', maxSpeed: 'Tốc độ tối đa', idle: 'Chờ máy (Idle)', waitForF3: 'Chờ F3 bắt đầu sản xuất', running: 'Running' },
            stats: { squareMeter: 'Mét vuông', total: 'Tổng số', count: 'Số đếm', remaining: 'Còn lại', defect: 'Lỗi', avgSpeed: 'Tốc độ TB', runTime: 'Thời gian SX', stopTime: 'Thời gian dừng', stopCount: 'Số lần dừng', today: 'Hôm nay', currentJob: 'Đơn hiện tại' },
            schedule: { seqNo: 'STT', customer: 'Tên khách hàng', orderNo: 'Số đơn hàng', boxNo: 'Mã thùng', qty: 'Số lượng', productName: 'Tên sản phẩm', boxType: 'Loại hộp', noQueuedOrders: 'Không có đơn trong lịch', autoNextOn: '【 Tự động đơn kế ON 】', autoNextOff: '【 Tự động đơn kế OFF 】', sheets: 'Số tờ', notes: 'Ghi chú' },
            machineStatus: { title: 'Trạng thái máy', stopReason: 'Lý do dừng máy', normal: 'Bình thường', warning: 'Cảnh báo', error: 'Lỗi' },
            stopReasons: { startTime: 'Thời gian bắt đầu', duration: 'Thời lượng', reason: 'Lý do' },
            alerts: { plcDisconnected: 'Mất kết nối PLC, không thể bắt đầu sản xuất!', selectOrderFirst: 'Vui lòng chọn lệnh sản xuất trước', selectQueuedOrder: 'Vui lòng chọn lệnh trong lịch bên dưới', speedNotZero: 'Tốc độ khác 0, không thể hoàn tất! Vui lòng dừng máy trước.', speedNotZeroReturn: 'Tốc độ khác 0, không thể trả về! Vui lòng dừng máy trước.', confirmDelete: 'Xác nhận xóa lệnh sản xuất', confirmReorder: 'Xác nhận sắp xếp lại thứ tự lệnh?', confirmExit: 'Xác nhận thoát?', startProduction: 'Bắt đầu sản xuất' },
            logs: { f1Pressed: 'F1: Nhấn (Lên)', f2Pressed: 'F2: Nhấn (Xuống)', f3Start: 'F3: Bắt đầu sản xuất', f4Finish: 'F4: Hoàn tất', f5GoodQty: 'F5: Số lượng +1', f6DefectQty: 'F6: Số lượng -1', f7OrderModal: 'F7: Mở cửa sổ đơn hàng', f8AutoNext: 'F8: Bật/tắt tự động đơn kế', f9SwitchShift: 'F9: Chuyển ca', f10Return: 'F10: Trả về', f12Exit: 'F12: Thoát hệ thống' }
        },
        orders: {
            tabs: { schedule: 'Quản lý lịch SX', products: 'Kho sản phẩm' },
            schedule: { title: 'Lịch sản xuất', moveUp: 'Lên', moveDown: 'Xuống', delete: 'Xóa lịch', reorder: 'Đặt lại thứ tự', addToSchedule: 'Thêm vào lịch' },
            products: { title: 'Kho sản phẩm', add: 'Thêm sản phẩm', edit: 'Sửa', delete: 'Xóa', boxNo: 'Mã thùng', productName: 'Tên sản phẩm', boxType: 'Loại hộp', customer: 'Khách hàng', maintenance_title: 'Bảo trì cơ sở dữ liệu' },
            alerts: { selectOrder: 'Vui lòng chọn lệnh sản xuất trước', confirmDeleteRunning: 'Xác nhận xóa lệnh đang chạy? Vui lòng đảm bảo tốc độ và sản lượng bằng 0', confirmDelete: 'Xác nhận xóa lệnh sản xuất', confirmReorder: 'Xác nhận sắp xếp lại thứ tự lệnh?' }
        },
        reports: {
            tabs: { daily: 'Báo cáo SX ngày', monthly: 'Báo cáo SX tháng', stopReasons: 'Lý do dừng máy' },
            filters: { dateRange: 'Khoảng ngày', shift: 'Ca', allShifts: 'Tất cả ca', shiftA: 'Ca A', shiftB: 'Ca B', shiftC: 'Ca C' },
            table: { id: 'STT', client: 'Khách hàng', orderNo: 'Số đơn hàng', product: 'Sản phẩm', shift: 'Ca', speed: 'Tốc độ', qty: 'Số lượng', count: 'Số đếm', good: 'Sản phẩm tốt', bad: 'Lỗi', start: 'Thời gian bắt đầu', test: 'Thời gian chạy thử', status: 'Trạng thái' },
            stopReasons: { startTime: 'Thời gian bắt đầu', endTime: 'Thời gian kết thúc', duration: 'Thời lượng', code: 'Mã', reason: 'Lý do' },
            summary: { totalOrders: 'Tổng số đơn', totalQty: 'Tổng số lượng', totalGood: 'Tổng sản phẩm tốt', totalBad: 'Tổng lỗi', avgSpeed: 'Tốc độ TB', totalRunTime: 'Tổng thời gian SX', totalStopTime: 'Tổng thời gian dừng' }
        },
        analysis: {
            title: 'Phân tích sản xuất',
            controls: { chartView: 'Xem biểu đồ', tableView: 'Xem bảng', scrollStart: 'Đầu', scrollEnd: 'Cuối' },
            charts: { oee: 'Xu hướng OEE', speedTrend: 'Xu hướng tốc độ', defectRate: 'Phân tích tỷ lệ lỗi', stopReasons: 'Phân tích lý do dừng máy' },
            metrics: { oee: 'OEE', availability: 'Tỷ lệ khả dụng', performance: 'Tỷ lệ hiệu suất', quality: 'Tỷ lệ sản phẩm tốt', avgSpeed: 'Tốc độ TB', defectRate: 'Tỷ lệ lỗi' },
            filters: { timePeriod: 'Khoảng thời gian', today: 'Hôm nay', week: 'Tuần này', month: 'Tháng này', custom: 'Tùy chỉnh' },
            fields: { customer: 'Khách hàng', product: 'Tên sản phẩm', boxNo: 'Mã thùng', boxType: 'Loại hộp', orderNo: 'Số đơn hàng', qty: 'Số lượng', operator: 'Người vận hành', shift: 'Ca', stopReason: 'Lý do dừng máy', prepTime: 'Thời gian chuẩn bị', date: 'Ngày', runTime: 'Thời gian chạy', stopTime: 'Thời gian dừng', avgSpeed: 'Tốc độ TB', stopCount: 'Số lần dừng', defectQty: 'Số lượng lỗi', oee: 'OEE', goodQty: 'Số lượng tốt' },
            chartType: { title: 'Loại biểu đồ' },
            chartTypes: { pie: 'Biểu đồ tròn', doughnut: 'Biểu đồ vành khuyên', line: 'Biểu đồ đường', bar: 'Biểu đồ cột', radar: 'Biểu đồ radar' },
            timeScale: { title: 'Thang thời gian' },
            timeScales: { minute: 'Phút', hour: 'Giờ', day: 'Ngày', week: 'Tuần', month: 'Tháng' },
            category: { title: 'Điều kiện phân loại' },
            display: { title: 'Cột hiển thị' },
            dateRange: 'Khoảng ngày',
            quickDate: { today: 'Hôm nay', yesterday: 'Hôm qua', last7days: '7 ngày qua', last30days: '30 ngày qua', thisMonth: 'Tháng này' },
            actions: { clearFilters: 'Xóa điều kiện', downloadImage: 'Tải ảnh', exportExcel: 'Xuất Excel', print: 'In' },
            summary: { totalQty: 'Tổng sản phẩm tốt', avgDailyQty: 'Sản lượng TB ngày', totalStopTime: 'Tổng thời gian dừng', avgSpeed: 'Tốc độ TB', recordsCount: 'Số bản ghi' },
            state: { loading: 'Đang tải bản ghi sản xuất…', error: 'Không lấy được bản ghi sản xuất, vui lòng thử lại sau', empty: 'Không có bản ghi sản xuất trong khoảng này', degraded: 'Không kết nối được máy chủ, đang hiển thị bộ nhớ đệm cục bộ, dữ liệu có thể không đầy đủ', truncated: 'Dữ liệu vượt giới hạn truy vấn một lần, hãy thu hẹp khoảng ngày; chỉ hiển thị một phần, số bản ghi hiển thị', localOnly: 'bản ghi chỉ tồn tại trong bộ nhớ đệm cục bộ, chưa đồng bộ lên máy chủ', retry: 'Thử lại', exportWhileLoading: 'Dữ liệu đang tải, vui lòng đợi trước khi xuất' }
        },
        modals: {
            finishOrder: { title: 'Xác nhận hoàn tất', goodQty: 'Số lượng tốt', defectQty: 'Số lượng lỗi', operator: 'Người vận hành', notes: 'Ghi chú', confirm: 'Xác nhận hoàn tất', cancel: 'Hủy' },
            productDetail: { title: 'Chi tiết quy cách sản phẩm' },
            orderDetails: { title: 'Chi tiết đơn hàng', orderNo: 'Số đơn hàng', customer: 'Tên khách hàng', boxNo: 'Mã thùng', productName: 'Tên sản phẩm', boxType: 'Loại hộp', qty: 'Số lượng', status: 'Trạng thái', close: 'Đóng' },
            productForm: { title: 'Biểu mẫu sản phẩm', addProduct: 'Thêm sản phẩm', editProduct: 'Sửa sản phẩm', boxNo: 'Mã thùng', productName: 'Tên sản phẩm', boxType: 'Loại hộp', customer: 'Khách hàng', length: 'Chiều dài', width: 'Chiều rộng', height: 'Chiều cao', save: 'Lưu', cancel: 'Hủy' },
            stopReason: { title: 'Lý do dừng máy', selectReason: 'Chọn lý do dừng máy', customReason: 'Lý do tùy chỉnh', startTime: 'Thời gian bắt đầu', duration: 'Thời lượng', confirm: 'Xác nhận', cancel: 'Hủy' },
            help: { title: 'Hướng dẫn sử dụng', fkeys: 'Giải thích phím chức năng', close: 'Đóng' }
        },
        ui: {
            buttons: { save: 'Lưu', cancel: 'Hủy', delete: 'Xóa', edit: 'Sửa', add: 'Thêm', confirm: 'Xác nhận', close: 'Đóng', search: 'Tìm kiếm', reset: 'Đặt lại', export: 'Xuất', import: 'Nhập', upload: 'Tải lên', download: 'Tải xuống' },
            status: { idle: 'Chờ máy', running: 'Đang chạy', stopped: 'Đã dừng', completed: 'Đã hoàn tất', error: 'Lỗi', warning: 'Cảnh báo', normal: 'Bình thường' },
            messages: { saveSuccess: 'Lưu thành công', saveFailed: 'Lưu thất bại', deleteSuccess: 'Xóa thành công', deleteFailed: 'Xóa thất bại', updateSuccess: 'Cập nhật thành công', updateFailed: 'Cập nhật thất bại', loading: 'Đang tải...', noData: 'Không có dữ liệu', confirmDelete: 'Xác nhận xóa?', confirmAction: 'Xác nhận thực hiện thao tác này?' }
        }
    },
    th: {
        modalExt: {
            params: {
                gapFeedFront: 'ระยะแผ่นกั้นหน้าป้อนกระดาษ', gapFeedProg: 'ระยะลูกกลิ้งป้อนกระดาษ', gapFeedRubber: 'ระยะลูกกลิ้งสายพานป้อนกระดาษ',
                gapFormFront: 'ระยะนำหน้าชุดขึ้นรูป', dieCutPhase: 'เฟสชุดไดคัท', dieCutFeedGap: 'ระยะลูกกลิ้งป้อนชุดไดคัท',
                slotGuide: 'ลูกกลิ้งนำกระดาษชุดเซาะร่อง', slotFront: 'เส้นพับชุดเซาะร่อง', slotAux: 'เส้นพับเสริมชุดเซาะร่อง', midKnife: 'ตำแหน่งมีดกลาง',
                printSection: 'ชุดพิมพ์', press: 'แรงกดพิมพ์', pos: 'ตำแหน่ง', beltGap: 'ระยะสายพาน', plateGap: 'ระยะฐานแม่พิมพ์',
                ink: 'หมึกพิมพ์', belt: 'สายพาน', crease: 'เส้นพับ', unit1: '1', unit2: '2', unit3: '3', unit4: '4'
            },
            finishOrder: {
                defectFlat: 'แผ่นเสีย', defectPrint: 'พิมพ์เสีย', defectSelf: 'ตัวกล่องเสีย', defectOver: 'ผลิตเกิน',
                reasonA: 'สาเหตุ A', reasonB: 'สาเหตุ B', typeA: 'ประเภท A', typeB: 'ประเภท B', pleaseSelect: 'กรุณาเลือก',
                shortageAlertPre: 'ผลิตไม่ถึงเป้าหมาย', shortageAlertMid: 'และส่วนต่างเกิน', shortageAlertPost: ' กรุณาระบุสาเหตุที่ขาด'
            },
            productForm: {
                title: 'ข้อมูลสินค้า', flute: 'ลอน', thicknessHint: 'ความหนาตั้งอัตโนมัติตามชนิดลอน', bundleCount: 'จำนวนมัด',
                uploadHint: 'กรุณาอัปโหลดรูปกล่องและตั้งค่าตำแหน่งฟิลด์ในหน้าตั้งค่า'
            },
            addSchedule: {
                title: 'เพิ่มกำหนดการ', orderNoPlaceholder: '12 หลัก ห้ามซ้ำ', useOptimized: 'ใช้พารามิเตอร์ที่ปรับเหมาะสม',
                alertOrderNoRequired: 'กรุณาระบุเลขที่ออเดอร์', alertQtyRequired: 'กรุณาระบุจำนวนที่ถูกต้อง', alertDuplicate: 'เลขที่ออเดอร์ซ้ำ'
            },
            orderDetails: {
                foldSheets: 'จำนวนแผ่นพับ'
            },
            ordersAlert: { cannotMoveRunning: 'ไม่สามารถย้ายใบสั่งงานที่กำลังผลิตอยู่!', cannotDeleteSpeedNotZero: '❌ ไม่สามารถลบ: ความเร็วไม่เป็น 0\nความเร็วปัจจุบัน: {speed} m/min\n\nกรุณาหยุดการผลิตก่อน', cannotDeleteQtyRemaining: '❌ ไม่สามารถลบ: จำนวนที่ยังไม่ผลิตไม่เป็น 0\nคงเหลือ: {qty} แผ่น\n\nกรุณาผลิตให้เสร็จก่อน', selectToShowDiagram: 'เลือกตารางผลิตด้านซ้ายเพื่อแสดงแผนผังกล่อง', confirmDeleteProduct: 'ลบข้อมูลผลิตภัณฑ์นี้?' },
            help: { title: 'คู่มือการใช้งาน', items: { monitor: '1. การตรวจสอบเรียลไทม์', schedule: '2. ตารางการผลิต', reports: '3. รายงานการผลิต', analysis: '4. การวิเคราะห์การผลิต', settings: '5. การตั้งค่าระบบ' } }
        },
        docs: { category: { workflow: 'ขั้นตอนการทำงาน', design: 'เอกสารออกแบบ', deploy: 'การปรับใช้และปฏิบัติการ', refactor: 'บันทึกการรีแฟคเตอร์', testing: 'การทดสอบและคุณภาพ', meeting: 'บันทึกการประชุม', other: 'อื่น ๆ' }, file: { manual: 'คู่มือการใช้งาน', sasd: 'คู่มือ SASD', dev: 'คู่มือการพัฒนา', mqtt: 'กระบวนการจัดการข้อความ MQTT', maintenance: 'เอกสารออกแบบการบำรุงรักษา', handover: 'เอกสารส่งมอบ', projectStatus: 'สถานะโครงการ', refactorLog: 'บันทึกการเปลี่ยนแปลงการรีแฟคเตอร์', testCases: 'กรณีทดสอบ', stressTest: 'รายงานการทดสอบภาระ', review: 'การตรวจทานโครงการ', meeting1: 'การแยกระบบจัดการซ่อมบำรุง', meeting2: 'แผนบำรุงรักษาเมี่ยวลี่' }, header: { title: 'ประตูเอกสาร' }, tab: { liveLog: 'บันทึกการทำงานแบบเรียลไทม์' }, liveLog: { title: 'บันทึกการทำงานแบบเรียลไทม์ (Live Operation Logs)', desc: 'แสดงบันทึกการทำงานแบบเรียลไทม์จาก Dashboard รวมถึงการใช้ F-Key การเปลี่ยนแปลงคำสั่งซื้อ และเหตุการณ์ระบบ', empty: 'ยังไม่มีบันทึกการทำงาน — บันทึกจะถูกสร้างอัตโนมัติเมื่อเริ่มใช้ Dashboard' }, welcome: { title: 'ระบบเอกสาร Printing IoT', subtitle: 'เลือกเอกสารจากด้านซ้ายเพื่อเริ่มเรียกดู', desc: 'ประกอบด้วยขั้นตอนการทำงาน เอกสารออกแบบ บันทึกการทำงาน บันทึกการรีแฟคเตอร์ และรายงานการทดสอบ' }, loading: 'กำลังโหลด...', error: { label: 'ข้อผิดพลาด:', hint: 'คำแนะนำ: ฟีเจอร์นี้จะเสร็จสมบูรณ์ในการรวมแบ็กเอนด์ Phase 3 ต้องใช้ปลายทาง API แบ็กเอนด์', loadFail: 'ไม่สามารถโหลดเอกสารได้', forbidden: 'บทบาทของคุณไม่มีสิทธิ์เข้าถึงเอกสารนี้', notFound: 'เอกสารนี้ไม่อยู่ในบิลด์ปัจจุบัน' } },
        fix: { monitorOperator: 'ผู้ปฏิบัติงาน', monitorShift: 'กะ', splitCount: 'จำนวนพิมพ์แยก', shortageWen: 'ขาด A', shortageWu: 'ขาด B', shortageReason: 'สาเหตุที่ขาด', processType: 'ประเภทกระบวนการ', isSplit: 'พิมพ์แยก', isFinished: 'เสร็จสิ้น', saveOptimized: 'บันทึกค่าที่เหมาะสม', tableReason: 'เหตุผล', unsavedWarning: 'มีการเปลี่ยนแปลงที่ยังไม่บันทึก ปิดหรือไม่?', modified: 'แก้ไขแล้ว', editNote: 'เคล็ดลับ: แก้ไขฟิลด์โดยตรงแล้วบันทึก', stop001: 'ป้อนกระดาษเบี้ยว', stop002: 'พิมพ์ไม่ชัด', stop003: 'กระดาษฉีก', stop004: 'หมึกไม่พอ', stop005: 'เครื่องจักรขัดข้อง', stop006: 'อื่นๆ' },
        nav: { monitor: 'จอภาพ', schedule: 'กำหนดการ', reports: 'รายงาน', settings: 'การตั้งค่า', analysis: 'วิเคราะห์', docs: 'เอกสาร', language: 'ภาษา' },
        authGuard: { forbidden: 'สิทธิ์ไม่เพียงพอ (Forbidden)', forbiddenHint: 'หน้านี้ต้องใช้สิทธิ์ของบทบาทอื่น กรุณาติดต่อผู้ดูแลระบบ', backHome: 'กลับหน้าแรก', sessionExpired: 'เซสชันหมดอายุแล้ว กรุณาเข้าสู่ระบบใหม่' },
        layout: { sim: { label: 'จำลอง:', modeTitle: 'เลือกโหมดจำลอง: ในเครื่อง (แสดงตรง) vs ระยะไกล (ผ่าน MQTT)', stop: 'หยุด', standard: 'มาตรฐาน', max: 'สูงสุด', stopShort: 'หยุด', speed: 'ความเร็ว' }, help: { title: 'วิธีใช้', button: 'ช่วยเหลือ' }, logout: 'ออกจากระบบ', status: { state: 'สถานะ: Idle', connected: 'เชื่อมต่อ', disconnected: 'ตัดการเชื่อมต่อ', disabled: 'ปิดใช้งาน' } },
        boxDiagram: { empty: 'เลือกออเดอร์ทางซ้ายเพื่อแสดงแบบแผ่นคลี่กล่อง', unit: 'หน่วย: mm', hsc: 'กล่องฝาเปิด (ไม่มีฝาบน)', rsc: 'กล่องร่องมาตรฐาน' },
        login: { btn: { admin: 'ผู้ดูแล', select: 'เลือก', exit: 'ออก', add: 'เพิ่ม', delete: 'ลบ', addPeriod: 'เพิ่มช่วงเวลา', customPeriod: 'กำหนดช่วงเวลาเอง', cancel: 'ยกเลิก', login: 'เข้าสู่ระบบ' }, label: { currentShift: 'กะปัจจุบัน', operator: 'ผู้ปฏิบัติงาน', workPeriod: 'ช่วงเวลาทำงาน', code: 'รหัส', people: 'จำนวนคน:' }, placeholder: { auto: 'อัตโนมัติ', username: 'ชื่อผู้ใช้', password: 'รหัสผ่าน' }, col: { code: 'รหัส', shift: 'กะ', operator: 'ผู้ปฏิบัติงาน', startTime: 'เวลาเริ่ม', endTime: 'เวลาสิ้นสุด', people: 'จำนวนคน' }, admin: { title: 'เข้าสู่ระบบผู้ดูแล' }, alert: { selectOperator: 'กรุณาเลือกผู้ปฏิบัติงาน', enterCodeName: 'กรุณากรอกรหัสและชื่อ', invalidCredentials: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' }, confirm: { delete: 'ยืนยันการลบ?' }, hint: { rosterLocal: 'รายชื่อเป็นเพียงรายการลัดแบบสัมผัสของเครื่องนี้: แตะแถวจะกรอกเฉพาะชื่อผู้ใช้ ยังต้องใส่รหัสผ่าน การเพิ่มหรือลบแถวไม่ได้สร้างหรือปิดใช้งานบัญชีบนเซิร์ฟเวอร์ — บัญชีจัดการโดยผู้ดูแลในหน้าตั้งค่า', usernameKept: 'เก็บชื่อผู้ใช้ที่คุณพิมพ์ไว้ รายชื่อไม่ได้เขียนทับ ล้างช่องนี้หากต้องการใช้บัญชีของแถวนั้น' } },
        backfill: { title: 'ส่งข้อมูลเก่าขึ้นเซิร์ฟเวอร์', expand: 'ขยาย', collapse: 'ย่อ', hint: 'รายการมีอยู่เฉพาะบนเบราว์เซอร์นี้ ยังไม่ได้ส่งขึ้นเซิร์ฟเวอร์', explain: 'การสแกนเป็นแบบอ่านอย่างเดียว จะบอกว่าจะส่งกี่รายการและกี่รายการที่ข้อมูลคลาดเคลื่อนจากการแปลง จะเขียนขึ้นเซิร์ฟเวอร์เมื่อคุณยืนยันเท่านั้น และรันซ้ำได้', scan: 'สแกน', scanning: 'กำลังสแกน…', run: 'เริ่มส่งข้อมูล', cancel: 'หยุด', scanFailed: 'สแกนไม่สำเร็จ ตรวจสอบว่าเข้าสู่ระบบแล้วและเชื่อมต่อเซิร์ฟเวอร์ได้', waitingRateLimit: 'ถึงขีดจำกัดปริมาณคำขอ กำลังรอ', summary: { localTotal: 'จำนวนรายการบนเครื่องนี้', alreadySynced: 'เซิร์ฟเวอร์มีแล้ว', pending: 'รอส่ง', duplicateKeys: 'รหัสซ้ำบนเครื่องนี้ (ส่งเฉพาะรายการแรก)', blocked: 'ส่งไม่ได้' }, issues: { title: 'การแปลงที่สูญเสียรายละเอียด (ยังส่ง แต่ต่างจากต้นฉบับเล็กน้อย)', approximatedTime: 'เวลาที่เสร็จงานอนุมานจากวันผลิต (ต้นฉบับมีแต่วันที่)', orderLinkLost: 'ลิงก์ใบสั่งผลิตหาย (เก็บเฉพาะเลขที่ใบสั่งเป็นข้อความ)', truncated: 'ข้อมูลยาวเกิน ถูกตัดทอน', negativeClamped: 'ค่าติดลบถูกปรับเป็น 0', notANumber: 'อ่านค่าตัวเลขไม่ได้ นับเป็น 0', unparsableFinishedAt: 'อ่านเวลาที่เสร็จงานไม่ได้', unparsableDuration: 'อ่านระยะเวลาหยุดเครื่องไม่ได้ นับเป็น 0' }, blockedTitle: 'รายการที่ส่งไม่ได้', result: { created: 'สร้างใหม่สำเร็จ', alreadyExists: 'เซิร์ฟเวอร์มีแล้ว (ข้าม)', conflict: 'รหัสชนกัน ต้องให้คนตรวจสอบ', failed: 'ล้มเหลว', rerunHint: 'รายการที่ล้มเหลวหรือชนกันยังอยู่บนเครื่องนี้ แก้ไขแล้วสแกนใหม่ได้' } },
        reportView: { tab: { details: 'รายละเอียดการผลิต', daily: 'รายงานรายวัน', monthly: 'รายงานรายเดือน', stop: 'สาเหตุการหยุด' }, alert: { selectOrder: 'กรุณาเลือกคำสั่งผลิตก่อน', noExport: 'ไม่มีบันทึกการผลิตให้ส่งออกในช่วงที่เลือก', exportWip: 'ฟังก์ชันส่งออกอยู่ระหว่างพัฒนา...', backendRecordReadOnly: 'บันทึกนี้จัดการโดยเซิร์ฟเวอร์ รุ่นนี้ยังไม่รองรับการแก้ไข' }, btn: { confirm: 'ยืนยัน', export: 'ส่งออก', manualUpload: 'อัปโหลดด้วยตนเอง', leave: 'ออก', exportExcel: 'ส่งออก Excel', print: 'พิมพ์', ok: 'ตกลง', cancel: 'ยกเลิก', expandAll: 'ขยายทั้งหมด', collapseAll: 'ยุบทั้งหมด', retry: 'ลองใหม่' }, label: { date: 'วันที่ผลิต', good: 'ดี', defect: 'เสีย', reportType: 'ประเภทรายงาน', dateRange: 'ช่วงวันที่', shift: 'กะ' }, col: { select: 'เลือก', seq: 'ลำดับ', customer: 'ชื่อลูกค้า', orderNo: 'เลขที่คำสั่ง', productName: 'ชื่อสินค้า', shift: 'กะ', speed: 'ความเร็ว', qty: 'จำนวน', countQty: 'จำนวนนับ', good: 'ดี', defect: 'เสีย', finishedAt: 'เวลาเสร็จ', boxNo: 'เลขกล่อง', operator: 'ผู้ปฏิบัติงาน', targetQty: 'จำนวนเป้าหมาย', goodQty: 'จำนวนดี', defectQty: 'จำนวนเสีย', yieldRate: 'อัตราดี', achievementRate: 'อัตราบรรลุ', prepTime: 'เวลาเตรียม', runTime: 'เวลาเดินเครื่อง', stopTime: 'เวลาหยุด', stopCount: 'จำนวนครั้งหยุด', avgSpeed: 'ความเร็วเฉลี่ย', stopStart: 'เริ่มหยุด', duration: 'ระยะเวลา', stopReason: 'สาเหตุการหยุด', date: 'วันที่', orderCount: 'จำนวนรายการ', totalQty: 'ปริมาณผลิต', prodTime: 'เวลาผลิต', utilization: 'อัตราการใช้งาน', time: 'เวลา', durationShort: 'ระยะเวลา', source: 'แหล่งข้อมูล' }, daily: { summaryTitle: 'สรุปสถิติ', totalOrders: 'จำนวนคำสั่งรวม', totalTarget: 'เป้าหมายรวม', totalGood: 'จำนวนดีรวม', totalDefect: 'จำนวนเสียรวม', avgYield: 'อัตราดีเฉลี่ย', avgAchievement: 'อัตราบรรลุเฉลี่ย', totalRunTime: 'เวลาเดินเครื่องรวม', totalStopTime: 'เวลาหยุดรวม', totalStopCount: 'จำนวนครั้งหยุดรวม', avgOEE: 'OEE เฉลี่ย', utilization: 'อัตราการใช้งาน' }, monthly: { selectMonth: 'เลือกเดือน', year: 'ปี', month: 'เดือน', title: 'รายงานการผลิตรายเดือน', total: 'รวมรายเดือน' }, stop: { timeRange: 'ช่วงเวลา', title: 'วิเคราะห์สาเหตุการหยุด', totalCount: 'จำนวนครั้งหยุดรวม', totalTime: 'เวลาหยุดรวม' }, shift: { all: 'ทั้งหมด', a: 'กะ A', b: 'กะ B', c: 'กะ C', day: 'กะกลางวัน', night: 'กะกลางคืน' }, unit: { count: 'รายการ', times: 'ครั้ง', minutes: 'นาที', sheetsPerMin: 'แผ่น/นาที' }, print: { printTime: 'เวลาพิมพ์', statRange: 'ช่วงสถิติ', shift: 'กะ' }, empty: { noRecords: 'ไม่มีบันทึกการผลิตในช่วงนี้', noStopRecords: 'คำสั่งนี้ไม่มีบันทึกการหยุด', noData: 'ไม่มีข้อมูล กรุณาปรับเงื่อนไข', noMonth: 'เดือนนี้ไม่มีบันทึกการผลิต', noStopInRange: 'ไม่มีบันทึกการหยุดในช่วงเวลานี้' }, state: { loading: 'กำลังโหลดบันทึกการผลิต…', error: 'ไม่สามารถดึงบันทึกการผลิตได้ กรุณาลองใหม่ภายหลัง', empty: 'ไม่มีบันทึกการผลิตในช่วงนี้', degraded: 'เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ กำลังแสดงแคชในเครื่อง ข้อมูลอาจไม่ครบถ้วน', truncated: 'ข้อมูลเกินขีดจำกัดการค้นหาครั้งเดียว กรุณาลดช่วงวันที่ แสดงเพียงบางส่วน จำนวนที่แสดง', localOnly: 'รายการมีอยู่เฉพาะในแคชในเครื่อง ยังไม่ซิงก์ไปเซิร์ฟเวอร์' , sourceBackend: 'ยอดรวมคำนวณจากเซิร์ฟเวอร์', sourceLocalOnly: 'บางรายการในช่วงนี้มีอยู่เฉพาะบนเครื่องนี้ ยอดรวมจึงคำนวณในเบราว์เซอร์', sourceDegraded: 'ไม่สามารถดึงยอดรวมจากเซิร์ฟเวอร์ จึงคำนวณในเบราว์เซอร์ และอาจต่างจากเซิร์ฟเวอร์'}, source: { backend: 'เซิร์ฟเวอร์', local: 'แคชในเครื่อง' } },
        settingsExt: { common: { add: 'เพิ่ม', edit: 'แก้ไข', delete: 'ลบ', save: 'บันทึก', cancel: 'ยกเลิก', update: 'อัปเดต', import: 'นำเข้า', sheets: 'แผ่น' }, general: { title: 'การตั้งค่าทั่วไป', companyHeader: 'ตั้งค่าหัวกระดาษบริษัท', companyHeaderHint: 'การตั้งค่านี้ใช้แสดงหัวกระดาษบริษัทเมื่อพิมพ์รายงาน', companyNameZh: 'ชื่อบริษัท (จีน):', companyNameZhPlaceholder: 'เช่น Taiwan Carton Co., Ltd.', companyNameEn: 'ชื่อบริษัท (อังกฤษ):', companyNameEnPlaceholder: 'เช่น Taiwan Carton Co., Ltd.', companyAddress: 'ที่อยู่บริษัท:', companyAddressPlaceholder: 'เช่น เลขที่ 100 ถนนซินอี้ ไทเป', phone: 'โทรศัพท์:', phonePlaceholder: 'เช่น 02-1234-5678', fax: 'แฟกซ์:', faxPlaceholder: 'เช่น 02-1234-5679', companyLogo: 'โลโก้บริษัท', noUpload: 'ยังไม่ได้อัปโหลด', userSettings: 'ตั้งค่าผู้ใช้', inheritRemoteIp: 'สืบทอด IP ระยะไกล', custom: 'กำหนดเอง', remoteIp: 'IP ระยะไกล:', remoteIpPlaceholder: 'เช่น 192.168.1.100', colUser: 'ผู้ใช้', colPassword: 'รหัสผ่าน', colId: 'รหัส', colActions: 'จัดการ', userNamePlaceholder: 'ชื่อ', passwordPlaceholder: 'รหัสผ่าน', idPlaceholder: 'รหัส', shiftSettings: 'ตั้งค่าเวลากะ', colShift: 'กะ', colStart: 'เริ่ม', colEnd: 'สิ้นสุด', shiftNamePlaceholder: 'กะ', stopReasonSettings: 'ตั้งค่าเหตุผลหยุดเครื่อง', defectReasonSettings: 'ตั้งค่าเหตุผลของเสีย', colReason: 'เหตุผล', colCategory: 'ประเภท', reasonPlaceholder: 'เหตุผล', categoryPlaceholder: 'ประเภท', alertFillUser: 'กรุณากรอกข้อมูลผู้ใช้ให้ครบ', alertDuplicateUser: 'รหัส {code} มีอยู่แล้วในผู้ใช้อื่น', alertUserSaved: 'บันทึกผู้ใช้แล้ว', confirmDeleteUser: 'ลบผู้ใช้นี้?', alertFillShift: 'กรุณากรอกข้อมูลกะให้ครบ', alertShiftSaved: 'บันทึกกะแล้ว', confirmDeleteShift: 'ลบกะนี้?', alertEnterIdReason: 'กรุณากรอกรหัสและเหตุผล', confirmDeleteReason: 'ลบ?', alertImportSuccess: 'จำลองการนำเข้าจาก Excel สำเร็จ!', offlineModeNotice: 'โหมดออฟไลน์: การเปลี่ยนแปลงถูกบันทึกบนเครื่องนี้เท่านั้น', colRole: 'บทบาท', colStatus: 'สถานะ', statusActive: 'เปิดใช้งาน', statusInactive: 'ปิดใช้งาน', btnDisableUser: 'ปิดใช้งาน', btnEnableUser: 'เปิดใช้งาน', confirmDisableUser: 'ปิดใช้งานผู้ใช้นี้หรือไม่ ผู้ใช้จะเข้าสู่ระบบไม่ได้อีก', userLoading: 'กำลังโหลดรายชื่อผู้ใช้…', userLoadFailed: 'เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ กำลังแสดงรายชื่อจากแคชในเครื่อง การเพิ่มหรือแก้ไขจะล้มเหลวจนกว่าจะเชื่อมต่อได้', userReadOnly: 'เฉพาะผู้ดูแลระบบเท่านั้นที่จัดการผู้ใช้ได้ ส่วนนี้เป็นแบบอ่านอย่างเดียว', alertPasswordRequired: 'ต้องกำหนดรหัสผ่านเมื่อสร้างผู้ใช้', alertUserSaveFailed: 'บันทึกผู้ใช้ไม่สำเร็จ', alertUserOffline: 'แถวนี้มีอยู่เฉพาะในแคชในเครื่อง ไม่มีบัญชีบนเซิร์ฟเวอร์ให้แก้ไข กรุณาเชื่อมต่อใหม่ก่อน', passwordKeepHint: 'รหัสผ่าน (เว้นว่างหากไม่เปลี่ยน)', usernameImmutableHint: 'ไม่สามารถเปลี่ยนชื่อบัญชีหลังจากสร้างแล้ว', roleAdmin: 'ผู้ดูแลระบบ', roleSupervisor: 'หัวหน้างาน', roleEngineer: 'วิศวกร', roleOperator: 'พนักงานควบคุมเครื่อง' }, formula: { savedAlert: 'บันทึกการตั้งค่าแล้ว', shortageThresholdLabel: 'เกณฑ์บังคับกรอกยอดขาด', stdAvgSpeed: 'ความเร็วเฉลี่ยมาตรฐาน', splitPrintCredit: 'ชดเชยการพิมพ์แยก', continuousDef: 'นิยามการผลิตต่อเนื่อง', continuousCriteria: 'เงื่อนไขตัดสินการผลิตต่อเนื่อง', criteriaPrefix: 'ภายใน', criteriaMiddle: 'วินาที ผลิต', trialSuccessLabel: 'เกณฑ์ทดลองเดินเครื่องสำเร็จ', withinSheets: 'แผ่น', trialSuccessHint: 'ทำได้ภายในจำนวนแผ่นนี้ขณะทดลองถือว่าสำเร็จ', prepTimeIndicator: 'จัดการไฟสถานะเวลาเตรียม', prepTimeDescPrefix: 'มีผลต่อคอลัมน์「จำนวนผลิต」ในการเฝ้าระวัง ', bgColor: 'สีพื้นหลัง', stdPrepTimeLabel: 'เวลาเตรียมมาตรฐาน', minUnit: 'นาที', defaultPrefix: 'ค่าเริ่มต้น', minuteWord: 'นาที', startTimeMode: 'โหมดเวลาเริ่ม', prevFinish: 'เวลาเสร็จของงานก่อนหน้า', dataArrival: 'เริ่มเมื่อข้อมูลเข้า', yellowUpper: 'ขีดบนไฟเหลือง', redLight: 'ไฟแดง', lightRule: 'กฎไฟสถานะ', qtyFontColor: 'สีตัวอักษรจำนวนผลิต', controlledByShortage: ' ควบคุมโดยเกณฑ์บังคับกรอกยอดขาด:', speedIndicator: 'จัดการไฟสถานะความเร็ว', speedDescPrefix: 'มีผลต่อคอลัมน์「ความเร็ว」ในการเฝ้าระวัง ', fontColor: 'สีตัวอักษร', speedDescSuffix: ' อ้างอิงความเร็วสูงสุดเครื่องในการตั้งค่าหน่วย', speedBaseType: 'ประเภทฐานความเร็ว', standardSpeed: 'ความเร็วมาตรฐาน', maximumSpeed: 'ความเร็วสูงสุด', stdSpeedBase: 'ฐานความเร็วมาตรฐาน', machineMaxTimes: 'ความเร็วสูงสุดเครื่อง ×', maxSpeedNote: 'เมื่อใช้ความเร็วสูงสุดเป็นฐาน ไฟความเร็วจะคิดจากความเร็วสูงสุดเครื่อง (100%)', yellowRange: 'ช่วงไฟเหลือง', greenLight: 'ไฟเขียว', standardSpeedShort: 'ความเร็วมาตรฐาน' }, boxType: { enterName: 'กรอกชื่อประเภทกล่อง:', renamePrompt: 'เปลี่ยนชื่อประเภทกล่อง:', deleteConfirm: 'ลบประเภทกล่องนี้?', title: 'ตั้งค่าประเภทกล่อง', basicInfo: 'ข้อมูลพื้นฐาน', nameLabel: 'ชื่อ', erpAlias: 'รหัส ERP', descLabel: 'คำอธิบาย', descPlaceholder: 'เช่น ย*ก*ส = S2*S3*H', formulasLabel: 'สูตร', formulaSupport: 'รองรับ +, -, *, /, ( ) และตัวแปรฟิลด์ (S1, L, W...)', lengthDef: 'นิยามความยาว', labelLenPlaceholder: 'ป้าย (ยาว/กว้าง)', correction: 'ค่าแก้ไข', mmAddSub: 'mm (บวกลบ)', formula: 'สูตร', widthDef: 'นิยามความกว้าง', labelPlaceholder: 'ป้าย', diagramPosSettings: 'ตั้งค่าตำแหน่งบนแผนภาพ', diagramPosHint: 'เลือกฟิลด์ด้านล่าง แล้วคลิกภาพเพื่อกำหนดตำแหน่ง', imageLabel: 'รูปภาพ', selectFieldFirst: 'กรุณาเลือกฟิลด์ก่อน', uploadImage: 'กรุณาอัปโหลดรูปภาพ', selectOrAdd: 'เลือกหรือเพิ่มประเภทกล่อง' }, comm: { monitorInterval: 'ความถี่อัปเดตการมอนิเตอร์', secondsDefault: 'วินาที (ค่าเริ่มต้น: 1.0 วินาที)', monitorMsg: 'ข้อความมอนิเตอร์', simControlTitle: 'การควบคุมจำลอง', simControlHintPre: 'โปรดใช้แถบเครื่องมือด้านบน', simProduction: 'จำลองการผลิต', simControlHintMid: 'และ', simControlHintPost: 'สวิตช์เพื่อทดสอบ', erpDesc: 'อินเทอร์เฟซโปรโตคอลที่จับคู่ไฟล์ผลิตภัณฑ์และคำสั่งผลิตของ ERP', connNone: 'ไม่เชื่อมต่อ', serverIp: 'IP เซิร์ฟเวอร์', port: 'พอร์ต', inputDir: 'พาธนำเข้า', outputDir: 'พาธส่งออก', dataLogTitle: 'การตั้งค่าบันทึกข้อมูล', dataLogDesc: 'ควบคุมความถี่ในการเขียนข้อมูล MQTT ลงฐานข้อมูล เขียนทันทีเมื่อสถานะเครื่องเปลี่ยน มิฉะนั้นเขียนตามช่วงเวลาที่ตั้งไว้', logInterval: 'ช่วงเวลาบันทึก', minutes: 'นาที', seconds: 'วินาที', current: 'ปัจจุบัน', note: 'หมายเหตุ', noteItem1: 'เขียนลงฐานข้อมูลทันทีเมื่อสถานะเปลี่ยน (RUN ↔ STOP ↔ JOG)', noteItem2: 'นอกนั้นเขียนเป็นระยะตามช่วงเวลานี้', noteItem3: 'แนะนำ: 180-600 วินาที (3-10 นาที)', noteItem4: 'ช่วงที่ถูกต้อง 1-3600 วินาที หากนอกช่วงระบบจะใช้ค่าเริ่มต้น 300 วินาที', intervalOutOfRange: 'ต้องเป็นจำนวนเต็มวินาทีระหว่าง 1 ถึง 3600 ค่านอกช่วงจะไม่ถูกส่ง', machineId: 'รหัสระบุเครื่อง', machineIdHint: 'รหัสเฉพาะที่ใช้ระบุเครื่องนี้ จะถูกบันทึกในบันทึกการผลิต', saveSuccess: 'บันทึกการตั้งค่าการสื่อสารไปยังเซิร์ฟเวอร์แล้ว', saveFailed: 'บันทึกล้มเหลว' }, machine: { enterSectionName: 'โปรดป้อนชื่อส่วน', addFailed: 'เพิ่มล้มเหลว', confirmDeleteSection: 'ลบส่วนนี้?', deleteFailed: 'ลบล้มเหลว', orderUpdateFailed: 'อัปเดตลำดับล้มเหลว', confirmReset: 'รีเซ็ต? การนี้จะลบส่วนที่มีอยู่และสร้างค่าเริ่มต้น', resetComplete: 'รีเซ็ตเป็นค่าเริ่มต้นแล้ว', resetFailed: 'รีเซ็ตล้มเหลว', sectionsHint: 'ส่วนเหล่านี้ใช้สำหรับแสดงสถานะเครื่องและตัวเลือกส่วนสำหรับการบำรุงรักษา', defaults: 'ค่าเริ่มต้น', noSections: 'ยังไม่มีส่วน โปรดคลิกปุ่มเพิ่ม', sectionDetails: 'รายละเอียดส่วน', order: 'ลำดับ', faultSignal: 'สัญญาณข้อผิดพลาด', runSignal: 'สัญญาณทำงาน', selectSectionHint: 'เลือกส่วนทางซ้ายเพื่อดูรายละเอียด', sheetsPerMin: 'แผ่น/นาที' }, report: { enterKeyword: 'ป้อนคำสำคัญเหตุผลการหยุดเครื่องที่ต้องการยกเว้น', dayCutoff: 'เวลาเกณฑ์ตัดข้ามวัน', cutoffDefault: 'ค่าเริ่มต้น 07:30:00', smallBatchTitle: 'นิยามล็อตเล็ก', smallBatchQty: 'จำนวนล็อตเล็ก', smallBatchHint: 'คำสั่งผลิตที่มีจำนวนต่ำกว่านี้จะถูกทำเครื่องหมายเป็นล็อตเล็กและคำนวณค่าเฉลี่ยแยก', exceptionFilters: 'ตัวกรองข้อยกเว้น', addKeyword: 'เพิ่มคำสำคัญ', filterHint: 'เมื่อคำนวณเวลาหยุดเครื่อง ระบบจะยกเว้นบันทึกที่มีคำสำคัญต่อไปนี้โดยอัตโนมัติ:', noFilters: 'ไม่มีคำสำคัญตัวกรอง' }, unit: { enterFluteName: 'ป้อนชื่อลอน', enterThicknessPre: 'ป้อน', enterThicknessPost: 'ความหนาลอน', confirmDeleteFlute: 'ลบลอนนี้?' } },
        fkeys: {
            f1: 'ขึ้น', f2: 'ลง', f3: 'เริ่ม', f4: 'เสร็จสิ้น', f5: 'ดี', f6: 'เสีย',
            f7: 'คำสั่ง', f8: 'ถัดไป', f9: 'กะ', f10: 'กลับ', f12: 'ออก'
        },
        common: { orderNo: 'เลขที่คำสั่ง', customer: 'ลูกค้า', qty: 'จำนวน', speed: 'ความเร็ว' },
        settings: {
            tabs: { general: 'ทั่วไป', unit: 'หน่วย', machine: 'เครื่องจักร', communication: 'การสื่อสาร', formula: 'สูตร', boxType: 'ประเภทกล่อง', report: 'รายงาน' },
            comm: {
                title: 'การตั้งค่าการสื่อสาร',
                desc: 'กำหนดค่าการเชื่อมต่อ PLC และการแลกเปลี่ยนข้อมูล ERP',
                plcTitle: 'การควบคุม PLC',
                erpTitle: 'การรวม ERP',
                deviceType: 'ประเภทอุปกรณ์',
                ip: 'ที่อยู่ IP',
                port: 'พอร์ต',
                connTest: 'ทดสอบการเชื่อมต่อ',
                simulateSignal: 'จำลองสัญญาณ',
                protocol: 'โปรโตคอล',
                connType: 'ประเภทการเชื่อมต่อ',
                svrPath: 'เส้นทางเซิร์ฟเวอร์'
            },
            machine: {
                title: 'การตั้งค่าเครื่องจักร',
                desc: 'กำหนดค่าความเร็วสูงสุดและส่วนของเครื่องจักร',
                maxSpeed: 'ความเร็วสูงสุด',
                sections: 'ส่วนของเครื่องจักร',
                sectionName: 'ชื่อส่วน',
                add: 'เพิ่ม',
                delete: 'ลบ'
            },
            unit: {
                title: 'การตั้งค่าหน่วย', select: 'เลือกหน่วย', mm: 'มิลลิเมตร (mm)', inch: 'นิ้ว',
                fluteSettings: 'การตั้งค่าลอน', flute: 'ชนิดลอน', thickness: 'ความหนา',
                addFlute: 'เพิ่มลอน', flute_single: 'ลอน'
            },
            formula: {
                title: 'การตั้งค่าพารามิเตอร์สูตร', desc: 'พารามิเตอร์มาตรฐานตามเอกสาร',
                coreEff: 'ประสิทธิภาพหลัก', timeAvail: 'อัตราการใช้เวลา', continuous: 'นิยามการผลิตต่อเนื่อง',
                targets: 'เป้าหมาย', stdAvgSpeed: 'ความเร็วเฉลี่ยมาตรฐาน', stdPrepTime: 'เวลาเตรียมมาตรฐาน',
                splitPrintCredit: 'ชดเชยการพิมพ์แยก', targetOEE: 'เป้าหมาย OEE', targetPrepSuccess: 'เป้าหมายอัตราทดลองเครื่อง'
            },
            report: {
                title: 'การตั้งค่าพารามิเตอร์รายงาน', desc: 'กำหนดค่าตรรกะการสร้างรายงาน backend',
                timeBoundary: 'ขอบเขตเวลา', smallBatch: 'นิยามล็อตเล็ก', exceptionFilters: 'ตัวกรองข้อยกเว้น'
            }
        },
        dashboard: {
            monitor: { productionQty: 'จำนวนผลิต', qty: 'Qty', speed: 'ความเร็ว', standard: 'มาตรฐาน', maxSpeed: 'ความเร็วสูงสุด', idle: 'รอทำงาน (Idle)', waitForF3: 'รอกด F3 เริ่มผลิต', running: 'Running' },
            stats: { squareMeter: 'ตารางเมตร', total: 'รวม', count: 'จำนวนชิ้น', remaining: 'คงเหลือ', defect: 'ของเสีย', avgSpeed: 'ความเร็วเฉลี่ย', runTime: 'เวลาผลิต', stopTime: 'เวลาหยุด', stopCount: 'จำนวนครั้งหยุด', today: 'วันนี้', currentJob: 'งานนี้' },
            schedule: { seqNo: 'ลำดับ', customer: 'ชื่อลูกค้า', orderNo: 'เลขที่ออเดอร์', boxNo: 'รหัสกล่อง', qty: 'จำนวน', productName: 'ชื่อสินค้า', boxType: 'ประเภทกล่อง', noQueuedOrders: 'ไม่มีออเดอร์ในคิว', autoNextOn: '【 งานถัดไปอัตโนมัติ ON 】', autoNextOff: '【 งานถัดไปอัตโนมัติ OFF 】', sheets: 'จำนวนแผ่น', notes: 'หมายเหตุ' },
            machineStatus: { title: 'สถานะเครื่อง', stopReason: 'สาเหตุหยุด', normal: 'ปกติ', warning: 'เตือน', error: 'ผิดปกติ' },
            stopReasons: { startTime: 'เวลาเริ่ม', duration: 'ระยะเวลา', reason: 'สาเหตุ' },
            alerts: { plcDisconnected: 'PLC หลุดการเชื่อมต่อ ไม่สามารถเริ่มผลิตได้!', selectOrderFirst: 'กรุณาเลือกใบสั่งงานก่อน', selectQueuedOrder: 'กรุณาเลือกใบสั่งงานในคิวด้านล่างก่อน', speedNotZero: 'ความเร็วไม่เป็น 0 ไม่สามารถปิดงานได้! กรุณาหยุดเครื่องก่อน', speedNotZeroReturn: 'ความเร็วไม่เป็น 0 ไม่สามารถถอยกลับได้! กรุณาหยุดเครื่องก่อน', confirmDelete: 'ยืนยันลบใบสั่งงาน', confirmReorder: 'ยืนยันจัดลำดับใบสั่งงานใหม่?', confirmExit: 'ยืนยันออก?', startProduction: 'เริ่มผลิต' },
            logs: { f1Pressed: 'F1: กด (เลื่อนขึ้น)', f2Pressed: 'F2: กด (เลื่อนลง)', f3Start: 'F3: เริ่มผลิต', f4Finish: 'F4: ปิดงาน', f5GoodQty: 'F5: จำนวนผลิต +1', f6DefectQty: 'F6: จำนวนผลิต -1', f7OrderModal: 'F7: เปิดหน้าต่างออเดอร์', f8AutoNext: 'F8: สลับงานถัดไปอัตโนมัติ', f9SwitchShift: 'F9: สลับกะ', f10Return: 'F10: ถอยกลับ', f12Exit: 'F12: ออกจากระบบ' }
        },
        orders: {
            tabs: { schedule: 'จัดการตารางผลิต', products: 'คลังสินค้า' },
            schedule: { title: 'ตารางการผลิต', moveUp: 'เลื่อนขึ้น', moveDown: 'เลื่อนลง', delete: 'ลบตาราง', reorder: 'รีเซ็ตลำดับ', addToSchedule: 'เพิ่มตาราง' },
            products: { title: 'คลังสินค้า', add: 'เพิ่มสินค้า', edit: 'แก้ไข', delete: 'ลบ', boxNo: 'รหัสกล่อง', productName: 'ชื่อสินค้า', boxType: 'ประเภทกล่อง', customer: 'ลูกค้า', maintenance_title: 'บำรุงรักษาฐานข้อมูล' },
            alerts: { selectOrder: 'กรุณาเลือกใบสั่งงานก่อน', confirmDeleteRunning: 'ยืนยันลบใบสั่งงานที่กำลังทำงาน? กรุณาตรวจสอบว่าความเร็วและจำนวนผลิตเป็น 0', confirmDelete: 'ยืนยันลบใบสั่งงาน', confirmReorder: 'ยืนยันจัดลำดับใบสั่งงานใหม่?' }
        },
        reports: {
            tabs: { daily: 'รายงานผลิตประจำวัน', monthly: 'รายงานผลิตประจำเดือน', stopReasons: 'สาเหตุหยุดเครื่อง' },
            filters: { dateRange: 'ช่วงวันที่', shift: 'กะ', allShifts: 'ทุกกะ', shiftA: 'กะ A', shiftB: 'กะ B', shiftC: 'กะ C' },
            table: { id: 'ลำดับ', client: 'ลูกค้า', orderNo: 'เลขที่ออเดอร์', product: 'สินค้า', shift: 'กะ', speed: 'ความเร็ว', qty: 'จำนวน', count: 'นับ', good: 'ของดี', bad: 'ของเสีย', start: 'เวลาเริ่ม', test: 'เวลาทดลองเครื่อง', status: 'สถานะ' },
            stopReasons: { startTime: 'เวลาเริ่ม', endTime: 'เวลาสิ้นสุด', duration: 'ระยะเวลา', code: 'รหัส', reason: 'สาเหตุ' },
            summary: { totalOrders: 'จำนวนออเดอร์รวม', totalQty: 'จำนวนรวม', totalGood: 'ของดีรวม', totalBad: 'ของเสียรวม', avgSpeed: 'ความเร็วเฉลี่ย', totalRunTime: 'เวลาผลิตรวม', totalStopTime: 'เวลาหยุดรวม' }
        },
        analysis: {
            title: 'วิเคราะห์การผลิต',
            controls: { chartView: 'มุมมองกราฟ', tableView: 'มุมมองตาราง', scrollStart: 'เริ่ม', scrollEnd: 'สิ้นสุด' },
            charts: { oee: 'แนวโน้ม OEE', speedTrend: 'แนวโน้มความเร็ว', defectRate: 'วิเคราะห์อัตราของเสีย', stopReasons: 'วิเคราะห์สาเหตุหยุดเครื่อง' },
            metrics: { oee: 'OEE', availability: 'อัตราการเดินเครื่อง', performance: 'อัตราสมรรถนะ', quality: 'อัตราของดี', avgSpeed: 'ความเร็วเฉลี่ย', defectRate: 'อัตราของเสีย' },
            filters: { timePeriod: 'ช่วงเวลา', today: 'วันนี้', week: 'สัปดาห์นี้', month: 'เดือนนี้', custom: 'กำหนดเอง' },
            fields: { customer: 'ลูกค้า', product: 'ชื่อสินค้า', boxNo: 'รหัสกล่อง', boxType: 'ประเภทกล่อง', orderNo: 'เลขที่ออเดอร์', qty: 'จำนวน', operator: 'พนักงาน', shift: 'กะ', stopReason: 'สาเหตุหยุด', prepTime: 'เวลาเตรียม', date: 'วันที่', runTime: 'เวลาเดินเครื่อง', stopTime: 'เวลาหยุด', avgSpeed: 'ความเร็วเฉลี่ย', stopCount: 'จำนวนครั้งหยุด', defectQty: 'จำนวนของเสีย', oee: 'OEE', goodQty: 'จำนวนของดี' },
            chartType: { title: 'ประเภทกราฟ' },
            chartTypes: { pie: 'กราฟวงกลม', doughnut: 'กราฟโดนัท', line: 'กราฟเส้น', bar: 'กราฟแท่ง', radar: 'กราฟเรดาร์' },
            timeScale: { title: 'มาตราเวลา' },
            timeScales: { minute: 'นาที', hour: 'ชั่วโมง', day: 'วัน', week: 'สัปดาห์', month: 'เดือน' },
            category: { title: 'เงื่อนไขจัดกลุ่ม' },
            display: { title: 'คอลัมน์ที่แสดง' },
            dateRange: 'ช่วงวันที่',
            quickDate: { today: 'วันนี้', yesterday: 'เมื่อวาน', last7days: '7 วันล่าสุด', last30days: '30 วันล่าสุด', thisMonth: 'เดือนนี้' },
            actions: { clearFilters: 'ล้างเงื่อนไข', downloadImage: 'ดาวน์โหลดรูป', exportExcel: 'ส่งออก Excel', print: 'พิมพ์' },
            summary: { totalQty: 'ของดีรวม', avgDailyQty: 'ผลผลิตเฉลี่ยต่อวัน', totalStopTime: 'เวลาหยุดรวม', avgSpeed: 'ความเร็วเฉลี่ย', recordsCount: 'จำนวนรายการ' },
            state: { loading: 'กำลังโหลดบันทึกการผลิต…', error: 'ไม่สามารถดึงบันทึกการผลิตได้ กรุณาลองใหม่ภายหลัง', empty: 'ไม่มีบันทึกการผลิตในช่วงนี้', degraded: 'เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ กำลังแสดงแคชในเครื่อง ข้อมูลอาจไม่ครบถ้วน', truncated: 'ข้อมูลเกินขีดจำกัดการค้นหาครั้งเดียว กรุณาลดช่วงวันที่ แสดงเพียงบางส่วน จำนวนที่แสดง', localOnly: 'รายการมีอยู่เฉพาะในแคชในเครื่อง ยังไม่ซิงก์ไปเซิร์ฟเวอร์', retry: 'ลองใหม่', exportWhileLoading: 'ข้อมูลกำลังโหลด กรุณารอสักครู่ก่อนส่งออก' }
        },
        modals: {
            finishOrder: { title: 'ยืนยันปิดงาน', goodQty: 'จำนวนของดี', defectQty: 'จำนวนของเสีย', operator: 'พนักงาน', notes: 'หมายเหตุ', confirm: 'ยืนยันปิดงาน', cancel: 'ยกเลิก' },
            productDetail: { title: 'รายละเอียดสเปกสินค้า' },
            orderDetails: { title: 'รายละเอียดออเดอร์', orderNo: 'เลขที่ออเดอร์', customer: 'ชื่อลูกค้า', boxNo: 'รหัสกล่อง', productName: 'ชื่อสินค้า', boxType: 'ประเภทกล่อง', qty: 'จำนวน', status: 'สถานะ', close: 'ปิด' },
            productForm: { title: 'ฟอร์มสินค้า', addProduct: 'เพิ่มสินค้า', editProduct: 'แก้ไขสินค้า', boxNo: 'รหัสกล่อง', productName: 'ชื่อสินค้า', boxType: 'ประเภทกล่อง', customer: 'ลูกค้า', length: 'ความยาว', width: 'ความกว้าง', height: 'ความสูง', save: 'บันทึก', cancel: 'ยกเลิก' },
            stopReason: { title: 'สาเหตุหยุดเครื่อง', selectReason: 'เลือกสาเหตุหยุด', customReason: 'สาเหตุกำหนดเอง', startTime: 'เวลาเริ่ม', duration: 'ระยะเวลา', confirm: 'ยืนยัน', cancel: 'ยกเลิก' },
            help: { title: 'คำอธิบายการใช้งาน', fkeys: 'คำอธิบายปุ่มฟังก์ชัน', close: 'ปิด' }
        },
        ui: {
            buttons: { save: 'บันทึก', cancel: 'ยกเลิก', delete: 'ลบ', edit: 'แก้ไข', add: 'เพิ่ม', confirm: 'ยืนยัน', close: 'ปิด', search: 'ค้นหา', reset: 'รีเซ็ต', export: 'ส่งออก', import: 'นำเข้า', upload: 'อัปโหลด', download: 'ดาวน์โหลด' },
            status: { idle: 'รอทำงาน', running: 'กำลังทำงาน', stopped: 'หยุดแล้ว', completed: 'เสร็จแล้ว', error: 'ผิดพลาด', warning: 'เตือน', normal: 'ปกติ' },
            messages: { saveSuccess: 'บันทึกสำเร็จ', saveFailed: 'บันทึกล้มเหลว', deleteSuccess: 'ลบสำเร็จ', deleteFailed: 'ลบล้มเหลว', updateSuccess: 'อัปเดตสำเร็จ', updateFailed: 'อัปเดตล้มเหลว', loading: 'กำลังโหลด...', noData: 'ไม่มีข้อมูล', confirmDelete: 'ยืนยันลบ?', confirmAction: 'ยืนยันดำเนินการนี้?' }
        }
    }
};

export const LanguageProvider = ({ children }) => {
    const [language, setLanguage] = useState('tw'); // Default Traditional Chinese

    const t = (key) => {
        // key format: 'nav.monitor'
        const keys = key.split('.');
        let value = translations[language];
        keys.forEach(k => {
            value = value ? value[k] : null;
        });
        return value || key;
    };

    return (
        <LanguageContext.Provider value={{ language, setLanguage, t }}>
            {children}
        </LanguageContext.Provider>
    );
};

export const useLanguage = () => useContext(LanguageContext);
