/**
 * 统一错误处理系统
 * 提供统一的错误处理、日志记录和用户提示
 */

class GameError extends Error {
    constructor(message, code, context = {}) {
        super(message);
        this.name = 'GameError';
        this.code = code;
        this.context = context;
        this.timestamp = new Date().toISOString();
    }
}

class ErrorHandler {
    constructor() {
        this.errors = [];
        this.maxErrors = 100; // 最多保存100个错误
        this.isDebugMode = this.checkDebugMode();
        
        // 绑定全局错误处理
        this.bindGlobalHandlers();
        
        console.log('🛡️ ErrorHandler 初始化完成');
    }
    
    /**
     * 检查是否为调试模式
     */
    checkDebugMode() {
        return window.location.hostname === 'localhost' || 
               window.location.hostname === '127.0.0.1' ||
               localStorage.getItem('debug') === 'true';
    }
    
    /**
     * 绑定全局错误处理器
     */
    bindGlobalHandlers() {
        // JavaScript 错误
        window.addEventListener('error', (event) => {
            this.handleError(new GameError(
                event.message,
                'JAVASCRIPT_ERROR',
                {
                    filename: event.filename,
                    lineno: event.lineno,
                    colno: event.colno,
                    stack: event.error?.stack
                }
            ));
        });
        
        // Promise 拒绝
        window.addEventListener('unhandledrejection', (event) => {
            this.handleError(new GameError(
                event.reason?.message || 'Unhandled Promise Rejection',
                'PROMISE_REJECTION',
                {
                    reason: event.reason,
                    stack: event.reason?.stack
                }
            ));
        });
        
        // Vue 错误处理（如果 Vue 可用）
        if (window.Vue && window.Vue.config) {
            window.Vue.config.errorHandler = (err, vm, info) => {
                this.handleError(new GameError(
                    err.message,
                    'VUE_ERROR',
                    {
                        componentInfo: info,
                        stack: err.stack,
                        vm: vm?.$options?.name || 'Unknown Component'
                    }
                ));
            };
        }
    }
    
    /**
     * 处理错误
     */
    handleError(error, showToUser = true) {
        // 记录错误
        this.logError(error);
        
        // 存储错误
        this.storeError(error);
        
        // 显示给用户（如果需要）
        if (showToUser) {
            this.showErrorToUser(error);
        }
        
        // 上报错误（生产环境）
        if (!this.isDebugMode) {
            this.reportError(error);
        }
        
        // 触发错误事件
        if (window.gameStore) {
            window.gameStore.emit('error', error);
        }
    }
    
    /**
     * 记录错误到控制台
     */
    logError(error) {
        const errorInfo = {
            message: error.message,
            code: error.code,
            context: error.context,
            timestamp: error.timestamp,
            stack: error.stack
        };
        
        if (this.isDebugMode) {
            console.group('🚨 Game Error');
            console.error('Message:', error.message);
            console.error('Code:', error.code);
            console.error('Context:', error.context);
            console.error('Stack:', error.stack);
            console.groupEnd();
        } else {
            console.error('Game Error:', errorInfo);
        }
    }
    
    /**
     * 存储错误
     */
    storeError(error) {
        this.errors.push({
            message: error.message,
            code: error.code,
            context: error.context,
            timestamp: error.timestamp,
            stack: error.stack
        });
        
        // 限制错误数量
        if (this.errors.length > this.maxErrors) {
            this.errors.shift();
        }
        
        // 保存到本地存储（调试模式）
        if (this.isDebugMode) {
            try {
                localStorage.setItem('gameErrors', JSON.stringify(this.errors.slice(-10)));
            } catch (e) {
                // 忽略存储错误
            }
        }
    }
    
    /**
     * 显示错误给用户
     */
    showErrorToUser(error) {
        const userMessage = this.getUserFriendlyMessage(error);
        
        // 使用游戏的通知系统
        if (window.gameStore) {
            window.gameStore.actions.showNotification(userMessage, 'error');
        } else {
            // 降级到原生提示
            this.showNativeNotification(userMessage, 'error');
        }
    }
    
