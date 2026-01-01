// 植物防御游戏引擎
class DefenseEngine extends EventEmitter {
    constructor() {
        super();
        
        // 游戏状态
        this.gameState = {
            isPlaying: false,
            isPaused: false,
            isCompleted: false,
            difficulty: 'easy',
            currentWave: 1,
            totalWaves: 4,
            score: 0,
            startTime: null
        };
        
        // 植物状态
        this.plant = {
            health: 100,
            maxHealth: 100,
            position: { x: 30, y: 150 },
            lastShot: 0,
            fireRate: 300, // 射击间隔(ms)
            isAlive: true
        };
        
        // 道路系统 (5条道路，均匀分布)
        // 车道位置会根据战场实际高度动态计算
        this.lanes = {
            count: 5,
            zombieHeight: 60 // 僵尸元素大约高度（icon + word-container）
        };

        // 战场尺寸（会在游戏开始时动态获取）
        this.battlefield = {
            width: 800,   // 默认值，会被动态更新
            height: 350   // 高度固定
        };
        
        // 僵尸系统
        this.zombies = new Map();
        this.zombieIdCounter = 0;
        this.currentTarget = null;
        this.userInput = '';
        
        // 子弹系统
        this.bullets = new Map();
        this.bulletIdCounter = 0;
        
        // 波次系统
        this.waveSystem = {
            current: 1,
            zombiesInWave: 0,
            zombiesKilled: 0,
            waveStartTime: null,
            betweenWaves: false
        };
        
        // 难度配置
        this.difficultyConfig = {
            easy: {
                waves: 4,
                zombiesPerWave: [3, 4, 5, 6],
                zombieTypes: {
                    basic: 0.7,
                    medium: 0.25,
                    strong: 0.05,
                    boss: 0
                },
                spawnInterval: 2000
            },
            medium: {
                waves: 7,
                zombiesPerWave: [4, 5, 6, 7, 8, 9, 10],
                zombieTypes: {
                    basic: 0.5,
                    medium: 0.35,
                    strong: 0.13,
                    boss: 0.02
                },
                spawnInterval: 1500
            },
            hard: {
                waves: 10,
                zombiesPerWave: [5, 6, 8, 10, 12, 14, 16, 18, 20, 25],
                zombieTypes: {
                    basic: 0.3,
                    medium: 0.4,
                    strong: 0.25,
                    boss: 0.05
                },
                spawnInterval: 1000
            }
        };
        
        // 僵尸类型配置
        // 血量由单词长度决定，这里只配置其他属性
        // 单词越长，僵尸越难击杀，但移动速度越慢，分数越高
        this.zombieTypes = {
            basic: {
                speed: 30,      // 移动速度（像素/秒）
                damage: 10,     // 对植物伤害
                points: 10,     // 击杀得分
                icon: '🧟‍♂️',
                color: '#8b4513'
            },
            medium: {
                speed: 22,
                damage: 15,
                points: 25,
                icon: '🧟‍♀️',
                color: '#ff6347'
            },
            strong: {
                speed: 15,
                damage: 25,
                points: 50,
                icon: '🧟',
                color: '#dc143c'
            },
            boss: {
                speed: 10,
                damage: 40,
                points: 100,
                icon: '👹',
                color: '#8b0000'
            }
        };
        
        // 单词数据 (将从API加载)
        this.wordsData = null;
        
        // 游戏循环
        this.gameLoop = null;
        this.lastUpdate = 0;
        
        // 初始化
        this.init();
    }
    
    init() {
        console.log('🌱 植物防御引擎初始化');
        this.bindEvents();
        this.loadWordsData();
    }
    
    // 加载单词数据
    async loadWordsData() {
        // 立即设置默认数据，避免异步加载期间的空值
        this.useDefaultWords();
        console.log('📚 使用默认单词数据');
        
        try {
            if (window.apiClient) {
                const response = await window.apiClient.getDefenseWords();
                if (response.status === 'success' && response.data) {
                    this.wordsData = response.data;
                    console.log('📚 从API加载单词数据成功');
                }
            }
        } catch (error) {
            console.warn('⚠️ API加载失败，继续使用默认数据');
        }
    }
    
