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
        // 数据验证和边界条件处理
        if (!data || typeof data !== 'object') {
            console.warn('Invalid stats data provided');
            return;
        }
        
        const now = Date.now();
        
        // 验证和更新基础数据
        if (typeof data.totalChars === 'number' && data.totalChars >= 0) {
            this.currentStats.totalChars = data.totalChars;
        }
        
        if (typeof data.correctChars === 'number' && data.correctChars >= 0) {
            this.currentStats.correctChars = Math.min(data.correctChars, this.currentStats.totalChars);
        }
        
        if (typeof data.incorrectChars === 'number' && data.incorrectChars >= 0) {
            this.currentStats.incorrectChars = data.incorrectChars;
            this.currentStats.errors = data.incorrectChars;
        }
        
        if (typeof data.currentIndex === 'number' && data.currentIndex >= 0) {
            this.currentStats.currentIndex = data.currentIndex;
        }
        
        // 计算时间（实时更新）
        if (this.currentStats.startTime) {
            this.currentStats.timeElapsed = Math.max(0, Math.floor((now - this.currentStats.startTime) / 1000));
        }
        
        // 实时计算所有指标
        this.calculateWPM();
        this.calculateCPM();
        this.calculateAccuracy();
        
        // 记录WPM历史（更频繁的记录）
        this.recordWPMHistory();
        
        // 实时验证数据一致性
        this.validateStatsConsistency();
        
        // 发射更新事件（包含完整的统计数据）
        this.emit('statsUpdated', this.getCurrentStats());
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
    
    // 验证统计数据一致性
    validateStatsConsistency() {
        // 确保数字字段的有效性
        this.currentStats.totalChars = Math.max(0, this.currentStats.totalChars || 0);
        this.currentStats.correctChars = Math.max(0, Math.min(this.currentStats.correctChars || 0, this.currentStats.totalChars));
        this.currentStats.incorrectChars = Math.max(0, this.currentStats.incorrectChars || 0);
        this.currentStats.currentIndex = Math.max(0, this.currentStats.currentIndex || 0);
        
        // 确保时间相关字段的有效性
        this.currentStats.timeElapsed = Math.max(0, this.currentStats.timeElapsed || 0);
        
        // 确保WPM和CPM不为负数或无穷大
        this.currentStats.wpm = Math.max(0, isFinite(this.currentStats.wpm) ? this.currentStats.wpm : 0);
        this.currentStats.cpm = Math.max(0, isFinite(this.currentStats.cpm) ? this.currentStats.cpm : 0);
        
        // 确保准确率在0-100范围内
        this.currentStats.accuracy = Math.max(0, Math.min(100, this.currentStats.accuracy || 100));
        
        // 验证错误数量一致性
        if (this.currentStats.incorrectChars !== this.currentStats.errors) {
            this.currentStats.errors = this.currentStats.incorrectChars;
        }
    }
    
    // 计算实时WPM（更平滑的计算）
    calculateRealTimeWPM() {
        if (!this.currentStats.startTime || this.currentStats.timeElapsed === 0) {
            return 0;
        }
        
        const timeInMinutes = this.currentStats.timeElapsed / 60;
        const words = this.currentStats.correctChars / 5;
        return Math.round(words / timeInMinutes) || 0;
    }
    
    // 计算实时CPM
    calculateRealTimeCPM() {
        if (!this.currentStats.startTime || this.currentStats.timeElapsed === 0) {
            return 0;
        }
        
        const timeInMinutes = this.currentStats.timeElapsed / 60;
        return Math.round(this.currentStats.correctChars / timeInMinutes) || 0;
    }
    
    // 计算实时准确率
    calculateRealTimeAccuracy() {
        if (this.currentStats.totalChars === 0) {
            return 100;
        }
        
        return Math.round((this.currentStats.correctChars / this.currentStats.totalChars) * 100);
    }
    
    // 获取目标文本长度（用于进度计算）
    getTargetTextLength() {
        // 从游戏引擎或配置中获取目标文本长度
        if (window.gameEngine && window.gameEngine.gameState && window.gameEngine.gameState.currentText) {
            return window.gameEngine.gameState.currentText.length;
        }
        return 0;
    }
    
    // 记录WPM历史（更频繁的记录）
    recordWPMHistory() {
        const interval = 2; // 每2秒记录一次，提高更新频率
        if (this.currentStats.timeElapsed > 0 && this.currentStats.timeElapsed % interval === 0) {
            // 避免重复记录相同时间点的数据
            const lastEntry = this.currentStats.wpmHistory[this.currentStats.wpmHistory.length - 1];
            if (!lastEntry || lastEntry.time !== this.currentStats.timeElapsed) {
                this.currentStats.wpmHistory.push({
                    time: this.currentStats.timeElapsed,
                    wpm: this.currentStats.wpm,
                    cpm: this.currentStats.cpm,
                    accuracy: this.currentStats.accuracy,
                    correctChars: this.currentStats.correctChars,
                    totalChars: this.currentStats.totalChars
                });
                
                // 限制历史记录长度，避免内存溢出
                if (this.currentStats.wpmHistory.length > 300) {
                    this.currentStats.wpmHistory = this.currentStats.wpmHistory.slice(-200);
                }
            }
        }
    }
    
    // 增强的错误记录
    recordError(position, expectedChar, actualChar) {
        // 验证输入参数
        if (typeof position !== 'number' || position < 0) {
            console.warn('Invalid error position:', position);
            return;
        }
        
        this.currentStats.errors++;
        this.currentStats.incorrectChars++;
        
        const errorRecord = {
            position,
            expected: expectedChar || '',
            actual: actualChar || '',
            timestamp: Date.now() - (this.currentStats.startTime || Date.now())
        };
        
        this.currentStats.errorPositions.push(errorRecord);
        
        // 限制错误记录数量
        if (this.currentStats.errorPositions.length > 500) {
            this.currentStats.errorPositions = this.currentStats.errorPositions.slice(-400);
        }
        
        // 实时发射错误事件
        this.emit('errorRecorded', {
            ...errorRecord,
            totalErrors: this.currentStats.errors,
            currentAccuracy: this.calculateRealTimeAccuracy()
        });
        
        // 触发统计更新
        this.emit('statsUpdated', this.getCurrentStats());
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
        // 返回深拷贝以避免外部修改
        const stats = JSON.parse(JSON.stringify(this.currentStats));
        
        // 实时计算进度百分比
        if (this.currentStats.mode === 'endless') {
            stats.progressPercentage = 0; // 无尽模式无进度
        } else {
            const targetLength = this.getTargetTextLength();
            if (targetLength > 0) {
                stats.progressPercentage = Math.min(100, Math.round((this.currentStats.currentIndex / targetLength) * 100));
            } else {
                stats.progressPercentage = 0;
            }
        }
        
        // 添加实时计算的额外指标
        stats.realTimeWPM = this.calculateRealTimeWPM();
        stats.realTimeCPM = this.calculateRealTimeCPM();
        stats.realTimeAccuracy = this.calculateRealTimeAccuracy();
        
        return stats;
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