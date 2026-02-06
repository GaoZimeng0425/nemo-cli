# @nemo-cli/git 命令参考手册

> 生成日期：2025-11-26

---

## 全局选项

```bash
ng --version, -V    # 显示版本号
ng --help, -h       # 显示帮助信息
ng <command> -h     # 显示子命令帮助
```

---

## 1. commit - 交互式提交

创建符合 Conventional Commits 规范的提交。

### 用法

```bash
ng commit
```

### 流程

1. **显示当前分支**
2. **获取文件状态**
   - 显示已暂存文件（绿色）
   - 可选择暂存未跟踪文件
3. **运行 lint-staged**（如果配置）
4. **选择提交类型** - 从 commitlint.config 读取
5. **选择提交范围** - 可选
6. **输入提交标题** - 限制 80 字符
7. **输入详细描述** - 可选
8. **自动提取 Ticket** - 从分支名匹配
9. **预览提交信息**
10. **确认并提交**
11. **可选推送到远程**

### 提交类型

| 类型 | Emoji | 说明 |
|------|-------|------|
| `feat` | 🌟 | 新功能 |
| `fix` | 🐛 | Bug 修复 |
| `docs` | 📚 | 文档变更 |
| `refactor` | 🔨 | 代码重构 |
| `perf` | 🚀 | 性能优化 |
| `test` | 🚨 | 测试相关 |
| `build` | 🚧 | 构建相关 |
| `ci` | 🤖 | CI 配置 |
| `chore` | 🧹 | 杂项变更 |
| `revert` | 🔙 | 回滚提交 |

### Ticket 自动提取

从分支名自动识别 Ticket 号：

| 分支名格式 | 提取结果 |
|-----------|---------|
| `feature/PRIME-1500` | `PRIME-1500` |
| `PRIME-1500-feature` | `PRIME-1500` |
| `PRIME-ABC_feature` | `PRIME-ABC` |
| `feature/1500` | `1500` |
| `1500-feature` | `1500` |

### 自定义配置

在项目根目录创建 `commitlint.config.js`：

```javascript
export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [2, 'always', ['feat', 'fix', 'docs', 'style', 'refactor', 'perf', 'test', 'build', 'ci', 'chore', 'revert']],
    'scope-enum': [1, 'always', ['app', 'shared', 'server', 'tools', '']],
  }
}
```

---

## 2. pull - 拉取远程分支

### 用法

```bash
ng pull
ng pl        # 别名
```

### 功能

1. 显示远程分支列表（按提交时间排序）
2. 默认选中当前分支
3. **自动 Stash**：拉取前暂存本地更改
4. 执行 `git pull origin <branch>`
5. **合并提交检测**：如果发生合并，提示自定义合并信息
6. **自动 Pop**：拉取后恢复暂存内容

### 合并提交处理

当检测到合并提交时：

- 提示是否自定义合并信息
- 打开系统编辑器（`$EDITOR` 或 `vim`）
- 保存后使用编辑后的消息提交

---

## 3. push - 推送到远程

### 用法

```bash
ng push
ng ps        # 别名
```

### 功能

1. 获取当前分支名
2. 确认推送当前分支
3. 如果取消，可选择其他分支推送
4. 执行 `git push origin <branch>`
5. 显示推送进度

---

## 4. checkout - 分支切换

### 用法

```bash
ng checkout [options]
ng co [options]    # 别名
```

### 选项

| 选项 | 说明 |
|------|------|
| `-l, --local` | 切换到本地分支（默认） |
| `-r, --remote` | 切换到远程分支 |
| `-b, --branch [name]` | 创建新分支 |

### 示例

```bash
# 交互式选择本地分支
ng co
ng co -l

# 交互式选择远程分支
ng co -r

# 创建新分支（直接指定名称）
ng co -b feature/new-feature

# 创建新分支（交互式）
ng co -b
# → 选择分支类型: feature/PRIME-, feature/, bugfix/
# → 输入分支名后缀
```

### 特性

- **自动 Stash**：切换前自动暂存未提交更改（以目标分支名命名）
- **自动 Pop**：切换后自动恢复暂存内容
- **远程分支追踪**：切换远程分支时自动创建本地跟踪分支

### 分支类型模板

创建新分支时的预设模板：

- `feature/PRIME-` - 功能开发（JIRA Ticket）
- `feature/` - 功能开发
- `bugfix/` - Bug 修复

