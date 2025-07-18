/**
 * 统计管理器 - 优化版
 * 完全集成统一状态管理，移除内部状态副本
 * 专注于历史数据存储和成就解锁
 */

class StatsManager extends Utils.EventEmitter {
    constructor() {
        super();
        
        // 保留必要的本地状态 - 只保存历史和成就
        this.gameHistory = [];
        this.achievements = [];
        
        // 引用统一状态管理和错误处理
        this.gameStore = window.gameStore;
        this.errorHandler = window.errorHandler;
        
        this.init();
    }
    
    init() {
        try {
            this.loadHistory();
            this.loadAchievements();
            this.setupStateListeners();
            console.log('📊 统计管理器初始化成功');
        } catch (error) {
            this.errorHandler.handleError(
                this.errorHandler.createError('stats', '统计管理器初始化失败', { error: error.message })
            );
        }
    }
    
    // 设置状态监听器
    setupStateListeners() {
        if (this.gameStore) {
            this.gameStore.on('gameStarted', () => this.handleGameStarted());
            this.gameStore.on('gameEnded', () => this.handleGameEnded());
            this.gameStore.on('stateChanged', (change) => {
                if (change.path === 'text.userInput') {
                    this.updateRealTimeStats();
                }
            });
        }
    }
    
    // 开始游戏统计（兼容原接口）
    startGame(mode = 'classic') {
        // 直接触发统一状态的事件
        this.handleGameStarted();
    }
    
    // 处理游戏开始事件
    handleGameStarted() {
        const gameState = this.gameStore.getState('game');
        
        // 日志游戏开始
        console.log(`📊 开始统计 ${gameState.mode} 模式`);
        
        // 通知监听器
        this.emit('gameStarted', this.getCurrentStats());
    }
    
    // 实时更新统计
    updateRealTimeStats() {
        const textState = this.gameStore.getState('text');
        const gameState = this.gameStore.getState('game');
        
        if (!gameState.isPlaying || !textState.currentText) return;
        
        // 计算统计数据
        let correctChars = 0;
        let totalChars = textState.userInput.length;
        
        for (let i = 0; i < textState.userInput.length; i++) {
            if (i < textState.currentText.length && textState.userInput[i] === textState.currentText[i]) {
                correctChars++;
            }
        }
        
        const timeElapsed = gameState.startTime ? Math.floor((Date.now() - gameState.startTime) / 1000) : 0;
        const timeInMinutes = timeElapsed / 60;
        
        let wpm = 0, cpm = 0, accuracy = 100;
        
        if (timeInMinutes > 0) {
            wpm = Math.round((correctChars / 5) / timeInMinutes) || 0;
            cpm = Math.round(correctChars / timeInMinutes) || 0;
        }
        
        if (totalChars > 0) {
            accuracy = Math.round((correctChars / totalChars) * 100);
        }
        
        // 更新统一状态
        this.gameStore.actions.updateStats({
            totalChars,
            correctChars,
            errors: totalChars - correctChars,
            wpm,
            cpm,
            accuracy
        });
        
        this.emit('statsUpdated', this.getCurrentStats());
    }
    
    // 更新统计（兼容原接口）
    updateStats(data) {
        if (!data || typeof data !== 'object') return;
        
        // 简化：直接更新统一状态
        const statsUpdate = {};
        if (typeof data.totalChars === 'number') statsUpdate.totalChars = Math.max(0, data.totalChars);
        if (typeof data.correctChars === 'number') statsUpdate.correctChars = Math.max(0, data.correctChars);
        if (typeof data.incorrectChars === 'number') statsUpdate.errors = Math.max(0, data.incorrectChars);
        
        this.gameStore.actions.updateStats(statsUpdate);
        this.emit('statsUpdated', this.getCurrentStats());
    }
    
    // 记录错误 - 过渡方法，引导调用统一状态管理
    recordError(position, expectedChar, actualChar) {
        if (typeof position !== 'number' || position < 0) return;
        
        // 直接使用 gameStore 记录错误
        this.gameStore.actions.recordError(position, expectedChar, actualChar);
        this.emit('errorRecorded', { position, expectedChar, actualChar });
    }
    
    // 记录按键 - 过渡方法，引导调用统一状态管理
    recordKeystroke() { 
        this.gameStore.actions.recordKeystroke(); 
    }
    
    recordBackspace() { 
        this.gameStore.actions.recordBackspace(); 
    }
    
    // 结束游戏
    endGame(completed = true) {
        return this.handleGameEnded(completed);
    }
    
    // 处理游戏结束事件
    handleGameEnded(completed = true) {
        try {
            const gameState = this.gameStore.getState('game');
            const statsState = this.gameStore.getState('stats');
            
            // 生成最终统计数据
            const finalStats = {
                ...statsState,
                endTime: Date.now(),
                mode: gameState.mode,
                timeElapsed: gameState.startTime ? Math.floor((Date.now() - gameState.startTime) / 1000) : 0,
                isCompleted: completed
            };
            
            // 保存和处理最终统计
            this.saveToHistory(finalStats);
            this.checkAchievements(finalStats);
            this.emit('gameEnded', finalStats);
            
            return finalStats;
        } catch (error) {
            this.errorHandler.handleError(
                this.errorHandler.createError('stats', '处理游戏结束统计失败', { error: error.message })
            );
            return {};
        }
    }
    
