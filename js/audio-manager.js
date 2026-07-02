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
        this.currentTheme = 'space';  // applyTheme 会同步，决定 BGM 风格

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
    
    // 设置当前主题（由 applyTheme 调用），音乐播放中则切换到对应风格
    setTheme(theme) {
        this.currentTheme = theme;
        if (this.backgroundMusic) {
            this.stopBackgroundMusic();
            this.startBackgroundMusic();
        }
    }

    // 创建背景音乐（按主题选择风格）
    createBackgroundMusic() {
        if (!this.audioContext || !this.musicEnabled || !this.isEnabled) return null;

        const themeMusicMap = {
            space: this.createSpaceDrift,          // 星际：深空低音 + 缓慢琶音漂移
            arcade: this.createChiptuneLoop,       // 街机：快节奏芯片音乐
            ocean: this.createOceanWaves,          // 海洋：3/4拍摇曳 + 海浪涌动
            comic: this.createUpbeatBounce,        // 漫画：欢快跳跃节奏
            candy: this.createCandyBox             // 糖果：八音盒甜美旋律
        };

        const selectedMode = themeMusicMap[this.currentTheme] || this.createUpbeatBounce;
        return selectedMode.call(this);
    }

    // 星际漂移（space主题）：深空低音嗡鸣 + Am9琶音缓慢流动，空灵但可听见
    createSpaceDrift() {
        const arpeggio = [220.00, 261.63, 329.63, 440.00, 523.25, 440.00, 329.63, 261.63]; // Am9 上下行
        let step = 0;
        let isPlaying = true;

        const playDrone = () => {
            if (!this.musicEnabled || !this.isEnabled || !this.audioContext || !isPlaying) return;
            const t = this.audioContext.currentTime;
            // 两个微失谐的低音正弦叠加，产生太空感的缓慢"拍频"波动
            [55.00, 55.35].forEach(freq => {
                const osc = this.audioContext.createOscillator();
                const g = this.audioContext.createGain();
                osc.connect(g);
                g.connect(this.musicGainNode);
                osc.type = 'sine';
                osc.frequency.setValueAtTime(freq, t);
                g.gain.setValueAtTime(0.001, t);
                g.gain.linearRampToValueAtTime(0.05, t + 2);
                g.gain.linearRampToValueAtTime(0.001, t + 8);
                osc.start(t);
                osc.stop(t + 8);
            });
            setTimeout(playDrone, 7000);
        };

        const playArp = () => {
            if (!this.musicEnabled || !this.isEnabled || !this.audioContext || !isPlaying) return;
            const t = this.audioContext.currentTime;
            const freq = arpeggio[step % arpeggio.length];

            const osc = this.audioContext.createOscillator();
            const g = this.audioContext.createGain();
            osc.connect(g);
            g.connect(this.musicGainNode);
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, t);
            // 慢起音慢释放，音符之间互相交叠形成"漂浮"感
            g.gain.setValueAtTime(0.001, t);
            g.gain.linearRampToValueAtTime(0.04, t + 0.25);
            g.gain.exponentialRampToValueAtTime(0.002, t + 1.8);
            osc.start(t);
            osc.stop(t + 1.8);

            step++;
            setTimeout(playArp, 650);
        };

        playDrone();
        playArp();
        return { stop: () => { isPlaying = false; }, type: 'space-drift' };
    }

    // 海浪摇曳（ocean主题）：3/4拍圆舞曲律动（低音-和弦-和弦）+ 低通噪声海浪涌动
    createOceanWaves() {
        // C - Am - F - G 进行，每小节一个和弦，90BPM 圆舞曲
        const bars = [
            { bass: 130.81, chord: [261.63, 329.63, 392.00] }, // C
            { bass: 110.00, chord: [220.00, 261.63, 329.63] }, // Am
            { bass: 87.31,  chord: [174.61, 220.00, 261.63] }, // F
            { bass: 98.00,  chord: [196.00, 246.94, 293.66] }  // G
        ];
        const beatMs = 667; // 90 BPM
        let bar = 0;
        let isPlaying = true;

        const playNote2 = (freq, at, len, gain, type = 'sine') => {
            const osc = this.audioContext.createOscillator();
            const g = this.audioContext.createGain();
            osc.connect(g);
            g.connect(this.musicGainNode);
            osc.type = type;
            osc.frequency.setValueAtTime(freq, at);
            g.gain.setValueAtTime(0.001, at);
            g.gain.linearRampToValueAtTime(gain, at + 0.05);
            g.gain.exponentialRampToValueAtTime(0.002, at + len);
            osc.start(at);
            osc.stop(at + len);
        };

        const playBar = () => {
            if (!this.musicEnabled || !this.isEnabled || !this.audioContext || !isPlaying) return;
            const t = this.audioContext.currentTime;
            const { bass, chord } = bars[bar % bars.length];

            // 第1拍：低音；第2、3拍：柔和和弦，形成"咚-嚓-嚓"的摇曳感
            playNote2(bass, t, 0.6, 0.055, 'triangle');
            [1, 2].forEach(beat => {
                chord.forEach(freq => playNote2(freq, t + beat * beatMs / 1000, 0.45, 0.016));
            });

            bar++;
            setTimeout(playBar, beatMs * 3);
        };

        // 海浪：低通滤波的白噪声缓慢涌起退去，每6秒一次
        const playWave = () => {
            if (!this.musicEnabled || !this.isEnabled || !this.audioContext || !isPlaying) return;
            const t = this.audioContext.currentTime;
            const dur = 4;
            const buffer = this.audioContext.createBuffer(1, this.audioContext.sampleRate * dur, this.audioContext.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;

            const src = this.audioContext.createBufferSource();
            const filter = this.audioContext.createBiquadFilter();
            const g = this.audioContext.createGain();
            src.buffer = buffer;
            src.connect(filter);
            filter.connect(g);
            g.connect(this.musicGainNode);
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(350, t);
            g.gain.setValueAtTime(0.001, t);
            g.gain.linearRampToValueAtTime(0.035, t + 1.5);
            g.gain.linearRampToValueAtTime(0.001, t + dur);
            src.start(t);
            src.stop(t + dur);

            setTimeout(playWave, 6000);
        };

        playBar();
        playWave();
        return { stop: () => { isPlaying = false; }, type: 'ocean-waves' };
    }

    // 八音盒（candy主题）：铃铛音色的高音区甜美旋律，音符快起音长衰减
    createCandyBox() {
        // C大调原创小曲，八分音符为主（0=休止）
        const melody = [
            1046.50, 1318.51, 1567.98, 1318.51, 1396.91, 1760.00, 1567.98, 0,
            1174.66, 1396.91, 1318.51, 1046.50, 1174.66, 1567.98, 1046.50, 0
        ];
        let step = 0;
        let isPlaying = true;

        const playBell = (freq, t) => {
            // 基音 + 2.7倍频微弱泛音 = 八音盒铃铛音色
            [[freq, 0.03], [freq * 2.7, 0.006]].forEach(([f, gain]) => {
                const osc = this.audioContext.createOscillator();
                const g = this.audioContext.createGain();
                osc.connect(g);
                g.connect(this.musicGainNode);
                osc.type = 'sine';
                osc.frequency.setValueAtTime(f, t);
                g.gain.setValueAtTime(gain, t);
                g.gain.exponentialRampToValueAtTime(0.0008, t + 0.7);
                osc.start(t);
                osc.stop(t + 0.7);
            });
        };

        const tick = () => {
            if (!this.musicEnabled || !this.isEnabled || !this.audioContext || !isPlaying) return;
            const t = this.audioContext.currentTime;
            const freq = melody[step % melody.length];
            if (freq > 0) playBell(freq, t);
            // 每小节开头补一个轻柔低音，撑住节奏
            if (step % 8 === 0) {
                const osc = this.audioContext.createOscillator();
                const g = this.audioContext.createGain();
                osc.connect(g);
                g.connect(this.musicGainNode);
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(261.63, t);
                g.gain.setValueAtTime(0.025, t);
                g.gain.exponentialRampToValueAtTime(0.002, t + 0.5);
                osc.start(t);
                osc.stop(t + 0.5);
            }
            step++;
            setTimeout(tick, 240);
        };

        tick();
        return { stop: () => { isPlaying = false; }, type: 'candy-box' };
    }

    // 芯片音乐循环（街机主题）：方波 + 快速十六分音符低音线
    createChiptuneLoop() {
        // C大调8-bit风格短句，120ms一拍
        const bassline = [130.81, 130.81, 196.00, 130.81, 164.81, 164.81, 196.00, 164.81];
        const lead = [523.25, 659.25, 783.99, 659.25, 523.25, 587.33, 659.25, 523.25];
        let step = 0;
        let isPlaying = true;

        const tick = () => {
            if (!this.musicEnabled || !this.isEnabled || !this.audioContext || !isPlaying) return;

            const t = this.audioContext.currentTime;
            const playSquare = (freq, gain, len) => {
                const osc = this.audioContext.createOscillator();
                const g = this.audioContext.createGain();
                osc.connect(g);
                g.connect(this.musicGainNode);
                osc.type = 'square';
                osc.frequency.setValueAtTime(freq, t);
                g.gain.setValueAtTime(gain, t);
                g.gain.exponentialRampToValueAtTime(0.003, t + len);
                osc.start(t);
                osc.stop(t + len);
            };

            playSquare(bassline[step % bassline.length], 0.025, 0.1);
            if (step % 2 === 0) playSquare(lead[(step / 2) % lead.length], 0.018, 0.15);

            step++;
            setTimeout(tick, 120);
        };

        tick();
        return { stop: () => { isPlaying = false; }, type: 'chiptune' };
    }

    // 欢快跳跃节奏（漫画/糖果主题）：明亮三和弦 + 弹跳低音，约每分钟140拍
    createUpbeatBounce() {
        const progression = [
            [261.63, 329.63, 392.00], // C
            [293.66, 369.99, 440.00], // D
            [329.63, 415.30, 493.88], // E
            [293.66, 369.99, 440.00]  // D
        ];
        const bass = [130.81, 146.83, 164.81, 146.83];
        let bar = 0;
        let isPlaying = true;

        const playBar = () => {
            if (!this.musicEnabled || !this.isEnabled || !this.audioContext || !isPlaying) return;

            const t = this.audioContext.currentTime;
            const chord = progression[bar % progression.length];

            // 弹跳低音：每小节两次"蹦蹦"
            [0, 0.43].forEach(offset => {
                const osc = this.audioContext.createOscillator();
                const g = this.audioContext.createGain();
                osc.connect(g);
                g.connect(this.musicGainNode);
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(bass[bar % bass.length], t + offset);
                g.gain.setValueAtTime(0.05, t + offset);
                g.gain.exponentialRampToValueAtTime(0.005, t + offset + 0.2);
                osc.start(t + offset);
                osc.stop(t + offset + 0.2);
            });

            // 明亮和弦：轻快断奏
            chord.forEach(freq => {
                const osc = this.audioContext.createOscillator();
                const g = this.audioContext.createGain();
                osc.connect(g);
                g.connect(this.musicGainNode);
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(freq * 2, t + 0.21); // 高八度更明亮
                g.gain.setValueAtTime(0.022, t + 0.21);
                g.gain.exponentialRampToValueAtTime(0.004, t + 0.21 + 0.18);
                osc.start(t + 0.21);
                osc.stop(t + 0.21 + 0.18);
            });

            bar++;
            setTimeout(playBar, 860); // ~140 BPM
        };

        playBar();
        return { stop: () => { isPlaying = false; }, type: 'upbeat' };
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
