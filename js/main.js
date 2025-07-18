/**
 * 主入口文件
 * 只保留必要的初始化和Vue应用启动
 */

class GameAppController {
    constructor() {
        this.isInitialized = false;
        this.init();
    }
    
    async init() {
        try {
            console.log('🎮 键盘打字竞速游戏启动中...');
            
            // 等待DOM加载完成
            if (document.readyState === 'loading') {
                await new Promise(resolve => {
                    document.addEventListener('DOMContentLoaded', resolve);
                });
            }
            
            // 初始化Vue应用
            this.initVueApp();
            
            // 设置性能监控
            this.setupPerformanceMonitoring();
            
            // 绑定必要的全局事件
            this.bindGlobalEvents();
            
            this.isInitialized = true;
            console.log('✅ 游戏初始化完成');
            
            // 显示欢迎信息
            this.showWelcomeMessage();
            
        } catch (error) {
            console.error('❌ 游戏初始化失败:', error);
            this.showErrorMessage('游戏初始化失败，请刷新页面重试');
        }
    }
    
    // 初始化Vue应用
    initVueApp() {
        if (typeof window.initVueApp === 'function') {
            window.initVueApp();
        } else {
            console.error('Vue应用初始化函数未找到');
        }
    }
    
    // 设置性能监控
    setupPerformanceMonitoring() {
        if (Utils && Utils.Performance) {
            // 监控FPS
            Utils.Performance.monitorFPS((fps) => {
                if (fps < 30) {
                    console.warn(`⚠️ 低FPS检测: ${fps}`);
                }
            });
            
            // 标记初始化完成时间
            Utils.Performance.mark('gameInitialized');
        }
    }
    
    // 绑定必要的全局事件
    bindGlobalEvents() {
        // 页面卸载前的提示
        window.addEventListener('beforeunload', (e) => {
            // 检查是否有游戏正在进行
            const vueApp = document.querySelector('#vue-app').__vue_app__;
            if (vueApp && vueApp._instance) {
                const gameState = vueApp._instance.ctx.gameState;
                if (gameState && gameState.isPlaying) {
                    e.preventDefault();
                    e.returnValue = '游戏正在进行中，确定要离开吗？';
                    return e.returnValue;
                }
            }
        });
        
        // 鼠标点击 - 用于恢复音频上下文
        document.addEventListener('click', () => {
            if (window.audioManager) {
                window.audioManager.resumeAudioContext();
            }
        }, { once: true });
    }
    
    // 显示欢迎信息
    showWelcomeMessage() {
        // 使用GameStore显示通知
        setTimeout(() => {
            if (window.gameStore) {
                window.gameStore.actions.showNotification(
                    '欢迎来到键盘打字竞速游戏！选择模式开始练习吧 🎮',
                    'info'
                );
            } else {
                // 后备方法：使用自定义事件
                const event = new CustomEvent('app-notification', {
                    detail: {
                        message: '欢迎来到键盘打字竞速游戏！选择模式开始练习吧 🎮',
                        type: 'info'
                    }
                });
                document.dispatchEvent(event);
            }
        }, 1000);
        
        // 检查是否是首次访问
        const isFirstVisit = !Utils.Storage.get('hasVisited');
        if (isFirstVisit) {
            Utils.Storage.set('hasVisited', true);
            this.showTutorial();
        }
    }
    
    // 显示教程
    showTutorial() {
        const tutorialSteps = [
            '🎯 选择游戏模式开始练习',
            '⌨️ 直接开始输入或点击开始按钮',
            '📊 实时查看你的WPM和准确率',
            '🎵 可以在设置中调整音频选项',
            '🏆 完成游戏解锁成就！'
        ];
        
        let currentStep = 0;
        
        const showNextStep = () => {
            if (currentStep < tutorialSteps.length) {
                if (window.gameStore) {
                    window.gameStore.actions.showNotification(
                        tutorialSteps[currentStep],
                        'info'
                    );
                } else {
                    const event = new CustomEvent('app-notification', {
                        detail: {
                            message: tutorialSteps[currentStep],
                            type: 'info'
                        }
                    });
                    document.dispatchEvent(event);
                }
                currentStep++;
                setTimeout(showNextStep, 3500);
            }
        };
        
        setTimeout(showNextStep, 3000);
    }
    
    // 显示错误信息
    showErrorMessage(message) {
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: #f44336;
            color: white;
            padding: 20px;
            border-radius: 8px;
            z-index: 10000;
            text-align: center;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        `;
        errorDiv.innerHTML = `
            <h3>❌ 初始化失败</h3>
            <p>${message}</p>
            <button onclick="window.location.reload()" style="
                background: white;
                color: #f44336;
                border: none;
                padding: 8px 16px;
                border-radius: 4px;
                cursor: pointer;
                margin-top: 10px;
            ">刷新页面</button>
        `;
        document.body.appendChild(errorDiv);
    }
    
    // 获取应用状态
    getAppStatus() {
        return {
            isInitialized: this.isInitialized,
            timestamp: new Date().toISOString()
        };
    }
    
    // 重启应用
    restart() {
        console.log('🔄 重启应用...');
        window.location.reload();
    }
}

// 创建并启动应用
const typingGameApp = new GameAppController();

// 将应用实例暴露到全局
window.typingGameApp = typingGameApp;

// 开发者工具
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    window.devTools = {
        getAppStatus: () => typingGameApp.getAppStatus(),
        restart: () => typingGameApp.restart(),
        clearData: () => {
            if (confirm('确定要清除所有数据吗？')) {
                Utils.Storage.clear();
                typingGameApp.restart();
            }
        },
        toggleDebug: () => {
            document.body.classList.toggle('debug-mode');
        }
    };
    
    console.log('🛠️ 开发者工具已加载，使用 window.devTools 访问');
}
