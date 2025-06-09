// 植物防御游戏组件
const { ref, reactive, computed, watch, onMounted, onUnmounted } = Vue;

const DefenseGame = {
    name: 'DefenseGame',
    props: {
        isVisible: {
            type: Boolean,
            default: false
        }
    },
    emits: ['game-over', 'score-changed'],
    setup(props, { emit }) {
        // 游戏引擎实例
        let defenseEngine = null;
        
        // 响应式数据
        const gameState = reactive({
            isPlaying: false,
            isPaused: false,
            isCompleted: false,
            difficulty: 'easy',
            currentWave: 1,
            totalWaves: 4,
            score: 0
        });
        
        const plant = reactive({
            health: 100,
            maxHealth: 100,
            isAlive: true,
            isShooting: false
        });
        
        const currentTarget = ref(null);
        const userInput = ref('');
        const zombies = ref([]);
        const bullets = ref([]);
        
        // 难度配置
        const difficulties = ref([
            {
                key: 'easy',
                name: '简单',
                icon: '🌱',
                desc: '4波 | 基础僵尸',
                waves: 4
            },
            {
                key: 'medium',
                name: '中等',
                icon: '🌿',
                desc: '7波 | 混合僵尸',
                waves: 7
            },
            {
                key: 'hard',
                name: '困难',
                icon: '🌳',
                desc: '10波 | 强力僵尸',
                waves: 10
            }
        ]);
        
        // 计算属性
        const healthPercentage = computed(() => {
            return (plant.health / plant.maxHealth) * 100;
        });
        
        const healthBarStyle = computed(() => {
            return {
                width: healthPercentage.value + '%'
            };
        });
        
        const waveText = computed(() => {
            return `${gameState.currentWave}/${gameState.totalWaves}`;
        });
        
        const healthText = computed(() => {
            return `${plant.health}/${plant.maxHealth}`;
        });
        
        const zombiesLeftCount = computed(() => {
            return zombies.value.filter(z => z.isAlive).length;
        });
        
        const targetWord = computed(() => {
            return currentTarget.value ? currentTarget.value.word : '点击开始游戏';
        });
        
        const typedPart = computed(() => {
            return userInput.value;
        });
        
        const remainingPart = computed(() => {
            if (!currentTarget.value) return '';
            return currentTarget.value.word.slice(userInput.value.length);
        });
        
        const canStartGame = computed(() => {
            return !gameState.isPlaying;
        });
        
        // 方法
        const selectDifficulty = (difficulty) => {
            if (canStartGame.value && defenseEngine) {
                gameState.difficulty = difficulty;
                defenseEngine.setDifficulty(difficulty);
                
                // 更新总波数
                const config = difficulties.value.find(d => d.key === difficulty);
                if (config) {
                    gameState.totalWaves = config.waves;
                }
            }
        };
        
        const startGame = () => {
            if (defenseEngine && canStartGame.value) {
                defenseEngine.startGame();
            }
        };
        
        const pauseGame = () => {
            if (defenseEngine) {
                defenseEngine.togglePause();
            }
        };
        
        const resetGame = () => {
            if (defenseEngine) {
                defenseEngine.resetGame();
            }
        };
        
        // 初始化游戏引擎
        const initDefenseEngine = () => {
            if (window.DefenseEngine) {
                defenseEngine = new window.DefenseEngine();
                
                // 监听游戏事件
                defenseEngine.on('gameStarted', handleGameStarted);
                defenseEngine.on('gameOver', handleGameOver);
                defenseEngine.on('gamePaused', handleGamePaused);
                defenseEngine.on('gameReset', handleGameReset);
                defenseEngine.on('waveStarted', handleWaveStarted);
                defenseEngine.on('waveCompleted', handleWaveCompleted);
                defenseEngine.on('zombieSpawned', handleZombieSpawned);
                defenseEngine.on('zombieKilled', handleZombieKilled);
                defenseEngine.on('zombieHit', handleZombieHit);
                defenseEngine.on('plantDamaged', handlePlantDamaged);
                defenseEngine.on('plantShoot', handlePlantShoot);
                defenseEngine.on('targetChanged', handleTargetChanged);
                defenseEngine.on('wordProgress', handleWordProgress);
                defenseEngine.on('inputError', handleInputError);
                defenseEngine.on('gameUpdate', handleGameUpdate);
                
                console.log('🌱 植物防御引擎已初始化');
            }
        };
        
        // 事件处理函数
        const handleGameStarted = () => {
            gameState.isPlaying = true;
            gameState.isPaused = false;
            gameState.isCompleted = false;
            console.log('🎮 植物防御游戏开始');
        };
        
        const handleGameOver = (results) => {
            gameState.isPlaying = false;
            gameState.isCompleted = true;
            
            console.log('🎮 植物防御游戏结束', results);
            
            // 显示结果通知
            const message = results.victory 
                ? `🎉 胜利！完成${results.wave}波，得分${results.score}` 
                : `💀 失败！坚持到第${results.wave}波，得分${results.score}`;
            
            // 通过全局通知系统显示
            if (window.uiManager) {
                window.uiManager.showNotification(
                    message, 
                    results.victory ? 'success' : 'error', 
                    5000
                );
            }
            
            emit('game-over', results);
        };
        
        const handleGamePaused = (isPaused) => {
            gameState.isPaused = isPaused;
        };
        
        const handleGameReset = () => {
            gameState.isPlaying = false;
            gameState.isPaused = false;
            gameState.isCompleted = false;
            gameState.currentWave = 1;
            gameState.score = 0;
            
            plant.health = plant.maxHealth;
            plant.isAlive = true;
            plant.isShooting = false;
            
            currentTarget.value = null;
            userInput.value = '';
            zombies.value = [];
            bullets.value = [];
        };
        
        const handleWaveStarted = (data) => {
            gameState.currentWave = data.wave;
            gameState.totalWaves = data.totalWaves;
            
            console.log(`🌊 第${data.wave}波开始`);
        };
        
        const handleWaveCompleted = (data) => {
            console.log(`✅ 第${data.wave}波完成`);
            
            // 显示波次完成通知
            if (window.uiManager) {
                window.uiManager.showNotification(
                    `🌊 第${data.wave}波完成！`, 
                    'success', 
                    2000
                );
            }
        };
        
        const handleZombieSpawned = (zombie) => {
            zombies.value.push(zombie);
            console.log(`🧟‍♂️ 僵尸生成: ${zombie.word}`);
        };
        
        const handleZombieKilled = (data) => {
            gameState.score = data.score;
            
            // 从数组中移除僵尸
            const index = zombies.value.findIndex(z => z.id === data.zombie.id);
            if (index !== -1) {
                zombies.value.splice(index, 1);
            }
            
            emit('score-changed', data.score);
        };
        
        const handleZombieHit = (data) => {
            // 更新僵尸血量
            const zombie = zombies.value.find(z => z.id === data.zombie.id);
            if (zombie) {
                zombie.health = data.zombie.health;
            }
            
            // 显示击中特效
            showHitEffect(data.position);
        };
        
        const handlePlantDamaged = (data) => {
            plant.health = data.currentHealth;
            
            if (plant.health <= 0) {
                plant.isAlive = false;
            }
            
            // 显示受伤特效
            showDamageEffect();
        };
        
        const handlePlantShoot = (data) => {
            plant.isShooting = true;
            bullets.value.push(data.bullet);
            
            // 射击动画
            setTimeout(() => {
                plant.isShooting = false;
            }, 300);
        };
        
        const handleTargetChanged = (data) => {
            currentTarget.value = data.zombie;
            userInput.value = '';
        };
        
        const handleWordProgress = (data) => {
            userInput.value = data.typed;
        };
        
        const handleInputError = (data) => {
            // 显示输入错误效果
            showInputError();
        };
        
        const handleGameUpdate = (data) => {
            // 更新游戏对象位置
            zombies.value = data.zombies;
            bullets.value = data.bullets;
        };
        
        // 特效函数
        const showHitEffect = (position) => {
            // 创建击中特效
            const effect = document.createElement('div');
            effect.className = 'hit-effect';
            effect.textContent = '💥';
            effect.style.left = position.x + 'px';
            effect.style.top = position.y + 'px';
            
            const container = document.getElementById('effectsContainer');
            if (container) {
                container.appendChild(effect);
                setTimeout(() => {
                    container.removeChild(effect);
                }, 600);
            }
        };
        
        const showDamageEffect = () => {
            // 植物受伤效果
            const plantElement = document.getElementById('plantDefender');
            if (plantElement) {
                plantElement.classList.add('damaged');
                setTimeout(() => {
                    plantElement.classList.remove('damaged');
                }, 500);
            }
        };
        
        const showInputError = () => {
            // 输入错误效果
            const wordContainer = document.querySelector('.target-word-container');
            if (wordContainer) {
                wordContainer.classList.add('error');
                setTimeout(() => {
                    wordContainer.classList.remove('error');
                }, 300);
            }
        };
        
        // 生命周期
        onMounted(() => {
            initDefenseEngine();
        });
        
        onUnmounted(() => {
            if (defenseEngine) {
                defenseEngine.resetGame();
                defenseEngine = null;
            }
        });
        
        // 监听可见性变化
        watch(() => props.isVisible, (visible) => {
            if (!visible && defenseEngine) {
                defenseEngine.resetGame();
            }
        });
        
        return {
            // 数据
            gameState,
            plant,
            currentTarget,
            userInput,
            zombies,
            bullets,
            difficulties,
            
            // 计算属性
            healthPercentage,
            healthBarStyle,
            waveText,
            healthText,
            zombiesLeftCount,
            targetWord,
            typedPart,
            remainingPart,
            canStartGame,
            
            // 方法
            selectDifficulty,
            startGame,
            pauseGame,
            resetGame
        };
    },
    template: `
        <div class="defense-container" v-show="isVisible">
            <!-- 游戏状态栏 -->
            <div class="defense-header">
                <div class="defense-title">🌱 植物防御模式</div>
                <div class="defense-stats">
                    <div class="stat-item">
                        <span class="stat-icon">❤️</span>
                        <span class="stat-label">血量</span>
                        <div class="health-bar">
                            <div class="health-fill" :style="healthBarStyle"></div>
                        </div>
                        <span class="health-text">{{ healthText }}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-icon">🌊</span>
                        <span class="stat-label">波次</span>
                        <span class="stat-value">{{ waveText }}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-icon">🧟‍♂️</span>
                        <span class="stat-label">僵尸</span>
                        <span class="stat-value">{{ zombiesLeftCount }}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-icon">⭐</span>
                        <span class="stat-label">分数</span>
                        <span class="stat-value">{{ gameState.score }}</span>
                    </div>
                </div>
            </div>
            
            <!-- 战场 -->
            <div class="battlefield" id="battlefield">
                <!-- 植物防御者 -->
                <div 
                    class="plant-defender" 
                    id="plantDefender"
                    :class="{ shooting: plant.isShooting, dead: !plant.isAlive }"
                >
                    <div class="plant-icon">{{ plant.isAlive ? '🌻' : '💀' }}</div>
                    <div class="plant-weapon" v-show="plant.isShooting">🌰</div>
                </div>
                
                <!-- 僵尸 -->
                <div 
                    v-for="zombie in zombies" 
                    :key="zombie.id"
                    class="zombie"
                    :class="zombie.type"
                    :style="{ 
                        left: zombie.position.x + 'px', 
                        top: zombie.position.y + 'px' 
                    }"
                >
                    <div class="zombie-icon">{{ zombie.icon }}</div>
                    <div class="zombie-word">{{ zombie.word }}</div>
                    <div class="zombie-health">
                        <div 
                            v-for="i in zombie.maxHealth" 
                            :key="i"
                            class="health-dot"
                            :style="{ 
                                opacity: i <= zombie.health ? 1 : 0.3 
                            }"
                        ></div>
                    </div>
                </div>
                
                <!-- 子弹 -->
                <div 
                    v-for="bullet in bullets" 
                    :key="bullet.id"
                    class="bullet"
                    :style="{ 
                        left: bullet.currentX + 'px', 
                        top: bullet.currentY + 'px' 
                    }"
                >
                    🌰
                </div>
                
                <!-- 特效容器 -->
                <div class="effects-container" id="effectsContainer"></div>
            </div>
            
            <!-- 当前目标单词 -->
            <div class="target-word-container">
                <div class="target-label">目标单词:</div>
                <div class="target-word">{{ targetWord }}</div>
                <div class="word-progress" v-if="currentTarget">
                    <span class="typed-part">{{ typedPart }}</span>
                    <span class="remaining-part">{{ remainingPart }}</span>
                </div>
            </div>
            
            <!-- 难度选择 -->
            <div class="difficulty-selector" v-if="canStartGame">
                <div class="difficulty-label">选择难度:</div>
                <div class="difficulty-buttons">
                    <button 
                        v-for="diff in difficulties" 
                        :key="diff.key"
                        class="difficulty-btn"
                        :class="{ active: gameState.difficulty === diff.key }"
                        @click="selectDifficulty(diff.key)"
                    >
                        <span class="difficulty-icon">{{ diff.icon }}</span>
                        <span class="difficulty-name">{{ diff.name }}</span>
                        <span class="difficulty-desc">{{ diff.desc }}</span>
                    </button>
                </div>
            </div>
            
            <!-- 游戏控制按钮 -->
            <div class="game-controls" style="margin-top: 20px;">
                <button 
                    v-if="canStartGame"
                    class="btn btn-primary"
                    @click="startGame"
                >
                    🌱 开始防御
                </button>
                <button 
                    v-if="gameState.isPlaying && !gameState.isCompleted"
                    class="btn btn-secondary"
                    @click="pauseGame"
                >
                    {{ gameState.isPaused ? '▶️ 继续' : '⏸️ 暂停' }}
                </button>
                <button 
                    v-if="gameState.isPlaying || gameState.isCompleted"
                    class="btn btn-secondary"
                    @click="resetGame"
                >
                    🔄 重新开始
                </button>
            </div>
        </div>
    `
};

// 导出组件
window.DefenseGame = DefenseGame;
