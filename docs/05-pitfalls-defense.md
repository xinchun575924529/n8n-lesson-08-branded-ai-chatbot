# 05 排障图谱：11 坑照妖镜与药方（含 C 版守卫修复示范）

## 一图总览
| # | 坑 | 级别 | 实锤关卡 | 修法 |
|---|---|---|---|---|
| 1 | 会后档起点不裁剪 businessStart | 🔴 | A FS11 | `slotStart=max(prevEnd,businessStart)`；**或 C 版服务端守卫兜底** |
| 2 | 周末不排除，押 LLM 自律 | 🔴 | A FS9 + B 互证 + C T4 | 算法排除周末 + 服务端守卫拒绝 |
| 3 | UTC 时段串 vs Europe/London 漂移 | 🟡 | A 断言 | luxon/Intl 按本地时区构造边界 |
| 4 | showAs≠busy 不占档 | 🟡 | A FS10 | busy 白名单扩 tentative/oof |
| 5 | Switch 无 default 静默丢 | 🟡 | A SW3 + B E1 | 加 default 分支回错误回执 |
| 6 | Switch 大小写敏感 | 🟡 | A SW4 | route 入参 `.toLowerCase()` 归一 |
| 7 | If 用 exists，空串也烧 token | 🟡 | A IF3 | 条件改 isNotEmpty |
| 8 | varResponse 输出 JSON 字符串 | 🟡 | A SET1/2 | 回执改结构化对象 + prompt 注明格式 |
| 9 | UTC↔London 换算押 LLM 心算 | 🔴 | **B 全链实锤** | 空档直接输出本地时间串；服务端守卫兜底 |
| 10 | 工具报错被 LLM 圆谎 | 🔴 | **B 全链实锤** | 子流必须 publish；排障看执行记录不看聊天 |
| 11 | Chat Trigger disabled + 占位邮箱 | ⚪ | 立项审计 | 导入即启用；邮箱换真实告警地址 |

## 🔴 三坑上单前必修
1. **坑#1/#2/#9 的共同药方 = 服务端守卫**：别指望 LLM 和 60 行算法都正确——预约写入前在服务端强制校验。C 版示范代码（已实测）：

```javascript
// 预约落盘前（C 版子流 Code 节点）
const start = new Date(req.start), end = new Date(req.end);
const day = start.getUTCDay();
if (day === 0 || day === 6) return [{ json: { booked:false, reason:'WEEKEND' } }];
const BH_START = 8*60, BH_END = 17*60+30; // 08:00-17:30
const mins = start.getUTCHours()*60 + start.getUTCMinutes();
const minsEnd = end.getUTCHours()*60 + end.getUTCMinutes();
if (mins < BH_START || minsEnd > BH_END) return [{ json: { booked:false, reason:'OUT_OF_HOURS' } }];
for (const e of calendar.events) {
  const s = new Date(e.start), t = new Date(e.end);
  if (start < t && end > s) return [{ json: { booked:false, reason:'CONFLICT', clashWith:e.subject } }];
}
// 通过才写入 calendar.events 并落盘
```

原理三句话：**周末拒、营业时段裁剪、冲突检测**——LLM 算错时段也写不进日历（C 关 T4 实测周日 7am 被拒；B 关 Agent 心算撞会在 mock 层被同一逻辑拦下）。

2. **坑#10 药方**：上线 checklist 加一条「工具子流 publish + 重启生效」；排障 SOP 第一条「看执行记录，不信聊天内容」。

3. **确认纪律 + 回执带原因**：B 关实测的正面经验——工具回执写 `CONFLICT with <忙会名>` 而不是 `false`，Agent 会自愈改约；prompt 里「确认后才建约」纪律多轮对话实测成立（C 关 T2 第二轮 agent 二次确认不动手）。

## 排障口诀（AI Agent 系统通用）
> **聊天内容是演技，执行记录是真相；工具回执带原因，LLM 自己会纠错；业务规则入代码，别押提示词自律。**