# 03 空闲时段算法深拆：freeTimeSlots 逐行过堂（本课最硬核）

这是模板里唯一的 Code 节点，约 60 行 JS，输入未来 14 天的日历事件，输出营业时间内 30 分钟粒度的空档。**L2-A 对它原文移植做了 12 个断言**，抓出 3 个算法级坑 + 1 个时区坑。

## 算法骨架
```
对每个工作日 D（未来第 2~16 天逐日展开）:
  businessStart = D + "08:00:00Z"     ← UTC 串，但日历声明 Europe/London（坑#3）
  businessEnd   = D + "17:30:00Z"
  busy = 当天 showAs=busy 的事件按 start 排序   ← free/tentative 被当空气（坑#4）
  slots = []
  光标 cur = businessStart
  for e in busy:
      会前档 = [cur, e.start)
      if 会前档 ≥ 30min: slots.push(会前档)
      cur = max(cur, e.end)
  收尾档 = [cur, businessEnd)
  if 收尾档 ≥ 30min: slots.push(收尾档)
```

## 坑#1（🔴）：会后档不与 businessStart 取 max——LLM 管不了，算法自己裸奔
- **实锤场景**：07:00–07:30 有个会（营业开始前结束）。`cur` 初始=businessStart=08:00，循环里 `cur = max(cur, e.end)` = max(08:00, 07:30) = 08:00——咦，这个 case 是对的？
- 真正翻车的是**另一种写法**：模板实际代码里「会后档」直接用 `busyEvents[i].end` 作为下一段空档起点，**只有会前档判断了 `> businessStart`**。当第一个会 07:00–07:30 结束、第二个会 09:00 开始时，产出的空档起点 = **07:30，早于营业开始 08:00**。
- A 关 FS11 断言实锤：**客户可被约到营业时间外**。
- **修法一行**：`slotStart = Math.max(prevEnd, businessStart)`。

## 坑#2（🔴）：周末完全不排除
- 逐日展开**不看星期几**，周六日照样出空档。
- AA 关 FS9 断言实锤：周六也能产出 09:00-10:00 的空档。
- 模板唯一防线 = systemMessage 里一句「别约周末」——**把业务规则押在 LLM 自律上**。C 关修法：服务端守卫见 docs/05。

## 坑#3（🟡）：UTC 时段串 vs Europe/London 声明
- 营业时间写的是 `"2026-09-28T08:00:00Z"`（UTC），日历 header 声明 `Europe/London`。
- BST 夏令时（UTC+1）期间 08:00Z = **伦敦 09:00**——实际营业时间整体漂移 1 小时；冬令时才恰好对齐。
- 修法：用 `Intl.DateTimeFormat` / luxon 按 Europe/London 本地时间构造 businessStart/End，别手拼 UTC 串。

## 坑#4（🟡）：showAs ≠ busy 被当空气
- `showAs: free / tentative` 的事件不参与占位。「暂定的客户会」被无视 → 新会议撞车。
- A 关 FS10 断言如实复刻，修法：白名单改 `['busy','tentative','oof']`。

## 断言清单（A 关 12 条全过）
空日历 / 单会双档 / 两会夹缝三档 / 全天排满 / 跨 4 天展开 / **周末不排除(实锤)** / **showAs=free 不占档(实锤)** / **营业前会议不裁剪(实锤坑#1)** / UTC dayOfWeek 边界 / 30 分钟粒度 / 会前档>0 判断 / 收尾档。

## 为什么这讲值钱
60 行代码同时踩中「边界条件 / 时区 / 数据语义」三类最经典工程 bug 的**全部**，且每一坑都有可跑断言——这是本课最适合面试/内训的一讲。