    // 使用默认单词数据
    useDefaultWords() {
        this.wordsData = {
            basic: ['cat', 'dog', 'run', 'sun', 'car', 'hat', 'bat', 'rat'],
            medium: ['house', 'water', 'quick', 'brown', 'jumps', 'table'],
            strong: ['computer', 'keyboard', 'beautiful', 'wonderful'],
            boss: ['extraordinary', 'incomprehensible', 'unbelievable']
        };
    }
    
    bindEvents() {
        // 监听键盘输入
        document.addEventListener('keydown', (e) => {
            if (this.gameState.isPlaying && !this.gameState.isPaused) {
                this.handleKeyInput(e);
            }
        });
    }
    
    // 设置难度
    setDifficulty(difficulty) {
        if (!this.gameState.isPlaying) {
            this.gameState.difficulty = difficulty;
            const config = this.difficultyConfig[difficulty];
            this.gameState.totalWaves = config.waves;
            console.log(`🎯 难度设置为: ${difficulty} (${config.waves}波)`);
            this.emit('difficultyChanged', { difficulty, config });
        }
    }
    
    // 动态更新战场尺寸
    updateBattlefieldSize() {
        const battlefieldEl = document.querySelector('.battlefield');
        if (battlefieldEl) {
            const rect = battlefieldEl.getBoundingClientRect();
            this.battlefield.width = rect.width;
            this.battlefield.height = rect.height;
            console.log(`📐 战场尺寸: ${this.battlefield.width}x${this.battlefield.height}`);
        }
    }

    // 开始游戏
    startGame() {
        if (this.gameState.isPlaying) return;

        console.log('🌱 植物防御游戏开始！');

        // 动态获取战场尺寸
        this.updateBattlefieldSize();

        // 重置游戏状态
        this.resetGame();

        // 设置游戏状态
        this.gameState.isPlaying = true;
        this.gameState.isPaused = false;
        this.gameState.isCompleted = false;
        this.gameState.startTime = Date.now();

        // 重置植物状态
        this.plant.health = this.plant.maxHealth;
        this.plant.isAlive = true;

        // 开始第一波
        this.startWave(1);

        // 开始游戏循环
        this.startGameLoop();

        // 播放开始音效
        if (window.audioManager) {
            window.audioManager.playSound('gameStart');
        }
        
        this.emit('gameStarted');
    }
    
    // 开始波次
    startWave(waveNumber) {
        const config = this.difficultyConfig[this.gameState.difficulty];
        const zombieCount = config.zombiesPerWave[waveNumber - 1] || 5;
        
        this.waveSystem.current = waveNumber;
        this.waveSystem.zombiesInWave = zombieCount;
        this.waveSystem.zombiesKilled = 0;
        this.waveSystem.waveStartTime = Date.now();
        this.waveSystem.betweenWaves = false;
        
        console.log(`🌊 第${waveNumber}波开始！僵尸数量: ${zombieCount}`);
        
        // 生成僵尸
        this.spawnWaveZombies(zombieCount);
        
        this.emit('waveStarted', {
            wave: waveNumber,
            totalWaves: this.gameState.totalWaves,
            zombieCount
        });
    }
    
    // 生成波次僵尸
    spawnWaveZombies(count) {
        const config = this.difficultyConfig[this.gameState.difficulty];
        let spawnedCount = 0;
        
        const spawnNext = () => {
            if (spawnedCount >= count || !this.gameState.isPlaying) return;
            
            // 根据概率选择僵尸类型
            const zombieType = this.selectZombieType(config.zombieTypes);
            this.spawnZombie(zombieType);
            
            spawnedCount++;
            
            // 继续生成下一个僵尸
            if (spawnedCount < count) {
                setTimeout(spawnNext, config.spawnInterval + Math.random() * 1000);
            }
        };
        
        spawnNext();
    }
    
    // 选择僵尸类型
    selectZombieType(typeDistribution) {
        const random = Math.random();
        let cumulative = 0;
        
        for (const [type, probability] of Object.entries(typeDistribution)) {
            cumulative += probability;
            if (random <= cumulative) {
                return type;
            }
        }
        
        return 'basic'; // 默认返回基础僵尸
    }
    
