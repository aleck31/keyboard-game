// 赛车追逐组件
const RacingTrack = {
    name: 'RacingTrack',
    props: {
        gameState: {
            type: Object,
            required: true
        },
        isVisible: {
            type: Boolean,
            default: false
        }
    },
    emits: ['car-overtaken', 'race-finished'],
    setup(props, { emit }) {
        const { ref, computed, watch, onMounted, onUnmounted } = Vue;
        
        // 赛车配置
        const racingConfig = ref({
            trackLength: 100,
            raceTime: 60,
            cars: {
                player: { name: '玩家', icon: '🚙', speed: 0, position: 0, color: '#00ff00' },
                slow: { name: '摩托车', icon: '🏍️', speed: 30, position: 0, color: '#90ee90' },
                medium: { name: '小汽车', icon: '🚗', speed: 50, position: 0, color: '#ffd700' },
                fast: { name: '超级跑车', icon: '🏎️', speed: 70, position: 0, color: '#ff6347' }
            }
        });
        
        // 响应式数据
        const raceState = ref({
            isRunning: false,
            timeLeft: 60,
            playerPosition: 0,
            aiPositions: {
                slow: 0,
                medium: 0,
                fast: 0
            },
            rankings: [],
            overtakeCount: 0,
            finalRank: 0
        });
        
        const raceTimer = ref(null);
        const animationFrame = ref(null);
        
        // 计算属性
        const playerProgress = computed(() => {
            return Math.min((raceState.value.playerPosition / racingConfig.value.trackLength) * 100, 100);
        });
        
        const aiProgress = computed(() => {
            return {
                slow: Math.min((raceState.value.aiPositions.slow / racingConfig.value.trackLength) * 100, 100),
                medium: Math.min((raceState.value.aiPositions.medium / racingConfig.value.trackLength) * 100, 100),
                fast: Math.min((raceState.value.aiPositions.fast / racingConfig.value.trackLength) * 100, 100)
            };
        });
        
        const currentRankings = computed(() => {
            const cars = [
                { name: '玩家', position: raceState.value.playerPosition, type: 'player', icon: '🏎️' },
                { name: '慢车', position: raceState.value.aiPositions.slow, type: 'slow', icon: '🚗' },
                { name: '中速车', position: raceState.value.aiPositions.medium, type: 'medium', icon: '🚙' },
                { name: '快车', position: raceState.value.aiPositions.fast, type: 'fast', icon: '🏁' }
            ];
            
            return cars
                .sort((a, b) => b.position - a.position)
                .map((car, index) => ({
                    ...car,
                    rank: index + 1,
                    progress: Math.min((car.position / racingConfig.value.trackLength) * 100, 100)
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
        
        // 方法
        const startRace = () => {
            if (raceState.value.isRunning) return;
            
            console.log('🏎️ 赛车比赛开始！');
            raceState.value.isRunning = true;
            raceState.value.timeLeft = racingConfig.value.raceTime;
            
            // 重置位置
            raceState.value.playerPosition = 0;
            raceState.value.aiPositions = { slow: 0, medium: 0, fast: 0 };
            raceState.value.overtakeCount = 0;
            
            // 启动计时器
            raceTimer.value = setInterval(() => {
                raceState.value.timeLeft--;
                if (raceState.value.timeLeft <= 0) {
                    finishRace();
                }
            }, 1000);
            
            // 启动AI赛车更新
            updateAICars();
        };
        
        const updatePlayerPosition = (wpm) => {
            if (!raceState.value.isRunning) return;
            
            // 根据WPM计算玩家位置
            const speedFactor = Math.max(wpm / 60, 0); // 60 WPM = 1.0倍速
            const timeElapsed = racingConfig.value.raceTime - raceState.value.timeLeft;
            raceState.value.playerPosition = Math.min(speedFactor * timeElapsed * 1.5, racingConfig.value.trackLength);
            
            checkOvertakes();
        };
        
        const updateAICars = () => {
            if (!raceState.value.isRunning) return;
            
            const timeElapsed = racingConfig.value.raceTime - raceState.value.timeLeft;
            
            // 更新AI赛车位置
            Object.keys(raceState.value.aiPositions).forEach(carType => {
                const carSpeed = racingConfig.value.cars[carType].speed;
                const speedFactor = carSpeed / 60; // 转换为相对速度
                raceState.value.aiPositions[carType] = Math.min(
                    speedFactor * timeElapsed * 1.5,
                    racingConfig.value.trackLength
                );
            });
            
            if (raceState.value.isRunning) {
                animationFrame.value = requestAnimationFrame(() => {
                    setTimeout(updateAICars, 100); // 每100ms更新一次
                });
            }
        };
        
        const checkOvertakes = () => {
            const previousRankings = [...raceState.value.rankings];
            const currentRanks = currentRankings.value;
            
            // 检查玩家是否超越了其他赛车
            const playerCurrentRank = currentRanks.find(car => car.type === 'player')?.rank || 4;
            const playerPreviousRank = previousRankings.find(car => car.type === 'player')?.rank || 4;
            
            if (playerCurrentRank < playerPreviousRank) {
                raceState.value.overtakeCount++;
                emit('car-overtaken', {
                    overtakenCar: previousRankings[playerCurrentRank - 1]?.name || '未知',
                    newRank: playerCurrentRank,
                    totalOvertakes: raceState.value.overtakeCount
                });
                
                // 触发超越动画
                triggerOvertakeAnimation();
            }
            
            raceState.value.rankings = currentRanks;
        };
        
        const triggerOvertakeAnimation = () => {
            const playerCar = document.querySelector('.racing-car.player');
            if (playerCar) {
                playerCar.classList.add('overtaking');
                setTimeout(() => {
                    playerCar.classList.remove('overtaking');
                }, 500);
            }
        };
        
        const finishRace = () => {
            if (!raceState.value.isRunning) return;
            
            console.log('🏁 赛车比赛结束！');
            raceState.value.isRunning = false;
            
            // 清理计时器
            if (raceTimer.value) {
                clearInterval(raceTimer.value);
                raceTimer.value = null;
            }
            
            if (animationFrame.value) {
                cancelAnimationFrame(animationFrame.value);
                animationFrame.value = null;
            }
            
            // 计算最终排名
            const finalRankings = currentRankings.value;
            const playerFinalRank = finalRankings.find(car => car.type === 'player')?.rank || 4;
            raceState.value.finalRank = playerFinalRank;
            
            // 发送比赛结束事件
            emit('race-finished', {
                finalRank: playerFinalRank,
                overtakeCount: raceState.value.overtakeCount,
                finalPosition: raceState.value.playerPosition,
                rankings: finalRankings
            });
        };
        
        const resetRace = () => {
            raceState.value.isRunning = false;
            raceState.value.timeLeft = racingConfig.value.raceTime;
            raceState.value.playerPosition = 0;
            raceState.value.aiPositions = { slow: 0, medium: 0, fast: 0 };
            raceState.value.rankings = [];
            raceState.value.overtakeCount = 0;
            raceState.value.finalRank = 0;
            
            if (raceTimer.value) {
                clearInterval(raceTimer.value);
                raceTimer.value = null;
            }
            
            if (animationFrame.value) {
                cancelAnimationFrame(animationFrame.value);
                animationFrame.value = null;
            }
        };
        
        // 监听游戏状态变化
        watch(() => props.gameState.wpm, (newWpm) => {
            if (raceState.value.isRunning) {
                updatePlayerPosition(newWpm);
            }
        });
        
        watch(() => props.gameState.isPlaying, (isPlaying) => {
            if (isPlaying && props.gameState.mode === 'racing' && !raceState.value.isRunning) {
                startRace();
            } else if (!isPlaying && raceState.value.isRunning) {
                finishRace();
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
        });
        
        onUnmounted(() => {
            resetRace();
        });
        
        return {
            // 数据
            racingConfig,
            raceState,
            
            // 计算属性
            playerProgress,
            aiProgress,
            currentRankings,
            timeDisplay,
            isTimeWarning,
            
            // 方法
            startRace,
            finishRace,
            resetRace
        };
    },
    template: `
        <div class="racing-container" v-show="isVisible">
            <!-- 赛车追逐标题 -->
            <div class="racing-title">🏎️ 赛车追逐模式</div>
            
            <!-- 时间显示 -->
            <div class="racing-timer" :class="{ warning: isTimeWarning }">
                ⏱️ {{ timeDisplay }}
            </div>
            
            <!-- 赛道 -->
            <div class="racing-track">
                <!-- 玩家赛车 -->
                <div 
                    class="racing-car player"
                    :style="{ left: playerProgress + '%' }"
                >
                    {{ racingConfig.cars.player.icon }}
                </div>
                
                <!-- AI赛车 -->
                <div 
                    class="racing-car ai slow"
                    :style="{ left: aiProgress.slow + '%' }"
                >
                    {{ racingConfig.cars.slow.icon }}
                </div>
                
                <div 
                    class="racing-car ai medium"
                    :style="{ left: aiProgress.medium + '%' }"
                >
                    {{ racingConfig.cars.medium.icon }}
                </div>
                
                <div 
                    class="racing-car ai fast"
                    :style="{ left: aiProgress.fast + '%' }"
                >
                    {{ racingConfig.cars.fast.icon }}
                </div>
            </div>
            
            <!-- 赛车统计 -->
            <div class="racing-stats">
                <div class="racing-stat-item">
                    <div class="racing-stat-icon">⚡</div>
                    <div class="racing-stat-label">当前速度</div>
                    <div class="racing-stat-value">{{ gameState.wpm || 0 }} WPM</div>
                </div>
                <div class="racing-stat-item">
                    <div class="racing-stat-icon">🚀</div>
                    <div class="racing-stat-label">超越次数</div>
                    <div class="racing-stat-value">{{ raceState.overtakeCount }}</div>
                </div>
                <div class="racing-stat-item">
                    <div class="racing-stat-icon">📊</div>
                    <div class="racing-stat-label">完成进度</div>
                    <div class="racing-stat-value">{{ Math.round(playerProgress) }}%</div>
                </div>
                <div class="racing-stat-item">
                    <div class="racing-stat-icon">🏁</div>
                    <div class="racing-stat-label">当前排名</div>
                    <div class="racing-stat-value">
                        {{ currentRankings.find(car => car.type === 'player')?.rank || 4 }}/4
                    </div>
                </div>
            </div>
            
            <!-- 排行榜 -->
            <div class="racing-leaderboard">
                <div class="racing-leaderboard-title">🏆 实时排名</div>
                <div 
                    v-for="car in currentRankings" 
                    :key="car.type"
                    class="racing-position"
                    :class="{ 
                        first: car.rank === 1,
                        second: car.rank === 2,
                        third: car.rank === 3,
                        player: car.type === 'player'
                    }"
                >
                    <div class="racing-position-rank">
                        {{ car.rank === 1 ? '🥇' : car.rank === 2 ? '🥈' : car.rank === 3 ? '🥉' : car.rank }}
                    </div>
                    <div class="racing-position-name">
                        {{ car.icon }} {{ car.name }}
                    </div>
                    <div class="racing-position-progress">
                        {{ Math.round(car.progress) }}%
                    </div>
                </div>
            </div>
            
            <!-- 游戏结束界面 -->
            <div v-if="!raceState.isRunning && raceState.finalRank > 0" class="racing-game-over">
                <div 
                    class="racing-game-over-title"
                    :class="{ 
                        victory: raceState.finalRank === 1,
                        defeat: raceState.finalRank > 1
                    }"
                >
                    {{ raceState.finalRank === 1 ? '🏆 恭喜获胜！' : '🏁 比赛结束' }}
                </div>
                
                <div class="racing-final-stats">
                    <div class="racing-final-stat">
                        <div class="racing-final-stat-label">最终排名</div>
                        <div class="racing-final-stat-value">{{ raceState.finalRank }}/4</div>
                    </div>
                    <div class="racing-final-stat">
                        <div class="racing-final-stat-label">超越次数</div>
                        <div class="racing-final-stat-value">{{ raceState.overtakeCount }}</div>
                    </div>
                    <div class="racing-final-stat">
                        <div class="racing-final-stat-label">完成进度</div>
                        <div class="racing-final-stat-value">{{ Math.round(playerProgress) }}%</div>
                    </div>
                    <div class="racing-final-stat">
                        <div class="racing-final-stat-label">平均速度</div>
                        <div class="racing-final-stat-value">{{ gameState.wpm || 0 }} WPM</div>
                    </div>
                </div>
            </div>
        </div>
    `
};

// 导出组件
window.RacingTrack = RacingTrack;
