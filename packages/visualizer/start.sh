#!/bin/bash
# Visualizer 启动脚本

echo "🚀 启动 ND AI 依赖关系可视化工具..."

# 检查是否在正确的目录
if [ ! -f "package.json" ]; then
    echo "❌ 错误: 请在 packages/visualizer 目录下运行此脚本"
    exit 1
fi

# 检查 node_modules
if [ ! -d "node_modules" ]; then
    echo "📦 首次运行,正在安装依赖..."
    pnpm install
fi

# 启动开发服务器
echo "📡 启动开发服务器在 http://localhost:3000"
pnpm run dev
