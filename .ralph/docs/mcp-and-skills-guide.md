# MCP & Skills 配置指南

## 概述

本指南说明 nemo-cli 项目中可用的 MCP (Model Context Protocol) 服务器和 Skills，以及如何在开发中使用它们。

## 可用的 MCP 服务器

### @nemo-cli/ai MCP Server

**位置**: `packages/ai/`

**启动方式**:
```bash
# 开发模式
pnpm run --filter=@nemo-cli/ai dev

# 或直接运行
na
```

**可用的 MCP 工具**:

1. **Confluence 集成**
   - 读取 Confluence 页面
   - 搜索 Confluence 内容
   - 环境变量: `CONFLUENCE_URL`, `CONFLUENCE_EMAIL`, `CONFLUENCE_TOKEN`

2. **邮件服务** (通过 @nemo-cli/mail)
   - 发送邮件通知
   - 环境变量: `GOOGLE_APP_PASSWORD`

3. **Slack Bot**
   - 发送 Slack 消息
   - 环境变量: `SLACK_BOT_TOKEN`, `SLACK_SIGNING_SECRET`

4. **Swagger API 解析**
   - 解析 OpenAPI/Swagger 规范
   - 生成 API 调用代码

### 在 AI 代理中使用 MCP

当使用 Claude Code 或其他 AI 工具时，可以通过以下方式使用 MCP：

```bash
# 确保 .env 文件配置正确
# 然后启动 MCP 服务器
pnpm run --filter=@nemo-cli/ai dev

# MCP 服务器将在指定的端口启动
# AI 工具可以通过 MCP 协议调用相关功能
```

## 可用的 Skills

本项目中已配置的 Skills（来自系统提示）：

### 开发流程相关

1. **superpowers:using-superpowers** - 使用任何技能前必须先查看
2. **superpowers:test-driven-development** - TDD 工作流，实现新功能前使用
3. **superpowers:systematic-debugging** - 调试流程，遇到 bug 时使用
4. **superpowers:brainstorming** - 创意工作，创建功能前使用
5. **superpowers:writing-plans** - 编写实现计划
6. **superpowers:verification-before-completion** - 完成前验证
7. **superpowers:code-review-excellence** - 代码审查

### 技术栈相关

8. **typescript-advanced-types** - TypeScript 高级类型系统
9. **modern-javascript-patterns** - ES6+ 特性
10. **coding-standards** - TypeScript/JavaScript 编码标准
11. **javascript-testing-patterns** - Jest/Vitest 测试

### 架构相关

12. **backend-patterns** - 后端架构模式
13. **monorepo-management** - Monorepo 管理（Turborepo, pnpm）
14. **git-advanced-workflows** - 高级 Git 工作流

### CLI 工具相关

15. **prompt-engineering-patterns** - CLI 提示工程
16. **security-review** - 安全审查（处理认证、输入等时使用）

### 代码审查相关

17. **code-review** - 通用代码审查
18. **python-review** - Python 代码审查（如需要）
19. **go-review** - Go 代码审查（如需要）

### 专用命令（Skills）

20. **tdd** - 强制 TDD 工作流
21. **verify** - 验证命令
22. **test-coverage** - 测试覆盖率检查
23. **code-review** - 代码审查命令
24. **update-codemaps** - 更新代码地图
25. **refactor-clean** - 重构清理
26. **plan** - 规划命令
27. **checkpoint** - 检查点命令

### 文档和设计

28. **docx** - Word 文档处理
29. **pdf** - PDF 文档处理
30. **pptx** - PowerPoint 演示文稿
31. **xlsx** - Excel 表格处理

### 其他

32. **webapp-testing** - Web 应用测试（Playwright）
33. **dependency-upgrade** - 依赖版本升级管理
34. **continuous-learning** - 从会话中提取可重用模式
35. **skill-creator** - 创建新技能

## 在开发中使用 Skills

