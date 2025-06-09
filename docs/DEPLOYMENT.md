# 键盘打字竞速游戏 - 部署指南

## 🚀 快速启动

### 方法1: 使用启动脚本 (推荐)
```bash
./start.sh
```

### 方法2: 手动启动
```bash
# 1. 创建虚拟环境
python3 -m venv venv

# 2. 激活虚拟环境
source venv/bin/activate

# 3. 安装依赖
pip install -r requirements.txt

# 4. 启动服务器
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

## 📍 访问地址

- **游戏主页**: http://localhost:8000
- **测试页面**: http://localhost:8000/test.html
- **API文档**: http://localhost:8000/docs
- **ReDoc文档**: http://localhost:8000/redoc

## 🧪 测试步骤

1. 启动服务器后，首先访问测试页面: http://localhost:8000/test.html
2. 运行所有测试确保功能正常
3. 如果测试通过，访问主游戏页面: http://localhost:8000

## 📁 项目结构

```
keyboard-game/
├── main.py                 # FastAPI后端入口
├── requirements.txt        # Python依赖
├── start.sh               # 启动脚本
├── index.html             # 游戏主页面
├── css/                   # 样式文件
│   ├── style.css         # 主样式
│   ├── themes.css        # 主题样式
│   └── responsive.css    # 响应式样式
├── js/                    # JavaScript文件
│   ├── main.js           # 主入口
│   ├── game-engine.js    # 游戏引擎
│   ├── audio-manager.js  # 音频管理
│   ├── stats-manager.js  # 统计管理
│   ├── ui-manager.js     # UI管理
│   └── utils.js          # 工具函数
├── data/                  # 游戏数据
│   ├── texts.json        # 练习文本
│   ├── words.json        # 单词库
│   └── config.json       # 配置文件
├── assets/                # 静态资源
│   ├── audio/            # 音频文件
│   ├── images/           # 图片资源
│   └── fonts/            # 字体文件
├── tests               # 测试文件
└── venv/                  # Python虚拟环境
```

## 🔧 配置选项

### 服务器配置
- **端口**: 默认8000，可在启动时修改
- **主机**: 默认0.0.0.0，允许外部访问
- **重载**: 开发模式下自动重载

### 游戏配置 (data/config.json)
```json
{
  "defaultMode": "classic",
  "timeLimit": 60,
  "enableSound": true,
  "theme": "dark",
  "difficulty": "normal"
}
```

## 🌐 生产环境部署

### 使用Nginx反向代理
```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### 使用Docker部署
```dockerfile
FROM python:3.11-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .
EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### 使用Systemd服务
```ini
[Unit]
Description=Typing Game
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/path/to/keyboard-game
Environment=PATH=/path/to/keyboard-game/venv/bin
ExecStart=/path/to/keyboard-game/venv/bin/uvicorn main:app --host 0.0.0.0 --port 8000
Restart=always

[Install]
WantedBy=multi-user.target
```

## 📊 性能优化

### 前端优化
- 启用Gzip压缩
- 使用CDN加速字体加载
- 压缩CSS和JavaScript文件
- 启用浏览器缓存

### 后端优化
- 使用Gunicorn多进程部署
- 配置数据库连接池
- 启用API响应缓存
- 监控内存使用情况

## 🔍 故障排除

### 常见问题

1. **端口被占用**
   ```bash
   # 查找占用端口的进程
   lsof -i :8000
   # 杀死进程
   kill -9 <PID>
   ```

2. **Python依赖安装失败**
   ```bash
   # 升级pip
   pip install --upgrade pip
   # 清除缓存
   pip cache purge
   ```

3. **音频不工作**
   - 检查浏览器是否支持Web Audio API
   - 确保用户已与页面交互（点击等）
   - 检查浏览器音频权限设置

4. **游戏数据丢失**
   - 检查localStorage是否被清除
   - 确认浏览器支持本地存储
   - 查看浏览器控制台错误信息

### 日志查看
```bash
# 查看服务器日志
tail -f /var/log/typing-game.log

# 查看系统日志
journalctl -u typing-game -f
```

## 🔒 安全考虑

- 使用HTTPS加密传输
- 设置适当的CORS策略
- 限制API请求频率
- 定期更新依赖包
- 监控异常访问

## 📈 监控和分析

### 性能监控
- 响应时间监控
- 内存使用监控
- CPU使用率监控
- 错误率统计

### 用户分析
- 游戏完成率
- 平均WPM统计
- 用户留存率
- 功能使用情况

## 🆘 支持和维护

### 备份策略
- 定期备份用户数据
- 备份配置文件
- 版本控制代码

### 更新流程
1. 测试新版本
2. 备份当前版本
3. 部署新版本
4. 验证功能正常
5. 监控系统状态

---

**最后更新**: 2025-06-08
**版本**: v1.0.0
