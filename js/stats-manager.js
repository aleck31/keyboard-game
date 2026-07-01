/**
 * 统计管理器 - 重构版
 * 职责：历史记录存储、成就解锁
 * 统计计算由GameStore负责
 */

class StatsManager extends Utils.EventEmitter {
    constructor() {
        super();
        
        this.gameHistory = [];
        this.achievements = [];
        
        this.gameStore = window.gameStore;
        this.errorHandler = window.errorHandler;
        
        this.init();
    }
    
    init() {
        try {
            this.loadHistory();
            this.loadAchievements();
            this.setupListeners();
            console.log('📊 统计管理器初始化成功');
        } catch (error) {
            this.errorHandler.handleError(
                this.errorHandler.createError('stats', '统计管理器初始化失败', { error: error.message })
            );
        }
    }
    
    setupListeners() {
        if (this.gameStore) {
            this.gameStore.on('gameStarted', () => this.onGameStarted());
        }
    }

    onGameStarted() {
        const gameState = this.gameStore.getState('game');
        console.log(`📊 开始统计 ${gameState.mode} 模式`);
        this.emit('gameStarted', this.getCurrentStats());
    }

    // 获取当前统计（从GameStore读取）
    getCurrentStats() {
        try {
            const gameState = this.gameStore.getState('game');
            const textState = this.gameStore.getState('text');
            const statsState = this.gameStore.getState('stats');
            
            // 如果正在暂停，使用暂停时的时间
            let timeElapsed = 0;
            if (gameState.startTime) {
                if (gameState.isPaused && gameState.pauseStartTime) {
                    // 暂停中：使用暂停开始时的时间
                    timeElapsed = Math.floor((gameState.pauseStartTime - gameState.startTime) / 1000);
                } else {
                    // 正常游戏中：使用当前时间
                    timeElapsed = Math.floor((Date.now() - gameState.startTime) / 1000);
                }
            }
            
            return {
                ...statsState,
                startTime: gameState.startTime,
                mode: gameState.mode,
                timeElapsed,
                isCompleted: gameState.isCompleted,
                currentIndex: textState.currentIndex
            };
        } catch (error) {
            console.error('获取统计失败:', error);
            return {
                wpm: 0,
                cpm: 0,
                accuracy: 100,
                errors: 0,
                totalChars: 0,
                correctChars: 0,
                timeElapsed: 0
            };
        }
    }
    
    
    // 结束游戏（由game-engine调用，唯一的保存入口）
    endGame(completed = true, extras = null) {
        const stats = { ...this.getCurrentStats(), ...extras };
        this.saveGameResult(stats);
        this.checkAchievements(stats);
        this.emit('gameEnded', stats);
        return stats;
    }
    
    // 保存游戏结果
    saveGameResult(stats) {
        try {
            const gameRecord = {
                ...stats,
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
                false
            );
        }
    }
    
    // 检查成就
    checkAchievements(stats) {
        const newAchievements = [];
        
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
            return { 
                totalGames: 0, 
                bestWPM: 0, 
                averageWPM: 0, 
                bestAccuracy: 0, 
                averageAccuracy: 0 
            };
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
