#!/usr/bin/env python3
"""
產生文件用的流程圖(SVG)—— 輸出到 doc/pic/flow/。

為什麼用腳本:文件頁不支援 mermaid(也不加新相依),流程圖改成 SVG 圖檔;
圖的內容會隨程式演進,手改 SVG 座標很痛苦,改這支腳本再重跑即可。
用法:python3 scripts/gen-doc-diagrams.py
每張圖對應的程式依據寫在 doc/系統設計說明書.md 與 doc/操作說明書.md。
"""
import os
from xml.sax.saxutils import escape

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'doc', 'pic', 'flow')

KINDS = {  # 線色, 底色, 字色
    'blue': ('#1565c0', '#e3f2fd', '#0d3c75'),
    'green': ('#2e7d32', '#e8f5e9', '#1b4d1f'),
    'orange': ('#e65100', '#fff3e0', '#7a2e00'),
    'grey': ('#546e7a', '#eceff1', '#263238'),
    'red': ('#c62828', '#ffebee', '#7f1d1d'),
    'purple': ('#6a1b9a', '#f3e5f5', '#3f0f5c'),
}
FONT = "'PingFang TC','Noto Sans TC','Microsoft JhengHei','Heiti TC',sans-serif"


class Svg:
    def __init__(self, w, h, title):
        self.w, self.h, self.title = w, h, title
        self.items = []

    def _lines(self, x, y, lines, color, size=14, bold_first=False, anchor='middle', lh=19):
        out = []
        n = len(lines)
        y0 = y - (n - 1) * lh / 2
        for i, ln in enumerate(lines):
            wt = ' font-weight="700"' if (bold_first and i == 0) else ''
            out.append(f'<text x="{x}" y="{y0 + i * lh + 5}" text-anchor="{anchor}" font-size="{size}" fill="{color}"{wt}>{escape(ln)}</text>')
        return ''.join(out)

    def box(self, x, y, w, h, lines, kind='blue', bold_first=True, rx=8, size=14):
        s, f, t = KINDS[kind]
        self.items.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{rx}" fill="{f}" stroke="{s}" stroke-width="1.6"/>')
        self.items.append(self._lines(x + w / 2, y + h / 2, lines, t, size, bold_first))

    def diamond(self, cx, cy, w, h, lines, kind='orange', size=13):
        s, f, t = KINDS[kind]
        pts = f'{cx},{cy - h / 2} {cx + w / 2},{cy} {cx},{cy + h / 2} {cx - w / 2},{cy}'
        self.items.append(f'<polygon points="{pts}" fill="{f}" stroke="{s}" stroke-width="1.6"/>')
        self.items.append(self._lines(cx, cy, lines, t, size, False, lh=17))

    def pill(self, x, y, w, h, text, kind='grey'):
        s, f, t = KINDS[kind]
        self.items.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{h / 2}" fill="{f}" stroke="{s}" stroke-width="1.6"/>')
        self.items.append(self._lines(x + w / 2, y + h / 2, [text], t, 13, True))

    def group(self, x, y, w, h, title, kind='grey'):
        s, _, t = KINDS[kind]
        self.items.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="10" fill="none" stroke="{s}" stroke-width="1.3" stroke-dasharray="6 4"/>')
        self.items.append(f'<text x="{x + 12}" y="{y + 20}" font-size="13" font-weight="700" fill="{t}">{escape(title)}</text>')

    def text(self, x, y, lines, color='#37474f', size=13, anchor='start', bold_first=False):
        self.items.append(self._lines(x, y, lines, color, size, bold_first, anchor))

    def arrow(self, pts, label=None, label_at=0, dashed=False, color='#455a64', label_dx=0, label_dy=-3):
        d = 'M ' + ' L '.join(f'{px},{py}' for px, py in pts)
        dash = ' stroke-dasharray="6 4"' if dashed else ''
        self.items.append(f'<path d="{d}" fill="none" stroke="{color}" stroke-width="1.6"{dash} marker-end="url(#ah)"/>')
        if label:
            (x1, y1), (x2, y2) = pts[label_at], pts[label_at + 1]
            lw = sum(14 if ord(c) > 255 else 7 for c in label) + 8
            lx, ly = (x1 + x2) / 2 + label_dx, (y1 + y2) / 2 + label_dy
            # 白底襯墊,避免標籤壓在線或方框上難讀
            self.items.append(f'<rect x="{lx - lw / 2}" y="{ly - 12}" width="{lw}" height="17" fill="#ffffff" opacity="0.9"/>')
            self.items.append(f'<text x="{lx}" y="{ly}" text-anchor="middle" font-size="12" fill="{color}">{escape(label)}</text>')

    def save(self, name):
        os.makedirs(OUT, exist_ok=True)
        body = '\n'.join(self.items)
        svg = (f'<svg xmlns="http://www.w3.org/2000/svg" width="{self.w}" height="{self.h}" viewBox="0 0 {self.w} {self.h}" '
               f'font-family="{FONT}" role="img" aria-label="{escape(self.title)}">'
               f'<title>{escape(self.title)}</title>'
               '<defs><marker id="ah" markerWidth="10" markerHeight="8" refX="9" refY="4" orient="auto">'
               '<path d="M0,0 L10,4 L0,8 z" fill="#455a64"/></marker></defs>'
               f'<rect width="{self.w}" height="{self.h}" fill="#ffffff"/>'
               f'<text x="20" y="28" font-size="17" font-weight="700" fill="#1a237e">{escape(self.title)}</text>'
               f'{body}</svg>')
        with open(os.path.join(OUT, name), 'w', encoding='utf-8') as f:
            f.write(svg)
        print('wrote', name)


