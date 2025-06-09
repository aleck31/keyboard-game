/**
 * 统计管理器
 * 处理游戏统计数据的计算、存储和分析
 */

class StatsManager extends Utils.EventEmitter {
    constructor() {
        super();
        this.currentStats = this.createEmptyStats();
        this.gameHistory = [];
        this.achievements = [];
        
        this.init();
    }
    
    init() {
        // 从本地存储加载历史数据
        this.loadHistory();
        this.loadAchievements();
        
        console.log('统计管理器初始化成功');
    }
    
    // 创建空的统计对象
    createEmptyStats() {
        return {
            startTime: null,
            endTime: null,
            mode: 'classic',
            totalChars: 0,
            correctChars: 0,
            incorrectChars: 0,
            currentIndex: 0,
            wpm: 0,
            cpm: 0, // 每分钟字符数
            accuracy: 100,
            timeElapsed: 0,
            errors: 0,
            backspaces: 0,
            maxWPM: 0,
            minWPM: 0,
            avgWPM: 0,
            maxCPM: 0,
            minCPM: 0,
            avgCPM: 0,
            wpmHistory: [],
            errorPositions: [],
            keystrokes: 0,
            isCompleted: false
        };
    }
    
    // 开始新的游戏统计
    startGame(mode = 'classic') {
        this.currentStats = this.createEmptyStats();
        this.currentStats.mode = mode;
        this.currentStats.startTime = Date.now();
        
        this.emit('gameStarted', this.currentStats);
        console.log(`开始统计 ${mode} 模式游戏`);
    }
    
    // 更新当前统计
    updateStats(data) {
        const now = Date.now();
        
        // 更新基础数据
        Object.assign(this.currentStats, data);
        
        // 计算时间
        if (this.currentStats.startTime) {
            this.currentStats.timeElapsed = Math.floor((now - this.currentStats.startTime) / 1000);
        }
        
        // 计算WPM
        this.calculateWPM();
        
        // 计算CPM
        this.calculateCPM();
        
        // 计算准确率
        this.calculateAccuracy();
        
        // 记录WPM历史
        this.recordWPMHistory();
        
        // 发射更新事件
        this.emit('statsUpdated', this.currentStats);
    }
    
    // 计算WPM
    calculateWPM() {
        if (!this.currentStats.startTime || this.currentStats.timeElapsed === 0) {
            this.currentStats.wpm = 0;
            return;
        }
        
        const timeInMinutes = this.currentStats.timeElapsed / 60;
        const words = this.currentStats.correctChars / 5; // 标准：5个字符 = 1个单词
        this.currentStats.wpm = Math.round(words / timeInMinutes) || 0;
        
        // 更新最大和最小WPM
        if (this.currentStats.wpm > this.currentStats.maxWPM) {
            this.currentStats.maxWPM = this.currentStats.wpm;
        }
        
        if (this.currentStats.minWPM === 0 || this.currentStats.wpm < this.currentStats.minWPM) {
            this.currentStats.minWPM = this.currentStats.wpm;
        }
    }
    
    // 计算CPM (每分钟字符数)
    calculateCPM() {
        if (!this.currentStats.startTime || this.currentStats.timeElapsed === 0) {
            this.currentStats.cpm = 0;
            return;
        }
        
        const timeInMinutes = this.currentStats.timeElapsed / 60;
        this.currentStats.cpm = Math.round(this.currentStats.correctChars / timeInMinutes) || 0;
        
        // 更新最大和最小CPM
        if (this.currentStats.cpm > this.currentStats.maxCPM) {
            this.currentStats.maxCPM = this.currentStats.cpm;
        }
        
        if (this.currentStats.minCPM === 0 || this.currentStats.cpm < this.currentStats.minCPM) {
            this.currentStats.minCPM = this.currentStats.cpm;
        }
    }
    
    // 计算准确率
    calculateAccuracy() {
        if (this.currentStats.totalChars === 0) {
            this.currentStats.accuracy = 100;
            return;
        }
        
        this.currentStats.accuracy = Math.round(
            (this.currentStats.correctChars / this.currentStats.totalChars) * 100
        );
    }
    
    // 记录WPM历史
    recordWPMHistory() {
        const interval = 5; // 每5秒记录一次
        if (this.currentStats.timeElapsed % interval === 0 && this.currentStats.timeElapsed > 0) {
            this.currentStats.wpmHistory.push({
                time: this.currentStats.timeElapsed,
                wpm: this.currentStats.wpm,
                cpm: this.currentStats.cpm,
                accuracy: this.currentStats.accuracy
            });
        }
    }
    
    // 记录错误位置
    recordError(position, expectedChar, actualChar) {
        this.currentStats.errors++;
        this.currentStats.errorPositions.push({
            position,
            expected: expectedChar,
            actual: actualChar,
            timestamp: Date.now() - this.currentStats.startTime
        });
        
        this.emit('errorRecorded', {
            position,
            expected: expectedChar,
            actual: actualChar,
            totalErrors: this.currentStats.errors
        });
    }
    
