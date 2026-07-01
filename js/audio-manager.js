/**
 * 音频管理器
 * 处理背景音乐和音效播放
 */

class AudioManager extends Utils.EventEmitter {
    constructor() {
        super();
        this.audioContext = null;
        this.backgroundMusic = null;
        this.soundEffects = {};
        this.isEnabled = true;
        this.musicEnabled = true;
        this.effectsEnabled = true;
        this.musicVolume = 0.3;
        this.effectsVolume = 0.5;
        
        this.init();
    }
    
    async init() {
        try {
            // 初始化Web Audio API - 使用延迟创建的方式，等待用户交互
            // 创建一个暂停状态的音频上下文避免浏览器自动播放策略警告
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            this.audioContext = new AudioContextClass({ latencyHint: 'interactive', sampleRate: 44100 });
            
            // 立即暂停音频上下文，等待用户交互后恢复
            if (this.audioContext.state === 'running') {
                await this.audioContext.suspend();
            }
            
            // 创建音量控制节点
            this.musicGainNode = this.audioContext.createGain();
            this.effectsGainNode = this.audioContext.createGain();
            
            this.musicGainNode.connect(this.audioContext.destination);
            this.effectsGainNode.connect(this.audioContext.destination);
            
            this.musicGainNode.gain.value = this.musicVolume;
            this.effectsGainNode.gain.value = this.effectsVolume;
            
            // 生成音效
            this.generateSoundEffects();
            
            // 从本地存储加载设置
            this.loadSettings();
            
            // 添加全局点击监听器来恢复音频上下文
            document.addEventListener('click', () => this.resumeAudioContext(), { once: true });
            document.addEventListener('keydown', () => this.resumeAudioContext(), { once: true });
            
            console.log('音频管理器初始化成功');
        } catch (error) {
            console.warn('音频管理器初始化失败:', error);
            this.isEnabled = false;
        }
    }
    
    // 生成音效 (使用Web Audio API合成)
    generateSoundEffects() {
        if (!this.audioContext) return;

        // 按键音效
        this.soundEffects.keyPress = this.createKeyPressSound();
        this.soundEffects.keyError = this.createKeyErrorSound();
        this.soundEffects.gameStart = this.createGameStartSound();
        this.soundEffects.gameEnd = this.createGameEndSound();
        this.soundEffects.achievement = this.createAchievementSound();
        this.soundEffects.combo = this.createComboSound();
        this.soundEffects.victory = this.createVictorySound();
    }

    // 单音符工具（钟琴质感：正弦主音 + 高八度轻泛音）
    playNote(freq, startDelay, duration, volume = 0.12) {
        const t = this.audioContext.currentTime + startDelay;
        [[freq, volume], [freq * 2, volume * 0.25]].forEach(([f, v]) => {
            const osc = this.audioContext.createOscillator();
            const gain = this.audioContext.createGain();
            osc.connect(gain);
            gain.connect(this.effectsGainNode);
            osc.type = 'sine';
            osc.frequency.setValueAtTime(f, t);
            gain.gain.setValueAtTime(0, t);
            gain.gain.linearRampToValueAtTime(v, t + 0.01);
            gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
            osc.start(t);
            osc.stop(t + duration);
        });
    }

    // 创建按键音效：C大调五声音阶，音高随连击等级爬升（打得越顺音越高）
    createKeyPressSound() {
        const pentatonic = [523.25, 587.33, 659.25, 783.99, 880.00]; // C5 D5 E5 G5 A5
        return () => {
            if (!this.effectsEnabled || !this.audioContext) return;
            const level = window.effectsManager ? window.effectsManager.getComboLevel() : 0;
            const combo = window.effectsManager ? window.effectsManager.combo : 0;
            const note = pentatonic[combo % pentatonic.length] * (1 + level * 0.12);
            this.playNote(note, 0, 0.12, 0.09);
        };
    }