# ───────────────────────── 1. 系統架構 ─────────────────────────
def architecture():
    g = Svg(1000, 600, '系統架構與連接埠')
    g.box(30, 60, 190, 70, ['操作員 / 管理者 / 主管', '(瀏覽器)'], 'grey')
    g.box(30, 330, 190, 80, ['WISE-4000 / 模擬器', '(現場設備訊號)'], 'orange')
    g.box(30, 190, 190, 70, ['ERP / MES', '(推送訂單)'], 'grey')

    g.group(290, 45, 690, 535, 'Docker 主機(docker compose)', 'blue')
    g.box(320, 80, 200, 80, ['frontend', 'nginx + React 19', '埠 5600'], 'blue')
    g.box(580, 80, 200, 80, ['backend-api', '.NET 9 Web API', '外部埠 5200 (/swagger)'], 'blue')
    g.box(580, 230, 200, 70, ['PostgreSQL 15', '資料庫 FlexoDB', '埠 5433'], 'green')
    g.box(820, 230, 140, 70, ['Redis 7', '埠 6380'], 'green')
    g.box(320, 330, 200, 80, ['mqtt-broker', 'Mosquitto', 'MQTT 1884 / WS 9001'], 'orange')
    g.box(580, 330, 200, 80, ['backend-worker', '.NET 9 Worker', '(MQTTnet 訂閱)'], 'blue')
    g.box(820, 80, 140, 80, ['cloudflared', 'Cloudflare', 'Tunnel(對外)'], 'purple')
    g.box(320, 470, 460, 90, ['MM 外掛(獨立專案,另一組容器)', '前端 5301 / 後端 5300 / 自己的資料庫 MmsDB', '主系統只提供入口,不共用資料庫'], 'grey')

    g.arrow([(220, 95), (320, 105)], '開啟畫面', label_dy=-8)
    g.arrow([(520, 120), (580, 120)], '/api')
    g.arrow([(680, 160), (680, 230)], '讀寫')
    g.arrow([(780, 150), (840, 230)], '快取/設定', dashed=True, label_dx=36)
    g.arrow([(220, 370), (320, 370)], 'MQTT 發布')
    g.arrow([(520, 370), (580, 370)], '訂閱')
    g.arrow([(680, 330), (680, 300)], '寫歷史', label_dx=32)
    g.arrow([(780, 360), (880, 300)], '寫快照', label_dx=22, label_dy=12)
    g.arrow([(220, 225), (620, 225), (620, 160)], 'POST /api/erp/push-orders + X-Api-Key', dashed=True, label_at=0, label_dx=-50)
    g.arrow([(820, 120), (780, 120)], '', dashed=True)
    g.text(30, 580, ['實線:資料流;虛線:輔助/選用。MM 的整合形狀見「系統設計說明書」第 9 節。'], '#546e7a', 12)
    g.save('flow-01-architecture.svg')


