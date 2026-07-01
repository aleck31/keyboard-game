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
        // 全局键盘监听（替代textarea）
        document.addEventListener('keydown', (e) => this.handleKeyDown(e));

        // 监听统计管理器事件
        if (window.statsManager) {
            window.statsManager.on('achievementUnlocked', (achievement) => {
                if (window.gameStore) {
                    window.gameStore.actions.showNotification(
                        `🏆 解锁成就: ${achievement.title}`,
                        'success'
                    );
                }
            });
        }
    }
    
    // 设置游戏模式
    setMode(mode) {
        const gameState = this.gameStore.getState('game');
        if (!gameState.isPlaying) {
            this.gameStore.actions.setMode(mode);
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

    // 生成赛车追逐模式文本
    generateRacingText() {
        const gameData = this.gameStore.getState('gameData');
        if (!gameData?.texts?.length) return '';
        
        // 选择一个较长的文本用于赛车模式
        const longTexts = gameData.texts.filter(text => text.length > 200);
        const selectedTexts = longTexts.length > 0 ? longTexts : gameData.texts;
        
        return Utils.randomChoice(selectedTexts);
    }
    
    // 开始游戏
    startGame() {
        return this.errorHandler.wrapSync(() => {
            const gameState = this.gameStore.getState('game');
            if (gameState.isPlaying) {
                console.log('游戏已在进行中');
                return;
            }

            console.log('🎮 GameEngine.startGame() 开始');

            // 重置游戏状态（通过统一状态管理）
            this.gameStore.actions.resetGame();

            // 防御模式没有打字文本，由 defenseEngine 驱动自己的模拟
            if (gameState.mode !== 'defense') {
                this.generateText();
            }

            // 启动游戏（通过统一状态管理）
            this.gameStore.actions.startGame();

            // 防御模式：启动引擎自身的模拟循环
            if (gameState.mode === 'defense' && window.defenseEngine) {
                window.defenseEngine.startGame();
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

            this.emit('gameStarted');

            console.log('✅ GameEngine.startGame() 完成');
        }, { context: 'startGame' })();
    }

    // 暂停/继续游戏
    togglePause() {
        const gameState = this.gameStore.getState('game');
        if (!gameState.isPlaying || gameState.isCompleted) return;
        
        const isPaused = !gameState.isPaused;
        this.gameStore.updateState('game.isPaused', isPaused);
        
        if (isPaused) {
            // 暂停：记录暂停开始时间
            this.gameStore.updateState('game.pauseStartTime', Date.now());
            this.stopUpdateLoop();
            if (window.audioManager) {
                window.audioManager.stopBackgroundMusic();
            }
            console.log('游戏暂停');
        } else {
            // 继续：调整 startTime，推迟暂停的时长
            const pauseStartTime = gameState.pauseStartTime;
            if (pauseStartTime && gameState.startTime) {
                const pauseDuration = Date.now() - pauseStartTime;
                this.gameStore.updateState('game.startTime', gameState.startTime + pauseDuration);
            }
            this.gameStore.updateState('game.pauseStartTime', null);
            this.startUpdateLoop();
            if (window.audioManager) {
                const audioStatus = window.audioManager.getStatus();
                if (audioStatus.isEnabled && audioStatus.musicEnabled) {
                    window.audioManager.startBackgroundMusic();
                }
            }
            console.log('游戏继续');
        }

        // 防御模式：同步引擎自身的暂停状态
        if (gameState.mode === 'defense' && window.defenseEngine) {
            window.defenseEngine.togglePause();
        }

        this.emit('gamePaused', isPaused);
    }
    
    // 重置游戏
    resetGame() {
        const gameState = this.gameStore.getState('game');

        this.stopGame();
        this.gameStore.actions.resetGame();

        if (gameState.mode !== 'defense') {
            this.generateText();
        }

        if (gameState.mode === 'defense' && window.defenseEngine) {
            window.defenseEngine.resetGame();
        }

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
    completeGame(extraResults = null) {
        return this.errorHandler.wrapSync(() => {
            const gameState = this.gameStore.getState('game');
            if (!gameState.isPlaying || gameState.isCompleted) return;

            // 生命周期变更统一走 GameStore（单次批量更新，emit 一次 gameEnded）
            this.gameStore.actions.endGame();

            this.stopUpdateLoop();

            // 播放完成音效
            if (window.audioManager) {
                window.audioManager.stopBackgroundMusic();
                window.audioManager.playSound('gameEnd');
            }

            // 结束统计（唯一保存入口，extraResults 由调用方传入，如赛车模式的名次/得分）
            let finalStats = null;
            if (window.statsManager) {
                finalStats = window.statsManager.endGame(true, extraResults);
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
        const textState = this.gameStore.getState('text');

        if (!gameState.isPlaying || gameState.isPaused || gameState.isCompleted) return;

        // 防御模式：路由给 defenseEngine 自己的单词匹配逻辑
        if (gameState.mode === 'defense') {
            if (window.defenseEngine) {
                window.defenseEngine.handleKeyInput(e);
            }
            return;
        }

        // 其余模式（classic/words/racing）走统一输入路径
        if (!['classic', 'words', 'racing'].includes(gameState.mode)) return;

        const key = e.key;
        
        // 记录按键
        this.gameStore.actions.recordKeystroke();
        
        // 处理退格键
        if (key === 'Backspace') {
            e.preventDefault();
            this.gameStore.actions.recordBackspace();
            
            if (textState.userInput.length > 0) {
                const newInput = textState.userInput.slice(0, -1);
                this.gameStore.actions.setUserInput(newInput);
            }
            return;
        }
        
        // 处理可打印字符
        if (key.length === 1) {
            e.preventDefault();
            const newInput = textState.userInput + key;
            this.gameStore.actions.setUserInput(newInput);
        }
    }
    
    // 处理输入逻辑（只处理业务逻辑：音效、错误记录、完成检查）
    handleInputLogic(input) {
        return this.errorHandler.wrapSync(() => {
            const textState = this.gameStore.getState('text');
            const currentText = textState.currentText;
            
            // 播放音效和记录错误
            if (input.length > 0) {
                const lastIndex = input.length - 1;
                const expectedChar = currentText[lastIndex];
                const actualChar = input[lastIndex];
                
                if (expectedChar === actualChar) {
                    if (window.audioManager) {
                        window.audioManager.playSound('keyPress');
                    }
                } else {
                    if (window.audioManager) {
                        window.audioManager.playSound('keyError');
                    }
                    this.gameStore.actions.recordError(lastIndex, expectedChar, actualChar);
                }
            }
            
            // 检查完成：输入长度等于文本长度即可完成
            if (input.length === currentText.length) {
                const gameState = this.gameStore.getState('game');
                if (gameState.mode === 'words') {
                    this.handleWordCompletion();
                } else if (gameState.mode === 'racing') {
                    // 赛车模式打完一段就续下一段，比赛本身由racing-track的计时器结束
                    this.gameStore.actions.setText(this.generateRacingText());
                    this.gameStore.actions.setUserInput('');
                } else {
                    this.completeGame();
                }
            }
        }, { context: 'handleInputLogic' })();
    }
    
    // 处理单词完成
    handleWordCompletion() {
        const wordsState = this.gameStore.getState('words');
        const textState = this.gameStore.getState('text');
        const statsState = this.gameStore.getState('stats');
        
        // 累积当前单词的统计
        const currentWordLength = textState.currentText.length;
        let currentCorrectChars = 0;
        for (let i = 0; i < textState.userInput.length; i++) {
            if (textState.userInput[i] === textState.currentText[i]) {
                currentCorrectChars++;
            }
        }
        
        // 更新累积统计
        this.gameStore.actions.updateStats({
            totalChars: statsState.totalChars + currentWordLength,
            correctChars: statsState.correctChars + currentCorrectChars,
            errors: statsState.errors + (currentWordLength - currentCorrectChars)
        });
        
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
            this.gameStore.actions.setUserInput('');
            
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
                // 驱动实时统计（wpm/cpm/accuracy 随时间推进，即使未打字也会衰减）
                this.gameStore.calculateStats();

                // 检查单词模式时间限制
                if (gameState.mode === 'words' && gameState.startTime) {
                    const elapsed = (Date.now() - gameState.startTime) / 1000;

                    if (elapsed >= gameState.timeLimit) {
                        this.completeGame();
                        return;
                    }
                }

                // 赛车模式的比赛计时由 racing-track.js 组件自己的计时器管理，
                // 到时后会调用 completeGame()，此处不重复判定
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