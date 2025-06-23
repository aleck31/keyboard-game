# 键盘打字竞速游戏

一款现代化的Web键盘打字练习游戏，集成了多种游戏模式和先进的前后端技术架构。

## 🎮 游戏特性

- 🎯 **五种游戏模式**（经典、单词、赛车追逐、植物防御、无尽模式）
- 📊 **实时统计显示**（WPM、CPM、准确率等）
- 🎵 **完整音频系统**（背景音乐和音效支持）
- 🎨 **主题切换**（暗色/亮色主题）
- 📱 **响应式设计**（支持移动端）
- 💾 **数据持久化**（本地存储+服务器端统计）
- 🏆 **成就系统**（排行榜和历史记录）
- 🚀 **Vue.js组件化**（现代前端架构）

## 🆕 最新更新 (v2)

### 🌱 **植物防御模式** - 全新游戏体验！
- ✅ **塔防玩法**: 植物vs僵尸的打字射击游戏
- ✅ **四种僵尸**: 基础、中级、强力、Boss僵尸，不同血量和单词长度
- ✅ **三种难度**: 简单(4波)、中等(7波)、困难(10波)
- ✅ **血量系统**: 植物血量机制，增加紧张感
- ✅ **智能目标**: 自动锁定最近僵尸
- ✅ **视觉特效**: 射击、击中、爆炸动画

### 🚀 **Vue.js重构** - 现代化前端架构
- ✅ **组件化设计**: 游戏控制、统计显示、赛车追逐、植物防御组件
- ✅ **响应式数据**: 自动UI更新，减少手动DOM操作
- ✅ **CDN集成**: 无需Node.js，渐进式重构
- ✅ **事件系统**: 清晰的组件通信机制

### 🐍 **Python后端集成** - 全栈架构
- ✅ **FastAPI框架**: 现代Python Web API
- ✅ **数据持久化**: 游戏统计和排行榜存储
- ✅ **RESTful API**: 标准化接口设计
- ✅ **自动文档**: Swagger UI集成
- ✅ **分析功能**: 游戏数据分析和报告

### 🏎️ **赛车追逐模式增强** - 短期优化完成！
- ✅ **AI赛车**: 三辆不同速度的AI赛车竞争
- ✅ **实时排名**: 动态排名显示和超越动画
- ✅ **60秒挑战**: 时间限制增加紧迫感
- ✅ **独立样式**: 专用CSS文件和视觉效果 🆕
- ✅ **增强组件**: 完整的游戏逻辑和统计面板 🆕
- ✅ **配置系统**: 赛车参数和难度设置 🆕

### 🔧 **重要修复**
- ✅ **暂停功能**: 修复暂停按钮无效问题
- ✅ **进度条**: 修复经典模式进度条显示
- ✅ **音频系统**: 完全修复音频控制问题
- ✅ **按钮优化**: "重新开始"改为"结束游戏"

## 🎮 游戏模式详解

### 📝 经典模式
- 输入完整的文章段落
- 适合练习连续打字和语感
- 进度条显示完成进度

### 🔤 单词模式
- 一次显示一个单词
- 完成后自动显示下一个单词
- 专注于单词拼写和准确性

### 🏎️ 赛车追逐模式
- 🏎️ 与AI赛车竞速，通过打字速度控制赛车前进
- 🚗 三辆不同速度的AI赛车：慢车(30WPM)、中速车(50WPM)、快车(70WPM)
- 🏁 60秒内尽可能超越更多赛车，获得更好名次
- 🏆 实时排名显示，超越时有特殊动画和音效
- 📊 完整的统计面板和游戏结束总结 🆕
- 🎨 专业的赛道设计和视觉效果 🆕

### 🌱 植物防御模式 (🆕)
- 🌻 **玩法**: 植物在左侧防守，通过输入单词射击右侧进攻的僵尸
- 🧟‍♂️ **僵尸类型**: 
  - 基础僵尸 (3-4字母，血量1，速度25)
  - 中级僵尸 (5-7字母，血量2，速度18)
  - 强力僵尸 (8-12字母，血量3，速度12)
  - Boss僵尸 (13+字母，血量5，速度8)
- 🌊 **波次系统**: 
  - 简单难度: 4波，基础僵尸为主
  - 中等难度: 7波，混合僵尸类型
  - 困难难度: 10波，强力僵尸占主导
- ❤️ **血量机制**: 植物初始100血量，僵尸到达时造成伤害
- 🎯 **胜负条件**: 
  - 胜利: 击败所有波次的僵尸
  - 失败: 植物血量归零

### ♾️ 无尽模式
- 持续的打字练习
- 难度逐渐递增

## 🏗️ 技术架构

### 🎨 前端技术栈
- **Vue.js 3** - 响应式UI框架 (CDN集成)
- **Vanilla JavaScript** - 游戏引擎和逻辑
- **HTML5/CSS3** - 现代化界面设计
- **Web APIs** - 音频、本地存储等

### 🐍 后端技术栈
- **FastAPI** - 现代Python Web框架
- **Pydantic** - 数据验证和序列化
- **Uvicorn** - ASGI服务器
- **JSON存储** - 轻量级数据持久化

### 🔗 集成方式
- **单一服务器**: Python FastAPI同时提供API和静态文件服务
- **RESTful API**: 前端通过HTTP请求与后端通信
- **异步处理**: 前端异步调用，不阻塞用户界面

## 🚀 快速开始