# ───────────────────────── 2. 即時資料流 ─────────────────────────
def realtime():
    g = Svg(1000, 560, '即時監控資料流(設備訊號 → 看板畫面)')
    steps = [
        (30, 70, ['① 設備發布', 'WISE 把 DI 計數、狀態', '發布到 Advantech/+/data', '(模擬器:factory/machine/update)'], 'orange'),
        (270, 70, ['② Worker 解析', '依「通訊設定」的計數訊號', '與馬達訊號轉成', 'MachineSample'], 'blue'),
        (510, 70, ['③ 統一管線', '搶設備鎖 → 算車速', '(或採設備帶的車速)', '→ 組成 MonitorData'], 'blue'),
        (750, 70, ['④ 寫 Redis 快照', 'SET factory/monitor', '(camelCase JSON)', '每筆都覆寫'], 'green'),
    ]
    for x, y, ls, k in steps:
        g.box(x, y, 220, 110, ls, k)
    for x in (250, 490, 730):
        g.arrow([(x, 125), (x + 20, 125)])
    g.box(510, 250, 220, 90, ['⑤ 節流寫歷史', 'ProductionLogs:該設備首筆、', '狀態改變、或達寫入間隔'], 'green')
    g.box(750, 250, 220, 90, ['⑥ 廣播 MQTT', 'factory/monitor/update', '(供訂閱的畫面使用)'], 'orange')
    g.arrow([(620, 180), (620, 250)])
    g.arrow([(860, 180), (860, 250)])
    g.box(30, 400, 220, 110, ['⑦ 前端輪詢', '每 1 秒 GET', '/api/monitor/realtime', '(useRealtimeData)'], 'blue')
    g.box(290, 400, 220, 110, ['⑧ API 讀快照', '讀 Redis factory/monitor', '以不分大小寫反序列化', '無快照 → 204'], 'blue')
    g.box(550, 400, 200, 110, ['⑨ 看板顯示', '數量 = 計數 − 歸零偏移', '車速、狀態燈、', '本日/本筆彙總'], 'green')
    g.arrow([(250, 455), (290, 455)])
    g.arrow([(510, 455), (550, 455)])
    g.arrow([(860, 180), (860, 215), (400, 215), (400, 400)], 'Redis', dashed=True, label_at=1, label_dx=0, label_dy=-6)
    g.text(780, 440, ['設計重點', '• 看板只信「後端算的」', '• 歸零(Tare)只在前端:', '  F3 送單時記下目前計數,', '  顯示數量從 0 起算'], '#37474f', 12, bold_first=True)
    g.text(30, 540, ['通訊設定頁(plc_count_signal / plc_motor_signal / 定時寫入間隔)由 Worker 週期重讀,改了不必重啟。'], '#546e7a', 12)
    g.save('flow-02-realtime.svg')


