# 01 入口与品牌化：前端三行嵌入 + 握手分支 + 品牌人设

## @n8n/chat 前端嵌入（三行代码）
模板配套的前端是 n8n 官方聊天组件，任意网页里加：

```html
<link href="https://cdn.jsdelivr.net/npm/@n8n/chat/dist/style.css" rel="stylesheet" />
<script type="module">
  import { createChat } from 'https://cdn.jsdelivr.net/npm/@n8n/chat/dist/chat.bundle.es.js';
  createChat({ webhookUrl: 'https://你的n8n/webhook/<webhookId>/chat' });
</script>
```

- 首次打开页面时，组件 POST **只有 sessionId、没有 chatInput** 的「握手」请求——这就是主链第一个坑的入口。
- C 关课程用普通 Webhook 节点模拟了这个 POST 协议（`POST /webhook/chatbot-2786`），不起 Chat Trigger 也能全真演练。

## Chat Trigger 的两个部署怪癖（坑#11）
1. **默认 disabled**：从模板导入后 Chat Trigger 是停的，必须手动启用，且确认 `public=true`、`responseMode=responseNode`——否则前端拿不到回复、干瞪眼。
2. webhook path 与 workflowId 绑定，改路径记得同步前端 `webhookUrl`。

## If 握手分支：欢迎语的灵魂
```
If: {{ $json.body.chatInput }} exists?
  true  → AI Agent（正常对话）
  false → Respond With Initial Message（固定欢迎语）
```
- **为什么必须有**：@n8n/chat 首条握手消息没有 chatInput；删掉 If，首页一打开就报错/空回复。
- **坑#7**：条件用的是 `exists` 不是 `isNotEmpty`——客户发一个**空字符串**也算 exists，照样走 AI Agent 白烧 token。修法：条件改 `isNotEmpty`。

## 品牌人设：超长 systemMessage
模板的 systemMessage 近 2000 字符，写死了：
- 人设：「你是 Wayne 的助理，Wayne 是 nocodecreative.io 的创始人」
- 业务规则：只聊预约/转人工两件事，不闲聊；先查档再报价；**客户确认后才建约**；不约就收集 4 字段转人工
- 营业时间/时区表达式的内联计算

**中文化改编点**（C 关已做）：
- 人名/公司/官网换成你的品牌；
- **确认纪律实测有效**（C 关 T2：agent 第二轮只做二次确认不动手）——这段 prompt 要留着；
- 内联时间表达式建议移到 Code 节点统一算（避免 LLM 心算，见坑#9）。

## 本讲断言现场
- L2-A：If 三分支断言（有值走 Agent / 首次握手走欢迎语 / **空串也算 exists**）3/3
- L2-B S1：首次握手回固定欢迎语 ✅3/3；S5 闲聊纪律（不谈别的）✅3/3