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
        const { ref, reactive, computed, watch, onMounted, onUnmounted, provide } = Vue;
        
        // 使用统一的游戏状态管理
        const gameStore = window.gameStore;
        const errorHandler = window.errorHandler;
        const performanceMonitor = window.performanceMonitor;
        
        // 创建事件总线
        const eventBus = new Utils.EventEmitter();
        provide('eventBus', eventBus);
        
        // 响应式状态 - 直接使用 ref 而不是 computed
        const gameState = ref(gameStore.getState('game'));
        const textState = ref(gameStore.getState('text'));
        const statsState = ref(gameStore.getState('stats'));
        const wordsState = ref(gameStore.getState('words'));
        const racingState = ref(gameStore.getState('racing'));
        const uiState = ref(gameStore.getState('ui'));
        
        // 监听 GameStore 状态变化并更新 Vue 状态
        const updateVueState = () => {
            const newGameState = gameStore.getState('game');
            const newTextState = gameStore.getState('text');
            const newStatsState = gameStore.getState('stats');
            const newWordsState = gameStore.getState('words');
            const newRacingState = gameStore.getState('racing');
            const newUiState = gameStore.getState('ui');
            
            // 更新状态，但不覆盖userInput（由v-model管理）
            gameState.value = { ...newGameState };
            textState.value = { 
                ...newTextState,
                userInput: textState.value.userInput // 保留Vue管理的userInput
            };
            statsState.value = { ...newStatsState };
            wordsState.value = { ...newWordsState };
            racingState.value = { ...newRacingState };
            uiState.value = { ...newUiState };
            
            // 只在模式切换时输出日志
            if (newGameState.mode !== gameState.value?.mode) {
                console.log('🔄 模式已切换到:', newGameState.mode);
            }
        };
        
        // 订阅 GameStore 状态变化 - 完全同步
        gameStore.subscribe(() => {
            gameState.value = { ...gameStore.getState('game') };
            textState.value = { ...gameStore.getState('text') };
            statsState.value = { ...gameStore.getState('stats') };
            wordsState.value = { ...gameStore.getState('words') };
            racingState.value = { ...gameStore.getState('racing') };
            uiState.value = { ...gameStore.getState('ui') };
        });
        
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
        const handleModeChanged = async (mode) => {
            if (gameState.value.isPlaying) {
                console.log('⛔ 无法切换模式，游戏正在进行中');
                return;
            }
            
            console.log(`🎮 切换到 ${mode} 模式`);
            
            // 统一由game-engine处理模式切换
            if (window.gameEngine) {
                window.gameEngine.setMode(mode);
            } else {
                // 后备方案
                gameStore.actions.setMode(mode);
            }
            
            // 更新UI状态
            if (mode === 'racing') {
                gameStore.updateState('ui.showRacing', true);
                gameStore.updateState('ui.showDefense', false);
            } else if (mode === 'defense') {
                gameStore.updateState('ui.showRacing', false);
                gameStore.updateState('ui.showDefense', true);
            } else {
                gameStore.updateState('ui.showRacing', false);
                gameStore.updateState('ui.showDefense', false);
            }
            
            // 强制更新Vue状态
            await Vue.nextTick();
            updateVueState();
        };
        
        const handleStartGame = () => {
            console.log(`🎮 开始${gameState.value.mode}模式游戏`);
            
            if (isBasicMode.value) {
                startBasicGame();
            } else if (isRacingMode.value) {
                startRacingGame();
            } else if (isDefenseMode.value) {
                startDefenseGame();
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
                
                // 等待Vue更新DOM后聚焦输入框
                await Vue.nextTick();
                
                const textInput = document.getElementById('textInput');
                if (textInput) {
                    textInput.focus();
                }
                
                console.log('✅ 游戏启动成功');
                
            } catch (error) {
                console.error('游戏启动失败:', error);
                gameStore.actions.showNotification('游戏启动失败', 'error');
            }
        };
        
        const startRacingGame = async () => {
            try {
                console.log('🏎️ 启动赛车追逐模式');
                
                // 设置赛车模式的文本
                const response = await fetch('/api/texts');
                const result = await response.json();
                const texts = result.data || result;
                const shortText = texts.find(text => text.length < 200) || texts[0];
                gameStore.actions.setText(shortText);
                
                // 启动游戏
                gameStore.actions.startGame();
                gameStore.updateState('ui.showRacing', true);
                
                // 启用输入
                const textInput = document.getElementById('textInput');
                if (textInput) {
                    textInput.disabled = false;
                    textInput.focus();
                    textInput.value = '';
                }
                
                console.log('✅ 赛车模式启动成功');
                
            } catch (error) {
                console.error('赛车模式启动失败:', error);
                gameStore.actions.showNotification('赛车模式启动失败', 'error');
            }
        };
        
        const startDefenseGame = async () => {
            try {
                console.log('🌱 启动植物防御模式');
                
                // 启动游戏
                gameStore.actions.startGame();
                gameStore.updateState('ui.showDefense', true);
                
                console.log('✅ 植物防御模式启动成功');
                
            } catch (error) {
                console.error('植物防御模式启动失败:', error);
                gameStore.actions.showNotification('植物防御模式启动失败', 'error');
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
        
        // 初始化赛车模式
        const initRacingMode = () => {
            console.log('🏎️ 初始化赛车追逐模式');
            
            // 清除基础模式的文本
            gameStore.actions.setText('');
            gameStore.updateState('text.userInput', '');
            gameStore.updateState('text.highlightedText', '');
            
            // 设置赛车模式UI状态
            gameStore.updateState('ui.showRacing', true);
            gameStore.updateState('ui.showDefense', false);
            
            console.log('✅ 赛车模式初始化完成');
        };
        
        // 初始化防御模式
        const initDefenseMode = () => {
            console.log('🌱 初始化植物防御模式');
            
            // 清除基础模式的文本
            gameStore.actions.setText('');
            gameStore.updateState('text.userInput', '');
            gameStore.updateState('text.highlightedText', '');
            
            // 设置防御模式UI状态
            gameStore.updateState('ui.showRacing', false);
            gameStore.updateState('ui.showDefense', true);
            
            console.log('✅ 植物防御模式初始化完成');
        };
        
        // 生命周期钩子
        onMounted(() => {
            console.log('🎮 Vue 应用已挂载');
            
            // 暴露全局Vue应用实例
            window.vueApp = {
                eventBus,
                instance: null
            };
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
            racingState,
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