# ───────────────────────── 3. 完工實績 ─────────────────────────
def completion():
    g = Svg(1000, 690, '完工(F4)到實績落地的流程')
    g.pill(40, 50, 120, 34, '按 F4 完工', 'blue')
    g.diamond(100, 150, 150, 80, ['車速 = 0 ?'], 'orange')
    g.arrow([(100, 84), (100, 110)])
    g.box(230, 125, 190, 50, ['提示「車速不為 0」', '不開啟完工視窗'], 'red')
    g.arrow([(175, 150), (230, 150)], '否')
    g.diamond(100, 260, 150, 80, ['本筆數量 > 0 ?'], 'orange')
    g.arrow([(100, 190), (100, 220)], '是')
    g.box(230, 235, 190, 50, ['提示「生產數量 0」', '改用 F10 退回'], 'red')
    g.arrow([(175, 260), (230, 260)], '否')
    g.box(25, 330, 150, 60, ['完工視窗', '填良品、不良明細', '短缺原因'], 'blue')
    g.arrow([(100, 300), (100, 330)], '是')
    g.box(25, 420, 150, 70, ['前端組成績', '寫本機快取', 'syncState = pending'], 'blue')
    g.arrow([(100, 390), (100, 420)], '確認')
    g.box(260, 420, 190, 70, ['POST /api/production/', 'completions', '(帶 clientRecordId 冪等鍵)'], 'blue')
    g.arrow([(175, 455), (260, 455)])
    g.box(520, 330, 220, 150, ['後端落地(單次存檔)', '1 驗證欄位,失敗 400 零寫入', '2 以冪等鍵去重(已存在回 200)', '3 重算不良總數、停機次數', '4 算工廠日(08:00 換日)', '5 OEE 四個率值'], 'green', bold_first=True)
    g.arrow([(450, 455), (520, 420)])
    g.box(780, 330, 190, 70, ['有 orderId 時', '工單狀態 → Completed', '(失敗只記 log,實績照落)'], 'green')
    g.arrow([(740, 380), (780, 370)])
    g.box(780, 430, 190, 50, ['回傳 201 / 200', '+ 後端算的率值'], 'green')
    g.arrow([(630, 480), (630, 500), (875, 500), (875, 480)])
    g.diamond(355, 600, 190, 90, ['送成功了嗎 ?'], 'orange')
    g.arrow([(355, 490), (355, 555)], '送出結果')
    g.box(560, 570, 250, 60, ['成功:本機紀錄改 synced', '以後端的工廠日與 OEE 覆寫'], 'green')
    g.arrow([(450, 600), (560, 600)], '是')
    g.box(30, 660, 270, 100, ['失敗:依狀態碼判斷是否重試', '斷網 / 429 / 408 / 5xx / 401 → 重試', '400 / 403 / 409 → 不重試', '階梯 2 秒 → 8 秒 → 30 秒'], 'orange', bold_first=True)
    g.arrow([(300, 625), (200, 660)], '否', label_dx=-26, label_dy=-2)
    g.box(360, 690, 290, 70, ['重試用盡:留 pending,不阻擋現場', '之後由報表頁「本機舊實績回填」補送', '(S10 掃描 → 回填,可重跑)'], 'red', bold_first=True)
    g.arrow([(300, 710), (360, 720)])
    g.arrow([(150, 660), (150, 640), (260, 560), (260, 520)], '重試', dashed=True, label_at=1)
    g.text(690, 700, ['冪等是重試安全的前提:', '同一個 clientRecordId', '重送不會產生第二筆。'], '#37474f', 12, bold_first=True)
    g.save('flow-03-completion.svg')


# ───────────────────────── 4. 作業流程(F 鍵) ─────────────────────────
def operator_flow():
    g = Svg(1000, 600, '作業員生產流程與 F 鍵')
    g.box(30, 60, 190, 60, ['登入', '點名冊一列 → 選取'], 'blue')
    g.box(270, 60, 190, 60, ['看板待機(Idle)', '綠框空白、等待 F3'], 'grey')
    g.box(510, 60, 200, 60, ['選一筆排隊中的訂單', '(F1 上移 / F2 下移)'], 'blue')
    g.arrow([(220, 90), (270, 90)])
    g.arrow([(460, 90), (510, 90)])
    g.diamond(860, 90, 200, 90, ['F3 送單', 'PLC 已連線 ?'], 'orange')
    g.arrow([(710, 90), (760, 90)])
    g.box(760, 190, 220, 60, ['提示「PLC 未連線」', '不開始生產'], 'red')
    g.arrow([(860, 135), (860, 190)], '否')
    g.box(510, 190, 200, 90, ['訂單進綠框', '計數歸零(記下目前計數)', '本筆運轉/停車時間歸零', '同步後端 CurrentOrder'], 'green')
    g.arrow([(760, 90), (700, 90), (700, 170), (640, 170), (640, 190)], '是', label_at=0, label_dx=-6, label_dy=-6)
    g.box(270, 190, 190, 90, ['生產中', '數量、車速即時更新', '車速 0 且剩餘 > 50 張時', '自動跳出停車原因視窗'], 'green')
    g.arrow([(510, 235), (460, 235)])
    g.diamond(365, 360, 190, 90, ['要結束這筆 ?'], 'orange')
    g.arrow([(365, 280), (365, 315)])
    g.box(30, 320, 190, 90, ['F10 退回(車速須為 0)', 'Auto Next ON:與下一筆交換', 'OFF:綠框留空、回待機'], 'orange')
    g.arrow([(270, 360), (220, 360)], '退回')
    g.box(510, 330, 200, 60, ['F4 完工', '車速須為 0、數量 > 0'], 'blue')
    g.arrow([(460, 360), (510, 360)], '完工')
    g.box(510, 430, 200, 70, ['完工視窗 → 送後端落地', '(詳見圖 3)'], 'blue')
    g.arrow([(610, 390), (610, 430)])
    g.box(760, 430, 220, 70, ['完工後:該筆移出佇列', '下一筆直接遞補為目前工單', '佇列空了就回到待機,可再 F3'], 'grey')
    g.arrow([(710, 465), (760, 465)])
    g.box(30, 450, 460, 120, ['其他 F 鍵', 'F7 訂單詳情(紙箱規格、機台軸位置)', 'F5 計數 +1 / F6 計數 −1(手動修正數量)', 'F8 切換 Auto Next(畫面標示 M/N 下一筆)', 'F9 換班別(開啟登入視窗)', 'F12 離開系統(會跳出瀏覽器確認視窗)'], 'grey', bold_first=True)
    g.text(520, 560, ['F 鍵作用於看板頁(即時監控);其他頁面不響應。'], '#546e7a', 12)
    g.save('flow-04-operator-flow.svg')


