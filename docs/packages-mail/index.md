# @nemo-cli/mail 模块文档

> 生成日期：2025-12-21
> 模块版本：0.0.1
> 扫描级别：快速扫描

---

## 📦 模块概览

| 属性 | 值 |
|------|-----|
| **包名** | `@nemo-cli/mail` |
| **描述** | 邮件服务（React Email） |
| **类型** | 服务库 |
| **语言** | TypeScript + React (ESM) |

---

## 📂 目录结构

```
packages/mail/
├── src/
│   ├── index.ts               # 主入口
│   └── services/
│       └── send.ts            # 邮件发送服务
├── emails/
│   ├── data.tsx               # 数据邮件模板
│   └── release.tsx            # 发布邮件模板
├── dist/
├── package.json
└── rolldown.config.ts
```

---

## 🎯 核心功能

### 邮件发送

使用 nodemailer 发送邮件：

```typescript
import { sendEmail } from '@nemo-cli/mail'

await sendEmail({
  to: 'recipient@example.com',
  subject: '发布通知',
  template: 'release',
  data: {
    version: '1.0.0',
    changes: ['Feature 1', 'Bug fix 2']
  }
})
```

### 邮件模板

使用 React Email 构建邮件模板：

#### release.tsx（发布邮件模板）

```tsx
import { Html, Body, Container, Text } from '@react-email/components'

export const ReleaseEmail = ({ version, changes }) => (
  <Html>
    <Body>
      <Container>
        <Text>版本 {version} 已发布</Text>
        {/* ... */}
      </Container>
    </Body>
  </Html>
)
```

#### data.tsx（数据邮件模板）

用于发送数据相关的邮件通知。

---

## 🛠️ 技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| @react-email/components | ^1.0.2 | React Email组件 |
| react-email | ^5.1.0 | React Email框架 |
| nodemailer | ^7.0.11 | 邮件发送 |
| react | ^19.2.3 | UI框架 |
| react-dom | ^19.2.3 | React DOM |

---

## ⚙️ 配置

### 环境变量

```bash
# Gmail
GOOGLE_APP_PASSWORD=your-app-password
GMAIL_USER=your-email@gmail.com

# 或其他 SMTP
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=username
SMTP_PASS=password
```

---

## 🚀 开发

### 预览邮件模板

```bash
# 启动邮件预览服务器
pnpm dev:email

# 访问 http://localhost:3000 预览模板
```

---

## 📖 依赖关系

| 依赖包 | 类型 | 说明 |
|--------|------|------|
| @nemo-cli/shared | workspace | 共享工具 |
| @nemo-cli/ui | workspace | TUI组件 |

**被依赖于：**
- @nemo-cli/ai（MCP邮件工具）

---

## 🔗 相关资源

- [React Email](https://react.email)
- [nodemailer](https://nodemailer.com)
- [@react-email/components](https://react.email/docs/components/html)
