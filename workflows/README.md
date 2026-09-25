# workflows/ · 四级配演工作流导览

六个 JSON 四种用法：**一个用来看，四个用来测，一套用来跑**。

| 文件 | 级别 | 用法 | 会不会真花钱 |
|------|------|------|--------------|
| `2786-original-template.json` | 原版 | **只读参考**。官方 API 实拉 15 节点，11 个坑原样保留——别直接上生产 | 导出不跑=0；真跑=烧 OpenAI + 需 M365 OAuth |
| `L2A-unit-test.json` | A 级 | **单元验证**。freeTimeSlots 原文移植 + If/Switch/varResponse 分支逻辑，21 断言 | 0（离线 CLI 断言，无外发） |
| `L2B-integration-mock-main.json` | B 级 | **集成 mock 主链**。DeepSeek 真连换脑 + 三工具 mock（Outlook 三件套落本地 JSON） | DeepSeek 分毛级 |
| `L2B-integration-mock-sub.json` | B 级 | **集成 mock 工具子流**。含**真实冲突检测**（撞档回执 CONFLICT）——必须 publish 才能被主链调用 | 0 |
| `L2C-free-replacement-main.json` | C 级 | **免费真跑主链**。真 webhook `POST /webhook/chatbot-2786`，DeepSeek + 常驻 Memory | DeepSeek 分毛级 |
| `L2C-free-replacement-sub.json` | C 级 | **免费真跑子流**。本地 JSON 真日历（三重守卫）+ 飞书群告警 | 0（需一个飞书自建应用） |

## 导入与触发

### 原版（读）
- 对照 `docs/00-overview.md` 节点地图读配置。
- ⚠️ 先盯三处：Chat Trigger **默认 disabled**（坑#11）、告警邮箱 `user@example.com` 占位（坑#11）、Make Appointment 时区/时长双硬编码 Europe/London + 30min。

### L2A（测）
- 触发：CLI `n8n execute --id=<导入后的ID>`。
- 期望：末节点断言汇总 **21 checks 全过**（首跑会 19/20——唯一失败项就是坑#1 的现形现场，别急着修，先看懂）。

### L2B（测）
- **顺序**：先导子流 `L2B-integration-mock-sub.json` 并 **publish**（不 publish 主链工具调用必挂，且报错会被 LLM 圆谎成「日历不可用」——坑#10），再导主链。
- 场景驱动脚本见工厂车间 `n8n-lesson-crew/scripts/run-l2-mock-2786.py`（8 场景 33 断言）。

### L2C（跑）
- 前置：① DeepSeek API key ② 飞书自建应用（app_id/app_secret + 一个群 chat_id）③ 子流 publish + 主链激活。
- 调用：`POST http://127.0.0.1:5678/webhook/chatbot-2786`，body `{"sessionId":"<唯一值>","chatInput":"..."}` 或 `{"action":"sendMessage",...}`。
- 期望：三轮对话成约 + `c-calendar.json` 真实写入 + 飞书群收到「新预约」通知；转人工场景收到「转人工」告警；周日/越界请求被守卫拒。
- ⚠️ 守护进程常驻 Memory 跨调用持久——**自动化测试每次用唯一 sessionId**，否则客户身份串台。

## 常见排错

| 症状 | 先看哪 |
|------|--------|
| 客户说「日历暂不可用」 | **别信聊天**（坑#10），看执行记录：八成是工具子流没 publish |
| 约到了周末/营业前 | 守卫没生效：查 C 版子流 Code 守卫在写入**之前**执行 |
| 报的时间段跟忙会撞了 | LLM UTC↔本地心算翻车（坑#9）；空档输出直接给本地时间串 |
| 工具调用石沉大海 | Switch 无 default 静默丢（坑#5），route 拼写/大小写 |
| 日历里有陌生客户 | sessionId 复用了，换唯一值 |

## 安全红线

- 本包 JSON 里的凭证 id 全是占位/已脱敏，不含明文密钥；导入后务必换成你自己的凭证。
- **原版别上生产**：11 坑未修；至少先修 🔴 三坑（#1 边界 / #2 周末 / #9 时区）或整体换 C 版守卫方案。
- 飞书 app_secret 不要内联进工作流 JSON 再上传仓库——走凭证管理。