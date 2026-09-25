# 00 总览：15 节点，一条「AI 前台」主轴

## 模板一句话
给任意网站嵌一个**自有品牌 AI 聊天前台**：访客聊两句，机器人查日历空档 → 建议时段 → 创建 Teams 会议发邀约；客户不约时收集线索发告警邮件给老板。

## 节点地图（15 个 = 9 功能 + 6 便签）

### 主链（用户侧）
```
@n8n/chat 前端 (任意网页的聊天框)
        │ POST sessionId + chatInput（首次握手只有 sessionId）
        ▼
Chat Trigger (webhook, public, 默认 disabled! 坑#11)
        │
        ▼
If: chatInput exists?                    ← 坑#7 exists≠isNotEmpty
   ├─ true  → AI Agent ──→ Respond to Webhook（把回复交给聊天框）
   └─ false → Respond With Initial Message（固定欢迎语，首次握手专用）
```

### AI Agent（大脑）
```
AI Agent
 ├── OpenAI Chat Model (gpt-4o → 课程换 DeepSeek)
 ├── Window Buffer Memory（20 轮，按 sessionId 隔离）
 └── 3 个工具
      ├── availability  → toolWorkflow → 子流 route=availability
      ├── message       → toolWorkflow → 子流 route=message（转人工告警邮件）
      └── Make Appointment → toolHttpRequest 直发 Graph API 建 Teams 会议
```

### 工具子流（Execute Workflow Trigger → Switch by route）
```
route=availability:
  Get Events (MS Graph calendarView: 未来第 2~16 天)
    → freeTimeSlots (Code：营业时间 08:00-17:30 Europe/London 内算空档)   ← 本课最硬核
    → varResponse (Set: .toJsonString() 输出 JSON 字符串)                  ← 坑#8
route=message:
  Send Message1 (Outlook 发品牌风 HTML 告警邮件) → varMessageResponse (Set)
route=???:
  无 default 分支 → 静默丢弃                                              ← 坑#5
```

## 一条主轴（成功路径）
```
访客：「下周有空聊聊我们的新项目吗？」
  → Agent 调 availability → 得空档 JSON（UTC ISO）
  → Agent 报几个候选时段（UTC↔London 换算押在 LLM 心算，坑#9）
访客：「周一上午 9 点（伦敦）吧」
  → Agent 二次确认（忠实 prompt 的确认纪律，C 关实测有效）
访客：「确认」
  → Agent 调 Make Appointment → Teams 会议创建 + 邀约邮件发给客户
访客（另一支线）：「我先不约，让人联系我」
  → Agent 调 message → 收集姓名/公司/邮箱/需求 → 老板收到 HTML 告警邮件
```

## 为什么选这个模板做课
1. **形态最常见**：网页聊天机器人是中小 B 端客户最常问的需求，没有之一。
2. **含金量集中**：60 行 freeTimeSlots 是「算法 + 时区 + 边界」三合一的教学富矿（独占 4 个坑）。
3. **AI Agent 工具编排标准范式**：toolWorkflow 分流 + 直发 HTTP 工具混用，学一个会一类。
4. **免费替身链完整**：DeepSeek/本地日历/飞书告警全部实测真跑，学员零成本复刻（docs/04）。