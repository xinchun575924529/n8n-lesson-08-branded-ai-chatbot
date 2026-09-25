# 02 Agent 与工具编排：三工具挂载 + Switch 分流 + Memory 隔离

## 三工具混用两种形态
| 工具 | 节点 | 干什么 |
|---|---|---|
| availability | toolWorkflow → 子流 | 查未来 2~16 天日历 → 算空档 → 回 JSON 字符串 |
| message | toolWorkflow → 子流 | 收集姓名/公司/邮箱/需求 → 发告警邮件 → 回执 |
| Make Appointment | **toolHttpRequest 直发** Graph API | POST /me/events 建 Teams 会议（不走子流） |

**教学点**：toolWorkflow（可复用子流程）与 toolHttpRequest（一次性外部调用）混用是 AI Agent 工具编排的标准范式。但这也埋了坑#10（见下）。

## 子流 Switch 的两分三无（坑#5/#6）
```
Switch by {{ $json.route }}（严格模式）
  ├─ "availability" → 查档链
  ├─ "message"      → 告警链
  └─ 其他           → 无 default 分支 → 静默丢弃！
```
- L2-A SW3 实锤：route='booking' 直接掉地上，**无任何错误反馈**——调用方只能等到超时。
- L2-A SW4 实锤：大小写敏感，'Availability' ≠ 'availability'。
- B 关 E1 场景全链复刻：断言「产出=空」通过 = 这个坑是**可观测的事实**，不是猜想。
- **修法**：Switch 加 default 分支，回 `{"error":"unknown route: ..."}`——工具回执有错误文案，LLM 还能把话圆回来。

## Memory：Window Buffer，按 sessionId 隔离
- 20 轮窗口，sessionId 由前端 @n8n/chat 自动生成并随每次 POST 携带。
- **多人共用一个机器人时互不见面**（每个访客一个 sessionId）。
- ⚠️ B/C 关实测提醒：守护进程常驻模式下记忆**跨测试持久**——自动化测试脚本必须每次生成唯一 sessionId，否则上轮测试的「John Smith」会学到这轮来。

## 坑#10：工具报错会被 LLM 圆谎（排障铁律）
B 关实锤现场：工具子流**没 publish** 时，toolWorkflow 调用失败；Agent梧州不报错，而是对客户说「我们的日历系统暂时不可用」。
- **排障铁律**：AI Agent 系统的故障**不能靠聊天记录排查**——LLM 会把一切工具异常包装成得体话术。必须看 n8n 执行记录里工具节点的真实输出。
- 配套纪律：toolWorkflow 指向的子流**必须 publish 且重启生效**（n8n 2.x 认 activeVersionId）。

## 正面亮点：Agent 自愈能力
B 关 A2 场景：首次建约被 mock 冲突检测拒（回执 'CONFLICT with Existing client call'）后，Agent **自动改约下一时段成交**——
> 工具回执文案写得好，LLM 就能自我纠错。回执不要只回 `false`，要回**原因**。

## 本讲断言现场
- L2-A：Switch 4 断言（两路分流/无 default 静默丢/大小写敏感）
- L2-B：A1 工具直调空闲 ✅、A2 撞档拦截+自愈 ✅、E1 route 异常静默丢 ✅、S5 工具选择纪律 ✅