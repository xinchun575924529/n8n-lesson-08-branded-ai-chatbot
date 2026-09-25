# 给公司官网装一个 AI 前台：查日程、约会议、转人工一条龙（官方模板 2786 拆解）
> 出处：https://n8n.io/workflows/2786/（Create a branded AI-powered website chatbot）

这个模板讲的是中小公司最眼馋的一个玩法：给任意网站嵌一个**自有品牌的 AI 前台**——访客在网页右下角聊天框里问「你们有没有空聊聊？」，机器人**真去查日历空闲**（读未来 14 天 Outlook 日历，算出营业时间内的空档）、**自动创建 Teams 会议邀约发邮件**、客户不想约时**收集姓名/公司/邮箱/需求发一封精美告警邮件给老板**。一个「AI 销售前台」闭环，前端用 @n8n/chat 三行代码嵌入任意网站。

我们把模板 15 个节点完整拉到本地做了 L2 三级验证——**A 单元 21/21、B mock 全链 33/33、C 免费替身真跑 14/14，三关全绿共 68 断言**，中途抓出 **11 个坑**（其中 3 个是「真跑必出事」级别：空档算法不裁剪营业边界、周末全靠 LLM 自觉、工具报错被 LLM 圆谎成话术）。C 关用 **DeepSeek + 本地 JSON 真日历 + 飞书群告警** 零成本真跑了「访客咨询→查档→成约→老板收通知」全闭环，并给出**服务端三重守卫**修复示范——LLM 算错时段也写不进日历。

## 你将学到（5 讲每讲配可跑工作流）
1. **00 总览**：15 节点骨架地图；一条「网页聊天 → AI 查档 → 建约成会 → 兜底转人工」主轴
2. **01 入口与品牌化**：@n8n/chat 前端三行嵌入 / Chat Trigger 握手分支 / 超长 systemMessage 品牌人设
3. **02 Agent 与工具编排**：三工具挂载 / 子流 Switch 分流 / Window Memory 按 sessionId 隔离
4. **03 空闲时段算法深拆**：freeTimeSlots 逐行拆解——本课最硬核的 60 行 Code 和它的 4 个算法级坑
5. **04 Outlook 三件套与免费替身**：日历读取/Teams 建会/HTML 邮件 → 本地 JSON 日历 + 飞书告警的 0 元方案
6. **05 排障图谱**：11 坑照妖镜合集 + C 版服务端守卫修复示范（每坑均有断言固化）

## 11 个坑先睹为快（剧透式目录，正文有药方）
| # | 坑 | 级别 | 一句话后果 |
|---|---|---|---|
| 1 | freeTimeSlots「会后档」不与营业开始取 max | 🔴 必炸 | 07:00 结束的会**造出 07:30 的空档**，客户被约到营业时间外 |
| 2 | 周末完全不排除，只靠提示词约束 LLM | 🔴 必炸 | LLM 一旦不守纪律，客户被约到周六 |
| 3 | 营业时间串 `"08:00:00Z"`(UTC) 与 Europe/London 混用 | 🟡 脆弱 | BST 夏令时期间营业时间**整体漂 1 小时** |
| 4 | showAs=free/tentative 的事件被当空气 | 🟡 数据 | 「暂定」会议被无视，新会议撞车 |
| 5 | Switch 只有两分支**无 default** | 🟡 隐晦 | route 异常（如 'booking'）静默丢弃，无任何反馈 |
| 6 | Switch 大小写敏感 | 🟡 隐晦 | 'Availability' 直接掉地上 |
| 7 | If 用 exists 而非 isNotEmpty | 🟡 浪费 | chatInput=空串也走 AI Agent 白烧 token |
| 8 | varResponse 输出 **JSON 字符串**不是数组 | 🟡 健壮 | 工具回执解析全靠 prompt 纪律硬撑 |
| 9 | UTC/London 换算正确性完全押在 LLM 心算上 | 🔴 必炸 | B 关实锤：Agent 把 UTC 空档「心算」成伦敦时间后**正好撞上忙会** |
| 10 | 工具调用报错会被 LLM **圆谎**成话术 | 🔴 排障 | 子流未 publish 时客户听到「日历系统暂不可用」——看聊天记录排障必被带偏 |
| 11 | Chat Trigger 默认 disabled + 告警邮箱 `user@example.com` 占位 | ⚪ 部署怪癖 | 导入不启用=前端干等；邮箱不改=告警发给空气 |

修复与加固方法全写在 `docs/05`，且**每一个坑都有本地断言固化**（A 8 坑 + B 实锤坑 9/10 + C 修复示范）。