    /**
     * 获取用户友好的错误消息
     */
    getUserFriendlyMessage(error) {
        const errorMessages = {
            'NETWORK_ERROR': '网络连接出现问题，请检查网络连接',
            'API_ERROR': '服务器响应异常，请稍后重试',
            'GAME_ENGINE_ERROR': '游戏引擎出现问题，请刷新页面',
            'AUDIO_ERROR': '音频播放出现问题，请检查音频设置',
            'STORAGE_ERROR': '数据保存失败，请检查浏览器设置',
            'VALIDATION_ERROR': '输入数据格式不正确',
            'JAVASCRIPT_ERROR': '页面脚本出现错误，请刷新页面',
            'VUE_ERROR': '界面组件出现错误，请刷新页面',
            'PROMISE_REJECTION': '异步操作失败，请重试'
        };
        
        return errorMessages[error.code] || '出现未知错误，请刷新页面重试';
    }
    
    /**
     * 显示原生通知
     */
    showNativeNotification(message, type) {
        // 创建通知元素
        const notification = document.createElement('div');
        notification.className = `error-notification error-${type}`;
        notification.innerHTML = `
            <div class="error-content">
                <span class="error-icon">${type === 'error' ? '❌' : '⚠️'}</span>
                <span class="error-message">${message}</span>
                <button class="error-close" onclick="this.parentElement.parentElement.remove()">×</button>
            </div>
        `;
        
        // 添加样式
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'error' ? '#f44336' : '#ff9800'};
            color: white;
            padding: 12px 16px;
            border-radius: 4px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
            z-index: 10000;
            max-width: 400px;
            animation: slideIn 0.3s ease-out;
        `;
        
        // 添加到页面
        document.body.appendChild(notification);
        
        // 自动移除
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 5000);
    }
    
    /**
     * 上报错误到服务器
     */
    async reportError(error) {
        try {
            await fetch('/api/errors', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    message: error.message,
                    code: error.code,
                    context: error.context,
                    timestamp: error.timestamp,
                    userAgent: navigator.userAgent,
                    url: window.location.href
                })
            });
        } catch (e) {
            // 忽略上报失败
            console.warn('Failed to report error:', e);
        }
    }
    
    /**
     * 创建特定类型的错误
     */
    createError(type, message, context = {}) {
        const errorCodes = {
            network: 'NETWORK_ERROR',
            api: 'API_ERROR',
            game: 'GAME_ENGINE_ERROR',
            audio: 'AUDIO_ERROR',
            storage: 'STORAGE_ERROR',
            validation: 'VALIDATION_ERROR'
        };
        
        return new GameError(message, errorCodes[type] || 'UNKNOWN_ERROR', context);
    }
    
    /**
     * 包装异步函数以处理错误
     */
    wrapAsync(fn, context = {}) {
        return async (...args) => {
            try {
                return await fn(...args);
            } catch (error) {
                this.handleError(new GameError(
                    error.message,
                    'ASYNC_ERROR',
                    { ...context, originalError: error }
                ));
                throw error;
            }
        };
    }
    
    /**
     * 包装同步函数以处理错误
     */
    wrapSync(fn, context = {}) {
        return (...args) => {
            try {
                return fn(...args);
            } catch (error) {
                this.handleError(new GameError(
                    error.message,
                    'SYNC_ERROR',
                    { ...context, originalError: error }
                ));
                throw error;
            }
        };
    }
    
    /**
     * 获取错误历史
     */
    getErrorHistory() {
        return [...this.errors];
    }
    
    /**
     * 清除错误历史
     */
    clearErrorHistory() {
        this.errors = [];
        if (this.isDebugMode) {
            localStorage.removeItem('gameErrors');
        }
    }
    
    /**
     * 调试方法
     */
    debug() {
        console.log('🛡️ ErrorHandler Status:');
        console.log('- Debug Mode:', this.isDebugMode);
        console.log('- Error Count:', this.errors.length);
        console.log('- Recent Errors:', this.errors.slice(-5));
    }
}

// 创建全局实例
window.errorHandler = new ErrorHandler();

// 导出供其他模块使用
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ErrorHandler, GameError };
}

// 添加 CSS 动画
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    .error-notification {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
    
    .error-content {
        display: flex;
        align-items: center;
        gap: 8px;
    }
    
    .error-close {
        background: none;
        border: none;
        color: white;
        font-size: 18px;
        cursor: pointer;
        padding: 0;
        margin-left: auto;
    }
    
    .error-close:hover {
        opacity: 0.8;
    }
`;
document.head.appendChild(style);
