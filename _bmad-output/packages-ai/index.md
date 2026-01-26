# @nemo-cli/ai 模块文档

> 生成日期：2025-12-21
> 模块版本：0.0.1
> 扫描级别：快速扫描

---

## 📦 模块概览

| 属性 | 值 |
|------|-----|
| **包名** | `@nemo-cli/ai` |
| **CLI 命令** | `na` |
| **描述** | AI CLI + MCP 服务器 |
| **类型** | CLI + MCP Server |
| **语言** | TypeScript (ESM) |

---

## 📂 目录结构

```
packages/ai/
├── bin/
│   └── index.mjs              # CLI 入口点
├── src/
│   ├── index.ts               # 主入口，MCP服务器启动
│   ├── components/            # React组件（预留）
│   ├── hooks/                 # React Hooks（预留）
│   └── services/
│       ├── chat/
│       │   └── index.ts       # AI聊天服务
│       ├── confluence/
│       │   ├── index.ts       # Confluence API入口
│       │   ├── createContent.ts   # 创建文档
│       │   ├── getContent.ts      # 获取文档
│       │   ├── mcp.ts             # MCP工具注册
│       │   └── template.ts        # 文档模板
│       ├── mails/
│       │   └── mcp.ts         # 邮件MCP工具
│       ├── slack/
│       │   ├── bot.ts         # Slack Bot
│       │   └── tools/
│       │       ├── getPRD.ts
│       │       ├── sendEmail.ts
│       │       └── index.ts
│       └── swagger/
│           ├── index.ts       # Swagger解析
│           ├── loop.ts
│           ├── mcp.ts
│           └── type.ts
├── manifest.json              # MCP/Slack清单
├── dist/
├── package.json
└── rolldown.config.ts
```

---

## 🎯 核心功能

### MCP 服务器

使用 FastMCP 框架提供 MCP (Model Context Protocol) 服务：

```typescript
const server = new FastMCP({
  name: 'Prime Workflow',
  version: '0.0.1',
})

addConfluenceMCP(server)  // Confluence工具
addMailMCP(server)        // 邮件工具

server.start({ transportType: 'stdio' })
```

### 注册的 MCP 工具

| 工具 | 功能 | 服务 |
|------|------|------|
| 打开文档 | 打开Confluence文档 | Confluence |
| 创建上线文档 | 创建发布工单 | Confluence |
| 发送上线邮件 | 发送发布邮件 | Mail |

### Slack Bot

集成 Slack Bot 功能：

- 监听频道消息
- 执行工作流工具
- 发送通知

---

## 🛠️ 技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| FastMCP | ^3.25.4 | MCP服务器框架 |
| @ai-sdk/openai | 3.0.0-beta.90 | OpenAI集成 |
| @ai-sdk/deepseek | ^1.0.32 | DeepSeek集成 |
| @ai-sdk/google | ^2.0.51 | Google AI集成 |
| ai | 6.0.0-beta.144 | Vercel AI SDK |
| confluence.js | ^2.1.0 | Confluence API |
| @slack/bolt | ^4.6.0 | Slack Bot框架 |

---

## ⚙️ 配置

### 环境变量

```bash
# Confluence
CONFLUENCE_URL=https://xxx.atlassian.net
CONFLUENCE_EMAIL=xxx@xxx.com
CONFLUENCE_TOKEN=xxx

# Google/Gmail
GOOGLE_APP_PASSWORD=xxx

# AI服务
OPENAI_API_KEY=sk-xxx
DEEPSEEK_API_KEY=xxx
GOOGLE_API_KEY=xxx

# Slack
SLACK_BOT_TOKEN=xoxb-xxx
SLACK_SIGNING_SECRET=xxx
```

### Cursor MCP 配置

```json
{
  "Prime Workflow": {
    "command": "node",
    "args": [
      "/path/to/nemo-cli/packages/ai/dist/index.js"
    ]
  }
}
```

---

## 🚀 使用示例

在 AI Agent 中：

- "帮我打开1653的文档"
- "帮我创建 1705 上线工单"
- "发送1705上线邮件"

---

## 📖 依赖关系

| 依赖包 | 类型 | 说明 |
|--------|------|------|
| @nemo-cli/git | workspace | Git操作 |
| @nemo-cli/mail | workspace | 邮件服务 |
| @nemo-cli/shared | workspace | 共享工具 |
| @nemo-cli/ui | workspace | TUI组件 |

---

## 🔗 相关资源

- [FastMCP文档](https://github.com/jlowin/fastmcp)
- [Vercel AI SDK](https://sdk.vercel.ai)
- [Confluence API](https://developer.atlassian.com/cloud/confluence/rest/)
- [Slack Bolt](https://slack.dev/bolt-js)
