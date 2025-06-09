/**
 * 主入口文件
 * 初始化应用程序并协调各个模块
 */

class TypingGame {
    constructor() {
        this.isInitialized = false;
        this.managers = {};
        
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
            
            // 初始化各个管理器
            await this.initializeManagers();
            
            // 绑定全局事件
            this.bindGlobalEvents();
            
            // 设置性能监控
            this.setupPerformanceMonitoring();
            
            // 标记为已初始化
            this.isInitialized = true;
            
            console.log('✅ 游戏初始化完成');
            
            // 显示欢迎信息
            this.showWelcomeMessage();
            
        } catch (error) {
            console.error('❌ 游戏初始化失败:', error);
            this.showErrorMessage('游戏初始化失败，请刷新页面重试');
        }
    }
    
    // 初始化各个管理器
    async initializeManagers() {
        console.log('📦 初始化管理器...');
        
        // 等待所有管理器初始化完成
        const managers = ['audioManager', 'statsManager', 'uiManager', 'gameEngine'];
        
        for (const managerName of managers) {
            if (window[managerName]) {
                this.managers[managerName] = window[managerName];
                console.log(`✓ ${managerName} 已就绪`);
            } else {
                console.warn(`⚠️ ${managerName} 未找到`);
            }
        }
        
        // 等待游戏引擎完全初始化
        if (this.managers.gameEngine && this.managers.gameEngine.init) {
            await this.managers.gameEngine.init();
        }
    }
    
    // 绑定全局事件
    bindGlobalEvents() {
        console.log('🔗 绑定全局事件...');
        
        // 页面可见性变化
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.handlePageHidden();
            } else {
                this.handlePageVisible();
            }
        });
        
        // 页面卸载前
        window.addEventListener('beforeunload', (e) => {
            this.handleBeforeUnload(e);
        });
        
        // 错误处理
        window.addEventListener('error', (e) => {
            this.handleGlobalError(e);
        });
        
        // 未处理的Promise拒绝
        window.addEventListener('unhandledrejection', (e) => {
            this.handleUnhandledRejection(e);
        });
        
        // 键盘快捷键
        document.addEventListener('keydown', (e) => {
            this.handleGlobalKeydown(e);
        });
        
        // 鼠标点击 - 用于恢复音频上下文
        document.addEventListener('click', () => {
            if (this.managers.audioManager) {
                this.managers.audioManager.resumeAudioContext();
            }
        }, { once: true });
        
        // 统计管理器事件
        if (this.managers.statsManager) {
            this.managers.statsManager.on('statsUpdated', (stats) => {
                if (this.managers.uiManager) {
                    this.managers.uiManager.updateStats(stats);
                }
            });
        }
        
        // 游戏引擎事件
        if (this.managers.gameEngine) {
            this.managers.gameEngine.on('gameStarted', () => {
                console.log('🎯 游戏开始');
            });
            
            this.managers.gameEngine.on('gameCompleted', (stats) => {
                console.log('🏆 游戏完成:', stats);
                this.handleGameCompleted(stats);
            });
            
            this.managers.gameEngine.on('gamePaused', (isPaused) => {
                console.log(isPaused ? '⏸️ 游戏暂停' : '▶️ 游戏继续');
            });
        }
    }
    
    // 设置性能监控
    setupPerformanceMonitoring() {
        if (Utils.Performance) {
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
    
    // 显示欢迎信息
    showWelcomeMessage() {
        if (this.managers.uiManager) {
            this.managers.uiManager.showNotification(
                '欢迎来到键盘打字竞速游戏！选择模式开始练习吧 🎮',
                'info',
                5000
            );
        }
        
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
            if (currentStep < tutorialSteps.length && this.managers.uiManager) {
                this.managers.uiManager.showNotification(
                    tutorialSteps[currentStep],
                    'info',
                    3000
                );
                currentStep++;
                setTimeout(showNextStep, 3500);
            }
        };
        
        setTimeout(showNextStep, 2000);
    }
    
    // 处理页面隐藏
    handlePageHidden() {
        // 如果游戏正在进行，自动暂停
        if (this.managers.gameEngine && 
            this.managers.gameEngine.getGameState().isPlaying &&
            !this.managers.gameEngine.getGameState().isPaused) {
            this.managers.gameEngine.togglePause();
        }
        
        // 停止背景音乐
        if (this.managers.audioManager) {
            this.managers.audioManager.stopBackgroundMusic();
        }
    }
    
    // 处理页面可见
    handlePageVisible() {
        // 恢复音频上下文
        if (this.managers.audioManager) {
            this.managers.audioManager.resumeAudioContext();
            
            // 如果游戏正在进行且音乐开启，恢复背景音乐
            const gameState = this.managers.gameEngine?.getGameState();
            const audioStatus = this.managers.audioManager.getStatus();
            
            if (gameState?.isPlaying && !gameState?.isPaused && 
                audioStatus.isEnabled && audioStatus.musicEnabled) {
                this.managers.audioManager.startBackgroundMusic();
            }
        }
    }
    
    // 处理页面卸载前
    handleBeforeUnload(e) {
        // 如果游戏正在进行，提示用户
        if (this.managers.gameEngine && 
            this.managers.gameEngine.getGameState().isPlaying) {
            e.preventDefault();
            e.returnValue = '游戏正在进行中，确定要离开吗？';
            return e.returnValue;
        }
    }
    
    // 处理全局错误
    handleGlobalError(e) {
        console.error('全局错误:', e.error);
        
        if (this.managers.uiManager) {
            this.managers.uiManager.showNotification(
                '发生了一个错误，游戏可能不稳定',
                'error'
            );
        }
        
        // 记录错误到统计
        this.logError('GlobalError', e.error);
    }
    
    // 处理未处理的Promise拒绝
    handleUnhandledRejection(e) {
        console.error('未处理的Promise拒绝:', e.reason);
        
        // 记录错误到统计
        this.logError('UnhandledRejection', e.reason);
    }
    
    // 处理全局按键
    handleGlobalKeydown(e) {
        // 防止某些快捷键的默认行为
        if (e.ctrlKey) {
            switch (e.key) {
                case 's': // Ctrl+S
                case 'p': // Ctrl+P
                    if (this.managers.gameEngine && 
                        this.managers.gameEngine.getGameState().isPlaying) {
                        e.preventDefault();
                    }
                    break;
            }
        }
        
        // F11 全屏切换
        if (e.key === 'F11') {
            this.toggleFullscreen();
            e.preventDefault();
        }
    }
    
    // 处理游戏完成
    handleGameCompleted(stats) {
        // 显示完成消息
        if (this.managers.uiManager) {
            let message = `游戏完成！WPM: ${stats.wpm}, 准确率: ${stats.accuracy}%`;
            
            // 根据成绩显示不同的消息
            if (stats.wpm >= 80) {
                message += ' 🚀 速度惊人！';
            } else if (stats.wpm >= 60) {
                message += ' ⚡ 表现优秀！';
            } else if (stats.wpm >= 40) {
                message += ' 👍 不错的成绩！';
            } else {
                message += ' 💪 继续加油！';
            }
            
            this.managers.uiManager.showNotification(message, 'success', 5000);
        }
        
        // 记录游戏完成事件
        this.logEvent('GameCompleted', {
            mode: stats.mode,
            wpm: stats.wpm,
            accuracy: stats.accuracy,
            timeElapsed: stats.timeElapsed
        });
    }
    
    // 切换全屏
    toggleFullscreen() {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(err => {
                console.warn('无法进入全屏模式:', err);
            });
        } else {
            document.exitFullscreen().catch(err => {
                console.warn('无法退出全屏模式:', err);
            });
        }
    }
    
    // 记录错误
    logError(type, error) {
        const errorData = {
            type,
            message: error?.message || String(error),
            stack: error?.stack,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            url: window.location.href
        };
        
        // 保存到本地存储
        const errors = Utils.Storage.get('errorLog', []);
        errors.unshift(errorData);
        
        // 限制错误日志数量
        if (errors.length > 50) {
            errors.splice(50);
        }
        
        Utils.Storage.set('errorLog', errors);
    }
    
    // 记录事件
    logEvent(eventName, data = {}) {
        const eventData = {
            event: eventName,
            data,
            timestamp: new Date().toISOString()
        };
        
        console.log('📊 事件记录:', eventData);
        
        // 可以在这里添加分析代码
    }
    
    // 获取应用状态
    getAppStatus() {
        return {
            isInitialized: this.isInitialized,
            managers: Object.keys(this.managers),
            gameState: this.managers.gameEngine?.getGameState(),
            audioStatus: this.managers.audioManager?.getStatus(),
            statsSummary: this.managers.statsManager?.getStatsSummary()
        };
    }
    
    // 重启应用
    restart() {
        console.log('🔄 重启应用...');
        
        // 停止所有活动
        if (this.managers.gameEngine) {
            this.managers.gameEngine.stopGame();
        }
        
        if (this.managers.audioManager) {
            this.managers.audioManager.stopBackgroundMusic();
        }
        
        // 重新加载页面
        window.location.reload();
    }
    
    // 导出游戏数据
    exportGameData() {
        const data = {
            stats: this.managers.statsManager?.exportData(),
            settings: this.managers.uiManager?.getSettings(),
            timestamp: new Date().toISOString()
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], {
            type: 'application/json'
        });
        
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `typing-game-data-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        
        URL.revokeObjectURL(url);
        
        if (this.managers.uiManager) {
            this.managers.uiManager.showNotification('数据导出成功！', 'success');
        }
    }
    
    // 导入游戏数据
    importGameData(file) {
        const reader = new FileReader();
        
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                
                if (data.stats && this.managers.statsManager) {
                    this.managers.statsManager.importData(data.stats);
                }
                
                if (this.managers.uiManager) {
                    this.managers.uiManager.showNotification('数据导入成功！', 'success');
                }
                
            } catch (error) {
                console.error('导入数据失败:', error);
                if (this.managers.uiManager) {
                    this.managers.uiManager.showNotification('数据导入失败，文件格式错误', 'error');
                }
            }
        };
        
        reader.readAsText(file);
    }
}

// 创建并启动应用
const typingGame = new TypingGame();

// 将应用实例暴露到全局
window.typingGame = typingGame;

// 开发者工具
if (process?.env?.NODE_ENV === 'development' || window.location.hostname === 'localhost') {
    window.devTools = {
        getAppStatus: () => typingGame.getAppStatus(),
        restart: () => typingGame.restart(),
        exportData: () => typingGame.exportGameData(),
        clearData: () => {
            if (confirm('确定要清除所有数据吗？')) {
                Utils.Storage.clear();
                typingGame.restart();
            }
        },
        toggleDebug: () => {
            document.body.classList.toggle('debug-mode');
        }
    };
    
    console.log('🛠️ 开发者工具已加载，使用 window.devTools 访问');
}