    // 生成僵尸
    spawnZombie(type) {
        const zombieConfig = this.zombieTypes[type];
        if (!zombieConfig) {
            console.error(`❌ 未知的僵尸类型: ${type}`);
            return;
        }

        const typeWords = this.wordsData?.[type] || this.wordsData?.basic || ['error'];
        const word = Utils.randomChoice(typeWords);

        // 血量 = 单词长度（每输入正确一个字母扣1点血）
        const health = word.length;

        // 根据难度调整速度
        const speedMultiplier = {
            easy: 0.8,
            medium: 1.0,
            hard: 1.3
        }[this.gameState.difficulty] || 1.0;

        // 随机选择一条道路
        const laneIndex = Math.floor(Math.random() * this.lanes.count);

        // 计算车道Y位置（按比例，使僵尸居中在车道内）
        // 5条车道均匀分布，车道高度 = 战场高度/5
        const laneHeight = this.battlefield.height / this.lanes.count;
        const laneY = laneIndex * laneHeight + (laneHeight - this.lanes.zombieHeight) / 2;

        // 僵尸生成位置：从战场右侧边缘开始（留出80px使其可见）
        const spawnX = this.battlefield.width - 80;

        const zombie = {
            id: ++this.zombieIdCounter,
            type: type,
            word: word,
            health: health,
            maxHealth: health,
            speed: zombieConfig.speed * speedMultiplier,
            damage: zombieConfig.damage,
            points: zombieConfig.points,
            icon: zombieConfig.icon,
            color: zombieConfig.color,
            lane: laneIndex, // 记录所在道路
            position: {
                x: spawnX,  // 从战场右侧开始
                y: laneY    // 居中在车道内
            },
            isAlive: true,
            lastMove: Date.now()
        };
        
        this.zombies.set(zombie.id, zombie);
        
        // 如果没有当前目标，设置为目标
        if (!this.currentTarget) {
            this.setTarget(zombie);
        }
        
        console.log(`🧟‍♂️ 生成${type}僵尸: "${word}" (血量: ${zombie.health}, 速度: ${zombie.speed.toFixed(1)})`);
        
        this.emit('zombieSpawned', zombie);
        return zombie;
    }
    
    // 设置目标僵尸
    setTarget(zombie) {
        this.currentTarget = zombie;
        this.userInput = '';
        
        this.emit('targetChanged', {
            zombie: zombie,
            word: zombie.word,
            typed: '',
            remaining: zombie.word
        });
    }
    
    // 处理键盘输入
    handleKeyInput(event) {
        if (!this.currentTarget || !this.gameState.isPlaying || this.gameState.isPaused) return;
        
        const key = event.key.toLowerCase();
        
        // 处理退格键
        if (key === 'backspace') {
            event.preventDefault();
            if (this.userInput.length > 0) {
                this.userInput = this.userInput.slice(0, -1);
                this.updateWordProgress();
            }
            return;
        }
        
        // 只处理字母
        if (!/^[a-z]$/.test(key)) return;
        
        event.preventDefault();
        
        const targetWord = this.currentTarget.word.toLowerCase();
        const expectedChar = targetWord[this.userInput.length];
        
        if (key === expectedChar) {
            // 正确输入
            this.userInput += key;
            this.updateWordProgress();
            
            // 播放正确音效
            if (window.audioManager) {
                window.audioManager.playSound('keyPress');
            }
            
            // 每输入正确一个字母就射击
            this.shootZombie(this.currentTarget);
            
            // 检查是否完成单词
            if (this.userInput === targetWord) {
                this.completeWord();
            }
        } else {
            // 错误输入
            if (window.audioManager) {
                window.audioManager.playSound('keyError');
            }
            
            // 显示错误效果
            this.showError();
        }
    }
    
    // 更新单词进度
    updateWordProgress() {
        if (!this.currentTarget) return;
        
        const word = this.currentTarget.word;
        const typed = this.userInput;
        const remaining = word.slice(typed.length);
        
        this.emit('wordProgress', {
            word: word,
            typed: typed,
            remaining: remaining,
            progress: typed.length / word.length
        });
    }
    
    // 完成单词
    completeWord() {
        if (!this.currentTarget) return;
        
        // 重置输入
        this.userInput = '';
        
        // 寻找下一个目标
        this.findNextTarget();
    }
    
