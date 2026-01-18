// English translations for dashboard, orders, reports, analysis, modals, and UI
const enTranslations = {
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
};
