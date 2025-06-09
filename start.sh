#!/bin/bash

# 键盘打字竞速游戏启动脚本

echo "🎮 启动键盘打字竞速游戏..."

# 检查虚拟环境
if [ ! -d "venv" ]; then
    echo "📦 创建虚拟环境..."
    python3 -m venv venv
fi

# 激活虚拟环境
source venv/bin/activate

# 安装依赖
echo "📋 检查依赖..."
pip install -r requirements.txt > /dev/null 2>&1

# 启动服务器
echo "🚀 启动服务器..."
echo "📍 游戏地址: http://localhost:8000"
echo "📖 API文档: http://localhost:8000/docs"
echo "🛑 按 Ctrl+C 停止服务器"
echo ""

uvicorn main:app --host 0.0.0.0 --port 8000 --reload