### 环境要求
- Python 3.11+
- 现代浏览器（Chrome 80+, Firefox 75+, Safari 13+, Edge 80+）
- **推荐**: [uv](https://docs.astral.sh/uv/) - 现代化的 Python 包管理工具

### 🆕 安装和启动

1. **克隆项目**
   ```bash
   git clone <repository-url>
   cd keyboard-game
   ```

2. **安装 uv**（如果尚未安装）
   ```bash
   # macOS 和 Linux
   curl -LsSf https://astral.sh/uv/install.sh | sh
   
   # Windows (PowerShell)
   powershell -c "irm https://astral.sh/uv/install.sh | iex"
   
   # 或使用包管理器
   brew install uv  # macOS
   pip install uv   # 任何平台
   ```

3. **一键启动**
   ```bash
   ./start.sh
   ```

4. **或手动使用 uv**
   ```bash
   # 安装依赖（自动创建虚拟环境）
   uv sync
   
   # 启动服务器
   uv run uvicorn main:app --host 0.0.0.0 --port 8000 --reload
   ```

### 🎮 访问游戏

启动成功后，在浏览器中访问：
   ```
   http://localhost:8000
   ```

🎮 开始你的打字冒险之旅！

## 📁 项目结构

```
keyboard-game/
├── main.py                     # FastAPI后端主文件
├── pyproject.toml              # 项目配置文件
├── start.sh                    # 启动脚本
├── index.html                  # 主页面
├── css/                        # 样式文件
│   ├── style.css              # 主样式
│   ├── themes.css             # 主题样式
│   ├── responsive.css         # 响应式样式
│   ├── vue-components.css     # Vue组件样式
│   ├── defense-mode.css       # 植物防御模式样式
│   └── racing-mode.css        # 赛车追逐模式样式
├── js/                         # JavaScript文件
│   ├── utils.js               # 工具函数
│   ├── api-client.js          # API客户端
│   ├── audio-manager.js       # 音频管理
│   ├── stats-manager.js       # 统计管理
│   ├── ui-manager.js          # UI管理
│   ├── game-engine.js         # 游戏引擎
│   ├── defense-engine.js      # 植物防御引擎
│   ├── vue-app.js             # Vue主应用
│   ├── main.js                # 主应用入口
│   └── components/            # Vue组件
│       ├── game-controls.js   # 游戏控制组件
│       ├── game-stats.js      # 统计显示组件
│       ├── racing-track.js    # 赛车追逐组件
│       └── defense-game.js    # 植物防御组件
├── data/                       # 数据文件
│   ├── texts.json             # 练习文本
│   ├── words.json             # 练习单词
│   ├── defense_words.json     # 植物防御单词
│   ├── racing_config.json     # 赛车追逐配置
│   ├── config.json            # 游戏配置
│   ├── game_stats.json        # 游戏统计
│   └── defense_stats.json     # 植物防御统计
├── assets/                  # 静态资源
├── tests                    # 测试文件
└── docs                     # 项目文档
```

## 📊 统计指标说明

### WPM (Words Per Minute)
- 每分钟输入的单词数
- 标准计算: 5个字符 = 1个单词
- 衡量整体打字速度

### CPM (Characters Per Minute)
- 每分钟输入的字符数
- 更精确的速度衡量
- 通常 CPM ≈ WPM × 5

### 准确率
- 正确输入字符数 / 总输入字符数
- 反映打字的精确度

### 植物防御专用指标
- **分数**: 击杀僵尸获得的总分数
- **波次**: 完成的波次数量
- **击杀数**: 消灭的僵尸总数
- **存活率**: 植物剩余血量百分比

## 🎮 游戏控制

### 通用控制
- **开始游戏**: 点击开始按钮或直接开始输入
- **暂停/继续**: 按 `Esc` 键或点击暂停按钮
- **结束游戏**: 点击"结束游戏"按钮
- **设置**: 点击设置图标
- **全屏**: 按 `F11` 键

### 植物防御模式控制
- **字母键 (A-Z)**: 输入目标单词的字母
- **退格键**: 删除已输入的字母
- **完成单词**: 正确输入完整单词后自动射击

## ⚙️ 自定义配置

编辑 `data/config.json` 文件来自定义游戏设置：

```json
{
  "defaultMode": "classic",
  "timeLimit": 60,
  "enableSound": true,
  "theme": "dark",
  "defenseSettings": {
    "plantHealth": 100,
    "bulletSpeed": 300,
    "spawnInterval": 2000
  }
}
```

## 📊 API接口文档

### 🔗 自动生成文档
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

### 📈 通用API
```
GET  /api/texts                      - 获取练习文本
GET  /api/words                      - 获取练习单词
POST /api/stats                      - 保存游戏统计
GET  /api/stats                      - 获取游戏统计
GET  /api/leaderboard                - 获取排行榜
GET  /api/analytics                  - 获取游戏分析数据
```

### 🌱 植物防御模式API
```
GET  /api/defense/words              - 获取植物防御单词库
POST /api/defense/wave               - 生成波次配置
GET  /api/defense/config/{difficulty} - 获取难度配置
POST /api/defense/stats              - 保存植物防御统计
GET  /api/defense/stats              - 获取植物防御统计
GET  /api/defense/leaderboard        - 获取植物防御排行榜
```

## 🔧 开发和调试

### 开发模式启动
```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

### 查看日志
- 浏览器开发者工具 Console
- Python服务器终端输出

### API测试
- 访问 http://localhost:8000/docs 进行API测试
- 使用测试页面验证功能

## 📈 性能优化

### 前端优化
- Vue.js组件化减少DOM操作
- 异步API调用避免阻塞
- 音频预加载和缓存
- 响应式设计优化移动端体验

### 后端优化
- FastAPI异步处理
- JSON文件缓存
- 静态文件压缩
- API响应优化

## 📄 许可证

MIT License