# ───────────────────────── 5. 認證 ─────────────────────────
def auth():
    g = Svg(1000, 560, '登入、角色與權杖')
    g.box(30, 60, 200, 70, ['開啟系統', '顯示登入視窗(班別 + 名冊)'], 'blue')
    g.diamond(330, 95, 150, 70, ['角色 ?'], 'orange')
    g.arrow([(230, 95), (255, 95)])
    g.box(450, 40, 250, 80, ['作業員 OPERATOR', '點名冊一列(或輸入帳號)', '按「選取」,免打密碼', '(前端帶約定值 0000)'], 'green')
    g.arrow([(405, 80), (450, 80)], '作業員')
    g.box(450, 150, 250, 80, ['管理者 / 工程師 / 主管', '先按「管理者」,', '再輸入 12 碼英數密碼'], 'orange')
    g.arrow([(405, 110), (430, 110), (430, 190), (450, 190)], '其他角色')
    g.box(760, 95, 210, 80, ['POST /api/v1/auth/login', '後端驗證帳號與密碼', '依角色套密碼政策'], 'blue')
    g.arrow([(700, 80), (730, 80), (730, 120), (760, 120)])
    g.arrow([(700, 190), (730, 190), (730, 150), (760, 150)])
    g.box(760, 230, 210, 90, ['簽發權杖', '存取權杖 2 小時', '刷新憑證 12 小時'], 'green')
    g.arrow([(865, 175), (865, 230)])
    g.box(450, 300, 250, 80, ['前端存入 localStorage', '之後每個 API 請求帶', 'Authorization: Bearer'], 'blue')
    g.arrow([(760, 290), (700, 330)])
    g.diamond(330, 400, 190, 80, ['API 回 401 ?'], 'orange')
    g.arrow([(450, 360), (400, 380)], '', dashed=True)
    g.box(30, 340, 220, 90, ['POST /api/v1/auth/refresh', '以刷新憑證換發新權杖', '成功:重送原請求;失敗:回登入'], 'orange')
    g.arrow([(255, 400), (250, 395)], '是', dashed=False)
    g.box(450, 420, 520, 120, ['後端授權:預設拒絕', '設定寫入(系統設定)與使用者維護需管理權限;', '文件頁:OPERATOR 只看操作手冊,其餘角色全看;', 'ERP 金鑰只能用推單端點', '完整權限矩陣見 docs/spec20260905-s5-v1.md'], 'grey')
    g.text(30, 470, ['限制:權杖無狀態,登出後最長仍有 2 小時有效', '(Backlog B1)'], '#c62828', 12)
    g.save('flow-05-auth.svg')


