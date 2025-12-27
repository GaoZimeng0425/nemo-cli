# @nemo-cli/package 模块文档

> 生成日期：2025-12-21
> 模块版本：0.0.1
> 扫描级别：快速扫描

---

## 📦 模块概览

| 属性 | 值 |
|------|-----|
| **包名** | `@nemo-cli/package` |
| **CLI 命令** | `np` |
| **描述** | pnpm 工作区管理 CLI |
| **类型** | CLI 工具 |
| **语言** | TypeScript (ESM) |
| **Node 版本要求** | `^20.19.0 \|\| >=22.12.0` |

---

## 📂 目录结构

```
packages/package/
├── bin/
│   └── index.mjs              # CLI 入口点（np命令）
├── src/
│   ├── index.ts               # 主入口，命令注册
│   ├── constants.ts           # 常量定义
│   └── commands/
│       ├── add.ts             # 添加依赖
│       ├── clean.ts           # 清理依赖
│       ├── list.ts            # 列表依赖
│       ├── remove.ts          # 移除依赖
│       └── upgrade.ts         # 升级依赖
├── dist/
├── package.json
└── rolldown.config.ts
```

---

## 🎯 CLI 命令

### 命令列表

| 命令 | 描述 |
|------|------|
| `np add` | 添加依赖到工作区 |
| `np remove` | 从工作区移除依赖 |
| `np upgrade` | 升级依赖版本 |
| `np list` | 列出工作区包 |
| `np clean` | 清理依赖（node_modules等） |

### 使用示例

```bash
# 查看帮助
np -h
np <command> -h

# 添加依赖
np add <package>

# 移除依赖
np remove <package>

# 升级依赖
np upgrade

# 列出工作区包
np list

# 清理依赖
np clean
```

---

## 📖 代码结构

### 入口文件

```typescript
// src/index.ts
export const init = () => {
  const command = createCommand('np')
    .version(pkg.version)
    .description(`${pkg.name} CLI helper for pnpm workspaces`)

  addCommand(command)
  upgradeCommand(command)
  removeCommand(command)
  listCommand(command)
  cleanCommand(command)

  return command
}

export const run = () => {
  const command = init()
  command.parse(process.argv)
}
```

---

## 🛠️ 技术栈

使用 @nemo-cli/shared 提供的工具：
- Commander.js（CLI框架）
- execa（命令执行）
- @clack/prompts（交互式提示）

---

## 📖 依赖关系

| 依赖包 | 类型 | 说明 |
|--------|------|------|
| @nemo-cli/shared | workspace | 共享工具 |
| @nemo-cli/ui | workspace | TUI组件 |

---

## 🔗 相关资源

- [pnpm Workspaces](https://pnpm.io/workspaces)
- [pnpm CLI](https://pnpm.io/cli/add)
