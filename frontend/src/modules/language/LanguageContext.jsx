import React, { createContext, useState, useContext } from 'react';

const LanguageContext = createContext();

export const translations = {
    tw: {
        nav: { monitor: '即時監控', schedule: '排程', reports: '報表', settings: '設定', analysis: '生產分析', docs: '文件', language: '語言' },
        layout: { sim: { label: '模擬生產:', modeTitle: '選擇模擬模式: 本地(直接顯示) vs 遠端(經由 MQTT 迴路)', stop: '停止', standard: '標準', max: '極速', stopShort: '停', speed: '速度' }, help: { title: '操作說明', button: '說明' }, logout: '登出', status: { state: '狀態: Idle', connected: '連線', disconnected: '斷線', disabled: '未啟用' } },
        boxDiagram: { empty: '請選取左側排程以顯示紙箱展開圖', unit: '尺寸單位: mm', hsc: '半槽箱(無上蓋)', rsc: '常規開槽箱' },
        login: { btn: { admin: '管理者 (Admin)', select: '選取 (Select)', exit: '離開 (Exit)', add: '新增', delete: '刪除', addPeriod: '新增時段', customPeriod: '自訂時段', cancel: '取消', login: '登入' }, label: { currentShift: '當前班別 (Current Shift)', operator: '操作員', workPeriod: '工作時段', code: '代碼', people: '人數:' }, placeholder: { auto: '自動', username: '帳號 (Username)', password: '密碼 (Password)' }, col: { code: '代碼', shift: '班別', operator: '操作員', startTime: '開始時間', endTime: '結束時間', people: '人數' }, admin: { title: '管理者登入 (Admin Login)' }, alert: { selectOperator: '請選擇操作員 (Please select an operator)', enterCodeName: '請輸入代碼與名稱', invalidCredentials: '帳號或密碼錯誤 (Invalid Credentials)' }, confirm: { delete: '確定刪除?' } },
        reportView: { tab: { details: '生產明細', daily: '生產日報表', monthly: '生產月報表', stop: '停車原因' }, alert: { selectOrder: '請先選擇一筆訂單', noExport: '查詢區間內無生產紀錄可匯出', exportWip: '匯出功能開發中...' }, btn: { confirm: '確認', export: '匯出', manualUpload: '手動上傳報工', leave: '離開', exportExcel: '匯出 Excel', print: '列印', ok: '確定', cancel: '取消', expandAll: '全部展開', collapseAll: '全部收合' }, label: { date: '生產日期', good: '良品', defect: '不良', reportType: '報表類型', dateRange: '日期範圍', shift: '班別' }, col: { select: '選', seq: '序號', customer: '客戶名稱', orderNo: '訂單號碼', productName: '產品名稱', shift: '班別', speed: '車速', qty: '數量', countQty: '計件數', good: '良品', defect: '不良', finishedAt: '完工時間', boxNo: '紙箱編號', operator: '操作員', targetQty: '目標數量', goodQty: '良品數量', defectQty: '不良數量', yieldRate: '良率', achievementRate: '達成率', prepTime: '準備時間', runTime: '運轉時間', stopTime: '停車時間', stopCount: '停車次數', avgSpeed: '平均車速', stopStart: '停車開始', duration: '持續時間', stopReason: '停車原因', date: '日期', orderCount: '筆數', totalQty: '生產量', prodTime: '生產時間', utilization: '稼動率', time: '時間', durationShort: '時長' }, daily: { summaryTitle: '統計彙總', totalOrders: '總工單數', totalTarget: '總目標數量', totalGood: '總良品數量', totalDefect: '總不良數量', avgYield: '平均良率', avgAchievement: '平均達成率', totalRunTime: '總運轉時間', totalStopTime: '總停車時間', totalStopCount: '總停車次數', avgOEE: '平均 OEE', utilization: '稼動率' }, monthly: { selectMonth: '月份選擇', year: '年', month: '月', title: '生產月報表', total: '月度總計' }, stop: { timeRange: '時間區間', title: '停車原因分析', totalCount: '總停車次數', totalTime: '總停車時間' }, shift: { all: '全部', a: 'A班', b: 'B班', c: 'C班', day: '日班', night: '夜班' }, unit: { count: '筆', times: '次', minutes: '分', sheetsPerMin: '張/分' }, print: { printTime: '列印時間', statRange: '統計區間', shift: '班別' }, empty: { noRecords: '查詢區間內無生產紀錄', noStopRecords: '此筆紀錄無停車記錄', noData: '查無資料，請調整查詢條件', noMonth: '本月無生產記錄', noStopInRange: '此時間區間內無停車記錄' } },
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
            summary: { totalQty: '總良品數', avgDailyQty: '日均產量', totalStopTime: '總停車時間', avgSpeed: '平均車速', recordsCount: '紀錄筆數' }
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
        nav: { monitor: '实时监控', schedule: '排程', reports: '报表', settings: '设置', analysis: '生产分析', docs: '文件', language: '语言' },
        layout: { sim: { label: '模拟生产:', modeTitle: '选择模拟模式: 本地(直接显示) vs 远端(经由 MQTT 回路)', stop: '停止', standard: '标准', max: '极速', stopShort: '停', speed: '速度' }, help: { title: '操作说明', button: '说明' }, logout: '登出', status: { state: '状态: Idle', connected: '连线', disconnected: '断线', disabled: '未启用' } },
        boxDiagram: { empty: '请选取左侧排程以显示纸箱展开图', unit: '尺寸单位: mm', hsc: '半槽箱(无上盖)', rsc: '常规开槽箱' },
        login: { btn: { admin: '管理员', select: '选取', exit: '退出', add: '新增', delete: '删除', addPeriod: '新增时段', customPeriod: '自定义时段', cancel: '取消', login: '登录' }, label: { currentShift: '当前班别', operator: '操作员', workPeriod: '工作时段', code: '代码', people: '人数:' }, placeholder: { auto: '自动', username: '账号', password: '密码' }, col: { code: '代码', shift: '班别', operator: '操作员', startTime: '开始时间', endTime: '结束时间', people: '人数' }, admin: { title: '管理员登录' }, alert: { selectOperator: '请选择操作员', enterCodeName: '请输入代码与名称', invalidCredentials: '账号或密码错误' }, confirm: { delete: '确定删除?' } },
        reportView: { tab: { details: '生产明细', daily: '生产日报表', monthly: '生产月报表', stop: '停车原因' }, alert: { selectOrder: '请先选择一笔订单', noExport: '查询区间内无生产记录可导出', exportWip: '导出功能开发中...' }, btn: { confirm: '确认', export: '导出', manualUpload: '手动上传报工', leave: '离开', exportExcel: '导出 Excel', print: '打印', ok: '确定', cancel: '取消', expandAll: '全部展开', collapseAll: '全部折叠' }, label: { date: '生产日期', good: '良品', defect: '不良', reportType: '报表类型', dateRange: '日期范围', shift: '班别' }, col: { select: '选', seq: '序号', customer: '客户名称', orderNo: '订单号码', productName: '产品名称', shift: '班别', speed: '车速', qty: '数量', countQty: '计件数', good: '良品', defect: '不良', finishedAt: '完工时间', boxNo: '纸箱编号', operator: '操作员', targetQty: '目标数量', goodQty: '良品数量', defectQty: '不良数量', yieldRate: '良率', achievementRate: '达成率', prepTime: '准备时间', runTime: '运转时间', stopTime: '停车时间', stopCount: '停车次数', avgSpeed: '平均车速', stopStart: '停车开始', duration: '持续时间', stopReason: '停车原因', date: '日期', orderCount: '笔数', totalQty: '生产量', prodTime: '生产时间', utilization: '稼动率', time: '时间', durationShort: '时长' }, daily: { summaryTitle: '统计汇总', totalOrders: '总工单数', totalTarget: '总目标数量', totalGood: '总良品数量', totalDefect: '总不良数量', avgYield: '平均良率', avgAchievement: '平均达成率', totalRunTime: '总运转时间', totalStopTime: '总停车时间', totalStopCount: '总停车次数', avgOEE: '平均 OEE', utilization: '稼动率' }, monthly: { selectMonth: '月份选择', year: '年', month: '月', title: '生产月报表', total: '月度总计' }, stop: { timeRange: '时间区间', title: '停车原因分析', totalCount: '总停车次数', totalTime: '总停车时间' }, shift: { all: '全部', a: 'A班', b: 'B班', c: 'C班', day: '日班', night: '夜班' }, unit: { count: '笔', times: '次', minutes: '分', sheetsPerMin: '张/分' }, print: { printTime: '打印时间', statRange: '统计区间', shift: '班别' }, empty: { noRecords: '查询区间内无生产记录', noStopRecords: '此笔记录无停车记录', noData: '无数据，请调整查询条件', noMonth: '本月无生产记录', noStopInRange: '此时间区间内无停车记录' } },
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
            summary: { totalQty: '总良品数', avgDailyQty: '日均产量', totalStopTime: '总停车时间', avgSpeed: '平均车速', recordsCount: '记录笔数' }
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
        nav: { monitor: 'Monitor', schedule: 'Schedule', reports: 'Reports', settings: 'Settings', analysis: 'Analysis', docs: 'Docs', language: 'Language' },
        layout: { sim: { label: 'Simulate:', modeTitle: 'Select sim mode: Local (direct) vs Remote (via MQTT)', stop: 'Stop', standard: 'Standard', max: 'Max', stopShort: 'Stop', speed: 'Speed' }, help: { title: 'Help', button: 'Help' }, logout: 'Logout', status: { state: 'Status: Idle', connected: 'Connected', disconnected: 'Disconnected', disabled: 'Disabled' } },
        boxDiagram: { empty: 'Select an order on the left to display the box diagram', unit: 'Unit: mm', hsc: 'HSC (no top flap)', rsc: 'RSC (regular slotted)' },
        login: { btn: { admin: 'Admin', select: 'Select', exit: 'Exit', add: 'Add', delete: 'Delete', addPeriod: 'Add Period', customPeriod: 'Custom Period', cancel: 'Cancel', login: 'Login' }, label: { currentShift: 'Current Shift', operator: 'Operator', workPeriod: 'Work Period', code: 'Code', people: 'People:' }, placeholder: { auto: 'Auto', username: 'Username', password: 'Password' }, col: { code: 'Code', shift: 'Shift', operator: 'Operator', startTime: 'Start Time', endTime: 'End Time', people: 'People' }, admin: { title: 'Admin Login' }, alert: { selectOperator: 'Please select an operator', enterCodeName: 'Please enter code and name', invalidCredentials: 'Invalid Credentials' }, confirm: { delete: 'Confirm delete?' } },
        reportView: { tab: { details: 'Production Details', daily: 'Daily Report', monthly: 'Monthly Report', stop: 'Stop Reasons' }, alert: { selectOrder: 'Please select an order first', noExport: 'No records to export in the selected range', exportWip: 'Export feature under development...' }, btn: { confirm: 'Confirm', export: 'Export', manualUpload: 'Manual Upload', leave: 'Leave', exportExcel: 'Export Excel', print: 'Print', ok: 'OK', cancel: 'Cancel', expandAll: 'Expand All', collapseAll: 'Collapse All' }, label: { date: 'Production Date', good: 'Good', defect: 'Defect', reportType: 'Report Type', dateRange: 'Date Range', shift: 'Shift' }, col: { select: 'Sel', seq: 'No.', customer: 'Customer', orderNo: 'Order No.', productName: 'Product Name', shift: 'Shift', speed: 'Speed', qty: 'Qty', countQty: 'Counted', good: 'Good', defect: 'Defect', finishedAt: 'Finished At', boxNo: 'Box No.', operator: 'Operator', targetQty: 'Target Qty', goodQty: 'Good Qty', defectQty: 'Defect Qty', yieldRate: 'Yield', achievementRate: 'Achievement', prepTime: 'Prep Time', runTime: 'Run Time', stopTime: 'Stop Time', stopCount: 'Stops', avgSpeed: 'Avg Speed', stopStart: 'Stop Start', duration: 'Duration', stopReason: 'Stop Reason', date: 'Date', orderCount: 'Orders', totalQty: 'Output', prodTime: 'Production Time', utilization: 'Utilization', time: 'Time', durationShort: 'Duration' }, daily: { summaryTitle: 'Summary', totalOrders: 'Total Orders', totalTarget: 'Total Target', totalGood: 'Total Good', totalDefect: 'Total Defect', avgYield: 'Avg Yield', avgAchievement: 'Avg Achievement', totalRunTime: 'Total Run Time', totalStopTime: 'Total Stop Time', totalStopCount: 'Total Stops', avgOEE: 'Avg OEE', utilization: 'Utilization' }, monthly: { selectMonth: 'Month', year: 'Year', month: 'Month', title: 'Monthly Production Report', total: 'Monthly Total' }, stop: { timeRange: 'Time Range', title: 'Stop Reason Analysis', totalCount: 'Total Stops', totalTime: 'Total Stop Time' }, shift: { all: 'All', a: 'Shift A', b: 'Shift B', c: 'Shift C', day: 'Day Shift', night: 'Night Shift' }, unit: { count: 'records', times: 'times', minutes: 'min', sheetsPerMin: 'sheets/min' }, print: { printTime: 'Print Time', statRange: 'Stat Range', shift: 'Shift' }, empty: { noRecords: 'No production records in range', noStopRecords: 'No stop records for this order', noData: 'No data. Please adjust the filters.', noMonth: 'No production records this month', noStopInRange: 'No stop records in this time range' } },
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
            summary: { totalQty: 'Total Good', avgDailyQty: 'Daily Avg', totalStopTime: 'Total Stop Time', avgSpeed: 'Avg Speed', recordsCount: 'Records' }
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
        nav: { monitor: 'Giám sát', schedule: 'Lịch trình', reports: 'Báo cáo', settings: 'Cài đặt', analysis: 'Phân tích', docs: 'Tài liệu', language: 'Ngôn ngữ' },
        layout: { sim: { label: 'Mô phỏng:', modeTitle: 'Chọn chế độ mô phỏng: Cục bộ (hiển thị trực tiếp) vs Từ xa (qua MQTT)', stop: 'Dừng', standard: 'Chuẩn', max: 'Tối đa', stopShort: 'Dừng', speed: 'Tốc độ' }, help: { title: 'Hướng dẫn', button: 'Trợ giúp' }, logout: 'Đăng xuất', status: { state: 'Trạng thái: Idle', connected: 'Đã kết nối', disconnected: 'Mất kết nối', disabled: 'Chưa bật' } },
        boxDiagram: { empty: 'Chọn một lệnh bên trái để hiển thị bản khai triển thùng', unit: 'Đơn vị: mm', hsc: 'Thùng nắp hở (không nắp trên)', rsc: 'Thùng khe thường' },
        login: { btn: { admin: 'Quản trị', select: 'Chọn', exit: 'Thoát', add: 'Thêm', delete: 'Xóa', addPeriod: 'Thêm ca', customPeriod: 'Ca tùy chỉnh', cancel: 'Hủy', login: 'Đăng nhập' }, label: { currentShift: 'Ca hiện tại', operator: 'Người vận hành', workPeriod: 'Thời gian làm việc', code: 'Mã', people: 'Số người:' }, placeholder: { auto: 'Tự động', username: 'Tài khoản', password: 'Mật khẩu' }, col: { code: 'Mã', shift: 'Ca', operator: 'Người vận hành', startTime: 'Giờ bắt đầu', endTime: 'Giờ kết thúc', people: 'Số người' }, admin: { title: 'Đăng nhập quản trị' }, alert: { selectOperator: 'Vui lòng chọn người vận hành', enterCodeName: 'Vui lòng nhập mã và tên', invalidCredentials: 'Tài khoản hoặc mật khẩu không đúng' }, confirm: { delete: 'Xác nhận xóa?' } },
        reportView: { tab: { details: 'Chi tiết sản xuất', daily: 'Báo cáo ngày', monthly: 'Báo cáo tháng', stop: 'Lý do dừng máy' }, alert: { selectOrder: 'Vui lòng chọn một đơn hàng trước', noExport: 'Không có bản ghi sản xuất để xuất trong khoảng đã chọn', exportWip: 'Tính năng xuất đang phát triển...' }, btn: { confirm: 'Xác nhận', export: 'Xuất', manualUpload: 'Tải lên thủ công', leave: 'Thoát', exportExcel: 'Xuất Excel', print: 'In', ok: 'OK', cancel: 'Hủy', expandAll: 'Mở rộng tất cả', collapseAll: 'Thu gọn tất cả' }, label: { date: 'Ngày sản xuất', good: 'Đạt', defect: 'Lỗi', reportType: 'Loại báo cáo', dateRange: 'Khoảng ngày', shift: 'Ca' }, col: { select: 'Chọn', seq: 'STT', customer: 'Tên khách hàng', orderNo: 'Số đơn hàng', productName: 'Tên sản phẩm', shift: 'Ca', speed: 'Tốc độ', qty: 'Số lượng', countQty: 'Số đếm', good: 'Đạt', defect: 'Lỗi', finishedAt: 'Thời gian hoàn thành', boxNo: 'Mã thùng', operator: 'Người vận hành', targetQty: 'Số lượng mục tiêu', goodQty: 'Số lượng đạt', defectQty: 'Số lượng lỗi', yieldRate: 'Tỷ lệ đạt', achievementRate: 'Tỷ lệ hoàn thành', prepTime: 'Thời gian chuẩn bị', runTime: 'Thời gian chạy', stopTime: 'Thời gian dừng', stopCount: 'Số lần dừng', avgSpeed: 'Tốc độ TB', stopStart: 'Bắt đầu dừng', duration: 'Thời lượng', stopReason: 'Lý do dừng', date: 'Ngày', orderCount: 'Số đơn', totalQty: 'Sản lượng', prodTime: 'Thời gian sản xuất', utilization: 'Hiệu suất', time: 'Thời gian', durationShort: 'Thời lượng' }, daily: { summaryTitle: 'Tổng hợp thống kê', totalOrders: 'Tổng số đơn', totalTarget: 'Tổng mục tiêu', totalGood: 'Tổng số đạt', totalDefect: 'Tổng số lỗi', avgYield: 'Tỷ lệ đạt TB', avgAchievement: 'Tỷ lệ hoàn thành TB', totalRunTime: 'Tổng thời gian chạy', totalStopTime: 'Tổng thời gian dừng', totalStopCount: 'Tổng số lần dừng', avgOEE: 'OEE TB', utilization: 'Hiệu suất' }, monthly: { selectMonth: 'Chọn tháng', year: 'Năm', month: 'Tháng', title: 'Báo cáo sản xuất tháng', total: 'Tổng tháng' }, stop: { timeRange: 'Khoảng thời gian', title: 'Phân tích lý do dừng máy', totalCount: 'Tổng số lần dừng', totalTime: 'Tổng thời gian dừng' }, shift: { all: 'Tất cả', a: 'Ca A', b: 'Ca B', c: 'Ca C', day: 'Ca ngày', night: 'Ca đêm' }, unit: { count: 'đơn', times: 'lần', minutes: 'phút', sheetsPerMin: 'tờ/phút' }, print: { printTime: 'Thời gian in', statRange: 'Khoảng thống kê', shift: 'Ca' }, empty: { noRecords: 'Không có bản ghi sản xuất trong khoảng', noStopRecords: 'Đơn này không có bản ghi dừng máy', noData: 'Không có dữ liệu, vui lòng điều chỉnh điều kiện', noMonth: 'Tháng này không có bản ghi sản xuất', noStopInRange: 'Không có bản ghi dừng máy trong khoảng thời gian này' } },
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
            summary: { totalQty: 'Tổng sản phẩm tốt', avgDailyQty: 'Sản lượng TB ngày', totalStopTime: 'Tổng thời gian dừng', avgSpeed: 'Tốc độ TB', recordsCount: 'Số bản ghi' }
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
        nav: { monitor: 'จอภาพ', schedule: 'กำหนดการ', reports: 'รายงาน', settings: 'การตั้งค่า', analysis: 'วิเคราะห์', docs: 'เอกสาร', language: 'ภาษา' },
        layout: { sim: { label: 'จำลอง:', modeTitle: 'เลือกโหมดจำลอง: ในเครื่อง (แสดงตรง) vs ระยะไกล (ผ่าน MQTT)', stop: 'หยุด', standard: 'มาตรฐาน', max: 'สูงสุด', stopShort: 'หยุด', speed: 'ความเร็ว' }, help: { title: 'วิธีใช้', button: 'ช่วยเหลือ' }, logout: 'ออกจากระบบ', status: { state: 'สถานะ: Idle', connected: 'เชื่อมต่อ', disconnected: 'ตัดการเชื่อมต่อ', disabled: 'ปิดใช้งาน' } },
        boxDiagram: { empty: 'เลือกออเดอร์ทางซ้ายเพื่อแสดงแบบแผ่นคลี่กล่อง', unit: 'หน่วย: mm', hsc: 'กล่องฝาเปิด (ไม่มีฝาบน)', rsc: 'กล่องร่องมาตรฐาน' },
        login: { btn: { admin: 'ผู้ดูแล', select: 'เลือก', exit: 'ออก', add: 'เพิ่ม', delete: 'ลบ', addPeriod: 'เพิ่มช่วงเวลา', customPeriod: 'กำหนดช่วงเวลาเอง', cancel: 'ยกเลิก', login: 'เข้าสู่ระบบ' }, label: { currentShift: 'กะปัจจุบัน', operator: 'ผู้ปฏิบัติงาน', workPeriod: 'ช่วงเวลาทำงาน', code: 'รหัส', people: 'จำนวนคน:' }, placeholder: { auto: 'อัตโนมัติ', username: 'ชื่อผู้ใช้', password: 'รหัสผ่าน' }, col: { code: 'รหัส', shift: 'กะ', operator: 'ผู้ปฏิบัติงาน', startTime: 'เวลาเริ่ม', endTime: 'เวลาสิ้นสุด', people: 'จำนวนคน' }, admin: { title: 'เข้าสู่ระบบผู้ดูแล' }, alert: { selectOperator: 'กรุณาเลือกผู้ปฏิบัติงาน', enterCodeName: 'กรุณากรอกรหัสและชื่อ', invalidCredentials: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' }, confirm: { delete: 'ยืนยันการลบ?' } },
        reportView: { tab: { details: 'รายละเอียดการผลิต', daily: 'รายงานรายวัน', monthly: 'รายงานรายเดือน', stop: 'สาเหตุการหยุด' }, alert: { selectOrder: 'กรุณาเลือกคำสั่งผลิตก่อน', noExport: 'ไม่มีบันทึกการผลิตให้ส่งออกในช่วงที่เลือก', exportWip: 'ฟังก์ชันส่งออกอยู่ระหว่างพัฒนา...' }, btn: { confirm: 'ยืนยัน', export: 'ส่งออก', manualUpload: 'อัปโหลดด้วยตนเอง', leave: 'ออก', exportExcel: 'ส่งออก Excel', print: 'พิมพ์', ok: 'ตกลง', cancel: 'ยกเลิก', expandAll: 'ขยายทั้งหมด', collapseAll: 'ยุบทั้งหมด' }, label: { date: 'วันที่ผลิต', good: 'ดี', defect: 'เสีย', reportType: 'ประเภทรายงาน', dateRange: 'ช่วงวันที่', shift: 'กะ' }, col: { select: 'เลือก', seq: 'ลำดับ', customer: 'ชื่อลูกค้า', orderNo: 'เลขที่คำสั่ง', productName: 'ชื่อสินค้า', shift: 'กะ', speed: 'ความเร็ว', qty: 'จำนวน', countQty: 'จำนวนนับ', good: 'ดี', defect: 'เสีย', finishedAt: 'เวลาเสร็จ', boxNo: 'เลขกล่อง', operator: 'ผู้ปฏิบัติงาน', targetQty: 'จำนวนเป้าหมาย', goodQty: 'จำนวนดี', defectQty: 'จำนวนเสีย', yieldRate: 'อัตราดี', achievementRate: 'อัตราบรรลุ', prepTime: 'เวลาเตรียม', runTime: 'เวลาเดินเครื่อง', stopTime: 'เวลาหยุด', stopCount: 'จำนวนครั้งหยุด', avgSpeed: 'ความเร็วเฉลี่ย', stopStart: 'เริ่มหยุด', duration: 'ระยะเวลา', stopReason: 'สาเหตุการหยุด', date: 'วันที่', orderCount: 'จำนวนรายการ', totalQty: 'ปริมาณผลิต', prodTime: 'เวลาผลิต', utilization: 'อัตราการใช้งาน', time: 'เวลา', durationShort: 'ระยะเวลา' }, daily: { summaryTitle: 'สรุปสถิติ', totalOrders: 'จำนวนคำสั่งรวม', totalTarget: 'เป้าหมายรวม', totalGood: 'จำนวนดีรวม', totalDefect: 'จำนวนเสียรวม', avgYield: 'อัตราดีเฉลี่ย', avgAchievement: 'อัตราบรรลุเฉลี่ย', totalRunTime: 'เวลาเดินเครื่องรวม', totalStopTime: 'เวลาหยุดรวม', totalStopCount: 'จำนวนครั้งหยุดรวม', avgOEE: 'OEE เฉลี่ย', utilization: 'อัตราการใช้งาน' }, monthly: { selectMonth: 'เลือกเดือน', year: 'ปี', month: 'เดือน', title: 'รายงานการผลิตรายเดือน', total: 'รวมรายเดือน' }, stop: { timeRange: 'ช่วงเวลา', title: 'วิเคราะห์สาเหตุการหยุด', totalCount: 'จำนวนครั้งหยุดรวม', totalTime: 'เวลาหยุดรวม' }, shift: { all: 'ทั้งหมด', a: 'กะ A', b: 'กะ B', c: 'กะ C', day: 'กะกลางวัน', night: 'กะกลางคืน' }, unit: { count: 'รายการ', times: 'ครั้ง', minutes: 'นาที', sheetsPerMin: 'แผ่น/นาที' }, print: { printTime: 'เวลาพิมพ์', statRange: 'ช่วงสถิติ', shift: 'กะ' }, empty: { noRecords: 'ไม่มีบันทึกการผลิตในช่วงนี้', noStopRecords: 'คำสั่งนี้ไม่มีบันทึกการหยุด', noData: 'ไม่มีข้อมูล กรุณาปรับเงื่อนไข', noMonth: 'เดือนนี้ไม่มีบันทึกการผลิต', noStopInRange: 'ไม่มีบันทึกการหยุดในช่วงเวลานี้' } },
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
            summary: { totalQty: 'ของดีรวม', avgDailyQty: 'ผลผลิตเฉลี่ยต่อวัน', totalStopTime: 'เวลาหยุดรวม', avgSpeed: 'ความเร็วเฉลี่ย', recordsCount: 'จำนวนรายการ' }
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
