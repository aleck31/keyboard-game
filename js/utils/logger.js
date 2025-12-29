/**
 * 日志管理器 - 统一控制台日志输出
 * 支持日志级别控制，减少生产环境的日志污染
 */

class Logger {
    constructor() {
        // 日志级别: 0=关闭, 1=错误, 2=警告, 3=信息, 4=调试
        this.level = this.getLogLevel();
        this.prefix = '🎮';
    }
    
    /**
     * 从localStorage获取日志级别
     */
    getLogLevel() {
        const saved = localStorage.getItem('gameLogLevel');
        if (saved !== null) {
            return parseInt(saved);
        }
        // 默认: 开发环境显示所有，生产环境只显示错误和警告
        return window.location.hostname === 'localhost' ? 4 : 2;
    }
    
    /**
     * 设置日志级别
     */
    setLevel(level) {
        this.level = level;
        localStorage.setItem('gameLogLevel', level.toString());
        console.log(`${this.prefix} 日志级别已设置为: ${this.getLevelName(level)}`);
    }
    
    /**
     * 获取级别名称
     */
    getLevelName(level) {
        const names = ['关闭', '错误', '警告', '信息', '调试'];
        return names[level] || '未知';
    }
    
    /**
     * 错误日志 (级别1)
     */
    error(...args) {
        if (this.level >= 1) {
            console.error(`${this.prefix} ❌`, ...args);
        }
    }
    
    /**
     * 警告日志 (级别2)
     */
    warn(...args) {
        if (this.level >= 2) {
            console.warn(`${this.prefix} ⚠️`, ...args);
        }
    }
    
    /**
     * 信息日志 (级别3)
     */
    info(...args) {
        if (this.level >= 3) {
            console.log(`${this.prefix} ℹ️`, ...args);
        }
    }
    
    /**
     * 调试日志 (级别4)
     */
    debug(...args) {
        if (this.level >= 4) {
            console.log(`${this.prefix} 🔍`, ...args);
        }
    }
    
    /**
     * 成功日志 (级别3)
     */
    success(...args) {
        if (this.level >= 3) {
            console.log(`${this.prefix} ✅`, ...args);
        }
    }
    
    /**
     * 分组日志
     */
    group(title, callback) {
        if (this.level >= 3) {
            console.group(`${this.prefix} ${title}`);
            callback();
            console.groupEnd();
        }
    }
}

// 创建全局实例
window.logger = new Logger();

// 开发者工具
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    window.setLogLevel = (level) => window.logger.setLevel(level);
    console.log('🛠️ 日志控制: window.setLogLevel(0-4)');
    console.log('   0=关闭, 1=错误, 2=警告, 3=信息, 4=调试');
    console.log(`   当前级别: ${window.logger.getLevelName(window.logger.level)}`);
}
