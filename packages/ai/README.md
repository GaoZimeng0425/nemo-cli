# MCP 功能:
- 打开文档
- 发送上线邮件
- 创建上线文档


# 前置条件

1. 申请 OAuth2.0:
    - <https://developer.atlassian.com/cloud/confluence/oauth-2-3lo-apps/>
    - <https://developer.atlassian.com/console/myapps/>
1. 申请 Confluence Token: https://id.atlassian.com/manage-profile/security/api-tokens
2. 创建 Google Auth App: https://myaccount.google.com/apppasswords
3. 添加到 .env 文件中
4. 执行 `pnpm build` 后添加 mcp
```json
    "Prime Workflow": {
        "command": "node",
        "args": [
            "/Users/[xxxx]/Documents/[xxxx]/nemo-cli/packages/ai/dist/index.js"
        ]
    }
```
5. 使用 Example:
    - 帮我打开1653的文档
    - 帮我创建 1705 上线工单
    - 发送1705上线邮件