---

## 5. branch - 分支管理

### 5.1 branch delete - 删除分支

```bash
ng branch delete [options]
```

| 选项 | 说明 |
|------|------|
| `-r, --remote` | 删除远程分支 |

#### 功能

1. 获取本地/远程分支列表
2. 检查每个分支是否已合并到 main
3. 显示合并状态和最后提交时间
4. 多选要删除的分支
5. 未合并分支删除前需确认
6. 批量删除

#### 示例

```bash
# 删除本地分支
ng branch delete

# 删除远程分支
ng branch delete -r
```

### 5.2 branch clean - 清理已合并分支

```bash
ng branch clean
```

#### 功能

1. 选择时间范围（全部/1月/3月/1年）
2. 获取本地分支列表
3. 检查每个分支是否已合并到 main
4. 按最后提交时间过滤
5. 显示待删除分支列表
6. 确认后批量删除

#### 排除分支

以下分支不会被清理：

- `main`
- `master`
- `develop`

---

## 6. list - 列出分支

### 用法

```bash
ng branch list [options]
ng branch ls [options]    # 别名
```

### 选项

| 选项 | 说明 |
|------|------|
| `-l, --local` | 仅列出本地分支 |
| `-r, --remote` | 仅列出远程分支 |
| `-a, --all` | 列出所有分支（默认） |

### 示例

```bash
# 列出所有分支
ng branch list
ng branch ls -a

# 仅本地分支
ng branch ls -l

# 仅远程分支
ng branch ls -r
```

### 输出格式

```
Local 5 branches
   main  (current)
   feature/login
   feature/dashboard
   bugfix/header

Remote 10 branches
   main
   develop
   feature/api
   ...
```

---

## 7. diff - 查看差异

### 用法

```bash
ng diff [options]
ng di [options]    # 别名
```

### 选项

| 选项 | 说明 |
|------|------|
| `-l, --local` | 与本地分支对比（默认） |
| `-r, --remote` | 与远程分支对比 |

### 功能

1. 获取本地/远程分支列表
2. 选择要对比的分支
3. 如果选择当前分支，显示工作区与 HEAD 的差异
4. 否则显示选中分支与当前分支的差异

### 示例

```bash
# 与本地分支对比
ng diff
ng di -l

# 与远程分支对比
ng di -r
```

---

## 8. merge - 合并分支

### 用法

```bash
ng merge [branch] [options]
ng mg [branch] [options]    # 别名
```

### 选项

| 选项 | 说明 |
|------|------|
| `-l, --local` | 合并本地分支 |
| `-r, --remote` | 合并远程分支 |
| `-b, --branch <branch>` | 指定要合并的分支 |

### 示例

```bash
# 直接指定分支
ng merge feature/login
ng mg main

# 交互式选择本地分支
ng mg -l

# 交互式选择远程分支
ng mg -r
```

### 特性

- **自动 Stash**：合并前自动暂存未提交更改
- **交互式合并**：使用 `stdio: 'inherit'` 支持交互式合并确认
- **自动 Pop**：合并后自动恢复暂存内容

---

## 9. stash - 暂存管理

### 用法

```bash
ng stash <command>
ng st <command>    # 别名
```

### 子命令

| 命令 | 别名 | 说明 |
|------|------|------|
| `save [message]` | `s` | 保存当前更改到 stash |
| `list` | `ls`, `l` | 列出所有 stash |
| `pop` | `p` | 弹出最近的 stash |
| `drop` | `clear`, `d` | 删除 stash |

### 示例

```bash
# 保存 stash
ng stash save "work in progress"
ng st s "WIP"

# 列出 stash
ng stash list
ng st ls

# 弹出 stash（交互式选择）
ng stash pop
ng st p

# 删除 stash
ng stash drop    # 可选择单个或全部删除
ng st d
```

### 特性

- **自动命名**：不指定消息时，使用 `NEMO-CLI-STASH:{timestamp}` 格式
- **交互式选择**：pop 和 drop 支持选择具体的 stash
- **批量清除**：drop 支持清除所有 stash

---

## 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `EDITOR` | 编辑合并提交信息的编辑器 | `vim` |
| `VISUAL` | 备用编辑器 | - |

---

## 退出码

| 码 | 说明 |
|----|------|
| 0 | 成功 |
| 1 | 一般错误 |
| 非0 | Git 命令执行失败的退出码 |