### 通过 Skill 工具调用

当 AI 代理执行相关任务时，应该主动调用相应的 Skill：

```typescript
// 示例：开始实现新功能前
// 1. 先调用 brainstorming skill 进行头脑风暴
// 2. 然后调用 plan skill 创建实现计划
// 3. 使用 tdd skill 强制测试驱动开发
// 4. 实现完成后调用 code-review skill
// 5. 最后调用 verify skill 验证
```

### 技能使用规则

**何时必须使用 Skills**:

1. **实现新功能前** → `brainstorming` + `plan`
2. **编写代码前** → `tdd` (测试优先)
3. **遇到 bug 时** → `systematic-debugging`
4. **编写/修改代码后** → `code-review`
5. **处理用户输入/认证时** → `security-review`
6. **完成工作前** → `verification-before-completion`

**技能优先级**:
1. 流程技能优先 (brainstorming, debugging, tdd)
2. 实现技能其次 (frontend-design, mcp-builder)
3. 技术栈技能按需使用 (typescript, testing, patterns)

## AI 代理工作流集成

### Ralph AI 的标准工作流

```yaml
1. 接收任务:
   - 检查是否需要 brainstorming → 调用 brainstorming skill
   - 如果是复杂任务 → 调用 plan skill

2. 规划实现:
   - 阅读 fix_plan.md 了解当前任务
   - 阅读 architecture.md 了解架构模式
   - 阅读 coding-standards.md 了解编码规范

3. 开始实现:
   - 调用 tdd skill（强制测试优先）
   - 编写测试
   - 实现代码
   - 运行测试

4. 代码审查:
   - 调用 code-review skill
   - 修复问题
   - 重新审查

5. 验证完成:
   - 调用 verify skill
   - 更新 fix_plan.md
   - 提交代码

6. 持续改进:
   - 调用 continuous-learning skill
   - 提取可重用模式
```

### 配置文件引用

确保以下文件包含正确的提示：

1. **PROMPT.md** - 包含 MCP 和 Skills 使用说明
2. **AGENT.md** - 包含工具使用指南
3. **fix_plan.md** - 包含当前任务和优先级

## 环境配置

### .env 文件示例

```bash
# AI 服务
OPENAI_API_KEY=sk-xxx
DEEPSEEK_API_KEY=xxx
GOOGLE_API_KEY=xxx

# Confluence
CONFLUENCE_URL=https://xxx.atlassian.net
CONFLUENCE_EMAIL=your-email@xxx.com
CONFLUENCE_TOKEN=your-api-token

# Gmail
GOOGLE_APP_PASSWORD=your-app-password

# Slack
SLACK_BOT_TOKEN=xoxb-xxx
SLACK_SIGNING_SECRET=xxx
```

## 最佳实践

### 1. 主动使用 Skills

不要等待用户明确要求，AI 代理应该：

- 实现功能前自动调用 `brainstorming`
- 编写代码前自动调用 `tdd`
- 完成代码后自动调用 `code-review`
- 处理敏感数据前自动调用 `security-review`

### 2. MCP 工具利用

当需要以下功能时，使用 MCP：

- 需要查询文档 → Confluence MCP
- 需要发送通知 → Mail/Slack MCP
- 需要解析 API → Swagger MCP

### 3. 组合使用

```yaml
场景1: 实现新功能
  - brainstorming skill
  - plan skill
  - tdd skill
  - 使用 MCP 查询相关文档
  - 实现 + 测试
  - code-review skill
  - verify skill

场景2: 修复 Bug
  - systematic-debugging skill
  - tdd skill (编写失败测试)
  - 修复代码
  - code-review skill
  - verify skill

场景3: 安全相关功能
  - brainstorming skill
  - security-review skill
  - tdd skill
  - 实现
  - security-review skill (再次)
  - verify skill
```

## 更新日志

- 2026-02-04: 初始版本，包含 MCP 和 Skills 配置指南