    // 射击僵尸
    shootZombie(zombie) {
        // 创建子弹
        const startX = this.plant.position.x + 40;
        const startY = this.plant.position.y;

        const bullet = {
            id: ++this.bulletIdCounter,
            startX: startX,
            startY: startY,
            targetX: zombie.position.x,
            targetY: zombie.position.y,
            currentX: startX,  // 初始位置
            currentY: startY,  // 初始位置
            targetZombieId: zombie.id, // 记录目标僵尸ID
            progress: 0,       // 飞行进度
            damage: 1,
            startTime: Date.now()
        };
        
        this.bullets.set(bullet.id, bullet);
        
        // 植物射击动画
        this.emit('plantShoot', {
            plant: this.plant,
            target: zombie,
            bullet: bullet
        });
        
        // 播放射击音效
        if (window.audioManager) {
            window.audioManager.playSound('achievement');
        }
        
        console.log(`💥 射击僵尸: ${zombie.word}`);
    }
    
    // 寻找下一个目标
    findNextTarget() {
        // 找到最近的活着的僵尸
        let nearestZombie = null;
        let nearestDistance = Infinity;
        
        for (const zombie of this.zombies.values()) {
            if (zombie.isAlive) {
                const distance = zombie.position.x;
                if (distance < nearestDistance) {
                    nearestDistance = distance;
                    nearestZombie = zombie;
                }
            }
        }
        
        if (nearestZombie) {
            this.setTarget(nearestZombie);
        } else {
            this.currentTarget = null;
            this.emit('noTarget');
        }
    }
    
    // 显示错误效果
    showError() {
        this.emit('inputError', {
            target: this.currentTarget,
            input: this.userInput
        });
    }
    
    // 开始游戏循环
    startGameLoop() {
        this.lastUpdate = Date.now();
        
        const gameLoop = (currentTime) => {
            if (!this.gameState.isPlaying) return;
            
            const deltaTime = currentTime - this.lastUpdate;
            this.lastUpdate = currentTime;
            
            // 更新游戏逻辑
            this.updateGame(deltaTime);
            
            // 继续循环
            this.gameLoop = requestAnimationFrame(gameLoop);
        };
        
        this.gameLoop = requestAnimationFrame(gameLoop);
    }
    
    // 更新游戏逻辑
    updateGame(deltaTime) {
        if (this.gameState.isPaused) return;
        
        // 更新僵尸位置
        this.updateZombies(deltaTime);
        
        // 更新子弹
        this.updateBullets(deltaTime);
        
        // 检查碰撞
        this.checkCollisions();
        
        // 检查波次完成
        this.checkWaveCompletion();
        
        // 检查游戏结束条件
        this.checkGameEnd();
        
        // 发送更新事件
        this.emit('gameUpdate', {
            plant: this.plant,
            zombies: Array.from(this.zombies.values()),
            bullets: Array.from(this.bullets.values()),
            gameState: this.gameState,
            waveSystem: this.waveSystem
        });
    }
    
    // 更新僵尸
    updateZombies(deltaTime) {
        const currentTime = Date.now();
        
        for (const zombie of this.zombies.values()) {
            if (!zombie.isAlive) continue;
            
            // 移动僵尸
            const moveDistance = (zombie.speed * deltaTime) / 1000;
            zombie.position.x -= moveDistance;
            
            // 检查是否到达植物
            if (zombie.position.x <= this.plant.position.x + 50) {
                this.zombieAttackPlant(zombie);
            }
        }
    }
    
    // 僵尸攻击植物
    zombieAttackPlant(zombie) {
        if (!zombie.isAlive || !this.plant.isAlive) return;
        
        // 造成伤害
        this.plant.health -= zombie.damage;
        this.plant.health = Math.max(0, this.plant.health);
        
        // 移除僵尸
        zombie.isAlive = false;
        this.zombies.delete(zombie.id);
        
        // 如果这是当前目标，寻找新目标
        if (this.currentTarget && this.currentTarget.id === zombie.id) {
            this.findNextTarget();
        }
        
        console.log(`💔 植物受到攻击！血量: ${this.plant.health}/${this.plant.maxHealth}`);
        
        // 播放受伤音效
        if (window.audioManager) {
            window.audioManager.playSound('keyError');
        }
        
        this.emit('plantDamaged', {
            damage: zombie.damage,
            currentHealth: this.plant.health,
            maxHealth: this.plant.maxHealth,
            zombie: zombie
        });
        
        // 检查植物是否死亡
        if (this.plant.health <= 0) {
            this.plant.isAlive = false;
            this.gameOver(false);
        }
    }
    
