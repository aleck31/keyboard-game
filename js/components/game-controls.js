// 游戏控制组件
const GameControls = {
    name: 'GameControls',
    props: {
        gameState: {
            type: Object,
            required: true
        }
    },
    emits: ['mode-changed', 'start-game', 'pause-game', 'reset-game'],
    setup(props, { emit }) {
        const { ref, computed } = Vue;
        
        // 游戏模式配置
        const gameModes = ref([
            { key: 'classic', label: '经典模式', icon: '📝', type: 'basic' },
            { key: 'words', label: '单词模式', icon: '🔤', type: 'basic' },
            { key: 'racing', label: '赛车追逐', icon: '🏎️', type: 'special' },
            { key: 'defense', label: '植物防御', icon: '🌱', type: 'special' }
        ]);
        
        // 计算属性
        const currentMode = computed(() => props.gameState.mode);
        
        const currentModeConfig = computed(() => {
            return gameModes.value.find(mode => mode.key === currentMode.value);
        });
        
        const isBasicMode = computed(() => {
            return currentModeConfig.value?.type === 'basic';
        });
        
        const isSpecialMode = computed(() => {
            return currentModeConfig.value?.type === 'special';
        });
        
        const startButtonText = computed(() => {
            if (props.gameState.isPlaying) {
                return '游戏中...';
            }
            return '开始游戏';
        });
        
        const pauseButtonText = computed(() => {
            return props.gameState.isPaused ? '继续' : '暂停';
        });
        
        const startButtonDisabled = computed(() => {
            return props.gameState.isPlaying;
        });
        
        const pauseButtonDisabled = computed(() => {
            return !props.gameState.isPlaying;
        });
        
        const showStartButton = computed(() => {
            // 只有基础模式显示开始按钮，特殊模式由各自组件控制
            return isBasicMode.value;
        });
        
        const showPauseResetButtons = computed(() => {
            // 所有模式都显示暂停和重置按钮
            return true;
        });
        
        // 方法
        const selectMode = (mode) => {
            if (props.gameState.isPlaying) return;
            emit('mode-changed', mode);
        };
        
        const startGame = () => {
            if (isBasicMode.value) {
                emit('start-game');
            }
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
            currentModeConfig,
            isBasicMode,
            isSpecialMode,
            startButtonText,
            pauseButtonText,
            startButtonDisabled,
            pauseButtonDisabled,
            showStartButton,
            showPauseResetButtons,
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
                    :class="{ 
                        active: currentMode === mode.key,
                        'basic-mode': mode.type === 'basic',
                        'special-mode': mode.type === 'special'
                    }"
                    :disabled="gameState.isPlaying"
                    @click="selectMode(mode.key)"
                >
                    <span class="mode-icon">{{ mode.icon }}</span>
                    {{ mode.label }}
                </button>
            </div>
            
            <!-- 游戏控制按钮 -->
            <div class="game-controls" v-if="showStartButton || showPauseResetButtons">
                <!-- 开始按钮 (仅基础模式显示) -->
                <button 
                    v-if="showStartButton"
                    class="btn btn-primary" 
                    :disabled="startButtonDisabled"
                    @click="startGame"
                >
                    {{ startButtonText }}
                </button>
                
                <!-- 暂停按钮 (所有模式显示) -->
                <button 
                    v-if="showPauseResetButtons"
                    class="btn btn-secondary" 
                    :disabled="pauseButtonDisabled"
                    @click="pauseGame"
                >
                    {{ pauseButtonText }}
                </button>
                
                <!-- 重置按钮 (所有模式显示) -->
                <button 
                    v-if="showPauseResetButtons"
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
