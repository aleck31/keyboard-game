/**
 * UI管理器
 * 处理用户界面的更新和交互
 */

class UIManager extends Utils.EventEmitter {
    constructor() {
        super();
        this.elements = {};
        this.currentTheme = 'dark';
        this.isSettingsOpen = false;
        this.isLeaderboardOpen = false;
        
        this.init();
    }
    
    init() {
        // 缓存DOM元素
        this.cacheElements();
        
        // 绑定事件监听器
        this.bindEvents();
        
        // 加载设置
        this.loadSettings();
        
        // 初始化UI状态
        this.initializeUI();
        
        console.log('UI管理器初始化成功');
    }
    
    // 缓存DOM元素
    cacheElements() {
        this.elements = {
            // 主要元素
            body: document.body,
            gameContainer: Utils.$('.game-container'),
            
            // 头部元素
            gameTitle: Utils.$('.game-title'),
            themeToggle: Utils.$('#themeToggle'),
            settingsBtn: Utils.$('#settingsBtn'),
            audioToggle: Utils.$('#audioToggle'),
            
            // 模式选择
            modeSelector: Utils.$('.mode-selector'),
            modeBtns: Utils.$$('.mode-btn'),
            
            // 统计面板
            wpmDisplay: Utils.$('#wpmDisplay'),
            cpmDisplay: Utils.$('#cpmDisplay'),
            accuracyDisplay: Utils.$('#accuracyDisplay'),
            timeDisplay: Utils.$('#timeDisplay'),
            errorsDisplay: Utils.$('#errorsDisplay'),
            
            // 游戏区域
            progressBar: Utils.$('#progressBar'),
            racingContainer: Utils.$('#racingContainer'),
            racingCountdown: Utils.$('#racingCountdown'),
            playerCar: Utils.$('#playerCar'),
            slowCar: Utils.$('#slowCar'),
            mediumCar: Utils.$('#mediumCar'),
            fastCar: Utils.$('#fastCar'),
            playerSpeed: Utils.$('#playerSpeed'),
            currentRank: Utils.$('#currentRank'),
            overtakenCars: Utils.$('#overtakenCars'),
            textDisplay: Utils.$('#textDisplay'),
            textContent: Utils.$('#textContent'),
            textInput: Utils.$('#textInput'),
            
            // 游戏控制
            startBtn: Utils.$('#startBtn'),
            pauseBtn: Utils.$('#pauseBtn'),
            resetBtn: Utils.$('#resetBtn'),
            
            // 结果面板
            resultsPanel: Utils.$('#resultsPanel'),
            finalWPM: Utils.$('#finalWPM'),
            finalCPM: Utils.$('#finalCPM'),
            finalAccuracy: Utils.$('#finalAccuracy'),
            finalTime: Utils.$('#finalTime'),
            finalErrors: Utils.$('#finalErrors'),
            racingResults: Utils.$('#racingResults'),
            racingRank: Utils.$('#racingRank'),
            racingOvertaken: Utils.$('#racingOvertaken'),
            racingDistance: Utils.$('#racingDistance'),
            playAgainBtn: Utils.$('#playAgainBtn'),
            shareBtn: Utils.$('#shareBtn'),
            
            // 设置模态框
            settingsModal: Utils.$('#settingsModal'),
            closeSettings: Utils.$('#closeSettings'),
            timeLimitSelect: Utils.$('#timeLimitSelect'),
            difficultySelect: Utils.$('#difficultySelect'),
            enableSounds: Utils.$('#enableSounds'),
            enableMusic: Utils.$('#enableMusic'),
            highlightErrors: Utils.$('#highlightErrors'),
            saveSettings: Utils.$('#saveSettings'),
            
            // 排行榜模态框
            leaderboardModal: Utils.$('#leaderboardModal'),
            closeLeaderboard: Utils.$('#closeLeaderboard'),
            leaderboardList: Utils.$('#leaderboardList')
        };
    }
    
