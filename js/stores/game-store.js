/**
 * 统一游戏状态管理
 * 解决 Vue.js 和 Vanilla JS 混用问题
 * 提供单一数据源和统一的状态管理
 */

class GameStore extends Utils.EventEmitter {
    constructor() {
        super();
        
        // 初始化状态
        this.state = this.createInitialState();
        
        // 绑定方法
        this.actions = this.createActions();
        
        // 设置响应式代理
        this.reactiveState = this.createReactiveProxy();
        
        console.log('🏪 GameStore 初始化完成');
    }
    
    /**
     * 创建初始状态
     */
    createInitialState() {
        return {
            // 游戏基础状态
            game: {
                isPlaying: false,
                isPaused: false,
                isCompleted: false,
                mode: 'classic',
                startTime: null,
                endTime: null,
                timeLimit: 60,
                difficulty: 'normal'
            },
            
            // 文本和输入状态
            text: {
                currentText: '',
                userInput: '',
                currentIndex: 0,
                highlightedText: '',
                renderKey: 0
            },
            
            // 统计数据
            stats: {
                wpm: 0,
                cpm: 0,
                accuracy: 100,
                errors: 0,
                correctChars: 0,
                totalChars: 0,
                keystrokes: 0,
                backspaces: 0,
                errorPositions: []
            },
            
            // 游戏数据 - 从game-engine.js迁移
            gameData: {
                texts: [],
                words: []
            },
            
            // 单词模式状态
            words: {
                currentWordIndex: 0,
                totalWords: 0,
                wordsCompleted: 0,
                wordsList: []
            },
            
            // 赛车模式状态
            racing: {
                aiCars: {
                    slow: { speed: 30, position: 0, name: '慢车' },
                    medium: { speed: 50, position: 0, name: '中速车' },
                    fast: { speed: 70, position: 0, name: '快车' }
                },
                playerPosition: 0,
                overtakenCars: [],
                currentRank: 4,
                raceStartTime: null
            },
            
            // UI 状态
            ui: {
                showRacing: false,
                showDefense: false,
                showResults: false,
                notification: {
                    show: false,
                    message: '',
                    type: 'info'
                }
            }
        };
    }
    
    /**
     * 创建响应式代理
     */
    createReactiveProxy() {
        const self = this;
        
        return new Proxy(this.state, {
            set(target, property, value, receiver) {
                const oldValue = target[property];
                const result = Reflect.set(target, property, value, receiver);
                
                // 触发变更事件
                if (oldValue !== value) {
                    self.emit('stateChanged', {
                        property,
                        oldValue,
                        newValue: value,
                        path: property
                    });
                    
                    // 触发特定属性变更事件
                    self.emit(`${property}Changed`, value, oldValue);
                }
                
                return result;
            },
            
            get(target, property, receiver) {
                const value = Reflect.get(target, property, receiver);
                
                // 如果是对象，也创建响应式代理
                if (typeof value === 'object' && value !== null) {
                    return new Proxy(value, this);
                }
                
                return value;
            }
        });
    }
    
