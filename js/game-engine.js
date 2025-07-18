/**
 * 游戏引擎 - 优化版
 * 专注于游戏逻辑处理，完全依赖 GameStore 进行状态管理
 * 移除本地状态副本，避免状态同步问题
 */
class GameEngine extends Utils.EventEmitter {
    constructor() {
        super();
        
        this.updateInterval = null;
        
        // 引用统一状态管理
        this.gameStore = window.gameStore;
        this.errorHandler = window.errorHandler;
        
        this.init();
    }
    
    async init() {
        try {
            // 加载游戏数据
            await this.loadGameData();
            
            // 绑定事件监听器
            this.bindEvents();
            
            console.log('游戏引擎初始化成功');
        } catch (error) {
            this.errorHandler.handleError(
                this.errorHandler.createError('game', '游戏引擎初始化失败', { error: error.message })
            );
        }
    }
    
    // 加载游戏数据
    async loadGameData() {
        try {
            // 从API加载文本数据
            const textsResponse = await Utils.API.get('/api/texts');
            const texts = textsResponse.status === 'success' ? textsResponse.data : [];
            
            // 从API加载单词数据
            const wordsResponse = await Utils.API.get('/api/words');
            const words = wordsResponse.status === 'success' ? wordsResponse.data : [];
            
            // 将数据直接存入 gameStore 而不是本地状态
            this.gameStore.updateState('gameData', {
                texts: texts.length > 0 ? texts : [
                    "The quick brown fox jumps over the lazy dog.",
                    "Python is a powerful programming language.",
                    "Practice makes perfect in typing speed."
                ],
                words: words.length > 0 ? words : [
                    "hello", "world", "python", "javascript", "typing", "speed",
                    "keyboard", "practice", "game", "fast", "accurate", "skill"
                ]
            });
            
            console.log('游戏数据加载成功');
        } catch (error) {
            // 使用错误处理器报告错误
            this.errorHandler.handleError(
                this.errorHandler.createError('api', '加载游戏数据失败', { error: error.message })
            );
            
            // 使用默认数据
            this.gameStore.updateState('gameData', {
                texts: [
                    "The quick brown fox jumps over the lazy dog.",
                    "Python is a powerful programming language.",
                    "Practice makes perfect in typing speed."
                ],
                words: [
                    "hello", "world", "python", "javascript", "typing", "speed",
                    "keyboard", "practice", "game", "fast", "accurate", "skill"
                ]
            });
        }
    }
    