    // 绑定事件监听器
    bindEvents() {
        // 主题切换
        this.elements.themeToggle?.addEventListener('click', () => this.toggleTheme());
        
        // 设置按钮
        this.elements.settingsBtn?.addEventListener('click', () => this.openSettings());
        this.elements.closeSettings?.addEventListener('click', () => this.closeSettings());
        this.elements.saveSettings?.addEventListener('click', () => this.saveSettings());
        
        // 音频切换
        this.elements.audioToggle?.addEventListener('click', () => this.toggleAudio());
        
        // 模式选择
        this.elements.modeBtns?.forEach(btn => {
            btn.addEventListener('click', (e) => this.selectMode(e.target.dataset.mode));
        });
        
        // 游戏控制
        this.elements.startBtn?.addEventListener('click', () => this.emit('startGame'));
        this.elements.pauseBtn?.addEventListener('click', () => this.emit('pauseGame'));
        this.elements.resetBtn?.addEventListener('click', () => this.emit('resetGame'));
        this.elements.playAgainBtn?.addEventListener('click', () => this.emit('playAgain'));
        this.elements.shareBtn?.addEventListener('click', () => this.shareResults());
        
        // 模态框外部点击关闭
        this.elements.settingsModal?.addEventListener('click', (e) => {
            if (e.target === this.elements.settingsModal) {
                this.closeSettings();
            }
        });
        
        this.elements.leaderboardModal?.addEventListener('click', (e) => {
            if (e.target === this.elements.leaderboardModal) {
                this.closeLeaderboard();
            }
        });
        
        // 键盘快捷键
        document.addEventListener('keydown', (e) => this.handleKeyboardShortcuts(e));
        
        // 窗口大小变化
        window.addEventListener('resize', Utils.debounce(() => this.handleResize(), 250));
    }
    
    // 初始化UI状态
    initializeUI() {
        // 设置初始主题
        this.applyTheme(this.currentTheme);
        
        // 更新音频按钮状态
        this.updateAudioButton();
        
        // 隐藏结果面板
        this.hideResults();
        
        // 禁用输入框
        if (this.elements.textInput) {
            this.elements.textInput.disabled = true;
        }
    }
    
    // 主题切换
    toggleTheme() {
        const themes = ['dark', 'light', 'blue', 'green', 'purple'];
        const currentIndex = themes.indexOf(this.currentTheme);
        const nextIndex = (currentIndex + 1) % themes.length;
        
        this.currentTheme = themes[nextIndex];
        this.applyTheme(this.currentTheme);
        this.saveSettings();
        
        this.emit('themeChanged', this.currentTheme);
    }
    
    // 应用主题
    applyTheme(theme) {
        // 移除所有主题类
        this.elements.body.className = this.elements.body.className
            .replace(/theme-\w+/g, '');
        
        // 添加新主题类
        this.elements.body.classList.add(`theme-${theme}`);
        
        // 更新主题按钮图标
        const themeIcons = {
            dark: '🌙',
            light: '☀️',
            blue: '🌊',
            green: '🌿',
            purple: '🔮'
        };
        
        if (this.elements.themeToggle) {
            this.elements.themeToggle.textContent = themeIcons[theme] || '🌙';
        }
        
        console.log(`应用主题: ${theme}`);
    }
    
    // 音频切换
    toggleAudio() {
        if (window.audioManager) {
            window.audioManager.toggleAudio();
        }
        this.updateAudioButton();
    }
    
    // 更新音频按钮
    updateAudioButton() {
        if (!this.elements.audioToggle || !window.audioManager) return;
        
        const status = window.audioManager.getStatus();
        this.elements.audioToggle.textContent = status.isEnabled ? '🔊' : '🔇';
        this.elements.audioToggle.title = status.isEnabled ? '关闭音频' : '开启音频';
    }
    