    // 更新子弹
    updateBullets(deltaTime) {
        const currentTime = Date.now();

        for (const bullet of this.bullets.values()) {
            const elapsed = currentTime - bullet.startTime;
            const flightTime = 400; // 0.4秒飞行时间
            const progress = Math.min(elapsed / flightTime, 1);

            // 更新子弹位置
            bullet.currentX = bullet.startX + (bullet.targetX - bullet.startX) * progress;
            bullet.currentY = bullet.startY + (bullet.targetY - bullet.startY) * progress;
            bullet.progress = progress; // 保存进度供碰撞检测使用
        }
        // 注意：不在这里删除子弹，由 checkCollisions 统一处理
    }
    
    // 检查碰撞
    checkCollisions() {
        const bulletsToRemove = [];

        for (const bullet of this.bullets.values()) {
            // 获取子弹的目标僵尸
            const targetZombie = this.zombies.get(bullet.targetZombieId);

            if (!targetZombie || !targetZombie.isAlive) {
                // 目标已死亡或不存在，移除子弹
                bulletsToRemove.push(bullet.id);
                continue;
            }

            // 更新子弹目标位置（追踪僵尸）
            bullet.targetX = targetZombie.position.x;
            bullet.targetY = targetZombie.position.y;

            // 检测碰撞：子弹到达目标位置 或 接近目标僵尸
            const dx = bullet.currentX - targetZombie.position.x;
            const dy = bullet.currentY - targetZombie.position.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            // 当子弹飞行完成(progress >= 1)或接近目标时，命中
            if (bullet.progress >= 1 || distance < 40) {
                this.hitZombie(targetZombie, bullet);
                bulletsToRemove.push(bullet.id);
            }
        }

        // 移除已命中或无效的子弹
        bulletsToRemove.forEach(id => this.bullets.delete(id));
    }
    
    // 击中僵尸
    hitZombie(zombie, bullet) {
        zombie.health -= bullet.damage;
        
        console.log(`🎯 击中僵尸 ${zombie.word}！剩余血量: ${zombie.health}`);
        
        this.emit('zombieHit', {
            zombie: zombie,
            damage: bullet.damage,
            position: { x: zombie.position.x, y: zombie.position.y }
        });
        
        // 检查僵尸是否死亡
        if (zombie.health <= 0) {
            this.killZombie(zombie);
        }
    }
    
    // 杀死僵尸
    killZombie(zombie) {
        zombie.isAlive = false;
        this.zombies.delete(zombie.id);
        
        // 增加分数
        this.gameState.score += zombie.points;
        
        // 增加击杀计数
        this.waveSystem.zombiesKilled++;
        
        console.log(`💀 僵尸 ${zombie.word} 被击杀！获得 ${zombie.points} 分`);
        
        // 如果这是当前目标，寻找新目标
        if (this.currentTarget && this.currentTarget.id === zombie.id) {
            this.findNextTarget();
        }
        
        // 播放击杀音效
        if (window.audioManager) {
            window.audioManager.playSound('achievement');
        }
        
        this.emit('zombieKilled', {
            zombie: zombie,
            score: this.gameState.score,
            waveProgress: {
                killed: this.waveSystem.zombiesKilled,
                total: this.waveSystem.zombiesInWave
            }
        });
    }
    
    // 检查波次完成
    checkWaveCompletion() {
        if (this.waveSystem.betweenWaves) return;
        
        // 检查是否所有僵尸都被击杀
        const aliveZombies = Array.from(this.zombies.values()).filter(z => z.isAlive);
        
        if (this.waveSystem.zombiesKilled >= this.waveSystem.zombiesInWave && aliveZombies.length === 0) {
            this.completeWave();
        }
    }
    
    // 完成波次
    completeWave() {
        const currentWave = this.waveSystem.current;
        
        console.log(`🌊 第${currentWave}波完成！`);
        
        this.waveSystem.betweenWaves = true;
        
        this.emit('waveCompleted', {
            wave: currentWave,
            totalWaves: this.gameState.totalWaves,
            score: this.gameState.score
        });
        
        // 检查是否还有下一波
        if (currentWave < this.gameState.totalWaves) {
            // 开始下一波
            setTimeout(() => {
                if (this.gameState.isPlaying) {
                    this.startWave(currentWave + 1);
                }
            }, 3000); // 3秒间隔
        } else {
            // 游戏胜利
            this.gameOver(true);
        }
    }
    
