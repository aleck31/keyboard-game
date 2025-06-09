// 赛车追逐组件
const { ref, computed, watch, onMounted, onUnmounted } = Vue;

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
        // 响应式数据
        const playerWPM = ref(0);
        const remainingTime = ref(60);
        const currentRank = ref(4);
        const overtakenCars = ref([]);
        
        // AI赛车配置
        const aiCars = ref({
            slow: { speed: 30, position: 0, name: '慢车', icon: '🚗', color: 'success' },
            medium: { speed: 50, position: 0, name: '中速车', icon: '🚙', color: 'warning' },
            fast: { speed: 70, position: 0, name: '快车', icon: '🏁', color: 'error' }
        });
        
        // 计算属性
        const playerPosition = computed(() => {
            return Math.min((playerWPM.value / 100) * 100, 85);
        });
        
        const countdownClass = computed(() => {
            if (remainingTime.value <= 10) return 'danger';
            if (remainingTime.value <= 30) return 'warning';
            return '';
        });
        
        const formattedTime = computed(() => {
            const minutes = Math.floor(remainingTime.value / 60);
            const seconds = remainingTime.value % 60;
            return `${minutes}:${seconds.toString().padStart(2, '0')}`;
        });
        
        const rankText = computed(() => {
            const ranks = ['', '第一名', '第二名', '第三名', '第四名'];
            return ranks[currentRank.value] || '第四名';
        });
        
        const overtakenText = computed(() => {
            return overtakenCars.value.length > 0 
                ? `已超越: ${overtakenCars.value.join(', ')}` 
                : '已超越: 无';
        });
        
        // 更新AI赛车位置
        const updateAIPositions = (elapsed) => {
            Object.keys(aiCars.value).forEach(carKey => {
                const car = aiCars.value[carKey];
                // AI赛车以固定速度前进 (基于时间)
                car.position = Math.min((car.speed / 100) * (elapsed / 60) * 100, 85);
            });
        };
        
        // 检查超越
        const checkOvertakes = () => {
            const playerPos = playerPosition.value;
            
            Object.keys(aiCars.value).forEach(carKey => {
                const car = aiCars.value[carKey];
                const carName = car.name;
                
                // 如果玩家超越了这辆车且之前没有超越过
                if (playerPos > car.position && !overtakenCars.value.includes(carName)) {
                    overtakenCars.value.push(carName);
                    emit('car-overtaken', { carName, carType: carKey });
                    
                    // 触发超越动画
                    triggerOvertakeAnimation();
                }
            });
        };
        
        // 计算当前排名
        const calculateRank = () => {
            const playerPos = playerPosition.value;
            const aiPositions = Object.values(aiCars.value).map(car => car.position);
            
            // 计算有多少辆车在玩家前面
            const carsAhead = aiPositions.filter(pos => pos > playerPos).length;
            currentRank.value = carsAhead + 1;
        };
        
        // 超越动画
        const triggerOvertakeAnimation = () => {
            const playerCar = document.querySelector('.player-car');
            if (playerCar) {
                playerCar.classList.add('overtaking');
                setTimeout(() => {
                    playerCar.classList.remove('overtaking');
                }, 500);
            }
        };
        
        // 更新游戏数据
        const updateRaceData = () => {
            if (!props.gameState.isPlaying || props.gameState.isPaused) return;
            
            // 获取当前统计数据
            const stats = window.statsManager?.getCurrentStats();
            if (stats) {
                playerWPM.value = stats.wpm || 0;
            }
            
            // 计算经过时间
            const elapsed = props.gameState.startTime 
                ? (Date.now() - props.gameState.startTime) / 1000 
                : 0;
            
            remainingTime.value = Math.max(0, props.gameState.timeLimit - elapsed);
            
            // 更新AI位置
            updateAIPositions(elapsed);
            
            // 检查超越和排名
            checkOvertakes();
            calculateRank();
            
            // 检查比赛是否结束
            if (remainingTime.value <= 0) {
                emit('race-finished', {
                    rank: currentRank.value,
                    overtakenCars: overtakenCars.value,
                    finalPosition: playerPosition.value
                });
            }
        };
        
        // 重置比赛数据
        const resetRace = () => {
            playerWPM.value = 0;
            remainingTime.value = 60;
            currentRank.value = 4;
            overtakenCars.value = [];
            
            Object.keys(aiCars.value).forEach(carKey => {
                aiCars.value[carKey].position = 0;
            });
        };
        
        // 监听游戏状态变化
        watch(() => props.gameState.isPlaying, (newVal) => {
            if (newVal) {
                resetRace();
            }
        });
        
        // 定时器
        let updateInterval = null;
        
        onMounted(() => {
            updateInterval = setInterval(updateRaceData, 100);
        });
        
        onUnmounted(() => {
            if (updateInterval) {
                clearInterval(updateInterval);
            }
        });
        
        return {
            // 数据
            playerWPM,
            remainingTime,
            currentRank,
            overtakenCars,
            aiCars,
            
            // 计算属性
            playerPosition,
            countdownClass,
            formattedTime,
            rankText,
            overtakenText,
            
            // 方法
            resetRace
        };
    },
    template: `
        <div class="racing-container" v-show="isVisible">
            <div class="racing-header">
                <div class="racing-title">🏁 赛车追逐模式</div>
                <div class="racing-countdown">
                    <span class="countdown-label">剩余时间</span>
                    <span class="countdown-time" :class="countdownClass">{{ formattedTime }}</span>
                </div>
            </div>
            
            <div class="racing-track">
                <div class="track-line"></div>
                
                <!-- 玩家赛车 -->
                <div class="racing-car player-car" :style="{ left: playerPosition + '%' }">
                    <div class="car-icon">🏎️</div>
                    <div class="car-label">你</div>
                    <div class="car-speed">{{ playerWPM }} WPM</div>
                </div>
                
                <!-- AI赛车 -->
                <div 
                    v-for="(car, key) in aiCars" 
                    :key="key"
                    class="racing-car ai-car"
                    :class="key + '-car'"
                    :style="{ left: car.position + '%' }"
                >
                    <div class="car-icon">{{ car.icon }}</div>
                    <div class="car-label">{{ car.name }}</div>
                    <div class="car-speed">{{ car.speed }} WPM</div>
                </div>
                
                <!-- 终点线 -->
                <div class="finish-line">🏁</div>
            </div>
            
            <div class="racing-status">
                <div class="current-rank">当前排名: {{ rankText }}</div>
                <div class="overtaken-cars">{{ overtakenText }}</div>
            </div>
        </div>
    `
};

// 导出组件
window.RacingTrack = RacingTrack;