    // 绑定事件监听器
    bindEvents() {
        // 监听自定义游戏事件 - 使用新的事件机制
        document.addEventListener('game:startGame', () => this.startGame());
        document.addEventListener('game:pauseGame', () => this.togglePause());
        document.addEventListener('game:resetGame', () => this.resetGame());
        document.addEventListener('game:playAgain', () => this.playAgain());
        document.addEventListener('game:modeChanged', (e) => {
            if (e.detail && e.detail.mode) {
                this.setMode(e.detail.mode);
            }
        });
        document.addEventListener('game:settingsChanged', (e) => {
            if (e.detail) {
                this.applySettings(e.detail);
            }
        });
        
        // 向后兼容：仍然监听uiManager事件
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
                // 将成就解锁事件传递给游戏商店和自定义事件
                if (window.gameStore) {
                    window.gameStore.actions.showNotification(
                        `🏆 解锁成就: ${achievement.title}`, 
                        'success'
                    );
                }
                
                // 触发自定义事件
                document.dispatchEvent(new CustomEvent('game:achievement', {
                    detail: achievement
                }));
                
                // 向后兼容：仍然使用uiManager
                if (window.uiManager) {
                    window.uiManager.showAchievement(achievement);
                }
            });
        }
    }
    
    // 设置游戏模式
    setMode(mode) {
        const gameState = this.gameStore.getState('game');
        if (!gameState.isPlaying) {
            this.gameStore.actions.setMode(mode);
            this.generateText();
        }
    }
    
    // 设置当前文本
    setCurrentText(text) {
        this.gameStore.actions.setText(text);
    }
    
    // 应用设置
    applySettings(settings) {
        this.gameStore.updateState('game.timeLimit', settings.timeLimit || 60);
        this.gameStore.updateState('game.difficulty', settings.difficulty || 'normal');
        
        // 如果游戏未开始，重新生成文本
        const gameState = this.gameStore.getState('game');
        if (!gameState.isPlaying) {
            this.generateText();
        }
        
        console.log('游戏设置已应用:', settings);
    }
    
    // 生成练习文本
    generateText() {
        const gameState = this.gameStore.getState('game');
        let text = '';
        
        switch (gameState.mode) {
            case 'classic':
                text = this.generateClassicText();
                break;
            case 'words':
                text = this.generateWordsText();
                break;
            case 'racing':
                text = this.generateRacingText();
                break;

            default:
                text = this.generateClassicText();
        }
        
        this.gameStore.actions.setText(text);
        
        console.log(`生成${gameState.mode}模式文本:`, text.substring(0, 50) + '...');
    }
    
    // 生成经典模式文本
    generateClassicText() {
        const gameData = this.gameStore.getState('gameData');
        if (!gameData?.texts?.length) return '';
        
        const gameState = this.gameStore.getState('game');
        const difficulty = gameState.difficulty;
        let selectedTexts = [...gameData.texts];
        
        // 根据难度筛选文本
        if (difficulty === 'easy') {
            selectedTexts = selectedTexts.filter(text => text.length <= 100);
        } else if (difficulty === 'hard') {
            selectedTexts = selectedTexts.filter(text => text.length >= 150);
        }
        
        return Utils.randomChoice(selectedTexts) || gameData.texts[0];
    }
    
    // 生成单词模式文本
    generateWordsText() {
        const gameData = this.gameStore.getState('gameData');
        if (!gameData?.words?.length) return '';
        
        const gameState = this.gameStore.getState('game');
        const difficulty = gameState.difficulty;
        let wordCount = 50; // 总单词数
        
        // 根据难度调整单词数量
        if (difficulty === 'easy') {
            wordCount = 30;
        } else if (difficulty === 'hard') {
            wordCount = 80;
        }
        
        // 生成单词列表
        const shuffledWords = Utils.shuffleArray(gameData.words);
        const wordsList = [];
        
        for (let i = 0; i < wordCount; i++) {
            wordsList.push(shuffledWords[i % shuffledWords.length]);
        }
        
        // 更新统一状态中的单词数据
        this.gameStore.updateState('words', {
            wordsList: wordsList,
            totalWords: wordCount,
            currentWordIndex: 0,
            wordsCompleted: 0
        });
        
        // 返回第一个单词
        return wordsList[0] || '';
    }


    
    // 生成时间挑战文本
    generateTimeText() {
        const gameData = this.gameStore.getState('gameData');
        if (!gameData?.texts?.length) return '';
        
        // 时间挑战模式使用较长的文本
        const longTexts = gameData.texts.filter(text => text.length >= 100);
        if (longTexts.length === 0) return this.generateClassicText();
        
        return Utils.randomChoice(longTexts);
    }
    
    // 生成赛车追逐模式文本
    generateRacingText() {
        const gameData = this.gameStore.getState('gameData');
        if (!gameData?.texts?.length) return '';
        
        // 选择一个较长的文本用于赛车模式
        const longTexts = gameData.texts.filter(text => text.length > 200);
        const selectedTexts = longTexts.length > 0 ? longTexts : gameData.texts;
        
        return Utils.randomChoice(selectedTexts);
    }
    
    // 初始化赛车模式
    initRacingMode() {
        const racingData = {
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
        
        // 更新统一状态中的赛车数据
        this.gameStore.updateState('racing', racingData);
        
        // 更新UI显示
        this.updateRacingDisplay();
    }
    
    // 更新赛车显示
    updateRacingDisplay() {
        const gameState = this.gameStore.getState('game');
        const racingState = this.gameStore.getState('racing');
        
        if (gameState.mode !== 'racing' || !window.uiManager) return;
        
        const stats = window.statsManager?.getCurrentStats();
        const playerWPM = stats?.wpm || 0;
        const elapsed = gameState.startTime ? (Date.now() - gameState.startTime) / 1000 : 0;
        const remaining = Math.max(0, gameState.timeLimit - elapsed);
        
        // 计算玩家位置 (基于WPM和时间)
        const playerPosition = Math.min((playerWPM / 100) * 100, 100);
        
        // 计算AI赛车位置 (基于它们的固定速度和时间)
        const raceTime = elapsed;
        const updatedAiCars = { ...racingState.aiCars };
        Object.keys(updatedAiCars).forEach(carKey => {
            const car = updatedAiCars[carKey];
            // AI赛车以固定速度前进
            car.position = Math.min((car.speed / 100) * (raceTime / 60) * 100, 100);
        });
        
        // 更新赛车状态
        this.gameStore.updateState('racing', {
            ...racingState,
            playerPosition,
            aiCars: updatedAiCars
        });
        
        // 检查超越
        this.checkOvertakes();
        
        // 计算当前排名
        this.calculateRank();
    }
    
    // 检查超越
    checkOvertakes() {
        const racingState = this.gameStore.getState('racing');
        const playerPos = racingState.playerPosition;
        const overtaken = racingState.overtakenCars || [];
        
        Object.keys(racingState.aiCars).forEach(carKey => {
            const car = racingState.aiCars[carKey];
            const carName = car.name;
            
            // 如果玩家超越了这辆车且之前没有超越过
            if (playerPos > car.position && !overtaken.includes(carName)) {
                overtaken.push(carName);
                // 显示超越动画 - 只记录
                console.log(`🏎️ 超越了${carName}！`);
                console.log(`🏎️ 超越了${carName}！`);
            }
        });
        
        // 更新超越状态
        this.gameStore.updateState('racing.overtakenCars', overtaken);
    }
    
    // 计算当前排名
    calculateRank() {
        const racingState = this.gameStore.getState('racing');
        const playerPos = racingState.playerPosition;
        const aiPositions = Object.values(racingState.aiCars).map(car => car.position);
        
        // 计算有多少辆车在玩家前面
        const carsAhead = aiPositions.filter(pos => pos > playerPos).length;
        const currentRank = carsAhead + 1;
        
        // 更新排名
        this.gameStore.updateState('racing.currentRank', currentRank);
    }
    
    // 获取最终赛车结果
    getRacingResults() {
        const racingState = this.gameStore.getState('racing');
        const rank = racingState.currentRank;
        const overtaken = racingState.overtakenCars || [];
        const playerPos = racingState.playerPosition;
        
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
            default:
                rankText = '第四名';
        }
        
        return {
            finalRank: rank,
            rankText,
            overtakenCars: overtaken,
            playerPosition: playerPos
        };
    }
    
    // 开始游戏
    startGame() {
        return this.errorHandler.wrapSync(() => {
            const gameState = this.gameStore.getState('game');
            if (gameState.isPlaying) return;
            
            // 重置游戏状态（通过统一状态管理）
            this.gameStore.actions.resetGame();
            
            // 生成文本
            this.generateText();
            
            // 启动游戏（通过统一状态管理）
            this.gameStore.actions.startGame();
            
            // 如果是赛车追逐模式，初始化赛车数据
            if (gameState.mode === 'racing') {
                this.initRacingMode();
                this.gameStore.updateState('racing.raceStartTime', Date.now());
            }
            
            // 开始统计
            if (window.statsManager) {
                window.statsManager.startGame(gameState.mode);
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
            
            // 聚焦输入框 - 通过事件系统
            document.dispatchEvent(new CustomEvent('game:focusInput'));
            // 依然保留直接操作作为后备
            const textInput = document.getElementById('textInput');
            if (textInput) {
                textInput.focus();
            }
            
            this.emit('gameStarted');
            console.log('游戏开始');
        }, { context: 'startGame' })();
    }
    
    // 暂停/继续游戏
    togglePause() {
        const gameState = this.gameStore.getState('game');
        if (!gameState.isPlaying || gameState.isCompleted) return;
        
        const isPaused = !gameState.isPaused;
        this.gameStore.updateState('game.isPaused', isPaused);
        
        if (isPaused) {
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
        
        // 确保在继续游戏时聚焦输入框 - 使用事件系统
        if (!isPaused) {
            setTimeout(() => {
                document.dispatchEvent(new CustomEvent('game:focusInput'));
            }, 100);
        }
        
        this.emit('gamePaused', isPaused);
    }
    
    // 重置游戏
    resetGame() {
        this.stopGame();
        this.gameStore.actions.resetGame();
        this.generateText();
        
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
        this.gameStore.updateState('game.isPlaying', false);
        this.gameStore.updateState('game.isPaused', false);
        this.stopUpdateLoop();
        
        if (window.audioManager) {
            window.audioManager.stopBackgroundMusic();
        }
    }
    
    // 完成游戏
    completeGame() {
        return this.errorHandler.wrapSync(() => {
            const gameState = this.gameStore.getState('game');
            if (!gameState.isPlaying || gameState.isCompleted) return;
            
            this.gameStore.updateState('game.isCompleted', true);
            this.gameStore.updateState('game.isPlaying', false);
            this.gameStore.updateState('game.endTime', Date.now());
            
            this.stopUpdateLoop();
            
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
            if (gameState.mode === 'racing') {
                const racingResults = this.getRacingResults();
                if (finalStats) {
                    finalStats.racingResults = racingResults;
                }
                
                // 显示赛车结果通知
                const { rankText } = racingResults;
                // 通过事件通知
                const event = new CustomEvent('app-notification', {
                    detail: {
                        message: `🏁 比赛结束！${rankText}`,
                        type: racingResults.finalRank <= 3 ? 'success' : 'info'
                    }
                });
                document.dispatchEvent(event);
            }
            
            // 更新UI - 通过事件系统
            if (finalStats) {
                this.emit('resultsUpdated', finalStats);
            }
            
            this.emit('gameCompleted', finalStats);
            console.log('游戏完成');
        }, { context: 'completeGame' })();
    }
    
    // 处理键盘按下事件
    handleKeyDown(e) {
        const gameState = this.gameStore.getState('game');
        if (!gameState.isPlaying || gameState.isPaused || gameState.isCompleted) {
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
        const gameState = this.gameStore.getState('game');
        if (!gameState.isPlaying || gameState.isPaused || gameState.isCompleted) {
            return;
        }
        
        if (e.target.id === 'textInput') {
            this.processInput(e.target.value);
        }
    }
    
    // 处理退格键
    handleBackspace() {
        const textState = this.gameStore.getState('text');
        if (textState.userInput.length > 0) {
            const newInput = textState.userInput.slice(0, -1);
            this.gameStore.actions.setUserInput(newInput);
        }
    }
    
    // 处理输入
    processInput(input) {
        return this.errorHandler.wrapSync(() => {
            const textState = this.gameStore.getState('text');
            const currentText = textState.currentText;
            
            // 检查输入长度
            if (input.length > currentText.length) {
                // 限制输入长度
                input = input.substring(0, currentText.length);
                // 通过状态管理更新输入值
                this.gameStore.actions.setUserInput(input);
            }
            
            // 更新统一状态中的输入
            this.gameStore.actions.setUserInput(input);
            
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
                    // 更新输入值 - 使用状态管理而非直接DOM操作
                    this.gameStore.actions.setUserInput(input);
                    
                    // 播放声音
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
                currentIndex: input.length
            };
            
            if (window.statsManager) {
                window.statsManager.updateStats(statsData);
            }
            
            // 检查是否完成当前文本
            if (input.length === currentText.length) {
                const gameState = this.gameStore.getState('game');
                if (gameState.mode === 'words') {
                    this.handleWordCompletion();
                } else {
                    this.completeGame();
                }
            }
        }, { context: 'processInput' })();
    }
    
    // 处理单词完成
    handleWordCompletion() {
        const wordsState = this.gameStore.getState('words');
        const newWordsCompleted = wordsState.wordsCompleted + 1;
        const newCurrentWordIndex = wordsState.currentWordIndex + 1;
        
        // 更新单词状态
        this.gameStore.updateState('words', {
            wordsCompleted: newWordsCompleted,
            currentWordIndex: newCurrentWordIndex
        });
        
        // 检查是否还有更多单词
        if (newCurrentWordIndex < wordsState.wordsList.length) {
            // 显示下一个单词
            const nextWord = wordsState.wordsList[newCurrentWordIndex];
            this.gameStore.actions.setText(nextWord);
            this.gameStore.actions.setUserInput("");
            
            // 清除输入框 - 使用状态管理
            this.gameStore.actions.setUserInput('');
            // 依然保留直接操作作为后备
            const textInput = document.getElementById('textInput');
            if (textInput) {
                textInput.value = '';
            }
            
            // 播放完成音效
            if (window.audioManager) {
                window.audioManager.playSound('keyPress');
            }
            
            console.log(`单词完成: ${newWordsCompleted}/${wordsState.totalWords}`);
        } else {
            // 所有单词完成
            this.completeGame();
        }
    }
    
    // 渲染带高亮的文本 - 优化版本使用游戏仓库的方法
    renderTextWithHighlight() {
        return this.errorHandler.wrapSync(() => {
            // 直接委托给 gameStore 的优化实现
            this.gameStore.updateTextHighlight();
            return this.gameStore.getState('text').highlightedText || '';
        }, { context: 'renderTextWithHighlight' })() || '';
    }
    
    // 开始更新循环
    startUpdateLoop() {
        this.stopUpdateLoop();
        
        this.updateInterval = setInterval(() => {
            const gameState = this.gameStore.getState('game');
            if (gameState.isPlaying && !gameState.isPaused) {
                // 检查赛车追逐模式
                if (gameState.mode === 'racing' && gameState.startTime) {
                    const elapsed = (Date.now() - gameState.startTime) / 1000;
                    
                    // 更新赛车显示
                    this.updateRacingDisplay();
                    
                    if (elapsed >= gameState.timeLimit) {
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
    
    // 获取游戏状态（从统一状态管理）
    getGameState() {
        return {
            game: this.gameStore.getState('game'),
            text: this.gameStore.getState('text'),
            stats: this.gameStore.getState('stats'),
            words: this.gameStore.getState('words'),
            racing: this.gameStore.getState('racing'),
            ui: this.gameStore.getState('ui')
        };
    }
    
    // 获取游戏数据
    getGameData() {
        return { ...this.gameStore.getState('gameData') };
    }
    
    // 添加自定义文本
    addCustomText(text) {
        if (text && text.trim()) {
            const gameData = this.getGameData();
            const updatedTexts = [...gameData.texts, text.trim()];
            this.gameStore.updateState('gameData.texts', updatedTexts);
            console.log('添加自定义文本:', text.substring(0, 50) + '...');
        }
    }
    
    // 添加自定义单词
    addCustomWords(words) {
        if (Array.isArray(words)) {
            const filteredWords = words.filter(word => word && word.trim());
            if (filteredWords.length === 0) return;
            
            const gameData = this.getGameData();
            const updatedWords = [...gameData.words, ...filteredWords];
            this.gameStore.updateState('gameData.words', updatedWords);
            console.log('添加自定义单词:', filteredWords.length, '个');
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