    // 检查游戏结束
    checkGameEnd() {
        // 植物死亡
        if (!this.plant.isAlive) {
            this.gameOver(false);
            return;
        }
        
        // 所有波次完成
        if (this.waveSystem.current > this.gameState.totalWaves) {
            this.gameOver(true);
            return;
        }
    }
    
    // 游戏结束
    gameOver(victory) {
        if (this.gameState.isCompleted) return;
        
        this.gameState.isCompleted = true;
        this.gameState.isPlaying = false;
        
        // 停止游戏循环
        if (this.gameLoop) {
            cancelAnimationFrame(this.gameLoop);
            this.gameLoop = null;
        }
        
        const endTime = Date.now();
        const playTime = (endTime - this.gameState.startTime) / 1000;
        
        const results = {
            victory: victory,
            score: this.gameState.score,
            wave: this.waveSystem.current,
            totalWaves: this.gameState.totalWaves,
            playTime: playTime,
            difficulty: this.gameState.difficulty,
            plantHealth: this.plant.health,
            zombiesKilled: this.waveSystem.zombiesKilled
        };
        
        console.log(`🎮 游戏结束！${victory ? '胜利' : '失败'}`, results);
        
        // 保存统计数据到Python后端
        this.saveGameStats(results);
        
        // 播放结束音效
        if (window.audioManager) {
            window.audioManager.playSound(victory ? 'gameEnd' : 'keyError');
        }
        
        this.emit('gameOver', results);
    }
    
    // 保存游戏统计到后端
    async saveGameStats(results) {
        try {
            if (window.apiClient) {
                const stats = {
                    score: results.score,
                    wave: results.wave,
                    total_waves: results.totalWaves,
                    zombies_killed: results.zombiesKilled,
                    plant_health: results.plantHealth,
                    difficulty: results.difficulty,
                    victory: results.victory,
                    play_time: results.playTime
                };
                
                const response = await window.apiClient.saveDefenseStats(stats);
                if (response.status === 'success') {
                    console.log('📊 植物防御统计已保存到后端');
                } else {
                    console.warn('⚠️ 保存统计数据失败');
                }
            }
        } catch (error) {
            console.error('❌ 保存统计数据出错:', error);
        }
    }
    
    // 暂停/继续游戏
    togglePause() {
        if (!this.gameState.isPlaying || this.gameState.isCompleted) return;
        
        this.gameState.isPaused = !this.gameState.isPaused;
        
        console.log(`⏸️ 游戏${this.gameState.isPaused ? '暂停' : '继续'}`);
        
        this.emit('gamePaused', this.gameState.isPaused);
    }
    
    // 重置游戏
    resetGame() {
        // 停止游戏循环
        if (this.gameLoop) {
            cancelAnimationFrame(this.gameLoop);
            this.gameLoop = null;
        }
        
        // 重置状态
        this.gameState.isPlaying = false;
        this.gameState.isPaused = false;
        this.gameState.isCompleted = false;
        this.gameState.currentWave = 1;
        this.gameState.score = 0;
        
        // 重置植物
        this.plant.health = this.plant.maxHealth;
        this.plant.isAlive = true;
        
        // 清空僵尸和子弹
        this.zombies.clear();
        this.bullets.clear();
        this.currentTarget = null;
        this.userInput = '';
        
        // 重置波次系统
        this.waveSystem.current = 1;
        this.waveSystem.zombiesInWave = 0;
        this.waveSystem.zombiesKilled = 0;
        this.waveSystem.betweenWaves = false;
        
        console.log('🔄 游戏重置');
        
        this.emit('gameReset');
    }
    
    // 获取游戏状态
    getGameState() {
        return {
            ...this.gameState,
            plant: { ...this.plant },
            waveSystem: { ...this.waveSystem },
            currentTarget: this.currentTarget,
            userInput: this.userInput,
            zombieCount: this.zombies.size,
            bulletCount: this.bullets.size
        };
    }
}

// 导出
window.DefenseEngine = DefenseEngine;
