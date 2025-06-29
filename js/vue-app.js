// Vue主应用
const TypingGameApp = {
    name: 'TypingGameApp',
    components: {
        GameControls: window.GameControls,
        GameStats: window.GameStats,
        RacingTrack: window.RacingTrack,
        DefenseGame: window.DefenseGame,
        AppUtils: window.AppUtils
    },
    setup() {
        const { ref, reactive, computed, watch, onMounted } = Vue;
        
        // 游戏状态 (响应式)
        const gameState = reactive({
            isPlaying: false,
            isPaused: false,
            isCompleted: false,
            mode: 'classic',
            startTime: null,
            endTime: null,
            timeLimit: 60,
            currentText: '',
            userInput: '',
            currentIndex: 0,
            // Text highlighting display data
            highlightedText: '',
            renderKey: 0,
            // 统计数据
            wpm: 0,
            cpm: 0,
            accuracy: 100,
            errors: 0,
            correctChars: 0,
            totalChars: 0,
            // 单词模式状态
            currentWordIndex: 0,
            totalWords: 0,
            wordsCompleted: 0,
            wordsList: []
        });
        
        // Game engine and stats manager references
        const gameEngine = ref(null);
        const statsManager = ref(null);
        const realTimeStats = reactive({
            wpm: 0,
            cpm: 0,
            accuracy: 100,
            errors: 0,
            correctChars: 0,
            totalChars: 0,
            progressPercentage: 0
        });
        
        // UI状态
        const uiState = reactive({
            showRacing: false,
            showDefense: false,
            showResults: false,
            notification: {
                show: false,
                message: '',
                type: 'info'
            }
        });
        
        // 计算属性
        const isBasicMode = computed(() => {
            return ['classic', 'words', 'endless'].includes(gameState.mode);
        });
        
        const isSpecialMode = computed(() => {
            return ['racing', 'defense'].includes(gameState.mode);
        });
        
        const isDefenseMode = computed(() => {
            return gameState.mode === 'defense';
        });
        
        const isRacingMode = computed(() => {
            return gameState.mode === 'racing';
        });
        
        const progress = computed(() => {
            if (gameState.currentText.length === 0) return 0;
            return Math.round((gameState.currentIndex / gameState.currentText.length) * 100);
        });
        
        const timeElapsed = computed(() => {
            if (!gameState.startTime) return 0;
            const endTime = gameState.endTime || Date.now();
            return Math.floor((endTime - gameState.startTime) / 1000);
        });
        
        // Watch for input changes to update display
        watch(() => gameState.userInput, (newInput) => {
            if (gameState.isPlaying && !gameState.isPaused) {
                handleTextInput({ target: { value: newInput } });
            }
        });

        // Watch for mode changes to reinitialize
        watch(() => gameState.mode, (newMode) => {
            if (gameEngine.value) {
                gameEngine.value.setMode(newMode);
            }
            updateTextDisplay();
        });
        
        // 方法
        const handleModeChanged = (mode) => {
            if (gameState.isPlaying) return;
            
            console.log(`🎮 切换到${mode}模式`);
            gameState.mode = mode;
            
            // 重置UI状态
            uiState.showRacing = mode === 'racing';
            uiState.showDefense = mode === 'defense';
            uiState.showResults = false;
            
            // 重置游戏状态
            resetGameState();
            
            // 根据模式加载相应数据
            if (isBasicMode.value) {
                loadBasicModeData();
            }
        };
        
        const handleStartGame = () => {
            if (!isBasicMode.value) return;
            
            console.log(`🎮 开始${gameState.mode}模式游戏`);
            startBasicGame();
        };
        
        const handlePauseGame = () => {
            if (gameState.isPlaying) {
                pauseGame();
            } else if (gameState.isPaused) {
                resumeGame();
            }
        };
        
        const handleResetGame = () => {
            console.log('🔄 重置游戏');
            resetGame();
        };
        
        const handleDefenseGameOver = (result) => {
            console.log('🌱 植物防御游戏结束', result);
            gameState.isPlaying = false;
            gameState.isCompleted = true;
            gameState.endTime = Date.now();
            
            showNotification(
                result.victory ? '🏆 防御成功！' : '💀 防御失败！',
                result.victory ? 'success' : 'error'
            );
        };
        
        const handleRaceFinished = (result) => {
            console.log('🏎️ 赛车比赛结束', result);
            gameState.isPlaying = false;
            gameState.isCompleted = true;
            gameState.endTime = Date.now();
            
            const rankText = ['🥇 第一名', '🥈 第二名', '🥉 第三名', '4️⃣ 第四名'];
            showNotification(
                `🏁 比赛结束！${rankText[result.finalRank - 1]}`,
                result.finalRank === 1 ? 'success' : 'info'
            );
        };
        
        // 基础游戏逻辑
        const startBasicGame = async () => {
            try {
                gameState.isPlaying = true;
                gameState.isPaused = false;
                gameState.isCompleted = false;
                gameState.startTime = Date.now();
                gameState.endTime = null;
                gameState.userInput = '';
                gameState.currentIndex = 0;
                
                // Initialize game engine and stats manager
                if (gameEngine.value) {
                    gameEngine.value.startGame();
                    gameEngine.value.setCurrentText(gameState.currentText);
                }
                
                if (statsManager.value) {
                    statsManager.value.startSession(gameState.mode);
                }
                
                // 启用输入
                const textInput = document.getElementById('textInput');
                if (textInput) {
                    textInput.disabled = false;
                    textInput.focus();
                    textInput.value = '';
                }
                
                // Start real-time updates
                startRealTimeUpdates();
                startGameTimer();
                
                showNotification('游戏开始！', 'success');
                
            } catch (error) {
                console.error('启动游戏失败:', error);
                showNotification('启动游戏失败', 'error');
            }
        };
        
        const pauseGame = () => {
            gameState.isPaused = true;
            showNotification('游戏已暂停', 'info');
        };
        
        const resumeGame = () => {
            gameState.isPaused = false;
            showNotification('游戏继续', 'info');
        };
        
        const resetGame = () => {
            gameState.isPlaying = false;
            gameState.isPaused = false;
            gameState.isCompleted = false;
            resetGameState();
            
            // 禁用输入
            const textInput = document.getElementById('textInput');
            if (textInput) {
                textInput.disabled = true;
                textInput.value = '';
            }
            
            showNotification('游戏已重置', 'info');
        };
        
        const resetGameState = () => {
            gameState.startTime = null;
            gameState.endTime = null;
            gameState.currentText = '';
            gameState.userInput = '';
            gameState.currentIndex = 0;
            gameState.wpm = 0;
            gameState.cpm = 0;
            gameState.accuracy = 100;
            gameState.errors = 0;
            gameState.correctChars = 0;
            gameState.totalChars = 0;
            gameState.currentWordIndex = 0;
            gameState.totalWords = 0;
            gameState.wordsCompleted = 0;
            gameState.wordsList = [];
            gameState.highlightedText = '';
            gameState.renderKey = 0;
        };

        const handleTextInput = (event) => {
            if (!gameState.isPlaying || gameState.isPaused) return;
            
            const inputValue = event.target.value;
            gameState.userInput = inputValue;
            gameState.currentIndex = inputValue.length;
            
            // Process input through game engine for character-level analysis
            if (gameEngine.value) {
                gameEngine.value.processInput(inputValue);
            }
            
            // Force re-render of highlighted text
            gameState.renderKey++;
            
            // Check for completion
            checkGameCompletion();
        };

        const checkGameCompletion = () => {
            if (gameState.mode === 'endless') return;
            
            if (gameState.userInput.length >= gameState.currentText.length ||
                (gameState.mode === 'words' && gameState.wordsCompleted >= gameState.totalWords)) {
                endGame();
            }
        };

        const updateTextDisplay = () => {
            if (gameEngine.value && gameEngine.value.renderTextWithHighlight) {
                gameState.highlightedText = gameEngine.value.renderTextWithHighlight();
            }
        };
        
        const loadBasicModeData = async () => {
            try {
                // Initialize game engine connection
                if (window.gameEngine) {
                    gameEngine.value = window.gameEngine;
                    gameEngine.value.setMode(gameState.mode);
                }
                
                // Initialize stats manager connection
                if (window.statsManager) {
                    statsManager.value = window.statsManager;
                    
                    // Listen to stats updates
                    statsManager.value.on('statsUpdated', (stats) => {
                        syncWithStatsManager();
                    });
                }
                
                if (gameState.mode === 'classic' || gameState.mode === 'endless') {
                    // 加载文本数据
                    const response = await fetch('/api/texts');
                    const texts = await response.json();
                    gameState.currentText = texts[Math.floor(Math.random() * texts.length)];
                } else if (gameState.mode === 'words') {
                    // 加载单词数据
                    const response = await fetch('/api/words');
                    const words = await response.json();
                    gameState.wordsList = words.slice(0, 50); // 默认50个单词
                    gameState.totalWords = gameState.wordsList.length;
                    gameState.currentText = gameState.wordsList.join(' ');
                }
                
                // Initialize text display
                updateTextDisplay();
                
            } catch (error) {
                console.error('加载游戏数据失败:', error);
                showNotification('加载游戏数据失败', 'error');
            }
        };
        
        const startGameTimer = () => {
            const timer = setInterval(() => {
                if (!gameState.isPlaying || gameState.isPaused) {
                    clearInterval(timer);
                    return;
                }
                
                const elapsed = timeElapsed.value;
                if (elapsed >= gameState.timeLimit) {
                    clearInterval(timer);
                    endGame();
                }
                
                // 更新统计数据
                updateStats();
                
            }, 100);
        };
        
        const updateStats = () => {
            if (!gameState.startTime) return;
            
            const timeInMinutes = timeElapsed.value / 60;
            const words = gameState.correctChars / 5;
            
            gameState.wpm = timeInMinutes > 0 ? Math.round(words / timeInMinutes) : 0;
            gameState.cpm = timeInMinutes > 0 ? Math.round(gameState.correctChars / timeInMinutes) : 0;
            gameState.accuracy = gameState.totalChars > 0 ? 
                Math.round((gameState.correctChars / gameState.totalChars) * 100) : 100;
        };

        const syncWithStatsManager = () => {
            if (statsManager.value) {
                const currentStats = statsManager.value.getCurrentStats();
                Object.assign(realTimeStats, {
                    wpm: currentStats.wpm || 0,
                    cpm: currentStats.cpm || 0,
                    accuracy: currentStats.accuracy || 100,
                    errors: currentStats.errors || 0,
                    correctChars: currentStats.correctChars || 0,
                    totalChars: currentStats.totalChars || 0,
                    progressPercentage: currentStats.progressPercentage || 0
                });
                
                // Update game state for UI display
                gameState.wpm = realTimeStats.wpm;
                gameState.cpm = realTimeStats.cpm;
                gameState.accuracy = realTimeStats.accuracy;
                gameState.errors = realTimeStats.errors;
                gameState.correctChars = realTimeStats.correctChars;
                gameState.totalChars = realTimeStats.totalChars;
            }
        };

        const startRealTimeUpdates = () => {
            const updateInterval = setInterval(() => {
                if (!gameState.isPlaying || gameState.isPaused) {
                    clearInterval(updateInterval);
                    return;
                }
                
                syncWithStatsManager();
                updateTextDisplay();
                
            }, 50); // Update every 50ms for smooth real-time experience
        };
        
        const endGame = () => {
            gameState.isPlaying = false;
            gameState.isCompleted = true;
            gameState.endTime = Date.now();
            
            showNotification('游戏结束！', 'info');
            uiState.showResults = true;
            
            // Final sync with stats manager
            syncWithStatsManager();
        };
        
        const showNotification = (message, type = 'info') => {
            uiState.notification.message = message;
            uiState.notification.type = type;
            uiState.notification.show = true;
            
            setTimeout(() => {
                uiState.notification.show = false;
            }, 3000);
        };
        
        // 生命周期
        onMounted(() => {
            console.log('🎮 Vue应用已挂载');
            
            // 加载初始数据
            if (isBasicMode.value) {
                loadBasicModeData();
            }
            
            // 监听AppUtils的通知事件
            document.addEventListener('app-notification', (e) => {
                showNotification(e.detail.message, e.detail.type);
            });
            
            // 监听页面可见性事件
            document.addEventListener('page-hidden', () => {
                if (gameState.isPlaying && !gameState.isPaused) {
                    handlePauseGame();
                }
            });
            
            document.addEventListener('page-visible', () => {
                // 页面可见时的处理
                if (window.audioManager) {
                    window.audioManager.resumeAudioContext();
                }
            });
        });
        
        return {
            // 状态
            gameState,
            uiState,
            realTimeStats,
            
            // 计算属性
            isBasicMode,
            isSpecialMode,
            isDefenseMode,
            isRacingMode,
            progress,
            timeElapsed,
            
            // 方法
            handleModeChanged,
            handleStartGame,
            handlePauseGame,
            handleResetGame,
            handleDefenseGameOver,
            handleRaceFinished,
            handleTextInput,
            updateTextDisplay,
            syncWithStatsManager
        };
    },
    template: `
        <div class="typing-game-app">
            <!-- 通知消息 -->
            <div v-if="uiState.notification.show" 
                 class="notification"
                 :class="'notification-' + uiState.notification.type">
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
            <game-stats
                :game-state="gameState"
                :is-visible="gameState.isPlaying || gameState.isCompleted"
            />
            
            <!-- 进度条 (仅基础模式显示) -->
            <div v-if="isBasicMode && (gameState.isPlaying || gameState.isCompleted)" 
                 class="progress-container">
                <div class="progress-bar" :style="{ width: progress + '%' }"></div>
            </div>
            
            <!-- 赛车追逐组件 -->
            <racing-track
                v-if="isRacingMode"
                :game-state="gameState"
                :is-visible="uiState.showRacing"
                @race-finished="handleRaceFinished"
            />
            
            <!-- 植物防御组件 -->
            <defense-game
                v-if="isDefenseMode"
                :is-visible="uiState.showDefense"
                @game-over="handleDefenseGameOver"
            />
            
            <!-- 基础模式文本显示和输入区域 -->
            <div v-if="isBasicMode" class="basic-game-area">
                <!-- 文本显示区域 -->
                <div class="text-display">
                    <div class="text-content" 
                         v-html="gameState.highlightedText || (gameState.currentText || '点击开始按钮开始游戏...')"
                         :key="gameState.renderKey">
                    </div>
                </div>
                
                <!-- 输入区域 -->
                <div class="input-area">
                    <textarea 
                        id="textInput"
                        class="text-input" 
                        placeholder="在这里输入文本..."
                        :disabled="!gameState.isPlaying"
                        v-model="gameState.userInput"
                        @input="handleTextInput"
                    ></textarea>
                </div>
            </div>
            
            <!-- AppUtils组件 (提供工具功能) -->
            <app-utils ref="appUtils" />
        </div>
    `
};

