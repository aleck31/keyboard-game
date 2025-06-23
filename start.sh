#!/bin/bash

echo "🚀 启动键盘打字竞速游戏服务器..."

# 检查 uv 是否安装
if ! command -v uv &> /dev/null; then
    echo "❌ uv 未安装，请先安装 uv:"
    echo "   curl -LsSf https://astral.sh/uv/install.sh | sh"
    exit 1
fi

# 安装依赖
echo "📦 安装依赖..."
uv sync

# 启动服务器
echo "🎮 启动游戏服务器..."
uv run uvicorn main:app --host 0.0.0.0 --port 8000 --reload

echo "✅ 服务器已启动！"
echo "🌐 游戏地址: http://localhost:8000"
echo "📊 API文档: http://localhost:8000/docs"
echo "🛑 按 Ctrl+C 停止服务器"
echo ""