    // 模式选择
    selectMode(mode) {
        // 更新按钮状态
        this.elements.modeBtns?.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.mode === mode);
        });
        
        // 显示/隐藏相应的UI元素
        if (this.elements.racingContainer) {
            if (mode === 'racing') {
                this.elements.racingContainer.classList.remove('hidden');
            } else {
                this.elements.racingContainer.classList.add('hidden');
            }
        }
        
        this.emit('modeChanged', mode);
        console.log(`选择游戏模式: ${mode}`);
    }
    
    // 更新统计显示
    updateStats(stats) {
        if (this.elements.wpmDisplay) {
            this.elements.wpmDisplay.textContent = stats.wpm || 0;
        }
        
        if (this.elements.cpmDisplay) {
            this.elements.cpmDisplay.textContent = stats.cpm || 0;
        }
        
        if (this.elements.accuracyDisplay) {
            this.elements.accuracyDisplay.textContent = `${stats.accuracy || 100}%`;
        }
        
        if (this.elements.timeDisplay) {
            this.elements.timeDisplay.textContent = Utils.formatTime(stats.timeElapsed || 0);
        }
        
        if (this.elements.errorsDisplay) {
            this.elements.errorsDisplay.textContent = stats.errors || 0;
        }
        
        // 更新进度条
        if (this.elements.progressBar) {
            let progress = 0;
            
            // 检查是否是单词模式
            const gameState = window.gameEngine?.getGameState();
            if (gameState && gameState.mode === 'words' && gameState.totalWords > 0) {
                // 单词模式：基于完成的单词数
                progress = (gameState.wordsCompleted / gameState.totalWords) * 100;
            } else if (stats.currentIndex !== undefined && stats.totalChars > 0) {
                // 其他模式：基于字符数，但只有在有有效数据时才计算
                progress = (stats.currentIndex / stats.totalChars) * 100;
            }
            
            this.elements.progressBar.style.width = `${Math.min(Math.max(progress, 0), 100)}%`;
        }
    }
    
    // 显示文本
    displayText(text, currentIndex = 0, userInput = '') {
        if (!this.elements.textContent) return;
        
        let html = '';
        
        for (let i = 0; i < text.length; i++) {
            const char = text[i];
            let className = '';
            
            if (i < currentIndex) {
                // 已输入的字符
                if (i < userInput.length && userInput[i] === char) {
                    className = 'char-correct';
                } else {
                    className = 'char-incorrect';
                }
            } else if (i === currentIndex) {
                // 当前字符
                className = 'char-current';
            }
            
            // 处理空格和特殊字符
            const displayChar = char === ' ' ? '&nbsp;' : this.escapeHtml(char);
            html += `<span class="${className}">${displayChar}</span>`;
        }
        
        this.elements.textContent.innerHTML = html;
        
        // 滚动到当前位置
        this.scrollToCurrentChar();
    }
    
    // 滚动到当前字符
    scrollToCurrentChar() {
        const currentChar = this.elements.textContent?.querySelector('.char-current');
        if (currentChar) {
            currentChar.scrollIntoView({
                behavior: 'smooth',
                block: 'center',
                inline: 'center'
            });
        }
    }
    
    // HTML转义
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    // 游戏状态更新
    updateGameState(state) {
        const { isPlaying, isPaused, isCompleted } = state;
        
        // 更新按钮状态
        if (this.elements.startBtn) {
            this.elements.startBtn.disabled = isPlaying;
            this.elements.startBtn.textContent = isPlaying ? '游戏中...' : '开始游戏';
        }
        
        if (this.elements.pauseBtn) {
            this.elements.pauseBtn.disabled = !isPlaying || isCompleted;
            this.elements.pauseBtn.textContent = isPaused ? '继续' : '暂停';
        }
        
        if (this.elements.resetBtn) {
            this.elements.resetBtn.disabled = false; // 总是可以结束游戏
            this.elements.resetBtn.textContent = '结束游戏';
        }
        
        // 更新输入框状态
        if (this.elements.textInput) {
            this.elements.textInput.disabled = !isPlaying || isPaused;
            if (isPlaying && !isPaused) {
                this.elements.textInput.focus();
            }
        }
        
        // 显示/隐藏结果面板
        if (isCompleted) {
            this.showResults();
        } else {
            this.hideResults();
        }
    }
    
    // 显示结果
    showResults() {
        if (!this.elements.resultsPanel) return;
        
        this.elements.resultsPanel.classList.remove('hidden');
        this.elements.resultsPanel.classList.add('fade-in');
        
        // 滚动到结果面板
        Utils.Animation.scrollToElement(this.elements.resultsPanel);
    }
    
    // 隐藏结果
    hideResults() {
        if (!this.elements.resultsPanel) return;
        
        this.elements.resultsPanel.classList.add('hidden');
        this.elements.resultsPanel.classList.remove('fade-in');
    }
    
    // 更新最终结果
    updateFinalResults(stats) {
        if (this.elements.finalWPM) {
            this.elements.finalWPM.textContent = stats.wpm || 0;
        }
        
        if (this.elements.finalCPM) {
            this.elements.finalCPM.textContent = stats.cpm || 0;
        }
        
        if (this.elements.finalAccuracy) {
            this.elements.finalAccuracy.textContent = `${stats.accuracy || 100}%`;
        }
        
        if (this.elements.finalTime) {
            this.elements.finalTime.textContent = Utils.formatTime(stats.timeElapsed || 0);
        }
        
        if (this.elements.finalErrors) {
            this.elements.finalErrors.textContent = stats.errors || 0;
        }
        
        // 显示赛车结果
        if (stats.racingResults && this.elements.racingResults) {
            this.elements.racingResults.classList.remove('hidden');
            
            if (this.elements.racingRank) {
                this.elements.racingRank.textContent = stats.racingResults.rankText;
            }
            
            if (this.elements.racingOvertaken) {
                const overtaken = stats.racingResults.overtakenCars;
                this.elements.racingOvertaken.textContent = 
                    overtaken.length > 0 ? `已超越: ${overtaken.join(', ')}` : '已超越: 无';
            }
            
            if (this.elements.racingDistance) {
                this.elements.racingDistance.textContent = 
                    `完成距离: ${stats.racingResults.totalDistance}%`;
            }
        } else if (this.elements.racingResults) {
            this.elements.racingResults.classList.add('hidden');
        }
    }
    
    // 分享结果
    shareResults() {
        const stats = window.statsManager?.getCurrentStats();
        if (!stats) return;
        
        const shareText = `我在键盘打字竞速游戏中取得了 ${stats.wpm} WPM (${stats.cpm} CPM)，准确率 ${stats.accuracy}%！你能超越我吗？`;
        
        if (navigator.share) {
            // 使用原生分享API
            navigator.share({
                title: '键盘打字竞速游戏成绩',
                text: shareText,
                url: window.location.href
            }).catch(console.error);
        } else {
            // 复制到剪贴板
            navigator.clipboard.writeText(shareText).then(() => {
                this.showNotification('成绩已复制到剪贴板！', 'success');
            }).catch(() => {
                this.showNotification('分享失败，请手动复制成绩', 'error');
            });
        }
    }
    
    // 显示通知
    showNotification(message, type = 'info', duration = 3000) {
        // 创建通知元素
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        
        // 添加样式
        Object.assign(notification.style, {
            position: 'fixed',
            top: '20px',
            right: '20px',
            padding: '15px 20px',
            borderRadius: '8px',
            color: 'white',
            fontWeight: '500',
            zIndex: '10000',
            transform: 'translateX(100%)',
            transition: 'transform 0.3s ease',
            backgroundColor: type === 'success' ? '#4CAF50' : 
                           type === 'error' ? '#F44336' : 
                           type === 'warning' ? '#FF9800' : '#2196F3'
        });
        
        document.body.appendChild(notification);
        
        // 显示动画
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 100);
        
        // 自动隐藏
        setTimeout(() => {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, duration);
    }
    
    // 显示成就
    showAchievement(achievement) {
        const achievementEl = document.createElement('div');
        achievementEl.className = 'achievement-popup';
        achievementEl.innerHTML = `
            <div class="achievement-icon">${achievement.icon}</div>
            <div class="achievement-content">
                <div class="achievement-title">🎉 成就解锁！</div>
                <div class="achievement-name">${achievement.name}</div>
                <div class="achievement-description">${achievement.description}</div>
            </div>
        `;
        
        // 添加样式
        Object.assign(achievementEl.style, {
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%) scale(0)',
            background: 'var(--card-bg)',
            border: '2px solid var(--primary-color)',
            borderRadius: '16px',
            padding: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '15px',
            zIndex: '10000',
            transition: 'transform 0.3s ease',
            maxWidth: '400px',
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)'
        });
        
        document.body.appendChild(achievementEl);
        
        // 播放成就音效
        if (window.audioManager) {
            window.audioManager.playSound('achievement');
        }
        
        // 显示动画
        setTimeout(() => {
            achievementEl.style.transform = 'translate(-50%, -50%) scale(1)';
        }, 100);
        
        // 自动隐藏
        setTimeout(() => {
            achievementEl.style.transform = 'translate(-50%, -50%) scale(0)';
            setTimeout(() => {
                document.body.removeChild(achievementEl);
            }, 300);
        }, 4000);
    }
    
    // 打开设置
    openSettings() {
        if (!this.elements.settingsModal) return;
        
        this.elements.settingsModal.classList.remove('hidden');
        this.isSettingsOpen = true;
        
        // 加载当前设置
        this.loadCurrentSettings();
    }
    
    // 关闭设置
    closeSettings() {
        if (!this.elements.settingsModal) return;
        
        this.elements.settingsModal.classList.add('hidden');
        this.isSettingsOpen = false;
    }
    
    // 加载当前设置
    loadCurrentSettings() {
        const settings = this.getSettings();
        
        if (this.elements.timeLimitSelect) {
            this.elements.timeLimitSelect.value = settings.timeLimit || 60;
        }
        
        if (this.elements.difficultySelect) {
            this.elements.difficultySelect.value = settings.difficulty || 'normal';
        }
        
        if (this.elements.enableSounds) {
            this.elements.enableSounds.checked = settings.enableSounds !== false;
        }
        
        if (this.elements.enableMusic) {
            this.elements.enableMusic.checked = settings.enableMusic !== false;
        }
        
        if (this.elements.highlightErrors) {
            this.elements.highlightErrors.checked = settings.highlightErrors !== false;
        }
        
        // 同步音频管理器状态
        if (window.audioManager) {
            const audioStatus = window.audioManager.getStatus();
            if (this.elements.enableSounds) {
                this.elements.enableSounds.checked = audioStatus.effectsEnabled;
            }
            if (this.elements.enableMusic) {
                this.elements.enableMusic.checked = audioStatus.musicEnabled;
            }
        }
    }
    
    // 保存设置
    saveSettings() {
        const settings = {
            theme: this.currentTheme,
            timeLimit: parseInt(this.elements.timeLimitSelect?.value) || 60,
            difficulty: this.elements.difficultySelect?.value || 'normal',
            enableSounds: this.elements.enableSounds?.checked !== false,
            enableMusic: this.elements.enableMusic?.checked !== false,
            highlightErrors: this.elements.highlightErrors?.checked !== false
        };
        
        Utils.Storage.set('gameSettings', settings);
        
        // 应用音频设置
        if (window.audioManager) {
            const audioStatus = window.audioManager.getStatus();
            
            // 更新音效设置
            if (settings.enableSounds !== audioStatus.effectsEnabled) {
                window.audioManager.toggleEffects();
            }
            
            // 更新音乐设置
            if (settings.enableMusic !== audioStatus.musicEnabled) {
                window.audioManager.toggleMusic();
            }
        }
        
        this.emit('settingsChanged', settings);
        this.closeSettings();
        
        this.showNotification('设置已保存', 'success');
        console.log('设置已保存:', settings);
    }
    
    // 加载设置
    loadSettings() {
        const settings = Utils.Storage.get('gameSettings', {});
        
        this.currentTheme = settings.theme || 'dark';
        
        console.log('设置已加载:', settings);
    }
    
    // 获取设置
    getSettings() {
        return Utils.Storage.get('gameSettings', {
            theme: 'dark',
            timeLimit: 60,
            difficulty: 'normal',
            enableSounds: true,
            enableMusic: true,
            highlightErrors: true
        });
    }
    
    // 键盘快捷键处理
    handleKeyboardShortcuts(e) {
        // Esc键 - 暂停/继续或关闭模态框
        if (e.key === 'Escape') {
            if (this.isSettingsOpen) {
                this.closeSettings();
            } else if (this.isLeaderboardOpen) {
                this.closeLeaderboard();
            } else {
                this.emit('pauseGame');
            }
            e.preventDefault();
        }
        
        // Ctrl+R - 重新开始
        if (e.ctrlKey && e.key === 'r') {
            this.emit('resetGame');
            e.preventDefault();
        }
        
        // Ctrl+Enter - 开始游戏
        if (e.ctrlKey && e.key === 'Enter') {
            this.emit('startGame');
            e.preventDefault();
        }
    }
    
    // 窗口大小变化处理
    handleResize() {
        // 重新计算布局
        this.scrollToCurrentChar();
        
        this.emit('resize');
    }
    
    // 更新赛车追逐显示
    updateRacing(racingData) {
        if (!this.elements.racingContainer) return;
        
        const { playerWPM, playerPosition, aiPositions, remainingTime, rank, overtakenCars } = racingData;
        
        // 更新倒计时
        if (this.elements.racingCountdown) {
            const minutes = Math.floor(remainingTime / 60);
            const seconds = remainingTime % 60;
            const timeString = `${minutes}:${seconds.toString().padStart(2, '0')}`;
            
            this.elements.racingCountdown.textContent = timeString;
            this.elements.racingCountdown.className = 'countdown-time';
            
            if (remainingTime <= 10) {
                this.elements.racingCountdown.classList.add('danger');
            } else if (remainingTime <= 30) {
                this.elements.racingCountdown.classList.add('warning');
            }
        }
        
        // 更新玩家赛车位置和速度
        if (this.elements.playerCar) {
            this.elements.playerCar.style.left = `${Math.min(playerPosition, 85)}%`;
        }
        
        if (this.elements.playerSpeed) {
            this.elements.playerSpeed.textContent = `${playerWPM} WPM`;
        }
        
        // 更新AI赛车位置
        if (this.elements.slowCar && aiPositions.slow !== undefined) {
            this.elements.slowCar.style.left = `${Math.min(aiPositions.slow, 85)}%`;
        }
        
        if (this.elements.mediumCar && aiPositions.medium !== undefined) {
            this.elements.mediumCar.style.left = `${Math.min(aiPositions.medium, 85)}%`;
        }
        
        if (this.elements.fastCar && aiPositions.fast !== undefined) {
            this.elements.fastCar.style.left = `${Math.min(aiPositions.fast, 85)}%`;
        }
        
        // 更新排名和超越信息
        if (this.elements.currentRank) {
            this.elements.currentRank.textContent = `当前排名: 第${rank}名`;
        }
        
        if (this.elements.overtakenCars) {
            if (overtakenCars.length > 0) {
                this.elements.overtakenCars.textContent = `已超越: ${overtakenCars.join(', ')}`;
            } else {
                this.elements.overtakenCars.textContent = '已超越: 无';
            }
        }
    }
    
    // 显示超越动画
    showOvertakeAnimation(carType) {
        const carElement = this.elements.playerCar;
        if (carElement) {
            carElement.classList.add('overtaking');
            setTimeout(() => {
                carElement.classList.remove('overtaking');
            }, 500);
        }
        
        // 播放超越音效
        if (window.audioManager) {
            window.audioManager.playSound('achievement');
        }
        
        // 显示超越通知
        this.showNotification(`🏎️ 超越了${carType}！`, 'success', 2000);
    }
    
    // 显示赛车模式
    showRacing() {
        if (this.elements.racingContainer) {
            this.elements.racingContainer.classList.remove('hidden');
        }
    }
    
    // 隐藏赛车模式
    hideRacing() {
        if (this.elements.racingContainer) {
            this.elements.racingContainer.classList.add('hidden');
        }
    }
    
    // 清空输入框
    clearInput() {
        if (this.elements.textInput) {
            this.elements.textInput.value = '';
        }
    }
    
    // 获取输入框内容
    getInputValue() {
        return this.elements.textInput?.value || '';
    }
    
    // 设置输入框内容
    setInputValue(value) {
        if (this.elements.textInput) {
            this.elements.textInput.value = value;
        }
    }
    
    // 聚焦输入框
    focusInput() {
        if (this.elements.textInput && !this.elements.textInput.disabled) {
            this.elements.textInput.focus();
        }
    }
}

// 创建全局UI管理器实例
window.uiManager = new UIManager();
