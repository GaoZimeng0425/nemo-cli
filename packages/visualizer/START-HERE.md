# 🎯 快速启动指南

## 问题: pnpm 构建失败

如果你遇到 `@nemo-cli/shared build: Failed` 错误,这是因为 workspace 中其他包的构建问题。

## ✅ 解决方案: 直接运行 Visualizer

Visualizer 包已经**成功构建**,可以直接运行!

### 方法 1: 直接运行开发服务器 (推荐)

```bash
# 进入 visualizer 目录
cd /Users/aa00930/Documents/Learn/nemo-cli/packages/visualizer

# 启动开发服务器
pnpm run dev
```

然后访问: http://localhost:3000

### 方法 2: 使用启动脚本

```bash
cd /Users/aa00930/Documents/Learn/nemo-cli/packages/visualizer
./start.sh
```

### 方法 3: 预览生产构建

```bash
cd /Users/aa00930/Documents/Learn/nemo-cli/packages/visualizer

# 构建生产版本
pnpm run build

# 预览
pnpm run preview
```

## 📝 使用步骤

1. **启动服务器**
   ```bash
   cd packages/visualizer
   pnpm run dev
   ```

2. **生成测试数据** (在你的 Next.js 项目中)
   ```bash
   nd analyze --format ai
   ```

3. **加载数据**
   - 打开 http://localhost:3000
   - 拖拽或选择 `ai-docs/deps.ai.json` 文件

4. **开始探索!**
   - 🔍 搜索节点
   - 🎨 过滤 scope
   - 📄 查看页面视图
   - 🔁 查看循环依赖

## ⚠️ 关于 Workspace 构建错误

`@nemo-cli/shared` 的构建错误**不影响** Visualizer 的使用,因为:

1. ✅ Visualizer 包已独立构建成功
2. ✅ 所有依赖已正确安装
3. ✅ 可以直接运行开发服务器
4. ✅ 功能完全可用

如果需要修复整个 workspace 的构建问题,可以单独处理 shared 包,但这不是必需的。

## 🎉 Visualizer 已可用!

现在就可以开始使用可视化工具了!