    // 获取当前统计（直接使用统一状态）
    getCurrentStats() {
        try {
            const gameState = this.gameStore.getState('game');
            const textState = this.gameStore.getState('text');
            const statsState = this.gameStore.getState('stats');
            
            const timeElapsed = gameState.startTime ? Math.floor((Date.now() - gameState.startTime) / 1000) : 0;
            
            return {
                ...statsState,
                startTime: gameState.startTime,
                mode: gameState.mode,
                timeElapsed,
                isCompleted: gameState.isCompleted,
                currentIndex: textState.currentIndex
            };
        } catch (error) {
            this.errorHandler.handleError(
                this.errorHandler.createError('stats', '获取当前统计失败', { error: error.message })
            );
            return {};
        }
    }
    
    // 保存到历史记录
    saveToHistory(finalStats) {
        try {
            const gameRecord = {
                ...finalStats,
                id: Date.now(),
                date: new Date().toISOString()
            };
            
            this.gameHistory.unshift(gameRecord);
            if (this.gameHistory.length > 100) {
                this.gameHistory = this.gameHistory.slice(0, 100);
            }
            
            Utils.Storage.set('gameHistory', this.gameHistory);
            this.syncToServer(gameRecord);
        } catch (error) {
            this.errorHandler.handleError(
                this.errorHandler.createError('storage', '保存游戏历史失败', { error: error.message })
            );
        }
    }
    
    // 同步到服务器
    async syncToServer(gameRecord) {
        try {
            await Utils.API.post('/api/stats', {
                wpm: gameRecord.wpm,
                accuracy: gameRecord.accuracy,
                time_taken: gameRecord.timeElapsed,
                errors: gameRecord.errors,
                mode: gameRecord.mode
            });
            console.log('📊 统计数据已同步');
        } catch (error) {
            this.errorHandler.handleError(
                this.errorHandler.createError('api', '同步统计数据失败', { error: error.message }), 
                false // 不显示给用户，避免干扰游戏体验
            );
        }
    }
    
    // 检查成就（简化版）
    checkAchievements(stats) {
        const newAchievements = [];
        
        // 简化的成就检查
        if (stats.wpm >= 60 && !this.hasAchievement('fast_fingers')) {
            newAchievements.push({
                id: 'fast_fingers',
                name: '快手',
                description: '达到60 WPM',
                icon: '⚡'
            });
        }
        
        if (stats.accuracy === 100 && stats.totalChars > 50 && !this.hasAchievement('perfectionist')) {
            newAchievements.push({
                id: 'perfectionist',
                name: '完美主义者',
                description: '100%准确率',
                icon: '💎'
            });
        }
        
        if (newAchievements.length > 0) {
            this.achievements.push(...newAchievements);
            this.saveAchievements();
            
            newAchievements.forEach(achievement => {
                this.emit('achievementUnlocked', achievement);
                if (this.gameStore) {
                    this.gameStore.actions.showNotification(
                        `🎉 ${achievement.icon} ${achievement.name}`,
                        'success'
                    );
                }
            });
        }
    }
    
    hasAchievement(id) {
        return this.achievements.some(a => a.id === id);
    }
    
    // 工具方法
    loadHistory() {
        this.gameHistory = Utils.Storage.get('gameHistory', []);
        console.log(`📊 加载了 ${this.gameHistory.length} 条历史记录`);
    }
    
    loadAchievements() {
        this.achievements = Utils.Storage.get('achievements', []);
        console.log(`🏆 加载了 ${this.achievements.length} 个成就`);
    }
    
    saveAchievements() {
        Utils.Storage.set('achievements', this.achievements);
    }
    
    getHistory(limit = 50) {
        return this.gameHistory.slice(0, limit);
    }
    
    getAchievements() {
        return [...this.achievements];
    }
    
    getStatsSummary() {
        if (this.gameHistory.length === 0) {
            return { totalGames: 0, bestWPM: 0, averageWPM: 0, bestAccuracy: 0, averageAccuracy: 0 };
        }
        
        const completed = this.gameHistory.filter(g => g.isCompleted);
        return {
            totalGames: this.gameHistory.length,
            completedGames: completed.length,
            bestWPM: Math.max(...completed.map(g => g.wpm)),
            averageWPM: Math.round(completed.reduce((sum, g) => sum + g.wpm, 0) / completed.length) || 0,
            bestAccuracy: Math.max(...completed.map(g => g.accuracy)),
            averageAccuracy: Math.round(completed.reduce((sum, g) => sum + g.accuracy, 0) / completed.length) || 0
        };
    }
    
    clearAllData() {
        this.gameHistory = [];
        this.achievements = [];
        Utils.Storage.remove('gameHistory');
        Utils.Storage.remove('achievements');
        this.emit('dataCleared');
        console.log('📊 数据已清除');
    }
}

// 创建全局实例
window.statsManager = new StatsManager();