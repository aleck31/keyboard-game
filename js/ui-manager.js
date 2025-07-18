/**
 * UI管理器适配层
 * 从直接DOM操作迁移到Vue组件
 * 仅作为兼容层，将被逐步淘汰
 */

class UIManagerAdapter extends Utils.EventEmitter {
    constructor() {
        super();
        this.init();
        console.log('⚠️ UIManagerAdapter 仅作为兼容层，将被逐步淘汰');
    }
    
    init() {
        console.log('🖥️ UIManagerAdapter 初始化中...');
        try {
            // 注册Vue全局事件总线
            this.vueEventBus = window.Utils ? new window.Utils.EventEmitter() : null;
            this._setupEventForwarding();
            console.log('🖥️ UIManagerAdapter 初始化成功');
        } catch (error) {
            console.error('🖥️ UIManagerAdapter 初始化失败:', error);
        }
    }
    
    /**
     * 设置事件转发
     * 将传统事件转发到Vue事件总线
     */
    _setupEventForwarding() {
        // 需要转发的事件类型
        const eventsToForward = [
            'startGame', 'pauseGame', 'resetGame', 'playAgain', 
            'modeChanged', 'settingsChanged', 'resultsUpdated'
        ];
        
        // 对于每种事件类型，拦截emit并转发到Vue
        const originalEmit = this.emit;
        this.emit = (eventName, ...args) => {
            // 调用原始emit保持兼容性
            originalEmit.call(this, eventName, ...args);
            
            // 同时发送到Vue事件总线
            if (this.vueEventBus && eventsToForward.includes(eventName)) {
                this.vueEventBus.emit(`ui:${eventName}`, ...args);
                console.log(`🔄 事件 ${eventName} 已转发到Vue事件总线`);
            }
            
            // 尝试使用全局自定义事件
            try {
                document.dispatchEvent(new CustomEvent(`game:${eventName}`, {
                    detail: args.length > 0 ? args[0] : null
                }));
            } catch (e) {
                // 忽略自定义事件错误
            }
        };
    }
    
    // === 保持与旧代码兼容的方法，但转向Vue管理 ===
    // Todo: 去掉兼容性考虑，保持代码简洁性
    
    // 设置输入值 - 使用GameStore处理
    setInputValue(value) {
        if (window.gameStore) {
            window.gameStore.actions.setUserInput(value);
        }
    }
    
    // 清除输入 - 使用GameStore处理
    clearInput() {
        if (window.gameStore) {
            window.gameStore.actions.setUserInput('');
        }
    }
    
    // 聚焦输入框 - 发送事件给Vue处理
    focusInput() {
        document.dispatchEvent(new CustomEvent('game:focusInput'));
    }
    
    // 显示超越动画 - 发送事件给Vue处理
    showOvertakeAnimation(carName) {
        document.dispatchEvent(new CustomEvent('game:overtake', {
            detail: { carName }
        }));
    }
    
    // 显示通知 - 使用GameStore处理
    showNotification(message, type = 'info', duration = 3000) {
        if (window.gameStore) {
            window.gameStore.actions.showNotification(message, type);
        }
    }
    
    // 显示成就 - 发送事件给Vue处理
    showAchievement(achievement) {
        document.dispatchEvent(new CustomEvent('game:achievement', {
            detail: achievement
        }));
    }
    
    // 更新最终结果 - 使用GameStore处理
    updateFinalResults(stats) {
        if (window.gameStore) {
            window.gameStore.actions.updateStats(stats);
            window.gameStore.updateState('ui.showResults', true);
        }
        // 同时触发传统事件以保持兼容性
        this.emit('resultsUpdated', stats);
    }
}

// 创建全局实例 - 仅作为兼容层
window.uiManager = new UIManagerAdapter();