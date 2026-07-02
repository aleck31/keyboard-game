// 应用工具组件 - 参考原UIManager实现
const AppUtils = {
    name: 'AppUtils',
    setup() {
        const { ref, onMounted, onUnmounted } = Vue;
        
        // 当前主题状态
        const currentTheme = ref('space');

        // 主题配置
        const themes = ['space', 'arcade', 'ocean', 'comic', 'candy'];
        const themeIcons = {
            space: '🚀',
            arcade: '🕹️',
            ocean: '🌊',
            comic: '💥',
            candy: '🍭'
        };

        // 获取主题中文名称
        const getThemeName = (theme) => {
            const themeNames = {
                space: '星际探险',
                arcade: '复古街机',
                ocean: '海底世界',
                comic: '漫画超英',
                candy: '糖果'
            };
            return themeNames[theme] || '未知';
        };
        
        // 成就显示
        const showAchievement = (achievement) => {
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
                background: 'rgba(0, 0, 0, 0.9)',
                border: '2px solid #4caf50',
                borderRadius: '16px',
                padding: '20px',
                display: 'flex',
                alignItems: 'center',
                gap: '15px',
                zIndex: '10000',
                transition: 'transform 0.3s ease',
                maxWidth: '400px',
                boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5)',
                color: 'white'
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
                    if (document.body.contains(achievementEl)) {
                        document.body.removeChild(achievementEl);
                    }
                }, 300);
            }, 4000);
        };
        
        // 分享结果
        const shareResults = (stats) => {
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
                    showNotification('成绩已复制到剪贴板！', 'success');
                }).catch(() => {
                    showNotification('分享失败，请手动复制成绩', 'error');
                });
            }
        };
        
        // 通知显示 (简化版，与Vue应用的通知系统配合)
        const showNotification = (message, type = 'info') => {
            if (window.gameStore) {
                window.gameStore.actions.showNotification(message, type);
            }
        };
        
        // 主题切换 - 参考原UIManager实现
        const toggleTheme = () => {
            const currentIndex = themes.indexOf(currentTheme.value);
            const nextIndex = (currentIndex + 1) % themes.length;
            
            currentTheme.value = themes[nextIndex];
            applyTheme(currentTheme.value);
            saveThemeSettings();
            
            showNotification(`已切换到${getThemeName(currentTheme.value)}主题`, 'success');
        };
        
        // 应用主题 - 参考原UIManager实现
        const applyTheme = (theme) => {
            // 移除所有主题类
            document.body.className = document.body.className.replace(/theme-\w+/g, '');
            
            // 添加新主题类
            document.body.classList.add(`theme-${theme}`);
            
            // 更新主题按钮图标
            const themeToggleBtn = document.getElementById('themeToggle');
            if (themeToggleBtn) {
                themeToggleBtn.textContent = themeIcons[theme] || '🌙';
                themeToggleBtn.title = `当前: ${getThemeName(theme)}主题，点击切换`;
            }
            
            console.log(`应用主题: ${theme}`);
        };
        
        // 保存主题设置
        const saveThemeSettings = () => {
            const settings = Utils.Storage.get('gameSettings', {});
            settings.theme = currentTheme.value;
            Utils.Storage.set('gameSettings', settings);
        };
        
        // 音频切换 - 参考原UIManager实现
        const toggleAudio = () => {
            if (window.audioManager) {
                window.audioManager.toggleAudio();
            }
            updateAudioButton();
        };
        
        // 更新音频按钮 - 参考原UIManager实现
        const updateAudioButton = () => {
            const audioToggleBtn = document.getElementById('audioToggle');
            if (!audioToggleBtn || !window.audioManager) return;
            
            const status = window.audioManager.getStatus();
            audioToggleBtn.textContent = status.isEnabled ? '🔊' : '🔇';
            audioToggleBtn.title = status.isEnabled ? '关闭音频' : '开启音频';
        };
        
        // 打开设置模态框
        const openSettings = () => {
            const settingsModal = document.getElementById('settingsModal');
            if (settingsModal) {
                settingsModal.classList.remove('hidden');
                loadCurrentSettings();
                showNotification('设置面板已打开', 'info');
            }
        };
        
        // 关闭设置模态框
        const closeSettings = () => {
            const settingsModal = document.getElementById('settingsModal');
            if (settingsModal) {
                settingsModal.classList.add('hidden');
            }
        };
        
        // 加载当前设置到模态框
        const loadCurrentSettings = () => {
            const settings = Utils.Storage.get('gameSettings', {
                theme: 'space',
                timeLimit: 60,
                difficulty: 'normal',
                enableSounds: true,
                enableMusic: true,
                highlightErrors: true
            });
            
            // 更新表单元素
            const enableSounds = document.getElementById('enableSounds');
            if (enableSounds) {
                enableSounds.checked = settings.enableSounds !== false;
            }
            
            const enableMusic = document.getElementById('enableMusic');
            if (enableMusic) {
                enableMusic.checked = settings.enableMusic !== false;
            }
            
            const highlightErrors = document.getElementById('highlightErrors');
            if (highlightErrors) {
                highlightErrors.checked = settings.highlightErrors !== false;
            }
            
            const themeSelectModal = document.getElementById('themeSelectModal');
            if (themeSelectModal) {
                themeSelectModal.value = settings.theme || 'space';
            }
        };
        
        // 保存设置
        const saveSettings = () => {
            const enableSounds = document.getElementById('enableSounds');
            const enableMusic = document.getElementById('enableMusic');
            const highlightErrors = document.getElementById('highlightErrors');
            const themeSelectModal = document.getElementById('themeSelectModal');
            
            const settings = {
                theme: themeSelectModal?.value || 'space',
                enableSounds: enableSounds?.checked !== false,
                enableMusic: enableMusic?.checked !== false,
                highlightErrors: highlightErrors?.checked !== false
            };
            
            Utils.Storage.set('gameSettings', settings);
            
            // 应用主题设置
            if (settings.theme !== currentTheme.value) {
                currentTheme.value = settings.theme;
                applyTheme(settings.theme);
            }
            
            // 应用音频设置
            if (window.audioManager) {
                const audioStatus = window.audioManager.getStatus();
                
                if (settings.enableSounds !== audioStatus.effectsEnabled) {
                    window.audioManager.toggleEffects();
                }
                
                if (settings.enableMusic !== audioStatus.musicEnabled) {
                    window.audioManager.toggleMusic();
                }
                
                updateAudioButton();
            }
            
            closeSettings();
            showNotification('设置已保存', 'success');
            console.log('设置已保存:', settings);
        };

        // 从API加载默认配置
        const loadDefaultConfig = async () => {
            try {
                if (window.apiClient) {
                    const response = await window.apiClient.getConfig();
                    if (response.status === 'success' && response.data) {
                        return response.data;
                    }
                }
            } catch (error) {
                console.warn('加载默认配置失败，使用内置默认值');
            }
            return {
                defaultMode: 'classic',
                theme: 'space',
                enableKeyboardSound: true,
                enableBackgroundMusic: true
            };
        };

        // 重置设置
        const resetSettings = async () => {
            if (confirm('确定要重置所有设置为默认值吗？')) {
                // 从API获取默认配置
                const defaultConfig = await loadDefaultConfig();
                const defaultSettings = {
                    theme: defaultConfig.theme || 'space',
                    timeLimit: 60,
                    difficulty: 'normal',
                    enableSounds: defaultConfig.enableKeyboardSound !== false,
                    enableMusic: defaultConfig.enableBackgroundMusic !== false,
                    highlightErrors: true
                };

                Utils.Storage.set('gameSettings', defaultSettings);
                loadCurrentSettings();

                // 应用默认主题
                currentTheme.value = defaultSettings.theme;
                applyTheme(defaultSettings.theme);

                showNotification('设置已重置为默认值', 'success');
            }
        };
        
        // 全屏切换
        const toggleFullscreen = () => {
            if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen().catch(err => {
                    console.warn('无法进入全屏模式:', err);
                    showNotification('无法进入全屏模式', 'warning');
                });
            } else {
                document.exitFullscreen().catch(err => {
                    console.warn('无法退出全屏模式:', err);
                    showNotification('无法退出全屏模式', 'warning');
                });
            }
        };
        
        // 键盘快捷键处理
        const handleKeyboardShortcuts = (e) => {
            // F11 全屏切换
            if (e.key === 'F11') {
                toggleFullscreen();
                e.preventDefault();
            }
            
            // Esc 关闭模态框
            if (e.key === 'Escape') {
                const settingsModal = document.getElementById('settingsModal');
                if (settingsModal && !settingsModal.classList.contains('hidden')) {
                    closeSettings();
                    e.preventDefault();
                }
            }
            
            // 防止某些快捷键的默认行为
            if (e.ctrlKey) {
                switch (e.key) {
                    case 's': // Ctrl+S
                    case 'p': // Ctrl+P
                        e.preventDefault();
                        break;
                }
            }
        };
        
        // 错误记录
        const logError = (type, error) => {
            const errorData = {
                type,
                message: error?.message || String(error),
                stack: error?.stack,
                timestamp: new Date().toISOString(),
                userAgent: navigator.userAgent,
                url: window.location.href
            };
            
            // 保存到本地存储
            const errors = Utils.Storage.get('errorLog', []);
            errors.unshift(errorData);
            
            // 限制错误日志数量
            if (errors.length > 50) {
                errors.splice(50);
            }
            
            Utils.Storage.set('errorLog', errors);
            console.error('错误已记录:', errorData);
        };
        
        // 数据导出
        const exportGameData = () => {
            const data = {
                settings: Utils.Storage.get('gameSettings', {}),
                stats: Utils.Storage.get('gameStats', {}),
                timestamp: new Date().toISOString()
            };
            
            const blob = new Blob([JSON.stringify(data, null, 2)], {
                type: 'application/json'
            });
            
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `typing-game-data-${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            
            URL.revokeObjectURL(url);
            showNotification('数据导出成功！', 'success');
        };
        
        // 数据导入
        const importGameData = (file) => {
            const reader = new FileReader();
            
            reader.onload = (e) => {
                try {
                    const data = JSON.parse(e.target.result);
                    
                    if (data.settings) {
                        Utils.Storage.set('gameSettings', data.settings);
                    }
                    
                    if (data.stats) {
                        Utils.Storage.set('gameStats', data.stats);
                    }
                    
                    showNotification('数据导入成功！请刷新页面应用设置', 'success');
                    
                } catch (error) {
                    console.error('导入数据失败:', error);
                    showNotification('数据导入失败，文件格式错误', 'error');
                }
            };
            
            reader.readAsText(file);
        };
        
        // 生命周期
        onMounted(async () => {
            // 加载保存的主题设置，若无则从API获取默认配置
            let settings = Utils.Storage.get('gameSettings', null);
            if (!settings) {
                const defaultConfig = await loadDefaultConfig();
                settings = {
                    theme: defaultConfig.theme || 'space',
                    enableSounds: defaultConfig.enableKeyboardSound !== false,
                    enableMusic: defaultConfig.enableBackgroundMusic !== false,
                    timeLimit: 60,
                    difficulty: 'normal',
                    highlightErrors: true
                };
                Utils.Storage.set('gameSettings', settings);
                console.log('⚙️ 已从API加载默认配置');
            }

            if (settings.theme && themes.includes(settings.theme)) {
                currentTheme.value = settings.theme;
                applyTheme(settings.theme);
            } else {
                // 如果没有保存的主题或主题无效，使用默认主题
                applyTheme(currentTheme.value);
            }
            
            // 绑定右上角按钮事件
            const themeToggleBtn = document.getElementById('themeToggle');
            const settingsBtn = document.getElementById('settingsBtn');
            const audioToggleBtn = document.getElementById('audioToggle');
            
            if (themeToggleBtn) {
                themeToggleBtn.addEventListener('click', toggleTheme);
                console.log('✓ 主题切换按钮事件已绑定');
            }
            
            if (settingsBtn) {
                settingsBtn.addEventListener('click', openSettings);
                console.log('✓ 设置按钮事件已绑定');
            }
            
            if (audioToggleBtn) {
                audioToggleBtn.addEventListener('click', toggleAudio);
                console.log('✓ 音频切换按钮事件已绑定');
            }
            
            // 绑定设置模态框事件
            const closeSettingsBtn = document.getElementById('closeSettings');
            const saveSettingsBtn = document.getElementById('saveSettings');
            const resetSettingsBtn = document.getElementById('resetSettings');
            const settingsModal = document.getElementById('settingsModal');
            
            if (closeSettingsBtn) {
                closeSettingsBtn.addEventListener('click', closeSettings);
            }
            
            if (saveSettingsBtn) {
                saveSettingsBtn.addEventListener('click', saveSettings);
            }
            
            if (resetSettingsBtn) {
                resetSettingsBtn.addEventListener('click', resetSettings);
            }
            
            // 点击模态框外部关闭
            if (settingsModal) {
                settingsModal.addEventListener('click', (e) => {
                    if (e.target === settingsModal) {
                        closeSettings();
                    }
                });
            }
            
            // 绑定全局事件
            document.addEventListener('keydown', handleKeyboardShortcuts);

            // 全局错误处理
            window.addEventListener('error', (e) => {
                logError('GlobalError', e.error);
            });
            
            window.addEventListener('unhandledrejection', (e) => {
                logError('UnhandledRejection', e.reason);
            });
            
            // 初始化音频按钮状态
            updateAudioButton();
            
            console.log('🛠️ AppUtils 已初始化，所有按钮事件已绑定');
            console.log(`🎨 当前主题: ${getThemeName(currentTheme.value)} (${currentTheme.value})`);
        });
        
        onUnmounted(() => {
            // 清理事件监听器
            const themeToggleBtn = document.getElementById('themeToggle');
            const settingsBtn = document.getElementById('settingsBtn');
            const audioToggleBtn = document.getElementById('audioToggle');
            
            if (themeToggleBtn) {
                themeToggleBtn.removeEventListener('click', toggleTheme);
            }
            
            if (settingsBtn) {
                settingsBtn.removeEventListener('click', openSettings);
            }
            
            if (audioToggleBtn) {
                audioToggleBtn.removeEventListener('click', toggleAudio);
            }
            
            document.removeEventListener('keydown', handleKeyboardShortcuts);
        });
        
        return {
            showAchievement,
            shareResults,
            showNotification,
            toggleTheme,
            toggleAudio,
            toggleFullscreen,
            exportGameData,
            importGameData,
            logError
        };
    },
    template: `<div style="display: none;"></div>` // 隐藏组件，只提供功能
};

// 导出组件
window.AppUtils = AppUtils;