    /**
     * 创建操作方法
     */
    createActions() {
        return {
            // 游戏控制
            startGame: () => {
                this.updateState('game', {
                    isPlaying: true,
                    isPaused: false,
                    isCompleted: false,
                    startTime: Date.now(),
                    endTime: null
                });
                
                // 重置统计数据
                this.updateState('stats', {
                    wpm: 0,
                    cpm: 0,
                    accuracy: 100,
                    errors: 0,
                    correctChars: 0,
                    totalChars: 0,
                    keystrokes: 0,
                    backspaces: 0,
                    errorPositions: []
                });
                
                // 确保重置文本状态后立即更新文本高亮
                this.resetTextState();
                this.updateTextHighlight();
                this.emit('gameStarted');
            },
            
            pauseGame: () => {
                this.updateState('game.isPaused', true);
                this.emit('gamePaused');
            },
            
            resumeGame: () => {
                this.updateState('game.isPaused', false);
                this.emit('gameResumed');
            },
            
            endGame: () => {
                this.updateState('game', {
                    isPlaying: false,
                    isCompleted: true,
                    endTime: Date.now()
                });
                this.emit('gameEnded');
            },
            
            resetGame: () => {
                // 获取当前模式以便调试
                const currentMode = this.state.game.mode;
                console.log(`[重置游戏] 当前模式: ${currentMode}，仅重置游戏状态而不改变模式`);
                
                // 重置游戏属性，但保持模式不变
                this.updateState('game', {
                    ...this.state.game,
                    isPlaying: false,
                    isPaused: false,
                    isCompleted: false,
                    startTime: null,
                    endTime: null
                    // mode保持不变
                });
                
                // 重置文本状态
                this.resetTextState();
                
                // 重置统计数据
                this.updateState('stats', {
                    wpm: 0,
                    cpm: 0,
                    accuracy: 100,
                    errors: 0,
                    correctChars: 0,
                    totalChars: 0,
                    keystrokes: 0,
                    backspaces: 0,
                    errorPositions: []
                });
                
                // 重置单词模式状态
                this.updateState('words', {
                    currentWordIndex: 0,
                    wordsCompleted: 0,
                    // 保留wordsList和totalWords
                    totalWords: this.state.words.totalWords,
                    wordsList: this.state.words.wordsList
                });
                
                // 重置赛车模式状态
                this.updateState('racing', {
                    aiCars: {
                        slow: { speed: 30, position: 0, name: '慢车' },
                        medium: { speed: 50, position: 0, name: '中速车' },
                        fast: { speed: 70, position: 0, name: '快车' }
                    },
                    playerPosition: 0,
                    overtakenCars: [],
                    currentRank: 4,
                    raceStartTime: null
                });
                
                console.log(`[重置游戏] 游戏状态已重置，维持模式为: ${this.state.game.mode}`);
                this.emit('gameReset');
            },
            
            // 模式切换
            setMode: (mode) => {
                console.log(`[模式切换] 尝试切换到 ${mode} 模式`);
                
                if (this.state.game.isPlaying) {
                    console.log(`[模式切换] 失败: 游戏正在进行中`);
                    return;
                }
                
                console.log(`[模式切换] 更新前的当前模式: ${this.state.game.mode}`);
                this.updateState('game.mode', mode);
                console.log(`[模式切换] 更新后的当前模式: ${this.state.game.mode}`);
                
                this.updateUIForMode(mode);
                console.log(`[模式切换] UI 已更新为 ${mode} 模式`);
                
                this.emit('modeChanged', mode);
                console.log(`[模式切换] 已触发 modeChanged 事件`); 
            },
            
            // 文本处理
            setText: (text) => {
                this.updateState('text.currentText', text);
                this.updateState('text.renderKey', this.state.text.renderKey + 1);
                // 同时更新高亮文本
                this.updateTextHighlight();
            },
            
            setUserInput: (input) => {
                this.updateState('text.userInput', input);
                this.updateState('text.currentIndex', input.length);
                this.updateState('text.renderKey', this.state.text.renderKey + 1);
                // 同时更新高亮文本
                this.updateTextHighlight();
            },
            
            // 记录按键和错误
            recordKeystroke: () => {
                this.updateState('stats.keystrokes', this.state.stats.keystrokes + 1);
            },
            
            recordBackspace: () => {
                this.updateState('stats.backspaces', this.state.stats.backspaces + 1);
            },
            
            recordError: (position, expectedChar, actualChar) => {
                const errorPositions = [...this.state.stats.errorPositions];
                errorPositions.push({
                    position,
                    expected: expectedChar || '',
                    actual: actualChar || '',
                    timestamp: Date.now() - (this.state.game.startTime || Date.now())
                });
                this.updateState('stats.errorPositions', errorPositions);
                this.updateState('stats.errors', this.state.stats.errors + 1);
            },
            
            // 游戏数据管理
            addCustomText: (text) => {
                if (!text || !text.trim()) return;
                const texts = [...this.state.gameData.texts, text.trim()];
                this.updateState('gameData.texts', texts);
            },
            
            addCustomWords: (words) => {
                if (!Array.isArray(words) || words.length === 0) return;
                const filteredWords = words.filter(word => word && word.trim());
                const updatedWords = [...this.state.gameData.words, ...filteredWords];
                this.updateState('gameData.words', updatedWords);
            },
            
            clearCustomData: () => {
                this.updateState('gameData', { texts: [], words: [] });
                // 触发重新加载游戏数据
                this.emit('reloadGameData');
            },
            
            // 统计更新
            updateStats: (stats) => {
                this.updateState('stats', { ...this.state.stats, ...stats });
                this.emit('statsUpdated', this.state.stats);
            },
            
            // 通知系统
            showNotification: (message, type = 'info') => {
                this.updateState('ui.notification', {
                    show: true,
                    message,
                    type
                });
                
                // 自动隐藏通知
                setTimeout(() => {
                    this.updateState('ui.notification.show', false);
                }, 3000);
            }
        };
    }
    
