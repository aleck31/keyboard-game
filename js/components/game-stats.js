// 游戏统计组件
const GameStats = {
    name: 'GameStats',
    props: {
        gameState: {
            type: Object,
            required: true
        }
    },
    setup(props) {
        const { ref, computed, watch, onMounted, onUnmounted, reactive } = Vue;
        
        // 响应式数据
        const stats = reactive({
            wpm: 0,
            cpm: 0,
            accuracy: 100,
            timeElapsed: 0,
            errors: 0,
            currentIndex: 0,
            totalChars: 0,
            correctChars: 0,
            incorrectChars: 0,
            progressPercentage: 0,
            lastUpdateTime: Date.now()
        });
        
        // 计算属性
        const formattedTime = computed(() => {
            const time = stats.timeElapsed;
            const minutes = Math.floor(time / 60);
            const seconds = time % 60;
            return `${minutes}:${seconds.toString().padStart(2, '0')}`;
        });
        
        const progressPercentage = computed(() => {
            const mode = props.gameState.mode;
            
            if (mode === 'words') {
                // 单词模式：基于时间进度
                const timeLimit = props.gameState.timeLimit;
                const elapsed = stats.timeElapsed;
                if (!timeLimit) return 0;
                return Math.min(100, Math.round((elapsed / timeLimit) * 100));
            } else {
                // 经典模式：基于输入进度 - 从 gameStore 获取 text 状态
                if (window.gameStore) {
                    const textState = window.gameStore.getState('text');
                    if (textState.currentText && textState.currentText.length > 0) {
                        return Math.min(100, Math.round((textState.userInput.length / textState.currentText.length) * 100));
                    }
                }
                return 0;
            }
        });
        
        const progressWidth = computed(() => {
            return Math.min(Math.max(progressPercentage.value, 0), 100) + '%';
        });
        
        const formattedWPM = computed(() => {
            return Math.round(stats.wpm);
        });
        
        const formattedCPM = computed(() => {
            return Math.round(stats.cpm);
        });
        
        const formattedAccuracy = computed(() => {
            // 确保准确率在0-100范围内，并格式化为最多一位小数
            return Math.min(100, Math.max(0, stats.accuracy)).toFixed(1);
        });
        
        // 更新统计数据 - 增加更新频率和数据验证
        const updateStats = () => {
            if (!window.statsManager) return;
            
            try {
                const currentStats = window.statsManager.getCurrentStats();
                if (currentStats && typeof currentStats === 'object') {
                    // 更新基础统计数据，添加数据验证
                    stats.wpm = isFinite(currentStats.wpm) ? Math.max(0, currentStats.wpm) : 0;
                    stats.cpm = isFinite(currentStats.cpm) ? Math.max(0, currentStats.cpm) : 0;
                    stats.accuracy = isFinite(currentStats.accuracy) ? 
                        Math.min(100, Math.max(0, currentStats.accuracy)) : 100;
                    stats.timeElapsed = isFinite(currentStats.timeElapsed) ? 
                        Math.max(0, currentStats.timeElapsed) : 0;
                    stats.errors = isFinite(currentStats.errors) ? Math.max(0, currentStats.errors) : 0;
                    stats.currentIndex = isFinite(currentStats.currentIndex) ? 
                        Math.max(0, currentStats.currentIndex) : 0;
                    stats.totalChars = isFinite(currentStats.totalChars) ? 
                        Math.max(0, currentStats.totalChars) : 0;
                    stats.correctChars = isFinite(currentStats.correctChars) ? 
                        Math.max(0, currentStats.correctChars) : 0;
                    stats.incorrectChars = isFinite(currentStats.incorrectChars) ? 
                        Math.max(0, currentStats.incorrectChars) : 0;
                    
                    // 使用 statsManager 计算的进度
                    if (typeof currentStats.progressPercentage === 'number') {
                        stats.progressPercentage = Math.min(100, Math.max(0, currentStats.progressPercentage));
                    }
                    
                    // 记录更新时间
                    stats.lastUpdateTime = Date.now();
                }
            } catch (err) {
                console.error('Error updating stats:', err);
            }
        };
        
        // 游戏状态变化监听
        watch(() => props.gameState.isPlaying, (isPlaying) => {
            if (isPlaying) {
                // 游戏开始时重置统计数据
                stats.wpm = 0;
                stats.cpm = 0;
                stats.accuracy = 100;
                stats.errors = 0;
            }
        });
        
        // 实时模式监听，确保在不同模式下正确显示统计
        watch(() => props.gameState.mode, () => {
            updateStats(); // 模式变化时立即更新统计
        });
        
        // 订阅 GameStore 状态变化（gameEngine 的更新循环每 100ms 驱动一次 calculateStats）
        let unsubscribe = null;

        onMounted(() => {
            // 初始化更新
            updateStats();

            if (window.gameStore) {
                unsubscribe = window.gameStore.subscribe(updateStats);
            }
        });

        onUnmounted(() => {
            if (unsubscribe) {
                unsubscribe();
            }
        });
        
        return {
            stats,
            formattedTime,
            progressWidth,
            progressPercentage,
            formattedWPM,
            formattedCPM,
            formattedAccuracy
        };
    },
    template: `
        <div class="basic-stats">
            <!-- 统计面版 -->
            <div class="stat-item">
                <span class="stat-icon">⚡</span>
                <span class="stat-label">WPM</span>
                <span class="stat-value">{{ formattedWPM }}</span>
            </div>
            <div class="stat-item">
                <span class="stat-icon">📝</span>
                <span class="stat-label">CPM</span>
                <span class="stat-value">{{ formattedCPM }}</span>
            </div>
            <div class="stat-item">
                <span class="stat-icon">❌</span>
                <span class="stat-label">错误</span>
                <span class="stat-value">{{ stats.errors }}</span>
            </div>
            <div class="stat-item">
                <span class="stat-icon">🎯</span>
                <span class="stat-label">准确率</span>
                <span class="stat-value">{{ formattedAccuracy }}%</span>
            </div>
            <div class="stat-item">
                <span class="stat-icon">⏱️</span>
                <span class="stat-label">时间</span>
                <span class="stat-value">{{ formattedTime }}</span>
            </div>
            <!-- 进度条 -->
            <div class="progress-container">
                <div class="progress-bar">
                    <div class="progress-fill" :style="{ width: progressPercentage + '%' }"></div>
                </div>
                <div class="progress-text">{{ progressPercentage }}%</div>
            </div>
        </div>
    `
};

// 导出组件
window.GameStats = GameStats;