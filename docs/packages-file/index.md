# @nemo-cli/file 模块文档

> 生成日期：2025-12-21
> 模块版本：1.0.0
> 扫描级别：快速扫描

---

## 📦 模块概览

| 属性 | 值 |
|------|-----|
| **包名** | `@nemo-cli/file` |
| **CLI 命令** | `nf` |
| **描述** | 文件 AST 操作 CLI |
| **类型** | CLI 工具 |
| **语言** | TypeScript (ESM) |

---

## 📂 目录结构

```
packages/file/
├── bin/
│   └── index.mjs              # CLI 入口点（nf命令）
├── src/
│   ├── index.ts               # 主入口，命令注册
│   ├── constants.ts           # 常量定义
│   └── commands/
│       ├── ast/
│       │   ├── index.ts       # AST命令入口
│       │   ├── ast-handle.ts  # AST处理核心
│       │   ├── create-table.tsx   # 表格生成（React）
│       │   └── slack.ts       # Slack集成
│       ├── clean.ts           # 清理命令
│       ├── create-routes.ts   # 路由生成
│       ├── delete.ts          # 删除命令
│       └── list.ts            # 列表命令
├── dist/
├── package.json
└── rolldown.config.ts
```

---

## 🎯 CLI 命令

### 命令列表

| 命令 | 描述 |
|------|------|
| `nf ast` | AST 分析和转换 |
| `nf clean` | 清理文件 |
| `nf create-routes` | 生成路由文件 |
| `nf delete` | 删除文件 |
| `nf list` | 列出文件 |

### 使用示例

```bash
# 查看帮助
nf -h
nf <command> -h

# AST 操作
nf ast [options]

# 清理文件
nf clean

# 生成路由
nf create-routes

# 删除文件
nf delete <pattern>

# 列出文件
nf list
```

---

## 🛠️ 技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| acorn | ^8.15.0 | JavaScript AST 解析 |
| acorn-jsx | ^5.3.2 | JSX AST 支持 |
| ts-morph | ^27.0.2 | TypeScript AST 操作 |

---

## 📖 代码结构

### 入口文件

```typescript
// src/index.ts
export const init = () => {
  const program = createCommand('nf')
    .version(pkg.version)
    .description(`${pkg.name} Make file operations easier`)

  astFilesCommand(program)
  deleteFilesCommand(program)
  cleanCommand(program)
  listCommand(program)
  createRoutesCommand(program)

  return program
}

export const run = () => {
  const command = init()
  command.parse(process.argv)
}
```

---

## 📖 依赖关系

| 依赖包 | 类型 | 说明 |
|--------|------|------|
| @nemo-cli/shared | workspace | 共享工具（commander等） |
| @nemo-cli/ui | workspace | TUI组件 |

---

## 🔗 相关资源

- [acorn](https://github.com/acornjs/acorn)
- [ts-morph](https://github.com/dsherret/ts-morph)
- [AST Explorer](https://astexplorer.net)
