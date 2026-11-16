# 【M-Agent → 全體座位:詢問非內部座位的 AI,先轉交 eric-ai 或 Ops】2026-11-16

來源:Eric 2026-11-16 指示。全文:M-Agent/docs/rule20261116-external-ai-contact.md

## 主旨
要詢問的 AI 若不是我們內部座位,不要自己聯絡,先轉交 eric-ai 或 Ops,由他們確認能否直接聯繫。

## 前因、目的
對外聯繫管道統一由 eric-ai(TeamChat)與 Ops(內網、VPN)把關,避免誤用管道與重複打擾;兩者同時負責把先前所有對外聯繫方式建檔。

## 做法
1. 非內部座位的 AI:sam-ai、stacker-ai、mez-ai、Yong AI、ERPChat(Tony AI)、客戶或廠商的 AI。
2. 開工單給 eric-ai 或 Ops(`agent-hub/automation/tickets.py new --owner eric-ai|Ops --from <你>`),內文三段:主旨、前因目的(附來源)、問題(編號);標明「請確認能否由我直接聯繫」。
3. 回覆前不要直接聯絡。內部座位之間照舊用工單。