    // 创建错误音效：低音"噗"声，柔和不刺耳（儿童友好）
    createKeyErrorSound() {
        return () => {
            if (!this.effectsEnabled || !this.audioContext) return;

            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(this.effectsGainNode);

            oscillator.type = 'triangle';
            oscillator.frequency.setValueAtTime(180, this.audioContext.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(90, this.audioContext.currentTime + 0.15);

            gainNode.gain.setValueAtTime(0.12, this.audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.15);

            oscillator.start(this.audioContext.currentTime);
            oscillator.stop(this.audioContext.currentTime + 0.15);
        };
    }

    // 连击里程碑音效：快速上行琶音
    createComboSound() {
        return () => {
            if (!this.effectsEnabled || !this.audioContext) return;
            [659.25, 783.99, 1046.50].forEach((f, i) => this.playNote(f, i * 0.06, 0.2, 0.12));
        };
    }

    // 胜利音效：欢快的号角式旋律
    createVictorySound() {
        return () => {
            if (!this.effectsEnabled || !this.audioContext) return;
            const melody = [
                [523.25, 0, 0.15], [659.25, 0.15, 0.15], [783.99, 0.3, 0.15],
                [1046.50, 0.45, 0.4], [783.99, 0.85, 0.12], [1046.50, 1.0, 0.6]
            ];
            melody.forEach(([f, d, len]) => this.playNote(f, d, len, 0.15));
        };
    }
    
    // 创建游戏开始音效
    createGameStartSound() {
        return () => {
            if (!this.effectsEnabled || !this.audioContext) return;
            
            const frequencies = [523.25, 659.25, 783.99]; // C5, E5, G5
            
            frequencies.forEach((freq, index) => {
                setTimeout(() => {
                    const oscillator = this.audioContext.createOscillator();
                    const gainNode = this.audioContext.createGain();
                    
                    oscillator.connect(gainNode);
                    gainNode.connect(this.effectsGainNode);
                    
                    oscillator.frequency.setValueAtTime(freq, this.audioContext.currentTime);
                    oscillator.type = 'sine';
                    
                    gainNode.gain.setValueAtTime(0.15, this.audioContext.currentTime);
                    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.3);
                    
                    oscillator.start(this.audioContext.currentTime);
                    oscillator.stop(this.audioContext.currentTime + 0.3);
                }, index * 100);
            });
        };
    }
    
