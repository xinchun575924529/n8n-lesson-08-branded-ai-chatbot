# 04 Outlook 三件套与免费替身：0 元跑通全闭环

## 原案三件套（都要 M365 OAuth2）
| 用途 | 节点 | 说明 |
|---|---|---|
| 读日历 | Get Events（MS Graph calendarView） | 拉未来第 2~16 天事件，喂给 freeTimeSlots |
| 建会议 | Make Appointment（toolHttpRequest 直发 Graph /me/events） | 创建 30 分钟 Teams 在线会议，邀约客户邮箱；时区/时长硬编码 Europe/London + 30min |
| 告警邮件 | Send Message1（Outlook 发 HTML 邮件） | 品牌紫黑风 HTML 模板，收件人 `user@example.com` 占位（坑#11） |

门槛：M365 账号 + OAuth2 应用注册，个人学习/中小企业试用都不轻。

## 免费替身架构（C 关实测真跑）
| 角色 | 替身 | 实测证据 |
|---|---|---|
| LLM | OpenAI gpt-4o → **DeepSeek deepseek-chat**（直连换脑，temperature=0） | B/C 两关真连 |
| 日历读 | **本地 JSON 真日历**（`state/2786-c-calendar.json`，文件读写） | T2 播种两个忙会，查档正确绕开 |
| 日历写/建会议 | 预约写入 JSON 日历（**带服务端三重守卫**，见 docs/05） | T2 预约真实落盘 + 冲突/越界被拒 |
| 告警邮件 | **飞书群通知**（告警含姓名/公司/邮箱） | T3 教案制作组群实测收到「转人工」告警 |
| 新预约通知 | 飞书群通知 | T2 实测收到「新预约」通知 |
| 前端 | 保留 @n8n/chat；测试用普通 Webhook 模拟其 POST 协议 | T1 握手/T2-T4 全链 |

**成本**：DeepSeek 分毛/次，其余全 0 —— 整套「AI 前台」零元上线中文版。

## 架构兼容性（将来接真 Outlook 时）
原模板的工具接口（route=availability/message + makeAppointment）没变——把 JSON 日历节点换回 Get Events、把飞书节点换回 Outlook Send Message 即还原，**Agent 侧 prompt/工具描述一行不用改**。这就是工具化分层的红利。

## 飞书通知的落地姿势（课程实测）
- 自建飞书应用（app_id/app_secret）→ tenant_access_token → `POST /open-apis/im/v1/messages?receive_id_type=chat_id`
- 两个通知场景两种标题：`【新预约】姓名/邮箱/时段`、`【转人工】姓名/公司/邮箱/需求`
- 比 Outlook 邮件**更快到老板手机**（飞书 App 推送），中文团队体验更好。

## 本讲断言现场（C 关 14/14）
T1 握手欢迎语 ✅ ｜ T2 查档→提案→确认→**预约写真日历**→**飞书新预约通知**→回复成交 ✅（8 条）｜ T3 拒约→收集 4 字段→**飞书转人工告警**（邮箱/公司字段全对）→且**未产生新预约（纪律）** ✅（5 条）｜ T4 周日+营业前 7am **被守卫拒** ✅