## 免费替代链（0 元跑通全闭环，L2C 实测）
| 模板角色 | 原案（付费/需账号） | 课程实测替身 | 成本 |
|---|---|---|---|
| LLM 大脑 | OpenAI gpt-4o（付费） | **DeepSeek deepseek-chat**（直连换脑） | 分毛/次 |
| 日历读取 | MS Graph calendarView（需 M365 OAuth2） | **本地 JSON 真日历**（文件读写，真冲突检测） | 0 |
| 建会议 | Graph /me/events + Teams（M365） | 写预约记录 + **飞书群「新预约」通知**（实测到达） | 0 |
| 告警邮件 | Outlook 发 HTML 邮件（M365） | **飞书群「转人工」告警**（带姓名/公司/邮箱，实测到达） | 0 |
| 前端聊天页 | @n8n/chat CDN（免费） | 保留（或普通 webhook 模拟，课程内两种方式都教） | 0 |

**结论性产品卖点**：整套「AI 前台」可以一分钱不花上线中文版——DeepSeek 换脑、飞书替 Outlook、本地 JSON 当日历；想接真 Outlook/Teams 时再补 M365 OAuth，架构原样兼容。

## C 版示范修复（把坑变成卖点）
C 关不是照抄模板，而是**带着 11 坑的教训重写**：
- **服务端三重守卫**：预约写入前强制校验①营业时段 08:00–17:30 裁剪 ②周末直接拒绝 ③与既有会议冲突检测——LLM 算错时段也写不进日历（T4 实测周日早 7am 请求被拒）
- **确认纪律实测**：忠实 prompt 的「客户确认后才建约」在多轮真对话中成立（agent 第二轮只做二次确认不动手）
- **多轮记忆成真**：守护进程常驻 Memory，同 sessionId 三轮「问档→指定时段→确认成交」真跑通

## 现场实测证据（不是复述官方话术）
- **L2-A 单元单测**：freeTimeSlots 原文移植 + If/Switch/varResponse 分支逻辑，**21 断言全过**；首跑 19/20，唯一失败项直接暴露坑#1（如实记录）
- **L2-B mock 全链**：主链+工具子流 1:1 还原 ×8 场景（握手/查档成约/转人工/撞档改约/闲聊拒答/工具直调×2/route 异常），**33/33 全过**，坑#9/#10 逐个坐实
- **L2-C 免费真跑**：真 webhook `POST /webhook/chatbot-2786` E2E，飞书群实测收到「新预约」「转人工」两类通知，**14/14 全过**
- 完整证据与测试工作流见 `workflows/`，复现手记见 `docs/`

## 仓库地图
```
.
├── README.md                     本文件
├── LEGEND.md                     图例与代号（L1-L5 / A-C 关 / 🔴-⚪ / ✅）
├── docs/
│   ├── 00-overview.md            节点地图与一条主轴
│   ├── 01-trigger-and-branding.md  前端嵌入 / Chat Trigger / 握手分支 / 品牌人设
│   ├── 02-agent-and-tools.md     Agent 三工具 / 子流 Switch / Memory 隔离
│   ├── 03-freetimeslots-algorithm.md  空闲算法逐行拆解与算法级坑
│   ├── 04-outlook-trio-and-free-replace.md  Outlook 三件套与免费替身架构
│   └── 05-pitfalls-defense.md    11 坑排障图谱与药方（含 C 版守卫代码）
├── exercises/exercises.md        6 个逐级动手练习（附参考答案）
├── script/short-video.md         60s 获客口播稿 + 分镜清单
├── workflows/
│   ├── README.md                 六个 JSON 的用法与安全红线
│   ├── 2786-original-template.json     原模板 15 节点（只读参考）
│   ├── L2A-unit-test.json              单元验证流（21 断言）
│   ├── L2B-integration-mock-main.json  mock 全链主链（DeepSeek 换脑）
│   ├── L2B-integration-mock-sub.json   mock 工具子流（含真实冲突检测）
│   ├── L2C-free-replacement-main.json  免费真跑主链（真 webhook）
│   └── L2C-free-replacement-sub.json   免费真跑子流（JSON 日历+飞书告警）
└── site/                         GitHub Pages 静态站（push 自动部署）
```

**License**: MIT（教程内容可自由转载，模板版权归 n8n 官方）

---
*本项目由「n8n 工厂店」教研车间产出 · L2 三级验证完成于 2026-09-23 · L3 教案封装 2026-09-25*