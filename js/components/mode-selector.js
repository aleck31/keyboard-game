/**
 * 模式选择器组件
 * 负责游戏模式的选择UI和交互
 */
const ModeSelector = {
    name: 'ModeSelector',
    props: {
        gameState: {
            type: Object,
            required: true
        }
    },
    emits: ['mode-changed'],
    setup(props, { emit }) {
        const { computed } = Vue;
        
        const gameModes = [
            { key: 'classic', label: '经典模式', icon: '📝', type: 'basic' },
            { key: 'words', label: '单词模式', icon: '📚', type: 'basic' },
            { key: 'racing', label: '赛车追逐', icon: '🏎️', type: 'special' },
            { key: 'defense', label: '植物防御', icon: '🌱', type: 'special' }
        ];
        
        const currentMode = computed(() => props.gameState.mode);
        
        const selectMode = (mode) => {
            if (props.gameState.isPlaying) return;
            emit('mode-changed', mode);
        };
        
        return {
            gameModes,
            currentMode,
            selectMode
        };
    },
    template: `
        <div class="mode-selector">
            <button 
                v-for="mode in gameModes" 
                :key="mode.key"
                class="mode-btn"
                :class="{ 
                    active: currentMode === mode.key,
                    'basic-mode': mode.type === 'basic',
                    'special-mode': mode.type === 'special'
                }"
                :disabled="gameState.isPlaying"
                @click="selectMode(mode.key)"
            >
                <span class="mode-icon">{{ mode.icon }}</span>
                {{ mode.label }}
            </button>
        </div>
    `
};

// 注册为全局组件
if (typeof window !== 'undefined') {
    window.ModeSelector = ModeSelector;
}

// 导出供其他模块使用
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ModeSelector;
}
