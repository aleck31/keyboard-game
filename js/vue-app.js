// Vue主应用
const { createApp, ref, reactive, computed, watch, onMounted } = Vue;

// 主应用组件
const TypingGameApp = {
    name: 'TypingGameApp',
    components: {
        GameControls: window.GameControls,
        GameStats: window.GameStats,
        RacingTrack: window.RacingTrack,
        DefenseGame: window.DefenseGame
    },
    setup() {
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
            // 单词模式状态
            currentWordIndex: 0,
            totalWords: 0,
            wordsCompleted: 0,
            wordsList: [],
            // 赛车模式状态
            racingData: {
                aiCars: {
                    slow: { speed: 30, position: 0, name: '慢车' },
                    medium: { speed: 50, position: 0, name: '中速车' },
                    fast: { speed: 70, position: 0, name: '快车' }
                },
                playerPosition: 0,
                overtakenCars: [],
                currentRank: 4,
                raceStartTime: null
            }
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
        const isRacingMode = computed(() => gameState.mode === 'racing');
        const isDefenseMode = computed(() => gameState.mode === 'defense');
        
        // 事件处理
        const handleModeChanged = (mode) => {
            gameState.mode = mode;
            uiState.showRacing = mode === 'racing';
            uiState.showDefense = mode === 'defense';
            
            // 通知原有的游戏引擎
            if (window.gameEngine && mode !== 'defense') {
                window.gameEngine.setMode(mode);
            }
        };
        
        const handleStartGame = () => {
            if (gameState.mode === 'defense') {
                // 植物防御模式由其自己的组件处理
                return;
            }
            
            // 其他模式使用原有游戏引擎
            if (window.gameEngine) {
                window.gameEngine.startGame();
            }
        };
        
        const handlePauseGame = () => {
            if (gameState.mode === 'defense') {
                // 植物防御模式由其自己的组件处理
                return;
            }
            
            if (window.gameEngine) {
                window.gameEngine.togglePause();
            }
        };
        
        const handleResetGame = () => {
            if (gameState.mode === 'defense') {
                // 植物防御模式由其自己的组件处理
                return;
            }
            
            if (window.gameEngine) {
                window.gameEngine.resetGame();
            }
        };
        
        const handleCarOvertaken = ({ carName, carType }) => {
            // 显示超越通知
            showNotification(`🏎️ 超越了${carName}！`, 'success');
            
            // 播放音效
            if (window.audioManager) {
                window.audioManager.playSound('achievement');
            }
        };
        
        const handleRaceFinished = (results) => {
            const { rank, overtakenCars, finalPosition } = results;
            
            let rankText = '';
            switch (rank) {
                case 1:
                    rankText = '🥇 第一名 - 冠军！';
                    break;
                case 2:
                    rankText = '🥈 第二名 - 亚军！';
                    break;
                case 3:
                    rankText = '🥉 第三名 - 季军！';
                    break;
                case 4:
                    rankText = '第四名 - 继续努力！';
                    break;
            }
            
            showNotification(`🏁 比赛结束！${rankText}`, rank <= 3 ? 'success' : 'info', 5000);
        };
        
        const handleDefenseGameOver = (results) => {
            console.log('🌱 植物防御游戏结束', results);
            
            // 显示结果通知
            const message = results.victory 
                ? `🎉 防御成功！完成${results.wave}波，得分${results.score}` 
                : `💀 防御失败！坚持到第${results.wave}波，得分${results.score}`;
            
            showNotification(message, results.victory ? 'success' : 'error', 5000);
        };
        
        const handleDefenseScoreChanged = (score) => {
            console.log('🌱 植物防御分数更新:', score);
        };
        
        // 显示通知
        const showNotification = (message, type = 'info', duration = 3000) => {
            uiState.notification = {
                show: true,
                message,
                type
            };
            
            setTimeout(() => {
                uiState.notification.show = false;
            }, duration);
        };
        
        // 同步原有游戏引擎状态
        const syncGameEngineState = () => {
            if (window.gameEngine && gameState.mode !== 'defense') {
                const engineState = window.gameEngine.getGameState();
                if (engineState) {
                    // 同步基本状态
                    gameState.isPlaying = engineState.isPlaying;
                    gameState.isPaused = engineState.isPaused;
                    gameState.isCompleted = engineState.isCompleted;
                    gameState.mode = engineState.mode;
                    gameState.startTime = engineState.startTime;
                    gameState.endTime = engineState.endTime;
                    gameState.timeLimit = engineState.timeLimit; // 同步时间限制
                    gameState.currentText = engineState.currentText;
                    gameState.userInput = engineState.userInput;
                    gameState.currentIndex = engineState.currentIndex;
                    
                    // 同步单词模式状态
                    if (engineState.currentWordIndex !== undefined) {
                        gameState.currentWordIndex = engineState.currentWordIndex;
                        gameState.totalWords = engineState.totalWords;
                        gameState.wordsCompleted = engineState.wordsCompleted;
                        gameState.wordsList = engineState.wordsList;
                    }
                    
                    // 同步赛车模式状态
                    if (engineState.racingData) {
                        gameState.racingData = { ...engineState.racingData };
                    }
                }
            }
        };
        
        // 监听游戏状态变化
        watch(() => gameState.mode, (newMode) => {
            uiState.showRacing = newMode === 'racing';
            uiState.showDefense = newMode === 'defense';
        });
        
        // 组件挂载后的初始化
        onMounted(() => {
            // 定期同步游戏引擎状态 (仅非植物防御模式)
            setInterval(() => {
                if (gameState.mode !== 'defense') {
                    syncGameEngineState();
                }
            }, 100);
            
            // 监听原有游戏引擎事件
            if (window.gameEngine) {
                window.gameEngine.on('gameStarted', () => {
                    if (gameState.mode !== 'defense') {
                        syncGameEngineState();
                    }
                });
                
                window.gameEngine.on('gameCompleted', () => {
                    if (gameState.mode !== 'defense') {
                        syncGameEngineState();
                    }
                });
                
                window.gameEngine.on('gamePaused', () => {
                    if (gameState.mode !== 'defense') {
                        syncGameEngineState();
                    }
                });
            }
        });
        
        return {
            // 状态
            gameState,
            uiState,
            
            // 计算属性
            isRacingMode,
            isDefenseMode,
            
            // 事件处理
            handleModeChanged,
            handleStartGame,
            handlePauseGame,
            handleResetGame,
            handleCarOvertaken,
            handleRaceFinished,
            handleDefenseGameOver,
            handleDefenseScoreChanged,
            
            // 方法
            showNotification
        };
    },
    template: `
        <div class="vue-game-container">
            <!-- 通知组件 -->
            <div 
                v-if="uiState.notification.show"
                class="notification"
                :class="'notification-' + uiState.notification.type"
            >
                {{ uiState.notification.message }}
            </div>
            
            <!-- 游戏控制 -->
            <game-controls
                :game-state="gameState"
                @mode-changed="handleModeChanged"
                @start-game="handleStartGame"
                @pause-game="handlePauseGame"
                @reset-game="handleResetGame"
            />
            
            <!-- 游戏统计 (非植物防御模式) -->
            <game-stats 
                v-if="!isDefenseMode"
                :game-state="gameState" 
            />
            
            <!-- 赛车追逐模式 -->
            <racing-track
                v-if="isRacingMode"
                :game-state="gameState"
                :is-visible="uiState.showRacing"
                @car-overtaken="handleCarOvertaken"
                @race-finished="handleRaceFinished"
            />
            
            <!-- 植物防御模式 -->
            <defense-game
                v-if="isDefenseMode"
                :is-visible="uiState.showDefense"
                @game-over="handleDefenseGameOver"
                @score-changed="handleDefenseScoreChanged"
            />
            
            <!-- 模式选择器 (植物防御模式时显示) -->
            <div v-if="isDefenseMode" class="mode-selector" style="margin-top: 20px;">
                <button 
                    v-for="mode in [
                        { key: 'classic', label: '经典模式', icon: '📝' },
                        { key: 'words', label: '单词模式', icon: '🔤' },
                        { key: 'racing', label: '赛车追逐', icon: '🏎️' },
                        { key: 'defense', label: '植物防御', icon: '🌱' },
                        { key: 'endless', label: '无尽模式', icon: '♾️' }
                    ]" 
                    :key="mode.key"
                    class="mode-btn"
                    :class="{ active: gameState.mode === mode.key }"
                    @click="handleModeChanged(mode.key)"
                >
                    <span class="mode-icon">{{ mode.icon }}</span>
                    {{ mode.label }}
                </button>
            </div>
        </div>
    `
};

// 初始化Vue应用
function initVueApp() {
    // 等待DOM加载完成
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            createVueApp();
        });
    } else {
        createVueApp();
    }
}

function createVueApp() {
    // 创建Vue应用实例
    const app = createApp(TypingGameApp);
    
    // 挂载到指定元素
    const vueContainer = document.getElementById('vue-app');
    if (vueContainer) {
        app.mount('#vue-app');
        console.log('✅ Vue应用已成功挂载');
    } else {
        console.warn('⚠️ 未找到Vue挂载点 #vue-app');
    }
}

// 导出初始化函数
window.initVueApp = initVueApp;
