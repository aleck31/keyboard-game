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
        const { ref, computed, watch, onMounted, onUnmounted } = Vue;
        // 响应式数据
        const stats = ref({
            wpm: 0,
            cpm: 0,
            accuracy: 100,
            timeElapsed: 0,
            errors: 0,
            currentIndex: 0,
            totalChars: 0
        });
        
        // 计算属性
        const formattedTime = computed(() => {
            const time = stats.value.timeElapsed;
            const minutes = Math.floor(time / 60);
            const seconds = time % 60;
            return `${minutes}:${seconds.toString().padStart(2, '0')}`;
        });
        
        const progressPercentage = computed(() => {
            if (props.gameState.mode === 'words' && props.gameState.totalWords > 0) {
                // 单词模式：基于完成的单词数
                return (props.gameState.wordsCompleted / props.gameState.totalWords) * 100;
            } else if (stats.value.currentIndex !== undefined && stats.value.totalChars > 0) {
                // 其他模式：基于字符数，但只有在有有效数据时才计算
                return (stats.value.currentIndex / stats.value.totalChars) * 100;
            }
            return 0;
        });
        
        const progressWidth = computed(() => {
            return Math.min(Math.max(progressPercentage.value, 0), 100) + '%';
        });
        
        // 更新统计数据
        const updateStats = () => {
            if (window.statsManager) {
                const currentStats = window.statsManager.getCurrentStats();
                if (currentStats) {
                    stats.value = { ...currentStats };
                }
            }
        };
        
        // 定时器
        let updateInterval = null;
        
        onMounted(() => {
            updateInterval = setInterval(updateStats, 100);
        });
        
        onUnmounted(() => {
            if (updateInterval) {
                clearInterval(updateInterval);
            }
        });
        
        return {
            stats,
            formattedTime,
            progressWidth,
            progressPercentage
        };
    },
    template: `
        <div class="stats-container">           
            <!-- 统计面版 -->
            <div class="stats-panel">
                <div class="stat-item">
                    <span class="stat-label">CPM</span>
                    <span class="stat-value">{{ stats.cpm }}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">WPM</span>
                    <span class="stat-value">{{ stats.wpm }}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">错误</span>
                    <span class="stat-value">{{ stats.errors }}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">准确率</span>
                    <span class="stat-value">{{ stats.accuracy }}%</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">时间</span>
                    <span class="stat-value">{{ formattedTime }}</span>
                </div>
            </div>
            <!-- 进度条 -->
            <div class="progress-container">
                <div class="progress-bar" :style="{ width: progressWidth }"></div>
            </div>
        </div>
    `
};

// 导出组件
window.GameStats = GameStats;
