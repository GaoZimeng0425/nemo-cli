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
│   │   ├── branch-viewer.tsx  # 交互式分支查看器 (NEW 2026-02-09)
│   │   ├── list.tsx           # 列表组件
│   │   ├── message.tsx        # 消息组件
│   │   ├── process-message.tsx    # 进度消息
│   │   ├── stash-list.tsx     # Stash 列表组件 (NEW)
│   │   ├── status-viewer.tsx  # 交互式状态查看器 (NEW)
│   │   ├── hist-viewer.tsx    # Git 历史查看器 (NEW)
│   │   ├── commit-viewer.tsx  # 提交查看器 (NEW)
│   │   ├── commit-detail.tsx  # 提交详情 (NEW)
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

### StashList

显示 Git Stash 列表（基于 Ink 的卡片式 UI）：

```tsx
import { StashList, renderStashList } from '@nemo-cli/ui'
import type { StashItem } from '@nemo-cli/ui'

const stashes: StashItem[] = [
  {
    ref: 'stash@{0}',
    branch: 'main',
    message: 'WIP: feature implementation',
    files: ['src/index.ts', 'src/utils.ts'],
    fileCount: 2
  }
]

// 方式1: 组件方式
<StashList stashes={stashes} />

// 方式2: 直接渲染
renderStashList(stashes)
```

**特性：**
- 📦 卡片式布局，每个 stash 独立显示
- 🎨 彩色边框（最新的绿色，旧的灰色）
- 📄 显示文件数量和文件列表（最多5个）
- 🔤 高亮显示最新的 stash

### StatusViewer

交互式 Git 状态查看器（两栏布局）：

```tsx
import { StatusViewer, renderStatusViewer } from '@nemo-cli/ui'
import type { StatusFile } from '@nemo-cli/ui'

const files: StatusFile[] = [
  {
    path: 'src/index.ts',
    status: 'M',  // M=Modified, A=Added, D=Deleted
    staged: false
  }
]

// 方式1: 组件方式
<StatusViewer files={files} onExit={() => {}} />

// 方式2: 直接渲染
renderStatusViewer(files)
```

**特性：**
- 📱 两栏布局：左侧文件列表，右侧 diff 内容
- ⌨️ Vim 风格键位：hjkl 上下左右导航
- 🎯 面板切换：← → 切换焦点面板
- 📜 滚动查看：↑ ↓ 滚动长 diff 内容
- 🌈 语法高亮：绿(+)红(-)青(@@)黄(diff)彩色显示
- 📐 终端自适应：根据终端窗口高度动态调整

**键盘操作：**
- `h/←` - 切换到文件列表面板
- `l/→` - 切换到 diff 面板
- `k/↑` - 向上移动/滚动
- `j/↓` - 向下移动/滚动
- `Enter/q` - 退出

### BranchViewer (NEW 2026-02-09)

交互式分支查看器（双面板布局）：

```tsx
import { BranchViewer, renderBranchViewer } from '@nemo-cli/ui'

// 直接渲染
renderBranchViewer(20)  // 限制显示20个分支
```

**特性：**
- 📱 双面板布局：左侧本地分支，右侧远程分支
- ⌨️ Vim 风格键位：hjkl 切换面板和滚动
- 🎯 面板焦点：绿色边框指示当前焦点
- 🌟 当前分支：绿色高亮 + `*` 标记
- 📜 独立滚动：每个面板独立控制
- 📐 终端自适应：根据终端高度动态调整
- 📊 状态栏：显示滚动位置和分支统计

**键盘操作：**
- `h/←` - 切换到左侧面板
- `l/→` - 切换到右侧面板
- `k/↑` - 向上滚动
- `j/↓` - 向下滚动
- `PageUp/PageDown` - 快速滚动
- `q/Enter` - 退出

**使用场景：**
- 快速查看本地和远程分支对比
- 确认分支同步状态
- 查找特定分支

**实现细节：**
- 分离的状态管理（本地/远程）
- 辅助函数减少代码重复
- 常量定义避免魔法数字
- 完整的 JSDoc 文档

### HistViewer (NEW)

Git 历史查看器（单面板滚动）：

```tsx
import { HistViewer, renderHistViewer } from '@nemo-cli/ui'

renderHistViewer(20)  // 显示最近20条提交
```

**特性：**
- 📜 图形化 Git 历史
- 🎨 彩色提交信息
- ⌨️ Vim 风格导航
- 📊 状态栏显示位置

### CommitViewer (NEW)

提交查看器组件。

### CommitDetail (NEW)

提交详情组件。

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
