# 键盘打字竞速游戏

一款现代化的Web键盘打字练习游戏，支持多种游戏模式。

## 🎮 游戏特性

- 🎯 **四种游戏模式**（经典模式、单词模式、赛车追逐、植物防御）
- 📊 **实时统计显示**（WPM、CPM、准确率等）
- 🎵 **音频系统**（背景音乐和音效）
- 🎨 **主题切换**（暗色/亮色主题）
- 📱 **响应式设计**（支持移动端）
- 🏆 **成就系统**（排行榜和历史记录）

## 🚀 快速开始

### 环境要求
- Python 3.11+
- 现代浏览器
- [uv](https://docs.astral.sh/uv/) (推荐)

### 安装和启动

1. **克隆项目**
   ```bash
   git clone <repository-url>
   cd keyboard-game
   ```

2. **一键启动**
   ```bash
   ./start.sh
   ```

3. **访问游戏**
   ```
   http://localhost:8000
   ```

## 🏗️ 技术架构

- **前端**: Vue.js 3 + Vanilla JavaScript
- **后端**: FastAPI + Python
- **存储**: JSON 文件
- **工具**: uv 包管理器

## 🔧 开发

```bash
# 开发模式
uv run uvicorn main:app --reload

# 运行测试
uv run tests/test_api.py

# API文档
http://localhost:8000/docs
```

## 📄 许可证

MIT License
