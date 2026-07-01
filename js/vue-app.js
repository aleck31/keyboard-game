/**
 * 简化重构的 Vue 主应用
 * 修复架构混乱问题，确保应用正常运行
 */

const VueTypingGameApp = {
    name: 'TypingGameApp',
    components: {
        ModeSelector: window.ModeSelector,
        DifficultySelector: window.DifficultySelector,
        GameButtons: window.GameButtons,
        GameStats: window.GameStats,
        RacingTrack: window.RacingTrack,
        DefenseGame: window.DefenseGame,
        AppUtils: window.AppUtils
    },
    setup() {
        const { ref, reactive, computed, watch, onMounted, onUnmounted } = Vue;

        // 使用统一的游戏状态管理
        const gameStore = window.gameStore;
        const errorHandler = window.errorHandler;
        const performanceMonitor = window.performanceMonitor;

        // 响应式状态 - 直接使用 ref 而不是 computed
        const gameState = ref(gameStore.getState('game'));
        const textState = ref(gameStore.getState('text'));
        const statsState = ref(gameStore.getState('stats'));
        const wordsState = ref(gameStore.getState('words'));
        const uiState = ref(gameStore.getState('ui'));

        // 监听 GameStore 状态变化并更新 Vue 状态（唯一同步入口）
        const updateVueState = () => {
            const newGameState = gameStore.getState('game');

            // 更新状态，但不覆盖userInput（若未来引入v-model输入框，由其管理）
            gameState.value = { ...newGameState };
            textState.value = {
                ...gameStore.getState('text'),
                userInput: textState.value.userInput
            };
            statsState.value = { ...gameStore.getState('stats') };
            wordsState.value = { ...gameStore.getState('words') };
            uiState.value = { ...gameStore.getState('ui') };
        };

        // 订阅 GameStore 状态变化 - 完全同步
        gameStore.subscribe(updateVueState);
        
        // 模式计算属性
        const isBasicMode = computed(() => {
            return ['classic', 'words'].includes(gameState.value.mode);
        });
        
        const isSpecialMode = computed(() => {
            return ['racing', 'defense'].includes(gameState.value.mode);
        });
        
        const isDefenseMode = computed(() => gameState.value.mode === 'defense');
        const isRacingMode = computed(() => gameState.value.mode === 'racing');
        
        const formattedTime = computed(() => {
            const gameState = gameStore.getState('game');
            if (!gameState.startTime) return '0:00';
            const elapsed = Math.floor((Date.now() - gameState.startTime) / 1000);
            const minutes = Math.floor(elapsed / 60);
            const seconds = elapsed % 60;
            return `${minutes}:${seconds.toString().padStart(2, '0')}`;
        });
        
        // 事件处理器
        const handleModeChanged = (mode) => {
            if (gameState.value.isPlaying) {
                console.log('⛔ 无法切换模式，游戏正在进行中');
                return;
            }

            console.log(`🎮 切换到 ${mode} 模式`);

            // 统一由game-engine处理模式切换（其内部会调用 gameStore.actions.setMode，
            // 该 action 已经会更新 ui.showRacing/showDefense，无需在此重复）
            if (window.gameEngine) {
                window.gameEngine.setMode(mode);
            } else {
                gameStore.actions.setMode(mode);
            }
        };
        
        const handleStartGame = () => {
            console.log(`🎮 开始${gameState.value.mode}模式游戏`);

            if (isBasicMode.value) {
                startBasicGame();
            }
        };
        
        const handlePauseGame = () => {
            if (gameState.value.isPlaying) {
                gameStore.actions.pauseGame();
                console.log(`⏸️ ${gameState.value.mode}模式已暂停`);
            } else if (gameState.value.isPaused) {
                gameStore.actions.resumeGame();
                console.log(`▶️ ${gameState.value.mode}模式已继续`);
            }
        };
        
        const handleResetGame = () => {
            console.log(`🔄 重置${gameState.value.mode}模式游戏`);
            gameStore.actions.resetGame();
            
            // 隐藏特殊模式UI
            gameStore.updateState('ui.showRacing', false);
            gameStore.updateState('ui.showDefense', false);
        };
        
        const handleDifficultyChanged = (difficulty) => {
            console.log(`🎯 难度切换到: ${difficulty}`);
            gameStore.updateState('game.difficulty', difficulty);
        };
        
        const handleTimeLimitChanged = (timeLimit) => {
            console.log(`⏱️ 时间限制切换到: ${timeLimit}秒`);
            gameStore.updateState('game.timeLimit', timeLimit);
        };
        
        // 游戏逻辑方法
        const startBasicGame = async () => {
            try {
                console.log(`🎮 开始${gameState.value.mode}模式游戏`);
                
                // 统一由game-engine处理启动逻辑
                if (window.gameEngine) {
                    window.gameEngine.startGame();
                } else {
                    console.error('❌ GameEngine未初始化');
                    gameStore.actions.showNotification('游戏引擎未初始化', 'error');
                    return;
                }
                
                // 等待Vue更新DOM
                await Vue.nextTick();

                console.log('✅ 游戏启动成功');
                
            } catch (error) {
                console.error('游戏启动失败:', error);
                gameStore.actions.showNotification('游戏启动失败', 'error');
            }
        };
        
        const updateTextDisplay = () => {
            try {
                // 使用游戏商店的文本高亮功能
                gameStore.updateTextHighlight();
                // 立即更新Vue状态
                updateVueState();
            } catch (error) {
                console.error('更新文本显示失败:', error);
            }
        };
        
        // 生命周期钩子
        onMounted(() => {
            console.log('🎮 Vue 应用已挂载');
        });
        
        onUnmounted(() => {
            console.log('🎮 Vue 应用卸载');
        });
        
        return {
            // 状态
            gameState,
            textState,
            statsState,
            wordsState,
            uiState,

            // 计算属性
            isBasicMode,
            isSpecialMode,
            isDefenseMode,
            isRacingMode,
            
            // 方法
            handleModeChanged,
            handleStartGame,
            handlePauseGame,
            handleResetGame,
            handleDifficultyChanged,
            handleTimeLimitChanged,
            formattedTime
        };
    },
    template: `
        <div class="typing-game-app">
            <!-- 通知系统 -->
            <div v-if="uiState.notification.show" 
                 :class="['notification', 'notification-' + uiState.notification.type]">
                {{ uiState.notification.message }}
            </div>

            <!-- 模式选择器 -->
            <mode-selector 
                :game-state="gameState"
                @mode-changed="handleModeChanged"
            />
            
            <!-- 赛车追逐组件 -->
            <racing-track
                v-if="isRacingMode"
                :game-state="gameState"
                :stats-state="statsState"
                :text-state="textState"
                :is-visible="uiState.showRacing"
            />
            
            <!-- 植物防御组件 -->
            <defense-game 
                v-if="isDefenseMode"
                :game-state="gameState"
                :is-visible="uiState.showDefense"
            />
            
            <!-- 基础游戏区域 -->
            <div v-if="isBasicMode" class="basic-game-container">
                <!-- 游戏统计信息（复用GameStats组件） -->
                <game-stats :game-state="gameState" class="basic-stats-inline" />
                
                <!-- 文本显示区域 -->
                <div class="text-display">
                    <div class="text-content">
                        <div v-if="textState.highlightedText" 
                             v-html="textState.highlightedText">
                        </div>
                        <div v-else-if="textState.currentText">
                            {{ textState.currentText }}
                        </div>
                        <div v-else class="text-placeholder">
                            点击开始按钮开始游戏...
                        </div>
                    </div>
                </div>
                
                <!-- 难度选择器 -->
                <difficulty-selector
                    :game-state="gameState"
                    @difficulty-changed="handleDifficultyChanged"
                    @time-limit-changed="handleTimeLimitChanged"
                />
                
                <!-- 游戏控制按钮 -->
                <game-buttons
                    :game-state="gameState"
                    @start-game="handleStartGame"
                    @pause-game="handlePauseGame"
                    @reset-game="handleResetGame"
                />
            </div>
            
            <!-- AppUtils组件 -->
            <app-utils />
        </div>
    `
};

// 初始化函数
window.initVueApp = () => {
    try {
        const { createApp } = Vue;
        const app = createApp(VueTypingGameApp);
        
        // 全局错误处理
        app.config.errorHandler = (err, vm, info) => {
            console.error('Vue Error:', err);
            if (window.errorHandler) {
                window.errorHandler.handleError(window.errorHandler.createError('vue', err.message, {
                    componentInfo: info,
                    stack: err.stack
                }));
            }
        };
        
        app.mount('#vue-app');
        console.log('✅ Vue 应用初始化成功');
        
    } catch (error) {
        console.error('Vue应用初始化失败:', error);
        if (window.errorHandler) {
            window.errorHandler.handleError(window.errorHandler.createError('vue', 'Vue应用初始化失败', {
                error: error.message
            }));
        }
    }
};

// 导出供其他模块使用
if (typeof module !== 'undefined' && module.exports) {
    module.exports = VueTypingGameApp;
}