// 初始化Vue应用
function initVueApp() {
    if (typeof Vue === 'undefined') {
        console.error('Vue.js 未加载');
        return;
    }
    
    // 等待所有组件加载完成
    if (typeof window.GameControls === 'undefined' || 
        typeof window.GameStats === 'undefined' ||
        typeof window.RacingTrack === 'undefined' ||
        typeof window.DefenseGame === 'undefined' ||
        typeof window.AppUtils === 'undefined') {
        setTimeout(initVueApp, 100);
        return;
    }
    
    try {
        createVueApp();
    } catch (error) {
        console.error('Vue应用初始化失败:', error);
        setTimeout(initVueApp, 500);
    }
}

function createVueApp() {
    const { createApp } = Vue;
    
    // 创建Vue应用实例
    const app = createApp(TypingGameApp);
    
    // 注册全局组件
    app.component('GameControls', window.GameControls);
    app.component('GameStats', window.GameStats);
    app.component('RacingTrack', window.RacingTrack);
    app.component('DefenseGame', window.DefenseGame);
    app.component('AppUtils', window.AppUtils);
    
    // 挂载vueS应用
    app.mount('#vue-app');
    
    console.log('✅ Vue应用已成功挂载到 #vue-app');
}

// 导出初始化函数
window.initVueApp = initVueApp;