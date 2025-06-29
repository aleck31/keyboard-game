class GameEngine extends Utils.EventEmitter {
    constructor() {
        super();
        this.gameState = {
            isPlaying: false,
            isPaused: false,
            isCompleted: false,
            mode: 'classic',
            currentText: '',
            userInput: '',
            currentIndex: 0,
            startTime: null,
            endTime: null,
            timeLimit: 60,
            difficulty: 'normal',
            // 单词模式专用状态
            currentWordIndex: 0,
            totalWords: 0,
            wordsCompleted: 0,
            wordsList: [],
            
            // 赛车追逐模式专用状态
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
        };
        
        this.gameData = {
            texts: [],
            words: []
        };
        
        this.updateInterval = null;
        this.keyPressHandlers = [];
        
        this.init();
    }
    
    async init() {
        // 加载游戏数据
        await this.loadGameData();
        
        // 绑定事件监听器
        this.bindEvents();
        
        console.log('游戏引擎初始化成功');
    }
    
    // 加载游戏数据
    async loadGameData() {
        try {
            // 从API加载文本数据
            const textsResponse = await Utils.API.get('/api/texts');
            if (textsResponse.status === 'success') {
                this.gameData.texts = textsResponse.data;
            }
            
            // 从API加载单词数据
            const wordsResponse = await Utils.API.get('/api/words');
            if (wordsResponse.status === 'success') {
                this.gameData.words = wordsResponse.data;
            }
            
            console.log('游戏数据加载成功');
        } catch (error) {
            console.warn('加载游戏数据失败，使用默认数据:', error);
            
            // 使用默认数据
            this.gameData.texts = [
                "The quick brown fox jumps over the lazy dog.",
                "Python is a powerful programming language.",
                "Practice makes perfect in typing speed."
            ];
            
            this.gameData.words = [
                "hello", "world", "python", "javascript", "typing", "speed",
                "keyboard", "practice", "game", "fast", "accurate", "skill"
            ];
        }
    }
    
    // 绑定事件监听器
    bindEvents() {
        // 监听UI管理器事件
        if (window.uiManager) {
            window.uiManager.on('startGame', () => this.startGame());
            window.uiManager.on('pauseGame', () => this.togglePause());
            window.uiManager.on('resetGame', () => this.resetGame());
            window.uiManager.on('playAgain', () => this.playAgain());
            window.uiManager.on('modeChanged', (mode) => this.setMode(mode));
            window.uiManager.on('settingsChanged', (settings) => this.applySettings(settings));
        }
        
        // 监听键盘输入
        document.addEventListener('keydown', (e) => this.handleKeyDown(e));
        document.addEventListener('input', (e) => this.handleInput(e));
        
        // 监听统计管理器事件
        if (window.statsManager) {
            window.statsManager.on('achievementUnlocked', (achievement) => {
                if (window.uiManager) {
                    window.uiManager.showAchievement(achievement);
                }
            });
        }
    }
    
    // 设置游戏模式
    setMode(mode) {
        if (!this.gameState.isPlaying) {
            this.gameState.mode = mode;
            this.generateText();
            
            // 如果是赛车追逐模式，显示赛车界面
            if (mode === 'racing' && window.uiManager) {
                window.uiManager.showRacing();
                this.initRacingMode();
            } else if (window.uiManager) {
                window.uiManager.hideRacing();
            }
            
            console.log(`游戏模式设置为: ${mode}`);
        }
    }
    
    // 应用设置
    applySettings(settings) {
        this.gameState.timeLimit = settings.timeLimit || 60;
        this.gameState.difficulty = settings.difficulty || 'normal';
        
        // 如果游戏未开始，重新生成文本
        if (!this.gameState.isPlaying) {
            this.generateText();
        }
        
        console.log('游戏设置已应用:', settings);
    }
    
    // 生成练习文本
    generateText() {
        let text = '';
        
        switch (this.gameState.mode) {
            case 'classic':
                text = this.generateClassicText();
                break;
            case 'words':
                text = this.generateWordsText();
                break;
            case 'racing':
                text = this.generateRacingText();
                break;
            case 'endless':
                text = this.generateEndlessText();
                break;
            default:
                text = this.generateClassicText();
        }
        
        this.gameState.currentText = text;
        this.updateDisplay();
        
        console.log(`生成${this.gameState.mode}模式文本:`, text.substring(0, 50) + '...');
    }
    
    // 生成经典模式文本
    generateClassicText() {
        if (this.gameData.texts.length === 0) return '';
        
        const difficulty = this.gameState.difficulty;
        let selectedTexts = [...this.gameData.texts];
        
        // 根据难度筛选文本
        if (difficulty === 'easy') {
            selectedTexts = selectedTexts.filter(text => text.length <= 100);
        } else if (difficulty === 'hard') {
            selectedTexts = selectedTexts.filter(text => text.length >= 150);
        }
        
        return Utils.randomChoice(selectedTexts) || this.gameData.texts[0];
    }
    
    // 生成单词模式文本
    generateWordsText() {
        if (this.gameData.words.length === 0) return '';
        
        const difficulty = this.gameState.difficulty;
        let wordCount = 50; // 总单词数
        
        // 根据难度调整单词数量
        if (difficulty === 'easy') {
            wordCount = 30;
        } else if (difficulty === 'hard') {
            wordCount = 80;
        }
        
        // 生成单词列表
        const shuffledWords = Utils.shuffleArray(this.gameData.words);
        this.gameState.wordsList = [];
        
        for (let i = 0; i < wordCount; i++) {
            this.gameState.wordsList.push(shuffledWords[i % shuffledWords.length]);
        }
        
        this.gameState.totalWords = wordCount;
        this.gameState.currentWordIndex = 0;
        this.gameState.wordsCompleted = 0;
        
        // 返回第一个单词
        return this.gameState.wordsList[0] || '';
    }
    
    // 生成时间挑战文本
    generateTimeText() {
        // 时间挑战模式使用较长的文本
        const longTexts = this.gameData.texts.filter(text => text.length >= 100);
        if (longTexts.length === 0) return this.generateClassicText();
        
        return Utils.randomChoice(longTexts);
    }
    
    // 生成赛车追逐模式文本
    generateRacingText() {
        if (this.gameData.texts.length === 0) return '';
        
        // 选择一个较长的文本用于赛车模式
        const longTexts = this.gameData.texts.filter(text => text.length > 200);
        const selectedTexts = longTexts.length > 0 ? longTexts : this.gameData.texts;
        
        return Utils.randomChoice(selectedTexts);
    }
    
    // 生成无尽模式文本
    generateEndlessText() {
        // 无尽模式组合多个文本
        const textCount = 3;
        const selectedTexts = [];
        
        for (let i = 0; i < textCount; i++) {
            selectedTexts.push(Utils.randomChoice(this.gameData.texts));
        }
        
        return selectedTexts.join(' ');
    }
    
    // 初始化赛车模式
    initRacingMode() {
        this.gameState.racingData = {
            aiCars: {
                slow: { speed: 30, position: 0, name: '慢车' },
                medium: { speed: 50, position: 0, name: '中速车' },
                fast: { speed: 70, position: 0, name: '快车' }
            },
            playerPosition: 0,
            overtakenCars: [],
            currentRank: 4,
            raceStartTime: null
        };
        
        // 更新UI显示
        this.updateRacingDisplay();
    }
    
    // 更新赛车显示
    updateRacingDisplay() {
        if (this.gameState.mode !== 'racing' || !window.uiManager) return;
        
        const stats = window.statsManager?.getCurrentStats();
        const playerWPM = stats?.wpm || 0;
        const elapsed = this.gameState.startTime ? (Date.now() - this.gameState.startTime) / 1000 : 0;
        const remaining = Math.max(0, this.gameState.timeLimit - elapsed);
        
        // 计算玩家位置 (基于WPM和时间)
        this.gameState.racingData.playerPosition = Math.min((playerWPM / 100) * 100, 100);
        
        // 计算AI赛车位置 (基于它们的固定速度和时间)
        const raceTime = elapsed;
        Object.keys(this.gameState.racingData.aiCars).forEach(carKey => {
            const car = this.gameState.racingData.aiCars[carKey];
            // AI赛车以固定速度前进
            car.position = Math.min((car.speed / 100) * (raceTime / 60) * 100, 100);
        });
        
        // 检查超越
        this.checkOvertakes();
        
        // 计算当前排名
        this.calculateRank();
        
        // 更新UI
        const racingData = {
            playerWPM: playerWPM,
            playerPosition: this.gameState.racingData.playerPosition,
            aiPositions: {
                slow: this.gameState.racingData.aiCars.slow.position,
                medium: this.gameState.racingData.aiCars.medium.position,
                fast: this.gameState.racingData.aiCars.fast.position
            },
            remainingTime: Math.ceil(remaining),
            rank: this.gameState.racingData.currentRank,
            overtakenCars: this.gameState.racingData.overtakenCars
        };
        
        window.uiManager.updateRacing(racingData);
    }
    
    // 检查超越
    checkOvertakes() {
        const playerPos = this.gameState.racingData.playerPosition;
        const overtaken = this.gameState.racingData.overtakenCars;
        
        Object.keys(this.gameState.racingData.aiCars).forEach(carKey => {
            const car = this.gameState.racingData.aiCars[carKey];
            const carName = car.name;
            
            // 如果玩家超越了这辆车且之前没有超越过
            if (playerPos > car.position && !overtaken.includes(carName)) {
                overtaken.push(carName);
                if (window.uiManager) {
                    window.uiManager.showOvertakeAnimation(carName);
                }
                console.log(`🏎️ 超越了${carName}！`);
            }
        });
    }
    
    // 计算当前排名
    calculateRank() {
        const playerPos = this.gameState.racingData.playerPosition;
        const aiPositions = Object.values(this.gameState.racingData.aiCars).map(car => car.position);
        
        // 计算有多少辆车在玩家前面
        const carsAhead = aiPositions.filter(pos => pos > playerPos).length;
        this.gameState.racingData.currentRank = carsAhead + 1;
    }
    
    // 获取最终赛车结果
    getRacingResults() {
        const rank = this.gameState.racingData.currentRank;
        const overtaken = this.gameState.racingData.overtakenCars;
        const playerPos = this.gameState.racingData.playerPosition;
        
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
        
        return {
            rank: rank,
            rankText: rankText,
            overtakenCars: overtaken,
            finalPosition: playerPos,
            totalDistance: Math.round(playerPos)
        };
    }
        if (this.gameState.isPlaying) return;
        
        // 重置游戏状态
        this.resetGameState();
        
        // 生成文本
        this.generateText();
        
        // 设置游戏状态
        this.gameState.isPlaying = true;
        this.gameState.isPaused = false;
        this.gameState.isCompleted = false;
        this.gameState.startTime = Date.now();
        
        // 如果是赛车追逐模式，初始化赛车数据
        if (this.gameState.mode === 'racing') {
            this.initRacingMode();
            this.gameState.racingData.raceStartTime = Date.now();
        }
        
        // 开始统计
        if (window.statsManager) {
            window.statsManager.startGame(this.gameState.mode);
        }
        
        // 开始背景音乐
        if (window.audioManager) {
            window.audioManager.resumeAudioContext();
            const audioStatus = window.audioManager.getStatus();
            if (audioStatus.isEnabled && audioStatus.musicEnabled) {
                window.audioManager.startBackgroundMusic();
            }
            window.audioManager.playSound('gameStart');
        }
        
        // 开始更新循环
        this.startUpdateLoop();
        
        // 更新UI
        this.updateUI();
        
        // 聚焦输入框
        if (window.uiManager) {
            window.uiManager.focusInput();
        }
        
        this.emit('gameStarted');
        console.log('游戏开始');
    }
    
    // 暂停/继续游戏
    togglePause() {
        if (!this.gameState.isPlaying || this.gameState.isCompleted) return;
        
        this.gameState.isPaused = !this.gameState.isPaused;
        
        if (this.gameState.isPaused) {
            this.stopUpdateLoop();
            if (window.audioManager) {
                window.audioManager.stopBackgroundMusic();
            }
            console.log('游戏暂停');
        } else {
            this.startUpdateLoop();
            if (window.audioManager) {
                const audioStatus = window.audioManager.getStatus();
                if (audioStatus.isEnabled && audioStatus.musicEnabled) {
                    window.audioManager.startBackgroundMusic();
                }
            }
            console.log('游戏继续');
        }
        
        // 更新UI状态
        this.updateUI();
        
        // 确保在继续游戏时聚焦输入框
        if (!this.gameState.isPaused && window.uiManager) {
            setTimeout(() => {
                window.uiManager.focusInput();
            }, 100);
        }
        
        this.emit('gamePaused', this.gameState.isPaused);
    }
    
    // 重置游戏
    resetGame() {
        this.stopGame();
        this.resetGameState();
        this.generateText();
        this.updateUI();
        
        this.emit('gameReset');
        console.log('游戏重置');
    }
    
    // 再玩一次
    playAgain() {
        this.resetGame();
        setTimeout(() => this.startGame(), 100);
    }
    
    // 停止游戏
    stopGame() {
        this.gameState.isPlaying = false;
        this.gameState.isPaused = false;
        this.stopUpdateLoop();
        
        if (window.audioManager) {
            window.audioManager.stopBackgroundMusic();
        }
    }
    
    // 完成游戏
    completeGame() {
        if (!this.gameState.isPlaying || this.gameState.isCompleted) return;
        
        this.gameState.isCompleted = true;
        this.gameState.isPlaying = false;
        this.gameState.endTime = Date.now();
        
        this.stopUpdateLoop();
        
        // 隐藏相关UI
        if (window.uiManager) {
            window.uiManager.hideRacing();
        }
        
        // 播放完成音效
        if (window.audioManager) {
            window.audioManager.stopBackgroundMusic();
            window.audioManager.playSound('gameEnd');
        }
        
        // 结束统计
        let finalStats = null;
        if (window.statsManager) {
            finalStats = window.statsManager.endGame(true);
        }
        
        // 如果是赛车模式，添加赛车结果
        if (this.gameState.mode === 'racing') {
            const racingResults = this.getRacingResults();
            if (finalStats) {
                finalStats.racingResults = racingResults;
            }
            
            // 显示赛车结果通知
            if (window.uiManager) {
                const { rankText, overtakenCars } = racingResults;
                window.uiManager.showNotification(
                    `🏁 比赛结束！${rankText}`, 
                    racingResults.rank <= 3 ? 'success' : 'info', 
                    5000
                );
            }
        }
        
        // 更新UI
        this.updateUI();
        if (window.uiManager && finalStats) {
            window.uiManager.updateFinalResults(finalStats);
        }
        
        this.emit('gameCompleted', finalStats);
        console.log('游戏完成');
    }
    
    // 重置游戏状态
    resetGameState() {
        this.gameState.userInput = '';
        this.gameState.currentIndex = 0;
        this.gameState.startTime = null;
        this.gameState.endTime = null;
        this.gameState.isPlaying = false;
        this.gameState.isPaused = false;
        this.gameState.isCompleted = false;
        
        // 重置单词模式状态
        this.gameState.currentWordIndex = 0;
        this.gameState.wordsCompleted = 0;
        this.gameState.wordsList = [];
        
        if (window.uiManager) {
            window.uiManager.clearInput();
        }
    }
    
    // 处理键盘按下事件
    handleKeyDown(e) {
        if (!this.gameState.isPlaying || this.gameState.isPaused || this.gameState.isCompleted) {
            return;
        }
        
        // 记录按键
        if (window.statsManager) {
            window.statsManager.recordKeystroke();
        }
        
        // 处理特殊键
        if (e.key === 'Backspace') {
            this.handleBackspace();
            if (window.statsManager) {
                window.statsManager.recordBackspace();
            }
        }
    }
    
    // 处理输入事件
    handleInput(e) {
        if (!this.gameState.isPlaying || this.gameState.isPaused || this.gameState.isCompleted) {
            return;
        }
        
        if (e.target.id === 'textInput') {
            this.processInput(e.target.value);
        }
    }
    
    // 处理退格键
    handleBackspace() {
        if (this.gameState.currentIndex > 0) {
            this.gameState.currentIndex--;
            this.gameState.userInput = this.gameState.userInput.slice(0, -1);
            this.updateDisplay();
        }
    }
    
    // 处理输入
    processInput(input) {
        this.gameState.userInput = input;
        const currentText = this.gameState.currentText;
        
        // 检查输入长度
        if (input.length > currentText.length) {
            // 限制输入长度
            input = input.substring(0, currentText.length);
            this.gameState.userInput = input;
            if (window.uiManager) {
                window.uiManager.setInputValue(input);
            }
        }
        
        // 更新当前位置
        this.gameState.currentIndex = input.length;
        
        // 计算正确和错误字符数
        let correctChars = 0;
        let incorrectChars = 0;
        
        for (let i = 0; i < input.length; i++) {
            if (i < currentText.length && input[i] === currentText[i]) {
                correctChars++;
            } else {
                incorrectChars++;
            }
        }
        
        // 检查最后输入的字符
        if (input.length > 0) {
            const lastIndex = input.length - 1;
            const expectedChar = currentText[lastIndex];
            const actualChar = input[lastIndex];
            
            if (expectedChar === actualChar) {
                // 正确输入
                if (window.audioManager) {
                    window.audioManager.playSound('keyPress');
                }
            } else {
                // 错误输入
                if (window.audioManager) {
                    window.audioManager.playSound('keyError');
                }
                
                // 记录错误
                if (window.statsManager) {
                    window.statsManager.recordError(lastIndex, expectedChar, actualChar);
                }
            }
        }
        
        // 更新统计数据
        const statsData = {
            totalChars: input.length,
            correctChars: correctChars,
            incorrectChars: incorrectChars,
            currentIndex: this.gameState.currentIndex
        };
        
        if (window.statsManager) {
            window.statsManager.updateStats(statsData);
        }
        
        // 更新显示
        this.updateDisplay();
        
        // 检查是否完成当前文本
        if (input.length === currentText.length) {
            if (this.gameState.mode === 'words') {
                this.handleWordCompletion();
            } else {
                this.completeGame();
            }
        }
    }
    
    // 处理单词完成
    handleWordCompletion() {
        this.gameState.wordsCompleted++;
        this.gameState.currentWordIndex++;
        
        // 检查是否还有更多单词
        if (this.gameState.currentWordIndex < this.gameState.wordsList.length) {
            // 显示下一个单词
            this.gameState.currentText = this.gameState.wordsList[this.gameState.currentWordIndex];
            this.gameState.userInput = '';
            this.gameState.currentIndex = 0;
            
            // 清空输入框
            if (window.uiManager) {
                window.uiManager.clearInput();
            }
            
            // 更新显示
            this.updateDisplay();
            
            // 播放完成音效
            if (window.audioManager) {
                window.audioManager.playSound('keyPress');
            }
            
            console.log(`单词完成: ${this.gameState.wordsCompleted}/${this.gameState.totalWords}`);
        } else {
            // 所有单词完成
            this.completeGame();
        }
    }
    
    // 更新显示
    updateDisplay() {
        if (window.uiManager) {
            const highlightedText = this.renderTextWithHighlight();
            window.uiManager.displayTextWithHighlight(
                highlightedText,
                this.gameState.currentIndex,
                this.gameState.userInput
            );
        }
    }
    
    // 渲染带高亮的文本
    renderTextWithHighlight() {
        const currentText = this.gameState.currentText;
        const userInput = this.gameState.userInput;
        const currentIndex = this.gameState.currentIndex;
        
        if (!currentText) return '';
        
        let highlightedHTML = '';
        
        for (let i = 0; i < currentText.length; i++) {
            const char = currentText[i];
            let cssClass = 'char-pending';
            
            if (i < userInput.length) {
                // 已输入的字符
                if (userInput[i] === char) {
                    cssClass = 'char-correct';
                } else {
                    cssClass = 'char-incorrect';
                }
            } else if (i === currentIndex) {
                // 当前输入位置
                cssClass = 'char-current';
            }
            
            // 处理特殊字符显示
            const displayChar = char === ' ' ? '&nbsp;' : char === '\n' ? '<br>' : char;
            highlightedHTML += `<span class="${cssClass}">${displayChar}</span>`;
        }
        
        return highlightedHTML;
    }
    
    // 更新UI
    updateUI() {
        if (window.uiManager) {
            window.uiManager.updateGameState({
                isPlaying: this.gameState.isPlaying,
                isPaused: this.gameState.isPaused,
                isCompleted: this.gameState.isCompleted
            });
        }
    }
    
    // 开始更新循环
    startUpdateLoop() {
        this.stopUpdateLoop();
        
        this.updateInterval = setInterval(() => {
            if (this.gameState.isPlaying && !this.gameState.isPaused) {
                // 检查赛车追逐模式
                if (this.gameState.mode === 'racing' && this.gameState.startTime) {
                    const elapsed = (Date.now() - this.gameState.startTime) / 1000;
                    const remaining = Math.max(0, this.gameState.timeLimit - elapsed);
                    
                    // 更新赛车显示
                    this.updateRacingDisplay();
                    
                    if (remaining <= 0) {
                        this.completeGame();
                        return;
                    }
                }
            }
        }, 100); // 每100ms更新一次
    }
    
    // 停止更新循环
    stopUpdateLoop() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
    }
    
    // 获取游戏状态
    getGameState() {
        return { ...this.gameState };
    }
    
    // 获取游戏数据
    getGameData() {
        return { ...this.gameData };
    }
    
    // 添加自定义文本
    addCustomText(text) {
        if (text && text.trim()) {
            this.gameData.texts.push(text.trim());
            console.log('添加自定义文本:', text.substring(0, 50) + '...');
        }
    }
    
    // 添加自定义单词
    addCustomWords(words) {
        if (Array.isArray(words)) {
            this.gameData.words.push(...words.filter(word => word && word.trim()));
            console.log('添加自定义单词:', words.length, '个');
        }
    }
    
    // 清除自定义数据
    clearCustomData() {
        // 重新加载原始数据
        this.loadGameData();
        console.log('自定义数据已清除');
    }
}

// 创建全局游戏引擎实例
window.gameEngine = new GameEngine();