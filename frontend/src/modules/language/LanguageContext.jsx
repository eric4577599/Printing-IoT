import React, { createContext, useState, useContext } from 'react';

const LanguageContext = createContext();

export const translations = {
    tw: {
        nav: { monitor: '即時監控', schedule: '排程', reports: '報表', settings: '設定', maintenance: '保養維修' },
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
        maintenance: {
            tabs: { taskList: '維修清單', parts: '零件庫存', schedule: '保養排程', history: '歷史紀錄', photos: '照片管理' },
            buttons: { execute: '執行', detail: '詳情', reportBreakdown: '故障回報', addPart: '新增零件', saveSchedule: '儲存排程' },
            labels: { partName: '零件名稱', stock: '庫存', status: '狀態', technician: '執行人員' }
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
                sheets: '張數'
            },
            machineStatus: {
                title: '機器狀態',
                stopReason: '停車原因',
                normal: '正常',
                warning: '警告',
                error: '異常'
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
            }
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
        nav: { monitor: '实时监控', schedule: '排程', reports: '报表', settings: '设置' },
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
                addFlute: '新增楞型'
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
        maintenance: {
            tabs: { taskList: '维修清单', parts: '零件库存', schedule: '保养排程', history: '历史记录', photos: '照片管理' },
            buttons: { execute: '执行', detail: '详情', reportBreakdown: '故障回报', addPart: '新增零件', saveSchedule: '保存排程' },
            labels: { partName: '零件名称', stock: '库存', status: '状态', technician: '执行人员' }
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
                autoNextOff: '【 自动下一笔 OFF 】'
            },
            machineStatus: {
                title: '机器状态',
                stopReason: '停车原因',
                normal: '正常',
                warning: '警告',
                error: '异常'
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
                customer: '客户'
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
            }
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
        nav: { monitor: 'Monitor', schedule: 'Schedule', reports: 'Reports', settings: 'Settings', maintenance: 'Maintenance' },
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
                addFlute: 'Add Flute'
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
        maintenance: {
            tabs: { taskList: 'Tasks', parts: 'Spare Parts', schedule: 'Schedules', history: 'History', photos: 'Photos' },
            buttons: { execute: 'Execute', detail: 'Detail', reportBreakdown: 'Report Breakdown', addPart: 'Add Part', saveSchedule: 'Save Schedule' },
            labels: { partName: 'Part Name', stock: 'Stock', status: 'Status', technician: 'Technician' }
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
                autoNextOff: '【 Auto Next OFF 】'
            },
            machineStatus: {
                title: 'Machine Status',
                stopReason: 'Stop Reason',
                normal: 'Normal',
                warning: 'Warning',
                error: 'Error'
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
                customer: 'Customer'
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
            }
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
        nav: { monitor: 'Giám sát', schedule: 'Lịch trình', reports: 'Báo cáo', settings: 'Cài đặt', maintenance: 'Bảo trì' },
        fkeys: {
            f1: 'Lên', f2: 'Xuống', f3: 'Bắt đầu', f4: 'Hoàn thành', f5: 'Tốt', f6: 'Xấu',
            f7: 'Đơn hàng', f8: 'Tiếp', f9: 'Ca', f10: 'Trở lại', f12: 'Thoát'
        },
        common: { orderNo: 'Số đơn', customer: 'Khách hàng', qty: 'Số lượng', speed: 'Tốc độ' },
        settings: {
            tabs: { general: 'Chung', unit: 'Đơn vị', machine: 'Máy móc', communication: 'Giao tiếp', formula: 'Công thức', boxType: 'Loại hộp', report: 'Báo cáo', maintenance: 'Bảo trì' },
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
            }
        },
        maintenance: {
            tabs: { taskList: 'Danh sách', parts: 'Phụ tùng', schedule: 'Lịch trình', history: 'Lịch sử', photos: 'Hình ảnh' },
            buttons: { execute: 'Thực hiện', detail: 'Chi tiết', reportBreakdown: 'Báo hỏng', addPart: 'Thêm phụ tùng', saveSchedule: 'Lưu lịch' },
            labels: { partName: 'Tên phụ tùng', stock: 'Kho', status: 'Trạng thái', technician: 'Kỹ thuật viên' }
        }
    },
    th: {
        nav: { monitor: 'จอภาพ', schedule: 'กำหนดการ', reports: 'รายงาน', settings: 'การตั้งค่า', maintenance: 'การบำรุงรักษา' },
        fkeys: {
            f1: 'ขึ้น', f2: 'ลง', f3: 'เริ่ม', f4: 'เสร็จสิ้น', f5: 'ดี', f6: 'เสีย',
            f7: 'คำสั่ง', f8: 'ถัดไป', f9: 'กะ', f10: 'กลับ', f12: 'ออก'
        },
        common: { orderNo: 'เลขที่คำสั่ง', customer: 'ลูกค้า', qty: 'จำนวน', speed: 'ความเร็ว' },
        settings: {
            tabs: { general: 'ทั่วไป', unit: 'หน่วย', machine: 'เครื่องจักร', communication: 'การสื่อสาร', formula: 'สูตร', boxType: 'ประเภทกล่อง', report: 'รายงาน', maintenance: 'การบำรุงรักษา' },
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
            }
        },
        maintenance: {
            tabs: { taskList: 'รายการงาน', parts: 'อะไหล่', schedule: 'กำหนดการ', history: 'ประวัติ', photos: 'รูปภาพ' },
            buttons: { execute: 'ดำเนินการ', detail: 'รายละเอียด', reportBreakdown: 'แจ้งซ่อม', addPart: 'เพิ่มอะไหล่', saveSchedule: 'บันทึก' },
            labels: { partName: 'ชื่ออะไหล่', stock: 'สต็อก', status: 'สถานะ', technician: 'ช่างเทคนิค' }
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