# ───────────────────────── 6. 報表口徑 ─────────────────────────
def report_calc():
    g = Svg(1000, 480, '報表數字從哪裡來、怎麼算')
    g.box(30, 60, 230, 90, ['完工實績', 'ProductionCompletions', '(每筆完工一列,含不良/停機明細)'], 'green')
    g.box(330, 40, 210, 60, ['GET /production/completions', '生產明細'], 'blue')
    g.box(330, 120, 210, 60, ['GET /summary/daily', '日報彙總'], 'blue')
    g.box(330, 200, 210, 60, ['GET /summary/monthly', '月報(每日一列 + 總計)'], 'blue')
    g.box(330, 280, 210, 60, ['GET /summary/stop-reasons', '停車原因(依次數遞減)'], 'blue')
    for y in (70, 150, 230, 310):
        g.arrow([(260, 105), (300, 105), (300, y), (330, y)])
    g.box(620, 40, 350, 300, ['計算口徑(後端權威,OeeCalculator)', '負荷時間 L = 運轉 + 停機 − 準備', '稼動率 A = min(運轉, L) ÷ L', '效能 P = min(良品 ÷ 目標, 1)(超產封頂)', '良率 Q = 良品 ÷ (良品 + 不良)', 'OEE = A × P × Q(三因子先四捨五入到 0.1)', '', '停機時間含準備時間(準備算在停機內)', '日報稼動率與月報同口徑(2026-11-15 統一)', '日報平均 OEE:逐筆 OEE 依產量加權', '月報 OEE:用當日/整月合計重算'], 'orange', bold_first=True)
    g.arrow([(540, 150), (620, 150)], dashed=True)
    g.arrow([(540, 230), (620, 230)], dashed=True)
    g.box(30, 400, 440, 110, ['工廠日(報表的「日期」)', '完工時間換算成工廠時區(Asia/Taipei)後,', '減去日界時數 8 小時再取日期。', '例:夜班 10/10 22:00 與 10/11 02:00 完工,都屬 10/10。'], 'purple', bold_first=True)
    g.box(520, 400, 450, 110, ['報表頁的資料來源提示', '「彙總數字由後端計算」:正常路徑', '「改以本機計算」:有未同步的本機紀錄,或後端無法連線', '(此時數字可能與後端不一致)'], 'grey', bold_first=True)
    g.text(30, 440, ['停車原因彙總來自完工時填的停機明細(代碼 + 原因快照)。', '原因主檔改名或停用,歷史報表仍顯示當時的說法。'], '#546e7a', 12)
    g.save('flow-06-report-calc.svg')


# ───────────────────────── 7. 通訊設定 ─────────────────────────
def comm_settings():
    g = Svg(1000, 520, '通訊設定頁的結構與去向')
    g.box(30, 60, 270, 90, ['設定頁 → 通訊設定', '(儲存需系統設定權限)'], 'blue')
    g.box(30, 190, 270, 150, ['PLC / 設備區塊', '啟用開關(僅記錄)  模擬訊號', '裝置類型:', '  Advantech MQTT (WISE-4000)', '  Generic Modbus TCP', '  Mitsubishi Evol (MHI) · RS-232'], 'orange', bold_first=True)
    g.box(30, 370, 270, 120, ['ERP 區塊', '啟用開關(僅記錄)', '協定:LMC Flexo / Custom JSON·XML', '連線方式:無 / TCP/IP / 檔案共享', '主機、埠、輸入/輸出路徑'], 'blue', bold_first=True)
    g.arrow([(300, 230), (360, 225)])
    g.arrow([(300, 290), (360, 310)])
    g.box(360, 190, 280, 70, ['依裝置類型出現的欄位', 'WISE:Broker、Topic、監控頻率', 'Modbus:IP、埠'], 'orange')
    g.box(360, 275, 280, 70, ['Evol:序列埠裝置、速率', '資料位元、同位、停止位元', '(預設 9600 / 8 / 偶 / 1)'], 'orange')
    g.box(360, 380, 280, 100, ['其他欄位', '定時寫入間隔、機台識別碼、MM 網址', '(整包存檔,少送欄位就被刪)'], 'grey')
    g.box(700, 100, 270, 110, ['PUT /api/settings/communication', 'buildCommPayload 一律送全部欄位', '後端整包覆寫 Redis', '鍵:config/communication'], 'green', bold_first=True)
    g.arrow([(300, 105), (700, 135)], '儲存')
    g.box(700, 260, 270, 130, ['Worker 實際會讀的設定', 'mqtt_topic(訂閱哪個 Topic)', 'plc_count_signal / plc_motor_signal', 'data_log_interval(寫歷史間隔)', '其餘欄位目前只是記錄'], 'blue', bold_first=True)
    g.arrow([(835, 210), (835, 260)], '週期重讀')
    g.box(700, 420, 270, 90, ['尚未連動(只存設定值)', 'plc_enabled / erp_enabled 開關', 'Mitsubishi Evol 與 RS-232', '需另行實作 Worker 驅動'], 'red', bold_first=True)
    g.text(30, 505, ['重點:新增欄位只要改 commPayload.js 一處(原本四處手寫,各漏不同欄位)。'], '#546e7a', 12)
    g.save('flow-07-comm-settings.svg')


if __name__ == '__main__':
    architecture()
    realtime()
    completion()
    operator_flow()
    auth()
    report_calc()
    comm_settings()
