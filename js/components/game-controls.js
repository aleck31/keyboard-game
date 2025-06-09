// 游戏控制组件
const { ref, computed } = Vue;

const GameControls = {
    name: 'GameControls',
    props: {
        gameState: {
            type: Object,
            required: true
        }
    },
    emits: ['start-game', 'pause-game', 'reset-game', 'mode-changed'],
    setup(props, { emit }) {
        // 游戏模式配置
        const gameModes = ref([
            { key: 'classic', label: '经典模式', icon: '📝' },
            { key: 'words', label: '单词模式', icon: '🔤' },
            { key: 'racing', label: '赛车追逐', icon: '🏎️' },
            { key: 'defense', label: '植物防御', icon: '🌱' },
            { key: 'endless', label: '无尽模式', icon: '♾️' }
        ]);
        
        const currentMode = ref('classic');
        
        // 计算属性
        const startButtonText = computed(() => {
            return props.gameState.isPlaying ? '游戏中...' : '开始游戏';
        });
        
        const pauseButtonText = computed(() => {
            return props.gameState.isPaused ? '继续' : '暂停';
        });
        
        const startButtonDisabled = computed(() => {
            return props.gameState.isPlaying;
        });
        
        const pauseButtonDisabled = computed(() => {
            return !props.gameState.isPlaying || props.gameState.isCompleted;
        });
        
        // 方法
        const selectMode = (mode) => {
            if (!props.gameState.isPlaying) {
                currentMode.value = mode;
                emit('mode-changed', mode);
            }
        };
        
        const startGame = () => {
            emit('start-game');
        };
        
        const pauseGame = () => {
            emit('pause-game');
        };
        
        const resetGame = () => {
            emit('reset-game');
        };
        
        return {
            gameModes,
            currentMode,
            startButtonText,
            pauseButtonText,
            startButtonDisabled,
            pauseButtonDisabled,
            selectMode,
            startGame,
            pauseGame,
            resetGame
        };
    },
    template: `
        <div class="game-controls-container">
            <!-- 模式选择器 -->
            <div class="mode-selector">
                <button 
                    v-for="mode in gameModes" 
                    :key="mode.key"
                    class="mode-btn"
                    :class="{ active: currentMode === mode.key }"
                    :disabled="gameState.isPlaying"
                    @click="selectMode(mode.key)"
                >
                    <span class="mode-icon">{{ mode.icon }}</span>
                    {{ mode.label }}
                </button>
            </div>
            
            <!-- 游戏控制按钮 -->
            <div class="game-controls">
                <button 
                    class="btn btn-primary" 
                    :disabled="startButtonDisabled"
                    @click="startGame"
                >
                    {{ startButtonText }}
                </button>
                <button 
                    class="btn btn-secondary" 
                    :disabled="pauseButtonDisabled"
                    @click="pauseGame"
                >
                    {{ pauseButtonText }}
                </button>
                <button 
                    class="btn btn-secondary" 
                    @click="resetGame"
                >
                    结束游戏
                </button>
            </div>
        </div>
    `
};

// 导出组件
window.GameControls = GameControls;
