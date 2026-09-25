# 动手练习（6 个逐级，附参考答案）

> 所有练习的工作流文件都在 `workflows/`，导入即可跑；A/B 两关 0 成本，C 关只需 DeepSeek key + 一个飞书群。

## 练习 1：让握手分支开口说话（入门）
导入原模板（只读参考）与 L2A 测试流。把固定欢迎语改成你自己的品牌话术，再回答：为什么不能删 If 节点？
<details><summary>参考</summary>@n8n/chat 首次握手 POST 不含 chatInput，走 If=false 分支拿欢迎语；删 If 后握手会进 AI Agent 或空响应，首屏报错/烧钱。</details>

## 练习 2：抓出空串烧 token（表达式）
在 If 节点把条件从 `exists` 改成 `isNotEmpty`，用 L2A 的 IF3 断言验证：chatInput='' 应走欢迎语分支。
<details><summary>参考</summary>n8n 表达式：`{{ $json.body.chatInput }}` `isNotEmpty`；L2A 工作流里直接改条件类型重跑断言。</details>

## 练习 3：给 Switch 装 default（健壮性）
克隆 L2B 子流，给 Switch 加 default 分支，回执 `{"error":"unknown route:'+route+'"}`；用 route='booking' 验证不再静默。
<details><summary>参考</summary>Switch 节点 Add Option → rename output default；接 Set 节点输出错误 JSON。E1 断言从「产出=空」变成「产出含 error 字段」。</details>

## 练习 4：修坑#1（算法硬核）
在 L2A 的 freeTimeSlots 移植代码里，给「会后档」起点加 `Math.max(prevEnd, businessStart)`；构造「07:00-07:30 早会 + 09:00 会」的日历，断言不再产出 07:30 空档。
<details><summary>参考</summary>原代码空档起点直接用 `busyEvents[i].end`；改为 `const s = Math.max(+new Date(busyEvents[i].end), +businessStart)`。L2A FS11 断言从「如实复刻翻车」改成「修复后不越界」。</details>

## 练习 5：三场景剧本真跑（集成）
用 L2C 主+子流，DeepSeek 换脑后跑三个剧本：①查档成约 ②拒约转人工 ③周日早 7am 约见。检查日历 JSON 与飞书群通知。
<details><summary>参考</summary>剧本 ③ 应被服务端守卫拒（reason WEEKEND/OUT_OF_HOURS）；若被约成功=守卫没生效，查子流 Code 顺序。参考 `scripts/run-l2c-2786.py` 的断言构造。</details>

## 练习 6：中文化品牌改编（课程毕设）
把 systemMessage 里的 Wayne/nocodecreative.io 换成你的品牌，加一条你自己的业务规则（如「只约工作日 14:00 后」），同时**在服务端守卫里落实这条规则**。
<details><summary>参考</summary>prompt 里加规则 + Code 守卫加 `mins < 14*60 → reject`。体会「业务规则双写：提示词管体验，代码管底线」——这就是本课核心方法论。</details>