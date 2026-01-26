# @nemo-cli/ui 模块文档

> 生成日期：2025-12-21
> 模块版本：0.0.1
> 扫描级别：快速扫描

---

## 📦 模块概览

| 属性 | 值 |
|------|-----|
| **包名** | `@nemo-cli/ui` |
| **描述** | React TUI 组件库 |
| **类型** | UI 组件库 |
| **语言** | TypeScript + React (ESM) |

---

## 📂 目录结构

```
packages/ui/
├── src/
│   ├── index.ts               # 主入口
│   ├── components/
│   │   ├── index.ts           # 组件导出
│   │   ├── big-text.tsx       # 大字体文本（figlet）
│   │   ├── list.tsx           # 列表组件
│   │   ├── message.tsx        # 消息组件
│   │   ├── process-message.tsx    # 进度消息
│   │   └── provider/
│   │       └── index.tsx      # Context Provider
│   └── hooks/
│       └── useTerminalSize.ts # 终端尺寸Hook
├── dist/
├── package.json
└── rolldown.config.ts
```

---

## 🎯 导出组件

### BigText

使用 figlet 显示大字体 ASCII 艺术文本：

```tsx
import { BigText } from '@nemo-cli/ui'

<BigText text="Hello" />
```

### Message / ErrorMessage

显示消息提示：

```tsx
import { Message, ErrorMessage } from '@nemo-cli/ui'

<Message type="success">操作成功</Message>
<Message type="warning">警告信息</Message>
<ErrorMessage>错误信息</ErrorMessage>
```

### ProcessMessage

显示进度消息：

```tsx
import { ProcessMessage } from '@nemo-cli/ui'

<ProcessMessage message="处理中..." />
```

### renderList

渲染列表：

```tsx
import { renderList } from '@nemo-cli/ui'

const items = ['Item 1', 'Item 2', 'Item 3']
renderList(items)
```

---

## 🛠️ 技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| ink | ^6.5.1 | React终端渲染 |
| react | ^19.2.3 | UI框架 |
| @inkjs/ui | ^2.0.0 | Ink UI组件 |
| figlet | ^1.9.4 | ASCII艺术字 |
| cfonts | ^3.3.1 | 彩色字体 |
| chalk | ^5.6.2 | 终端颜色 |
| cli-table3 | ^0.6.5 | 表格渲染 |
| figures | ^6.1.0 | 终端图标 |
| ink-gradient | ^3.0.0 | 渐变文本 |
| ink-table | ^3.1.0 | Ink表格 |
| ink-markdown | ^1.0.4 | Markdown渲染 |
| marked | ^17.0.1 | Markdown解析 |

---

## 📖 使用示例

### 基本使用

```tsx
import React from 'react'
import { render } from 'ink'
import { BigText, Message } from '@nemo-cli/ui'

const App = () => (
  <>
    <BigText text="nemo-cli" />
    <Message type="success">Ready to use!</Message>
  </>
)

render(<App />)
```

### 在CLI中使用

```tsx
import { render } from 'ink'
import { ErrorMessage } from '@nemo-cli/ui'

// 显示错误
render(<ErrorMessage>Something went wrong</ErrorMessage>)
```

---

## 🪝 Hooks

### useTerminalSize

获取终端尺寸：

```tsx
import { useTerminalSize } from '@nemo-cli/ui'

const MyComponent = () => {
  const { width, height } = useTerminalSize()
  return <Text>Terminal: {width}x{height}</Text>
}
```

---

## 📖 依赖关系

| 依赖包 | 类型 | 说明 |
|--------|------|------|
| @nemo-cli/shared | workspace | 共享工具 |

**被依赖于：**
- @nemo-cli/git
- @nemo-cli/ai
- @nemo-cli/file
- @nemo-cli/package
- @nemo-cli/mail

---

## 🔗 相关资源

- [Ink](https://github.com/vadimdemedes/ink)
- [React](https://react.dev)
- [figlet](https://github.com/patorjk/figlet.js)
- [@inkjs/ui](https://github.com/vadimdemedes/ink-ui)