    // 记录退格键
    recordBackspace() {
        this.currentStats.backspaces++;
    }
    
    // 记录按键
    recordKeystroke() {
        this.currentStats.keystrokes++;
    }
    
    // 结束游戏
    endGame(completed = true) {
        this.currentStats.endTime = Date.now();
        this.currentStats.isCompleted = completed;
        
        // 计算平均WPM和CPM
        if (this.currentStats.wpmHistory.length > 0) {
            const totalWPM = this.currentStats.wpmHistory.reduce((sum, entry) => sum + entry.wpm, 0);
            const totalCPM = this.currentStats.wpmHistory.reduce((sum, entry) => sum + entry.cpm, 0);
            this.currentStats.avgWPM = Math.round(totalWPM / this.currentStats.wpmHistory.length);
            this.currentStats.avgCPM = Math.round(totalCPM / this.currentStats.wpmHistory.length);
        } else {
            this.currentStats.avgWPM = this.currentStats.wpm;
            this.currentStats.avgCPM = this.currentStats.cpm;
        }
        
        // 保存到历史记录
        this.saveToHistory();
        
        // 检查成就
        this.checkAchievements();
        
        // 发射游戏结束事件
        this.emit('gameEnded', this.currentStats);
        
        console.log('游戏统计结束:', this.currentStats);
        return this.currentStats;
    }
    
    // 保存到历史记录
    saveToHistory() {
        const gameRecord = {
            ...this.currentStats,
            id: Date.now(),
            date: new Date().toISOString()
        };
        
        this.gameHistory.unshift(gameRecord);
        
        // 限制历史记录数量
        if (this.gameHistory.length > 100) {
            this.gameHistory = this.gameHistory.slice(0, 100);
        }
        
        // 保存到本地存储
        Utils.Storage.set('gameHistory', this.gameHistory);
        
        // 同步到服务器
        this.syncToServer(gameRecord);
    }
    
    // 同步到服务器
    async syncToServer(gameRecord) {
        try {
            const statsData = {
                wpm: gameRecord.wpm,
                accuracy: gameRecord.accuracy,
                time_taken: gameRecord.timeElapsed,
                errors: gameRecord.errors,
                mode: gameRecord.mode
            };
            
            await Utils.API.post('/api/stats', statsData);
            console.log('统计数据已同步到服务器');
        } catch (error) {
            console.warn('同步统计数据到服务器失败:', error);
        }
    }
    
    // 检查成就
    checkAchievements() {
        const newAchievements = [];
        
        // WPM成就
        if (this.currentStats.wpm >= 100 && !this.hasAchievement('speed_demon')) {
            newAchievements.push({
                id: 'speed_demon',
                name: '速度恶魔',
                description: '达到100 WPM',
                icon: '🚀',
                unlockedAt: Date.now()
            });
        }
        
        if (this.currentStats.wpm >= 60 && !this.hasAchievement('fast_fingers')) {
            newAchievements.push({
                id: 'fast_fingers',
                name: '快手',
                description: '达到60 WPM',
                icon: '⚡',
                unlockedAt: Date.now()
            });
        }
        
        if (this.currentStats.wpm >= 30 && !this.hasAchievement('getting_started')) {
            newAchievements.push({
                id: 'getting_started',
                name: '入门者',
                description: '达到30 WPM',
                icon: '🌟',
                unlockedAt: Date.now()
            });
        }
        
        // 准确率成就
        if (this.currentStats.accuracy === 100 && this.currentStats.totalChars > 50 && !this.hasAchievement('perfectionist')) {
            newAchievements.push({
                id: 'perfectionist',
                name: '完美主义者',
                description: '100%准确率完成游戏',
                icon: '💎',
                unlockedAt: Date.now()
            });
        }
        
        if (this.currentStats.accuracy >= 95 && !this.hasAchievement('accurate_typist')) {
            newAchievements.push({
                id: 'accurate_typist',
                name: '精准打字员',
                description: '达到95%准确率',
                icon: '🎯',
                unlockedAt: Date.now()
            });
        }
        
        // 游戏次数成就
        const totalGames = this.gameHistory.length;
        if (totalGames >= 100 && !this.hasAchievement('dedicated_player')) {
            newAchievements.push({
                id: 'dedicated_player',
                name: '专注玩家',
                description: '完成100场游戏',
                icon: '🏆',
                unlockedAt: Date.now()
            });
        }
        
        if (totalGames >= 10 && !this.hasAchievement('regular_player')) {
            newAchievements.push({
                id: 'regular_player',
                name: '常规玩家',
                description: '完成10场游戏',
                icon: '🎮',
                unlockedAt: Date.now()
            });
        }
        
        // 添加新成就
        if (newAchievements.length > 0) {
            this.achievements.push(...newAchievements);
            this.saveAchievements();
            
            newAchievements.forEach(achievement => {
                this.emit('achievementUnlocked', achievement);
                console.log(`🎉 解锁成就: ${achievement.name}`);
            });
        }
    }
    
    // 检查是否已有成就
    hasAchievement(achievementId) {
        return this.achievements.some(achievement => achievement.id === achievementId);
    }
    