    // 创建游戏结束音效
    createGameEndSound() {
        return () => {
            if (!this.effectsEnabled || !this.audioContext) return;
            
            const frequencies = [783.99, 659.25, 523.25]; // G5, E5, C5
            
            frequencies.forEach((freq, index) => {
                setTimeout(() => {
                    const oscillator = this.audioContext.createOscillator();
                    const gainNode = this.audioContext.createGain();
                    
                    oscillator.connect(gainNode);
                    gainNode.connect(this.effectsGainNode);
                    
                    oscillator.frequency.setValueAtTime(freq, this.audioContext.currentTime);
                    oscillator.type = 'sine';
                    
                    gainNode.gain.setValueAtTime(0.15, this.audioContext.currentTime);
                    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.4);
                    
                    oscillator.start(this.audioContext.currentTime);
                    oscillator.stop(this.audioContext.currentTime + 0.4);
                }, index * 150);
            });
        };
    }
    
    // 创建成就音效
    createAchievementSound() {
        return () => {
            if (!this.effectsEnabled || !this.audioContext) return;
            
            const frequencies = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
            
            frequencies.forEach((freq, index) => {
                setTimeout(() => {
                    const oscillator = this.audioContext.createOscillator();
                    const gainNode = this.audioContext.createGain();
                    
                    oscillator.connect(gainNode);
                    gainNode.connect(this.effectsGainNode);
                    
                    oscillator.frequency.setValueAtTime(freq, this.audioContext.currentTime);
                    oscillator.type = 'sine';
                    
                    gainNode.gain.setValueAtTime(0.2, this.audioContext.currentTime);
                    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.5);
                    
                    oscillator.start(this.audioContext.currentTime);
                    oscillator.stop(this.audioContext.currentTime + 0.5);
                }, index * 80);
            });
        };
    }
    
    // 播放背景音乐 (使用振荡器生成简单旋律)
    async startBackgroundMusic() {
        if (!this.musicEnabled || !this.isEnabled || !this.audioContext || this.backgroundMusic) return;
        
        try {
            this.backgroundMusic = this.createBackgroundMusic();
            console.log('背景音乐开始播放');
        } catch (error) {
            console.warn('背景音乐播放失败:', error);
        }
    }
    
    // 创建背景音乐
    createBackgroundMusic() {
        if (!this.audioContext || !this.musicEnabled || !this.isEnabled) return null;
        
        // 多种音乐模式随机选择
        const musicModes = [
            this.createClassicChordProgression,
            this.createPentatonicMelody,
            this.createArpeggioPattern,
            this.createAmbientPad
        ];
        
        const selectedMode = musicModes[Math.floor(Math.random() * musicModes.length)];
        return selectedMode.call(this);
    }
    
    // 经典和弦进行
    createClassicChordProgression() {
        // 简单的和弦进行: C - Am - F - G
        const chords = [
            [261.63, 329.63, 392.00], // C major
            [220.00, 261.63, 329.63], // A minor
            [174.61, 220.00, 261.63], // F major
            [196.00, 246.94, 293.66]  // G major
        ];
        
        let currentChord = 0;
        const chordDuration = 3000; // 3秒每个和弦
        let isPlaying = true;
        
        const playChord = () => {
            if (!this.musicEnabled || !this.isEnabled || !this.audioContext || !isPlaying) return;
            
            const chord = chords[currentChord];
            const oscillators = [];
            
            chord.forEach(frequency => {
                const oscillator = this.audioContext.createOscillator();
                const gainNode = this.audioContext.createGain();
                
                oscillator.connect(gainNode);
                gainNode.connect(this.musicGainNode);
                
                oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
                oscillator.type = 'sine';
                
                gainNode.gain.setValueAtTime(0.03, this.audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + chordDuration / 1000);
                
                oscillator.start(this.audioContext.currentTime);
                oscillator.stop(this.audioContext.currentTime + chordDuration / 1000);
                
                oscillators.push(oscillator);
            });
            
            currentChord = (currentChord + 1) % chords.length;
            
            setTimeout(playChord, chordDuration);
        };
        
        playChord();
        return { 
            stop: () => { isPlaying = false; },
            type: 'classic'
        };
    }
    
    // 五声音阶旋律
    createPentatonicMelody() {
        const pentatonic = [261.63, 293.66, 329.63, 392.00, 440.00]; // C D E G A
        let isPlaying = true;
        
        const playMelody = () => {
            if (!this.musicEnabled || !this.isEnabled || !this.audioContext || !isPlaying) return;
            
            const noteIndex = Math.floor(Math.random() * pentatonic.length);
            const frequency = pentatonic[noteIndex];
            const duration = 800 + Math.random() * 400; // 0.8-1.2秒
            
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(this.musicGainNode);
            
            oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
            oscillator.type = 'triangle';
            
            gainNode.gain.setValueAtTime(0.04, this.audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration / 1000);
            
            oscillator.start(this.audioContext.currentTime);
            oscillator.stop(this.audioContext.currentTime + duration / 1000);
            
            setTimeout(playMelody, duration + Math.random() * 500);
        };
        
        playMelody();
        return { 
            stop: () => { isPlaying = false; },
            type: 'pentatonic'
        };
    }
    
    // 琶音模式
    createArpeggioPattern() {
        const arpeggio = [130.81, 164.81, 196.00, 246.94]; // C3 E3 G3 B3
        let currentNote = 0;
        let isPlaying = true;
        
        const playArpeggio = () => {
            if (!this.musicEnabled || !this.isEnabled || !this.audioContext || !isPlaying) return;
            
            const frequency = arpeggio[currentNote];
            const duration = 600;
            
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(this.musicGainNode);
            
            oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
            oscillator.type = 'sawtooth';
            
            gainNode.gain.setValueAtTime(0.02, this.audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.005, this.audioContext.currentTime + duration / 1000);
            
            oscillator.start(this.audioContext.currentTime);
            oscillator.stop(this.audioContext.currentTime + duration / 1000);
            
            currentNote = (currentNote + 1) % arpeggio.length;
            setTimeout(playArpeggio, duration);
        };
        
        playArpeggio();
        return { 
            stop: () => { isPlaying = false; },
            type: 'arpeggio'
        };
    }
    
    // 环境音垫
    createAmbientPad() {
        const frequencies = [65.41, 82.41, 98.00]; // C2 E2 G2
        let isPlaying = true;
        const oscillators = [];
        
        frequencies.forEach((frequency, index) => {
            const playPad = () => {
                if (!this.musicEnabled || !this.isEnabled || !this.audioContext || !isPlaying) return;
                
                const oscillator = this.audioContext.createOscillator();
                const gainNode = this.audioContext.createGain();
                
                oscillator.connect(gainNode);
                gainNode.connect(this.musicGainNode);
                
                oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
                oscillator.type = 'sine';
                
                gainNode.gain.setValueAtTime(0.01, this.audioContext.currentTime);
                gainNode.gain.setValueAtTime(0.02, this.audioContext.currentTime + 2);
                gainNode.gain.setValueAtTime(0.01, this.audioContext.currentTime + 8);
                
                oscillator.start(this.audioContext.currentTime);
                oscillator.stop(this.audioContext.currentTime + 10);
                
                oscillators.push(oscillator);
                
                setTimeout(playPad, 8000 + index * 1000);
            };
            
            setTimeout(playPad, index * 2000);
        });
        
        return { 
            stop: () => { 
                isPlaying = false;
                oscillators.forEach(osc => {
                    try { osc.stop(); } catch(e) {}
                });
            },
            type: 'ambient'
        };
    }
    
    // 停止背景音乐
    stopBackgroundMusic() {
        if (this.backgroundMusic) {
            this.backgroundMusic.stop();
            this.backgroundMusic = null;
            console.log('背景音乐已停止');
        }
    }
    
    // 播放音效
    playSound(soundName) {
        if (!this.isEnabled || !this.soundEffects[soundName]) return;
        
        try {
            this.soundEffects[soundName]();
        } catch (error) {
            console.warn(`播放音效 ${soundName} 失败:`, error);
        }
    }
    
    // 设置音乐音量
    setMusicVolume(volume) {
        this.musicVolume = Math.max(0, Math.min(1, volume));
        if (this.musicGainNode) {
            this.musicGainNode.gain.value = this.musicVolume;
        }
        this.saveSettings();
    }
    
    // 设置音效音量
    setEffectsVolume(volume) {
        this.effectsVolume = Math.max(0, Math.min(1, volume));
        if (this.effectsGainNode) {
            this.effectsGainNode.gain.value = this.effectsVolume;
        }
        this.saveSettings();
    }
    
    // 切换音乐开关
    toggleMusic() {
        this.musicEnabled = !this.musicEnabled;
        if (this.musicEnabled && this.isEnabled) {
            this.startBackgroundMusic();
        } else {
            this.stopBackgroundMusic();
        }
        this.saveSettings();
        this.emit('musicToggled', this.musicEnabled);
        console.log('音乐开关:', this.musicEnabled ? '开启' : '关闭');
    }
    
    // 切换音效开关
    toggleEffects() {
        this.effectsEnabled = !this.effectsEnabled;
        this.saveSettings();
        this.emit('effectsToggled', this.effectsEnabled);
        console.log('音效开关:', this.effectsEnabled ? '开启' : '关闭');
    }
    
    // 切换所有音频
    toggleAudio() {
        this.isEnabled = !this.isEnabled;
        if (!this.isEnabled) {
            this.stopBackgroundMusic();
        } else if (this.musicEnabled) {
            this.startBackgroundMusic();
        }
        this.saveSettings();
        this.emit('audioToggled', this.isEnabled);
        console.log('音频总开关:', this.isEnabled ? '开启' : '关闭');
    }
    
    // 恢复音频上下文 (用户交互后)
    async resumeAudioContext() {
        if (this.audioContext && this.audioContext.state === 'suspended') {
            try {
                await this.audioContext.resume();
                console.log('音频上下文已恢复');
            } catch (error) {
                console.warn('恢复音频上下文失败:', error);
            }
        }
    }
    
    // 保存设置到本地存储
    saveSettings() {
        const settings = {
            isEnabled: this.isEnabled,
            musicEnabled: this.musicEnabled,
            effectsEnabled: this.effectsEnabled,
            musicVolume: this.musicVolume,
            effectsVolume: this.effectsVolume
        };
        Utils.Storage.set('audioSettings', settings);
    }
    
    // 从本地存储加载设置
    loadSettings() {
        const settings = Utils.Storage.get('audioSettings', {});
        
        this.isEnabled = settings.isEnabled !== undefined ? settings.isEnabled : true;
        this.musicEnabled = settings.musicEnabled !== undefined ? settings.musicEnabled : true;
        this.effectsEnabled = settings.effectsEnabled !== undefined ? settings.effectsEnabled : true;
        this.musicVolume = settings.musicVolume !== undefined ? settings.musicVolume : 0.3;
        this.effectsVolume = settings.effectsVolume !== undefined ? settings.effectsVolume : 0.5;
        
        // 应用音量设置
        if (this.musicGainNode) {
            this.musicGainNode.gain.value = this.musicVolume;
        }
        if (this.effectsGainNode) {
            this.effectsGainNode.gain.value = this.effectsVolume;
        }
    }
    
    // 获取当前状态
    getStatus() {
        return {
            isEnabled: this.isEnabled,
            musicEnabled: this.musicEnabled,
            effectsEnabled: this.effectsEnabled,
            musicVolume: this.musicVolume,
            effectsVolume: this.effectsVolume,
            isPlaying: !!this.backgroundMusic
        };
    }
}

// 创建全局音频管理器实例
window.audioManager = new AudioManager();
