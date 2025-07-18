/**
 * 简化重构的 Vue 主应用
 * 修复架构混乱问题，确保应用正常运行
 */

const VueTypingGameApp = {
    name: 'TypingGameApp',
    components: {
        GameControls: window.GameControls,
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
            
            // 强制更新状态
            gameState.value = { ...newGameState };
            textState.value = { ...newTextState };
            statsState.value = { ...newStatsState };
            wordsState.value = { ...newWordsState };
            racingState.value = { ...newRacingState };
            uiState.value = { ...newUiState };
            
            // 只在模式切换时输出日志
            if (newGameState.mode !== gameState.value?.mode) {
                console.log('🔄 模式已切换到:', newGameState.mode);
            }
        };
        
        // 订阅 GameStore 状态变化
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
        
        // 事件处理器
        const handleModeChanged = (mode) => {
            if (gameState.value.isPlaying) {
                console.log('⛔ 无法切换模式，游戏正在进行中');
                return;
            }
            
            console.log(`🎮 切换到 ${mode} 模式`);
            
            // 先更新模式
            gameStore.actions.setMode(mode);
            
            // 立即更新UI状态，确保界面切换
            if (['classic', 'words'].includes(mode)) {
                // 基础模式
                gameStore.updateState('ui.showRacing', false);
                gameStore.updateState('ui.showDefense', false);
                loadBasicModeData(); // 加载基础模式数据
            } else if (mode === 'racing') {
                // 赛车模式
                gameStore.updateState('ui.showRacing', true);
                gameStore.updateState('ui.showDefense', false);
                initRacingMode(); // 初始化赛车模式
            } else if (mode === 'defense') {
                // 防御模式
                gameStore.updateState('ui.showRacing', false);
                gameStore.updateState('ui.showDefense', true);
                initDefenseMode(); // 初始化防御模式
            }
            
            // 立即强制更新Vue状态
            updateVueState();
            
            // 再次确保状态同步
            setTimeout(() => {
                updateVueState();
            }, 100);
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
            
            // 禁用输入
            const textInput = document.getElementById('textInput');
            if (textInput) {
                textInput.disabled = true;
                textInput.value = '';
            }
        };
        
        const handleTextInput = (event) => {
            if (!gameState.value.isPlaying || gameState.value.isPaused) return;
            
            const inputValue = event.target.value;
            gameStore.actions.setUserInput(inputValue);
            
            // 使用游戏引擎处理输入
            if (window.gameEngine) {
                window.gameEngine.processInput(inputValue);
            }
            
            // 更新文本显示
            updateTextDisplay();
        };
        
        // 游戏逻辑方法
        const startBasicGame = async () => {
            try {
                console.log(`🎮 开始${gameState.value.mode}模式游戏`);
                
                // 确保数据已加载
                if (!textState.value.currentText) {
                    await loadBasicModeData();
                }
                
                // 启动游戏
                gameStore.actions.startGame();
                
                // 启用输入
                const textInput = document.getElementById('textInput');
                if (textInput) {
                    textInput.disabled = false;
                    textInput.focus();
                    textInput.value = '';
                }
                
                // 使用游戏引擎启动
                if (window.gameEngine) {
                    window.gameEngine.startGame();
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
        
        const loadBasicModeData = async () => {
            try {
                console.log(`📝 加载${gameState.value.mode}模式数据`);
                
                if (gameState.value.mode === 'classic') {
                    const response = await fetch('/api/texts');
                    const result = await response.json();
                    const texts = result.data || result;
                    const randomText = texts[Math.floor(Math.random() * texts.length)];
                    gameStore.actions.setText(randomText);
                    
                    console.log('📝 已加载文本:', randomText.substring(0, 50) + '...');
                    
                } else if (gameState.value.mode === 'words') {
                    const response = await fetch('/api/words');
                    const result = await response.json();
                    const words = result.data || result;
                    const selectedWords = words.slice(0, 50);
                    
                    // 更新单词状态
                    gameStore.updateState('words', {
                        wordsList: selectedWords,
                        totalWords: selectedWords.length,
                        currentWordIndex: 0,
                        wordsCompleted: 0
                    });
                    
                    const firstWord = selectedWords[0] || 'test';
                    gameStore.actions.setText(firstWord);
                    
                    console.log('📝 已加载单词模式，第一个单词:', firstWord);
                }
                
                // 更新文本显示
                updateTextDisplay();
                
                console.log(`✅ ${gameState.value.mode}模式数据加载成功`);
                
            } catch (error) {
                console.error('数据加载失败:', error);
                gameStore.actions.showNotification('数据加载失败', 'error');
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
        
        // 定期更新Vue状态以确保同步
        let stateUpdateInterval = null;
        
        // 生命周期钩子
        onMounted(() => {
            console.log('🎮 Vue 应用已挂载');
            
            // 初始化默认模式数据
            if (isBasicMode.value) {
                loadBasicModeData();
            }
            
            // 设置定期状态更新
            stateUpdateInterval = setInterval(updateVueState, 100); // 每100ms更新一次
            
            // 暴露全局Vue应用实例
            window.vueApp = {
                eventBus,
                instance: null,
                updateState: updateVueState // 暴露手动更新方法
            };
        });
        
        onUnmounted(() => {
            console.log('🎮 Vue 应用卸载');
            
            // 清理定时器
            if (stateUpdateInterval) {
                clearInterval(stateUpdateInterval);
                stateUpdateInterval = null;
            }
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
            handleTextInput
        };
    },
    template: `
        <div class="typing-game-app">
            <!-- 通知系统 -->
            <div v-if="uiState.notification.show" 
                 :class="['notification', 'notification-' + uiState.notification.type]">
                {{ uiState.notification.message }}
            </div>

            <!-- 游戏控制组件 -->
            <game-controls 
                :game-state="gameState"
                @mode-changed="handleModeChanged"
                @start-game="handleStartGame"
                @pause-game="handlePauseGame"
                @reset-game="handleResetGame"
            />
            
            <!-- 游戏统计组件 -->
            <game-stats :game-state="gameState" />
            
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
            <div v-if="isBasicMode" class="basic-game-area">
                <!-- 文本显示区域 -->
                <div class="text-display">
                    <div class="text-content">

                        
                        <div v-if="textState.highlightedText" 
                             v-html="textState.highlightedText">
                        </div>
                        <div v-else-if="textState.currentText">
                            {{ textState.currentText }}
                        </div>
                        <div v-else>
                            点击开始按钮开始游戏...
                        </div>
                    </div>
                </div>
                
                <!-- 输入区域 -->
                <div class="input-area">
                    <textarea
                        id="textInput"
                        class="text-input" 
                        placeholder="在这里输入文本..."
                        :disabled="!gameState.isPlaying"
                        v-model="textState.userInput"
                        @input="handleTextInput"
                    ></textarea>
                </div>
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