    // 获取统计摘要
    getStatsSummary() {
        if (this.gameHistory.length === 0) {
            return {
                totalGames: 0,
                bestWPM: 0,
                averageWPM: 0,
                bestAccuracy: 0,
                averageAccuracy: 0,
                totalTime: 0,
                totalChars: 0,
                totalErrors: 0
            };
        }
        
        const completedGames = this.gameHistory.filter(game => game.isCompleted);
        
        return {
            totalGames: this.gameHistory.length,
            completedGames: completedGames.length,
            bestWPM: Math.max(...completedGames.map(game => game.wpm)),
            averageWPM: Math.round(completedGames.reduce((sum, game) => sum + game.wpm, 0) / completedGames.length) || 0,
            bestAccuracy: Math.max(...completedGames.map(game => game.accuracy)),
            averageAccuracy: Math.round(completedGames.reduce((sum, game) => sum + game.accuracy, 0) / completedGames.length) || 0,
            totalTime: completedGames.reduce((sum, game) => sum + game.timeElapsed, 0),
            totalChars: completedGames.reduce((sum, game) => sum + game.totalChars, 0),
            totalErrors: completedGames.reduce((sum, game) => sum + game.errors, 0),
            achievements: this.achievements.length
        };
    }
    
    // 获取进步趋势
    getProgressTrend(days = 7) {
        const cutoffDate = Date.now() - (days * 24 * 60 * 60 * 1000);
        const recentGames = this.gameHistory.filter(game => 
            new Date(game.date).getTime() > cutoffDate && game.isCompleted
        );
        
        if (recentGames.length === 0) return null;
        
        // 按日期分组
        const gamesByDate = {};
        recentGames.forEach(game => {
            const date = new Date(game.date).toDateString();
            if (!gamesByDate[date]) {
                gamesByDate[date] = [];
            }
            gamesByDate[date].push(game);
        });
        
        // 计算每日平均值
        const dailyStats = Object.entries(gamesByDate).map(([date, games]) => ({
            date,
            avgWPM: Math.round(games.reduce((sum, game) => sum + game.wpm, 0) / games.length),
            avgAccuracy: Math.round(games.reduce((sum, game) => sum + game.accuracy, 0) / games.length),
            gamesPlayed: games.length
        }));
        
        return dailyStats.sort((a, b) => new Date(a.date) - new Date(b.date));
    }
    
    // 获取错误分析
    getErrorAnalysis() {
        const allErrors = this.gameHistory.flatMap(game => game.errorPositions || []);
        
        if (allErrors.length === 0) return null;
        
        // 统计最常见的错误字符
        const errorChars = {};
        allErrors.forEach(error => {
            const key = `${error.expected} → ${error.actual}`;
            errorChars[key] = (errorChars[key] || 0) + 1;
        });
        
        // 排序并取前10
        const topErrors = Object.entries(errorChars)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 10)
            .map(([chars, count]) => ({ chars, count }));
        
        return {
            totalErrors: allErrors.length,
            topErrors,
            errorRate: allErrors.length / this.gameHistory.reduce((sum, game) => sum + game.totalChars, 0)
        };
    }
    
    // 加载历史记录
    loadHistory() {
        this.gameHistory = Utils.Storage.get('gameHistory', []);
        console.log(`加载了 ${this.gameHistory.length} 条历史记录`);
    }
    
    // 加载成就
    loadAchievements() {
        this.achievements = Utils.Storage.get('achievements', []);
        console.log(`加载了 ${this.achievements.length} 个成就`);
    }
    
    // 保存成就
    saveAchievements() {
        Utils.Storage.set('achievements', this.achievements);
    }
    
    // 清除所有数据
    clearAllData() {
        this.gameHistory = [];
        this.achievements = [];
        this.currentStats = this.createEmptyStats();
        
        Utils.Storage.remove('gameHistory');
        Utils.Storage.remove('achievements');
        
        this.emit('dataCleared');
        console.log('所有统计数据已清除');
    }
    
    // 导出数据
    exportData() {
        return {
            gameHistory: this.gameHistory,
            achievements: this.achievements,
            summary: this.getStatsSummary(),
            exportDate: new Date().toISOString()
        };
    }
    
    // 导入数据
    importData(data) {
        try {
            if (data.gameHistory) {
                this.gameHistory = data.gameHistory;
                Utils.Storage.set('gameHistory', this.gameHistory);
            }
            
            if (data.achievements) {
                this.achievements = data.achievements;
                Utils.Storage.set('achievements', this.achievements);
            }
            
            this.emit('dataImported');
            console.log('数据导入成功');
            return true;
        } catch (error) {
            console.error('数据导入失败:', error);
            return false;
        }
    }
    
    // 获取当前统计
    getCurrentStats() {
        return { ...this.currentStats };
    }
    
    // 获取历史记录
    getHistory(limit = 50) {
        return this.gameHistory.slice(0, limit);
    }
    
    // 获取成就列表
    getAchievements() {
        return [...this.achievements];
    }
}

// 创建全局统计管理器实例
window.statsManager = new StatsManager();
