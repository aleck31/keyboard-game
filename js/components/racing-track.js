// 赛车追逐组件
const RacingTrack = {
    name: 'RacingTrack',
    props: {
        gameState: {
            type: Object,
            required: true
        },
        statsState: {
            type: Object,
            required: true
        },
        textState: {
            type: Object,
            required: true
        },
        isVisible: {
            type: Boolean,
            default: false
        }
    },
    emits: ['car-overtaken', 'race-finished', 'difficulty-changed'],
    setup(props, { emit }) {
        const { ref, computed, watch, onMounted, onUnmounted } = Vue;

        // 默认配置（API加载前使用）
        const defaultConfig = {
            trackLength: 100,
            difficulty: {
                easy: { name: '简单', raceTime: 90, aiSpeedMultiplier: 0.7 },
                medium: { name: '中等', raceTime: 60, aiSpeedMultiplier: 1.0 },
                hard: { name: '困难', raceTime: 45, aiSpeedMultiplier: 1.3 }
            },
            cars: {
                player: { name: '玩家', icon: '🚙', color: '#00ff00' },
                ai: [
                    { id: 'slow', name: '摩托车', icon: '🏍️', baseWpm: 25, color: '#90ee90' },
                    { id: 'medium', name: '小汽车', icon: '🚗', baseWpm: 40, color: '#ffd700' },
                    { id: 'fast', name: '跑车', icon: '🏎️', baseWpm: 55, color: '#ff6347' }
                ]
            },
            gameplay: { wpmToSpeedFactor: 1.5, overtakeBonus: 50, winBonus: 200, baseScore: 10 }
        };

        // 配置数据
        const config = ref({ ...defaultConfig });
        const configLoaded = ref(false);

        // 当前难度
        const currentDifficulty = ref('medium');

        // 响应式数据
        const raceState = ref({
            isRunning: false,
            isPaused: false,
            timeLeft: 60,
            playerPosition: 0,
            aiPositions: {},
            rankings: [],
            overtakeCount: 0,
            finalRank: 0,
            score: 0
        });

        const raceTimer = ref(null);
        const animationFrame = ref(null);
        const lastUpdateTime = ref(0);

        // 计算属性
        const difficultyConfig = computed(() => {
            return config.value.difficulty[currentDifficulty.value] || config.value.difficulty.medium;
        });

        const aiCars = computed(() => {
            return config.value.cars.ai || [];
        });

        const playerProgress = computed(() => {
            return Math.min((raceState.value.playerPosition / config.value.trackLength) * 100, 100);
        });

        const aiProgress = computed(() => {
            const progress = {};
            aiCars.value.forEach(car => {
                const pos = raceState.value.aiPositions[car.id] || 0;
                progress[car.id] = Math.min((pos / config.value.trackLength) * 100, 100);
            });
            return progress;
        });

        const currentRankings = computed(() => {
            const cars = [
                {
                    name: config.value.cars.player.name,
                    position: raceState.value.playerPosition,
                    type: 'player',
                    icon: config.value.cars.player.icon
                },
                ...aiCars.value.map(car => ({
                    name: car.name,
                    position: raceState.value.aiPositions[car.id] || 0,
                    type: car.id,
                    icon: car.icon
                }))
            ];

            return cars
                .sort((a, b) => b.position - a.position)
                .map((car, index) => ({
                    ...car,
                    rank: index + 1,
                    progress: Math.min((car.position / config.value.trackLength) * 100, 100)
                }));
        });

        const timeDisplay = computed(() => {
            const minutes = Math.floor(raceState.value.timeLeft / 60);
            const seconds = raceState.value.timeLeft % 60;
            return `${minutes}:${seconds.toString().padStart(2, '0')}`;
        });

        const isTimeWarning = computed(() => {
            return raceState.value.timeLeft <= 10;
        });

        // 加载配置
        const loadConfig = async () => {
            try {
                if (window.apiClient) {
                    const response = await window.apiClient.getRacingConfig();
                    if (response.status === 'success' && response.data) {
                        config.value = response.data;
                        configLoaded.value = true;
                        console.log('🏎️ 赛车配置加载成功');
                        initAiPositions();
                    }
                }
            } catch (error) {
                console.warn('⚠️ 赛车配置加载失败，使用默认配置');
            }
        };

        // 初始化AI位置
        const initAiPositions = () => {
            const positions = {};
            aiCars.value.forEach(car => {
                positions[car.id] = 0;
            });
            raceState.value.aiPositions = positions;
        };

        // 第 laneIndex 条车道的垂直中心（车道总数 = 玩家 + AI）
        const laneCenter = (laneIndex) => {
            const laneCount = aiCars.value.length + 1;
            return ((laneIndex + 0.5) / laneCount) * 100 + '%';
        };

        // 进度(0-100)映射到赛道水平位置：起点留 2% 车身空间，
        // 终点 END 必须与终点线(.racing-track::after 的 left)对齐，
        // 这样进度 100% 时车正好压线，与排行榜百分比语义一致
        const FINISH_LINE_PCT = 90;
        const laneX = (progress) => {
            const START = 2, END = FINISH_LINE_PCT;
            return START + (Math.min(100, Math.max(0, progress)) / 100) * (END - START) + '%';
        };

        // 选择难度
        const selectDifficulty = (difficulty) => {
            if (raceState.value.isRunning) return;
            currentDifficulty.value = difficulty;
            raceState.value.timeLeft = difficultyConfig.value.raceTime;
            emit('difficulty-changed', difficulty);
            console.log(`🏎️ 难度切换: ${difficultyConfig.value.name}`);
        };

        // “开始比赛”按钮：走统一生命周期，gameEngine.startGame() 会置 isPlaying=true，
        // 下方的 isPlaying watch 再触发本地模拟的 startRace()
        const startRaceButtonClick = () => {
            if (window.gameEngine) {
                window.gameEngine.startGame();
            }
        };

        // 开始比赛（本地模拟）
        const startRace = () => {
            if (raceState.value.isRunning) return;

            console.log('🏎️ 赛车比赛开始！难度:', difficultyConfig.value.name);
            raceState.value.isRunning = true;
            raceState.value.timeLeft = difficultyConfig.value.raceTime;
            raceState.value.playerPosition = 0;
            raceState.value.overtakeCount = 0;
            raceState.value.score = 0;
            raceState.value.finalRank = 0;
            initAiPositions();
            lastUpdateTime.value = performance.now();

            // 启动计时器
            raceTimer.value = setInterval(() => {
                raceState.value.timeLeft--;
                if (raceState.value.timeLeft <= 0) {
                    finishRace();
                }
            }, 1000);

            // 启动游戏循环
            updateLoop();
        };

        // 游戏循环
        const updateLoop = () => {
            if (!raceState.value.isRunning || raceState.value.isPaused) return;

            const now = performance.now();
            const deltaTime = (now - lastUpdateTime.value) / 1000;
            lastUpdateTime.value = now;

            // 玩家位置每帧重算：公式依赖持续增长的 timeElapsed，
            // 不能只靠 wpm 变化的 watch 驱动（wpm 平稳时车会冻结）
            updatePlayerPosition(props.statsState.wpm || 0);
            updateAICars(deltaTime);
            checkOvertakes();

            // 到达终点即结束（先冲线者胜）；计时归零是兜底，在 raceTimer 里处理
            if (hasReachedFinish()) {
                finishRace();
                return;
            }

            animationFrame.value = requestAnimationFrame(updateLoop);
        };

        // 是否有车抵达终点线（位置达到赛道全长）
        const hasReachedFinish = () => {
            const len = config.value.trackLength;
            if (raceState.value.playerPosition >= len) return true;
            return aiCars.value.some(car => (raceState.value.aiPositions[car.id] || 0) >= len);
        };

        // 暂停比赛
        const pauseRace = () => {
            if (!raceState.value.isRunning || raceState.value.isPaused) return;
            raceState.value.isPaused = true;
            if (raceTimer.value) {
                clearInterval(raceTimer.value);
                raceTimer.value = null;
            }
            console.log('⏸️ 比赛暂停');
        };

        // 继续比赛
        const resumeRace = () => {
            if (!raceState.value.isRunning || !raceState.value.isPaused) return;
            raceState.value.isPaused = false;
            lastUpdateTime.value = performance.now();

            // 重新启动计时器
            raceTimer.value = setInterval(() => {
                raceState.value.timeLeft--;
                if (raceState.value.timeLeft <= 0) {
                    finishRace();
                }
            }, 1000);

            // 重新启动游戏循环
            updateLoop();
            console.log('▶️ 比赛继续');
        };

        // 切换暂停状态（统一走 GameStore，本地 pauseRace/resumeRace 只响应 isPaused 的变化）
        const togglePause = () => {
            if (window.gameStore) {
                if (props.gameState.isPlaying) {
                    window.gameStore.actions.pauseGame();
                } else if (props.gameState.isPaused) {
                    window.gameStore.actions.resumeGame();
                }
            }
        };

        // 更新玩家位置（由外部WPM驱动）
        const updatePlayerPosition = (wpm) => {
            if (!raceState.value.isRunning || raceState.value.isPaused) return;

            const timeElapsed = difficultyConfig.value.raceTime - raceState.value.timeLeft;
            const speedFactor = wpm / 60;
            const gameplay = config.value.gameplay;
            raceState.value.playerPosition = Math.min(
                speedFactor * timeElapsed * gameplay.wpmToSpeedFactor,
                config.value.trackLength
            );
        };

        // 更新AI赛车
        const updateAICars = (deltaTime) => {
            const timeElapsed = difficultyConfig.value.raceTime - raceState.value.timeLeft;
            const speedMultiplier = difficultyConfig.value.aiSpeedMultiplier;
            const gameplay = config.value.gameplay;

            aiCars.value.forEach(car => {
                const effectiveWpm = car.baseWpm * speedMultiplier;
                const speedFactor = effectiveWpm / 60;
                raceState.value.aiPositions[car.id] = Math.min(
                    speedFactor * timeElapsed * gameplay.wpmToSpeedFactor,
                    config.value.trackLength
                );
            });
        };

        // 检查超越
        const checkOvertakes = () => {
            const previousRankings = [...raceState.value.rankings];
            const currentRanks = currentRankings.value;

            const playerCurrentRank = currentRanks.find(car => car.type === 'player')?.rank || 4;
            const playerPreviousRank = previousRankings.find(car => car.type === 'player')?.rank || 4;

            if (playerCurrentRank < playerPreviousRank && previousRankings.length > 0) {
                raceState.value.overtakeCount++;
                raceState.value.score += config.value.gameplay.overtakeBonus;

                // 被超越的车：上一帧占据玩家新名次的那辆（rank 1-based → index rank-1）
                const overtakenCar = previousRankings.find(car => car.rank === playerCurrentRank && car.type !== 'player');
                emit('car-overtaken', {
                    overtakenCar: overtakenCar?.name || '未知',
                    newRank: playerCurrentRank,
                    totalOvertakes: raceState.value.overtakeCount
                });

                triggerOvertakeAnimation();
            }

            raceState.value.rankings = currentRanks;
        };

        // 超越动画
        const triggerOvertakeAnimation = () => {
            const playerCar = document.querySelector('.racing-car.player');
            if (playerCar) {
                playerCar.classList.add('overtaking');
                setTimeout(() => playerCar.classList.remove('overtaking'), 500);
            }
        };

        // 结束比赛
        const finishRace = () => {
            if (!raceState.value.isRunning) return;

            console.log('🏁 赛车比赛结束！');
            raceState.value.isRunning = false;

            if (raceTimer.value) {
                clearInterval(raceTimer.value);
                raceTimer.value = null;
            }

            if (animationFrame.value) {
                cancelAnimationFrame(animationFrame.value);
                animationFrame.value = null;
            }

            const finalRankings = currentRankings.value;
            const playerFinalRank = finalRankings.find(car => car.type === 'player')?.rank || 4;
            raceState.value.finalRank = playerFinalRank;

            // 计算最终分数
            if (playerFinalRank === 1) {
                raceState.value.score += config.value.gameplay.winBonus;
            }
            raceState.value.score += Math.round(playerProgress.value * config.value.gameplay.baseScore);

            const racingResults = {
                finalRank: playerFinalRank,
                overtakeCount: raceState.value.overtakeCount,
                finalPosition: raceState.value.playerPosition,
                score: raceState.value.score,
                difficulty: currentDifficulty.value,
                rankings: finalRankings
            };

            emit('race-finished', racingResults);

            // 持久化结果（走统一的生命周期+统计单路径）；isRunning 已置 false，
            // 不会因 completeGame 触发的 isPlaying 变化而重入 finishRace
            if (window.gameEngine) {
                window.gameEngine.completeGame({ racingResults });
            }
        };

        // 重置比赛
        const resetRace = () => {
            raceState.value.isRunning = false;
            raceState.value.isPaused = false;
            raceState.value.timeLeft = difficultyConfig.value.raceTime;
            raceState.value.playerPosition = 0;
            raceState.value.overtakeCount = 0;
            raceState.value.finalRank = 0;
            raceState.value.score = 0;
            raceState.value.rankings = [];
            initAiPositions();

            if (raceTimer.value) {
                clearInterval(raceTimer.value);
                raceTimer.value = null;
            }

            if (animationFrame.value) {
                cancelAnimationFrame(animationFrame.value);
                animationFrame.value = null;
            }
        };

        // “结束”按钮：主动放弃比赛，先本地重置（置 isRunning=false，使下方 watch 不再结算成绩），
        // 再走统一生命周期重置，回到难度选择
        const resetGame = () => {
            resetRace();
            if (window.gameEngine) {
                window.gameEngine.resetGame();
            }
        };

        watch(() => props.gameState.isPlaying, (isPlaying) => {
            if (isPlaying && props.gameState.mode === 'racing' && !raceState.value.isRunning) {
                startRace();
            } else if (!isPlaying && raceState.value.isRunning) {
                finishRace();
            }
        });

        // 暂停/继续统一由 GameStore 驱动（header 的暂停按钮走这条路径）
        watch(() => props.gameState.isPaused, (isPaused) => {
            if (isPaused && raceState.value.isRunning && !raceState.value.isPaused) {
                pauseRace();
            } else if (!isPaused && raceState.value.isRunning && raceState.value.isPaused) {
                resumeRace();
            }
        });

        watch(() => props.isVisible, (visible) => {
            if (!visible) {
                resetRace();
            }
        });

        // 生命周期
        onMounted(() => {
            console.log('🏎️ RacingTrack组件已挂载');
            loadConfig();
        });

        onUnmounted(() => {
            resetRace();
        });

        return {
            config,
            configLoaded,
            currentDifficulty,
            difficultyConfig,
            aiCars,
            raceState,
            playerProgress,
            aiProgress,
            currentRankings,
            timeDisplay,
            isTimeWarning,
            laneCenter,
            laneX,
            selectDifficulty,
            startRaceButtonClick,
            startRace,
            pauseRace,
            resumeRace,
            togglePause,
            finishRace,
            resetRace,
            resetGame
        };
    },
    template: `
        <div class="racing-container" v-show="isVisible">
            <!-- 顶部：状态面板（复用基础 .stat-item 组件，与其它模式统一尺寸）-->
            <div class="racing-stats">
                <div class="stat-item">
                    <span class="stat-icon">⚡</span>
                    <span class="stat-label">当前速度</span>
                    <span class="stat-value">{{ statsState.wpm || 0 }} WPM</span>
                </div>
                <div class="stat-item">
                    <span class="stat-icon">🚀</span>
                    <span class="stat-label">超越次数</span>
                    <span class="stat-value">{{ raceState.overtakeCount }}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-icon">🏁</span>
                    <span class="stat-label">当前排名</span>
                    <span class="stat-value">
                        {{ currentRankings.find(car => car.type === 'player')?.rank || '-' }}/{{ aiCars.length + 1 }}
                    </span>
                </div>
                <div class="stat-item">
                    <span class="stat-icon">💰</span>
                    <span class="stat-label">得分</span>
                    <span class="stat-value">{{ raceState.score }}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-icon">⏱️</span>
                    <span class="stat-label">剩余时间</span>
                    <span class="stat-value" :class="{ warning: isTimeWarning }">{{ timeDisplay }}</span>
                </div>
            </div>

            <!-- 中间：游戏区域 -->
            <div class="racing-game-area">
                <!-- 赛道（车道数 = 玩家 + AI，每道等高）-->
                <div class="racing-track" :style="{ '--lane-count': aiCars.length + 1 }">
                    <!-- 紧凑实时排名：浮在赛道右上角 -->
                    <div class="racing-mini-rank">
                        <div
                            v-for="car in currentRankings"
                            :key="car.type"
                            class="racing-mini-rank-row"
                            :class="{ player: car.type === 'player' }"
                        >
                            <span class="racing-mini-rank-pos">{{ car.rank }}</span>
                            <span class="racing-mini-rank-icon">{{ car.icon }}</span>
                            <span class="racing-mini-rank-pct">{{ Math.round(car.progress) }}%</span>
                        </div>
                    </div>

                    <!-- 玩家赛车（第 1 道）-->
                    <div
                        class="racing-car player"
                        :style="{ left: laneX(playerProgress), top: laneCenter(0) }"
                    >
                        {{ config.cars.player.icon }}
                    </div>

                    <!-- AI赛车（第 2..N 道）-->
                    <div
                        v-for="(car, index) in aiCars"
                        :key="car.id"
                        class="racing-car ai"
                        :class="car.id"
                        :style="{
                            left: laneX(aiProgress[car.id]),
                            top: laneCenter(index + 1)
                        }"
                    >
                        {{ car.icon }}
                    </div>

                    <!-- 暂停遮罩 -->
                    <div class="paused-veil" v-if="raceState.isPaused">
                        <div class="veil-icon">⏸️</div>
                        <div class="veil-text">比赛暂停</div>
                    </div>
                </div>
            </div>

            <!-- 打字文本面板 -->
            <div class="racing-typing-panel" v-if="raceState.isRunning">
                <div class="text-content">
                    <div v-if="textState.highlightedText" v-html="textState.highlightedText"></div>
                    <div v-else>{{ textState.currentText }}</div>
                </div>
                <!-- 暂停蒙版：模糊文本 -->
                <div class="paused-veil" v-if="raceState.isPaused">
                    <div class="veil-icon">⏸️</div>
                    <div class="veil-text">进站休息~</div>
                </div>
            </div>

            <!-- 底部：游戏控制 -->
            <div class="racing-game-controls" v-if="!raceState.isRunning && raceState.finalRank === 0">
                <div class="difficulty-title">选择难度</div>
                <div class="difficulty-options">
                    <button
                        v-for="(diff, key) in config.difficulty"
                        :key="key"
                        class="difficulty-btn"
                        :class="{ active: currentDifficulty === key }"
                        @click="selectDifficulty(key)"
                    >
                        <span class="diff-name">{{ diff.name }}</span>
                        <span class="diff-desc">{{ diff.description }}</span>
                        <span class="diff-time">{{ diff.raceTime }}秒</span>
                    </button>
                </div>
                <button class="racing-start-btn" @click="startRaceButtonClick">
                    🏎️ 开始比赛
                </button>
            </div>

            <!-- 游戏结束界面 -->
            <div v-if="!raceState.isRunning && raceState.finalRank > 0" class="racing-game-over">
                <div
                    class="racing-game-over-title"
                    :class="{ victory: raceState.finalRank === 1 }"
                >
                    {{ raceState.finalRank === 1 ? '🏆 恭喜获胜！' : '🏁 比赛结束' }}
                </div>

                <div class="racing-final-stats">
                    <div class="racing-final-stat">
                        <div class="racing-final-stat-label">最终排名</div>
                        <div class="racing-final-stat-value">{{ raceState.finalRank }}/{{ aiCars.length + 1 }}</div>
                    </div>
                    <div class="racing-final-stat">
                        <div class="racing-final-stat-label">超越次数</div>
                        <div class="racing-final-stat-value">{{ raceState.overtakeCount }}</div>
                    </div>
                    <div class="racing-final-stat">
                        <div class="racing-final-stat-label">最终得分</div>
                        <div class="racing-final-stat-value">{{ raceState.score }}</div>
                    </div>
                    <div class="racing-final-stat">
                        <div class="racing-final-stat-label">平均速度</div>
                        <div class="racing-final-stat-value">{{ statsState.wpm || 0 }} WPM</div>
                    </div>
                </div>

                <button class="racing-start-btn" @click="resetGame">
                    🏎️ 再来一局
                </button>
            </div>

            <!-- 游戏控制按钮（container 最下方，与植物防御模式统一）-->
            <div class="game-controls" v-if="raceState.isRunning" style="margin-top: 20px;">
                <button
                    class="btn btn-secondary"
                    @click="togglePause"
                    style="background: #ff9800; color: white; border: none; padding: 12px 24px; border-radius: 8px; cursor: pointer; margin: 5px;"
                >
                    {{ raceState.isPaused ? '▶️ 继续' : '⏸️ 暂停' }}
                </button>
                <button
                    class="btn btn-secondary"
                    @click="resetGame"
                    style="background: #f44336; color: white; border: none; padding: 12px 24px; border-radius: 8px; cursor: pointer; margin: 5px;"
                >
                    🔄 结束
                </button>
            </div>
        </div>
    `
};

// 导出组件
window.RacingTrack = RacingTrack;
