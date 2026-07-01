// 植物防御游戏组件
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
        const { ref, reactive, computed, watch, onMounted, onUnmounted } = Vue;
        console.log('🌱 DefenseGame组件初始化', props);
        
        // 游戏引擎单例（在 defense-engine.js 加载时创建，所有组件实例共用）
        const defenseEngine = window.defenseEngine;

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
        
        // 时间统计
        const startTime = ref(null);
        const elapsedTime = ref(0);
        let timeInterval = null;
        
        const formattedTime = computed(() => {
            const minutes = Math.floor(elapsedTime.value / 60);
            const seconds = elapsedTime.value % 60;
            return `${minutes}:${seconds.toString().padStart(2, '0')}`;
        });
        
        // 方法
        const selectDifficulty = (difficulty) => {
            if (canStartGame.value) {
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
            console.log('🌱 开始防御游戏');
            if (window.gameEngine) {
                window.gameEngine.startGame();
            }
            // 启动计时器（先清旧的，重开一局不叠加）
            stopGame();
            startTime.value = Date.now();
            elapsedTime.value = 0;
            timeInterval = setInterval(() => {
                if (gameState.isPlaying && !gameState.isPaused) {
                    elapsedTime.value = Math.floor((Date.now() - startTime.value) / 1000);
                }
            }, 1000);
        };

        const pauseGame = () => {
            if (window.gameStore) {
                if (gameState.isPlaying) {
                    window.gameStore.actions.pauseGame();
                } else if (gameState.isPaused) {
                    window.gameStore.actions.resumeGame();
                }
            }
        };

        const stopGame = () => {
            // 停止计时器
            if (timeInterval) {
                clearInterval(timeInterval);
                timeInterval = null;
            }
        };

        const resetGame = () => {
            if (window.gameEngine) {
                window.gameEngine.resetGame();
            }
        };

        // 注册引擎事件监听（单例引擎，卸载时必须逐一 off，否则重新挂载会重复触发）
        const registerEngineEvents = () => {
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
            defenseEngine.on('bossPhaseChange', handleBossPhaseChange);
        };

        const unregisterEngineEvents = () => {
            defenseEngine.off('gameStarted', handleGameStarted);
            defenseEngine.off('gameOver', handleGameOver);
            defenseEngine.off('gamePaused', handleGamePaused);
            defenseEngine.off('gameReset', handleGameReset);
            defenseEngine.off('waveStarted', handleWaveStarted);
            defenseEngine.off('waveCompleted', handleWaveCompleted);
            defenseEngine.off('zombieSpawned', handleZombieSpawned);
            defenseEngine.off('zombieKilled', handleZombieKilled);
            defenseEngine.off('zombieHit', handleZombieHit);
            defenseEngine.off('plantDamaged', handlePlantDamaged);
            defenseEngine.off('plantShoot', handlePlantShoot);
            defenseEngine.off('targetChanged', handleTargetChanged);
            defenseEngine.off('wordProgress', handleWordProgress);
            defenseEngine.off('inputError', handleInputError);
            defenseEngine.off('gameUpdate', handleGameUpdate);
            defenseEngine.off('bossPhaseChange', handleBossPhaseChange);
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
            if (window.gameStore) {
                window.gameStore.actions.showNotification(
                    message,
                    results.victory ? 'success' : 'error'
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
            if (window.gameStore) {
                window.gameStore.actions.showNotification(
                    `🌊 第${data.wave}波完成！`,
                    'success'
                );
            }
        };
        
        const handleZombieSpawned = (zombie) => {
            // 仅记录日志，数据同步由 handleGameUpdate 统一处理
            console.log(`🧟‍♂️ 僵尸生成: ${zombie.word}`);
        };

        const handleZombieKilled = (data) => {
            gameState.score = data.score;
            // 数据同步由 handleGameUpdate 统一处理
            emit('score-changed', data.score);
        };

        const handleZombieHit = (data) => {
            // 立即从UI中移除已命中的子弹（避免穿透效果）
            if (data.bulletId) {
                bullets.value = bullets.value.filter(b => b.id !== data.bulletId);
            }
            // 在子弹命中位置显示爆炸特效
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
            // 创建新对象以确保Vue检测到变化（修复Boss多阶段时word不更新的问题）
            currentTarget.value = data.zombie ? { ...data.zombie } : null;
            userInput.value = data.typed || '';
        };
        
        const handleWordProgress = (data) => {
            userInput.value = data.typed;
        };
        
        const handleInputError = (data) => {
            // 显示输入错误效果
            showInputError();
        };
        
        const handleGameUpdate = (data) => {
            // 使用展开运算符创建新数组，确保Vue响应式更新
            zombies.value = [...data.zombies];
            bullets.value = [...data.bullets];
        };

        const handleBossPhaseChange = (data) => {
            console.log(`👹 Boss阶段变化: ${data.phase}/${data.totalPhases} - ${data.word}`);
            // 显示阶段转换通知
            if (window.gameStore) {
                window.gameStore.actions.showNotification(
                    `👹 Boss进入第${data.phase}阶段: ${data.word.toUpperCase()}`,
                    'warning'
                );
            }
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
                    if (container.contains(effect)) {
                        container.removeChild(effect);
                    }
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
            console.log('🌱 DefenseGame组件已挂载');
            registerEngineEvents();
        });

        onUnmounted(() => {
            unregisterEngineEvents();
            stopGame();
            defenseEngine.resetGame();
        });

        // 监听可见性变化
        watch(() => props.isVisible, (visible) => {
            if (!visible) {
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
            formattedTime,
            
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
                <div class="stat-item">
                    <span class="stat-icon">⏱️</span>
                    <span class="stat-label">时长</span>
                    <span class="stat-value">{{ formattedTime }}</span>
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
                    <div class="plant-icon">
                        <img v-if="plant.isAlive" src="/assets/images/peashooter.svg" alt="豌豆射手" class="peashooter-img">
                        <span v-else>💀</span>
                    </div>
                    <div class="plant-weapon" v-show="plant.isShooting">🌰</div>
                </div>
                
                <!-- 僵尸 -->
                <div
                    v-for="zombie in zombies"
                    :key="zombie.id"
                    class="zombie"
                    :class="[zombie.type, { 'low-health': zombie.health / zombie.maxHealth <= 0.3 }]"
                    :style="{
                        left: zombie.position.x + 'px',
                        top: zombie.position.y + 'px'
                    }"
                >
                    <div class="zombie-icon">{{ zombie.icon }}</div>
                    <!-- Boss阶段指示器 -->
                    <div v-if="zombie.isBoss && zombie.totalPhases" class="boss-phase-indicator">
                        {{ zombie.currentPhase + 1 }}/{{ zombie.totalPhases }}
                    </div>
                    <div class="zombie-word-container">
                        <div
                            class="zombie-word-health"
                            :style="{
                                width: (zombie.health / zombie.maxHealth * 100) + '%',
                                backgroundColor: zombie.health / zombie.maxHealth > 0.5 ? 'rgba(74, 222, 128, 0.6)' : zombie.health / zombie.maxHealth > 0.2 ? 'rgba(251, 191, 36, 0.6)' : 'rgba(239, 68, 68, 0.6)'
                            }"
                        ></div>
                        <span class="zombie-word">{{ zombie.word }}</span>
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
                    style="background: #4caf50; color: white; border: none; padding: 12px 24px; border-radius: 8px; cursor: pointer; margin: 5px;"
                >
                    🌱 开始
                </button>
                <button 
                    v-if="gameState.isPlaying && !gameState.isCompleted"
                    class="btn btn-secondary"
                    @click="pauseGame"
                    style="background: #ff9800; color: white; border: none; padding: 12px 24px; border-radius: 8px; cursor: pointer; margin: 5px;"
                >
                    {{ gameState.isPaused ? '▶️ 继续' : '⏸️ 暂停' }}
                </button>
                <button 
                    v-if="gameState.isPlaying || gameState.isCompleted"
                    class="btn btn-secondary"
                    @click="resetGame"
                    style="background: #f44336; color: white; border: none; padding: 12px 24px; border-radius: 8px; cursor: pointer; margin: 5px;"
                >
                    🔄 结束
                </button>
            </div>
            
            <!-- 调试信息
            <div v-if="!gameState.isPlaying" style="background: rgba(0,0,0,0.3); padding: 10px; border-radius: 8px; margin-top: 10px; font-size: 12px; color: #ccc;">
                <p>🔧 调试信息:</p>
                <p>• 游戏状态: {{ gameState.isPlaying ? '进行中' : '未开始' }}</p>
                <p>• 植物血量: {{ plant.health }}/{{ plant.maxHealth }}</p>
                <p>• 当前难度: {{ gameState.difficulty }}</p>
                <p>• 可以开始: {{ canStartGame ? '是' : '否' }}</p>
            </div>
            -->
        </div>
    `
};

// 导出组件
window.DefenseGame = DefenseGame;