    /**
     * 更新状态
     */
    updateState(path, value) {
        const keys = path.split('.');
        let current = this.state;
        
        // 导航到目标对象
        for (let i = 0; i < keys.length - 1; i++) {
            if (!current[keys[i]]) {
                current[keys[i]] = {};
            }
            current = current[keys[i]];
        }
        
        // 设置值
        const lastKey = keys[keys.length - 1];
        const oldValue = current[lastKey];
        
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
            current[lastKey] = { ...current[lastKey], ...value };
        } else {
            current[lastKey] = value;
        }
        
        // 触发变更事件
        this.emit('stateChanged', {
            path,
            oldValue,
            newValue: current[lastKey]
        });
    }
    
    /**
     * 获取状态
     */
    getState(path) {
        if (!path) return this.state;
        
        const keys = path.split('.');
        let current = this.state;
        
        for (const key of keys) {
            if (current[key] === undefined) {
                return undefined;
            }
            current = current[key];
        }
        
        return current;
    }
    
    /**
     * 重置文本状态
     */
    resetTextState() {
        this.updateState('text', {
            userInput: '',
            currentIndex: 0,
            highlightedText: '',
            renderKey: 0
        });
    }
    
    // 更新文本缓存状态
    _lastRenderInfo = {
        text: '',
        input: '',
        html: '',
        lastRenderTime: 0
    };

    /**
     * 更新文本高亮 (超级性能优化版本 + 可靠性提升)
     * 从game-engine.js迁移而来的文本处理逻辑
     */
    updateTextHighlight() {
        try {
            const currentText = this.state.text.currentText;
            const userInput = this.state.text.userInput || '';
            const now = performance.now();
            
            // 如果没有文本，则直接清除高亮状态
            if (!currentText) {
                this.updateState('text.highlightedText', '');
                return;
            }
            
            // 简单文本：如果文本很短，直接进行常规处理，避免优化过度导致显示问题
            if (currentText.length < 50) {
                return this.updateTextHighlightSimple(currentText, userInput);
            }
            
            // 性能优化：节流渲染，避免短时间内重复渲染
            if (now - this._lastRenderInfo.lastRenderTime < 33 && // ~30fps
                this._lastRenderInfo.text === currentText && 
                this._lastRenderInfo.input === userInput) {
                return; // 避免不必要的计算和重渲染
            }
            
            // 性能优化：使用字符串拼接数组而不是+=操作
            const chunks = [];
            
            // 性能优化：仅处理视觉可见部分，避免处理超大文本
            // 减小可见范围以提高性能
            const visibleStartPos = Math.max(0, userInput.length - 100);
            const visibleEndPos = Math.min(currentText.length, userInput.length + 150);
            
            // 先添加前面不可见部分的长度占位符
            if (visibleStartPos > 0) {
                chunks.push(`<span class="text-chunk-hidden" data-length="${visibleStartPos}"></span>`);
            }
            
            // 性能优化: 每10个字符作为一组进行处理，而不是每个字符一个span
            let currentGroup = {
                type: null,
                chars: [],
                start: visibleStartPos
            };
            
            // 批量处理可见部分的字符
            for (let i = visibleStartPos; i < visibleEndPos; i++) {
                const char = currentText[i];
                let charType;
                
                if (i < userInput.length) {
                    // 已输入的字符
                    charType = (userInput[i] === char) ? 'correct' : 'incorrect';
                } else if (i === userInput.length) {
                    // 当前输入位置
                    charType = 'current';
                } else {
                    // 未输入的字符
                    charType = 'pending';
                }
                
                // 如果是新类型字符或者是当前位置（特殊显示），创建新的组
                if (charType !== currentGroup.type || charType === 'current') {
                    // 将当前组添加到chunks
                    if (currentGroup.chars.length > 0) {
                        const cssClass = 'char-' + currentGroup.type;
                        const displayText = currentGroup.chars.join('')
                            .replace(/ /g, '&nbsp;')
                            .replace(/\n/g, '<br>');
                        chunks.push(`<span class="${cssClass}">${displayText}</span>`);
                    }
                    
                    // 开始新的组
                    currentGroup = {
                        type: charType,
                        chars: [char],
                        start: i
                    };
                } else {
                    // 继续当前组
                    currentGroup.chars.push(char);
                }
            }
            
            // 添加最后一组
            if (currentGroup.chars.length > 0) {
                const cssClass = 'char-' + currentGroup.type;
                const displayText = currentGroup.chars.join('')
                    .replace(/ /g, '&nbsp;')
                    .replace(/\n/g, '<br>');
                chunks.push(`<span class="${cssClass}">${displayText}</span>`);
            }
            
            // 添加后面不可见部分的长度占位符
            if (visibleEndPos < currentText.length) {
                const hiddenLength = currentText.length - visibleEndPos;
                chunks.push(`<span class="text-chunk-hidden" data-length="${hiddenLength}"></span>`);
            }
            
            // 性能优化：使用join而不是累加字符串
            const highlightedHTML = chunks.join('');
            
            // 日志输出帮助调试
            console.log(`文本高亮已生成: ${highlightedHTML.substring(0, 100)}...`);
            
            // 更新缓存信息
            this._lastRenderInfo = {
                text: currentText,
                input: userInput,
                html: highlightedHTML,
                lastRenderTime: now
            };
            
            // 直接更新状态，确保显示
            this.updateState('text.highlightedText', highlightedHTML);
            
        } catch (error) {
            console.error('渲染文本高亮出错:', error);
            // 使用原始文本作为降级处理
            this.updateState('text.highlightedText', this.state.text.currentText || '');
        }
    }
    
    /**
     * 简单文本高亮处理 - 用于短文本，确保可靠性
     */
    updateTextHighlightSimple(currentText, userInput) {
        try {
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
                } else if (i === userInput.length) {
                    // 当前输入位置
                    cssClass = 'char-current';
                }
                
                // 处理特殊字符显示
                const displayChar = char === ' ' ? '&nbsp;' : char === '\n' ? '<br>' : char;
                highlightedHTML += `<span class="${cssClass}">${displayChar}</span>`;
            }
            
            // 直接更新状态，确保显示
            console.log(`简单文本高亮已生成: ${highlightedHTML.substring(0, 100)}...`);
            this.updateState('text.highlightedText', highlightedHTML);
            
        } catch (error) {
            console.error('简单文本高亮出错:', error);
            this.updateState('text.highlightedText', currentText || '');
        }
    }
    
    /**
     * 根据模式更新UI状态
     */
    updateUIForMode(mode) {
        this.updateState('ui', {
            showRacing: mode === 'racing',
            showDefense: mode === 'defense',
            showResults: false
        });
    }
    
    /**
     * 获取计算属性
     */
    get computed() {
        return {
            isBasicMode: () => {
                return ['classic', 'words'].includes(this.state.game.mode);
            },
            
            isSpecialMode: () => {
                return ['racing', 'defense'].includes(this.state.game.mode);
            },
            
            progress: () => {
                if (!this.state.text.currentText) return 0;
                return Math.round((this.state.text.currentIndex / this.state.text.currentText.length) * 100);
            },
            
            timeElapsed: () => {
                if (!this.state.game.startTime) return 0;
                const endTime = this.state.game.endTime || Date.now();
                return Math.floor((endTime - this.state.game.startTime) / 1000);
            }
        };
    }
    
    /**
     * 订阅状态变更
     */
    subscribe(callback) {
        this.on('stateChanged', callback);
        
        // 返回取消订阅函数
        return () => {
            this.off('stateChanged', callback);
        };
    }
    
    /**
     * 调试方法
     */
    debug() {
        console.log('🏪 GameStore State:', this.state);
        console.log('🏪 GameStore Listeners:', this.listeners);
    }
}

// 创建全局实例
window.gameStore = new GameStore();

// 导出供其他模块使用
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GameStore;
}
