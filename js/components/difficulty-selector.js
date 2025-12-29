/**
 * 游戏难度选择器组件
 */
const DifficultySelector = {
    name: 'DifficultySelector',
    props: {
        gameState: {
            type: Object,
            required: true
        }
    },
    emits: ['difficulty-changed', 'time-limit-changed'],
    setup(props, { emit }) {
        const { computed } = Vue;
        
        const difficulties = [
            { key: 'easy', label: '简单', icon: '🟢', desc: '较短文本' },
            { key: 'normal', label: '普通', icon: '🟡', desc: '标准难度' },
            { key: 'hard', label: '困难', icon: '🔴', desc: '较长文本' }
        ];
        
        const timeLimits = [
            { value: 30, label: '30秒' },
            { value: 60, label: '60秒' },
            { value: 120, label: '2分钟' },
            { value: 300, label: '5分钟' }
        ];
        
        const isClassicMode = computed(() => props.gameState.mode === 'classic');
        const isWordsMode = computed(() => props.gameState.mode === 'words');
        const canChange = computed(() => !props.gameState.isPlaying);
        
        const selectDifficulty = (difficulty) => {
            if (canChange.value) {
                emit('difficulty-changed', difficulty);
            }
        };
        
        const selectTimeLimit = (timeLimit) => {
            if (canChange.value) {
                emit('time-limit-changed', timeLimit);
            }
        };
        
        return {
            difficulties,
            timeLimits,
            isClassicMode,
            isWordsMode,
            canChange,
            selectDifficulty,
            selectTimeLimit
        };
    },
    template: `
        <div class="difficulty-selector" v-if="isClassicMode || isWordsMode">
            <!-- 经典模式：难度选择 -->
            <div v-if="isClassicMode" class="selector-group">
                <label class="selector-label">难度：</label>
                <div class="selector-buttons">
                    <button
                        v-for="diff in difficulties"
                        :key="diff.key"
                        :class="['selector-btn', { active: gameState.difficulty === diff.key }]"
                        :disabled="!canChange"
                        @click="selectDifficulty(diff.key)"
                    >
                        <span class="selector-icon">{{ diff.icon }}</span>
                        {{ diff.label }}
                    </button>
                </div>
            </div>
            
            <!-- 单词模式：时间限制 -->
            <div v-if="isWordsMode" class="selector-group">
                <label class="selector-label">时间限制：</label>
                <div class="selector-buttons">
                    <button
                        v-for="time in timeLimits"
                        :key="time.value"
                        :class="['selector-btn', { active: gameState.timeLimit === time.value }]"
                        :disabled="!canChange"
                        @click="selectTimeLimit(time.value)"
                    >
                        {{ time.label }}
                    </button>
                </div>
            </div>
        </div>
    `
};

// 注册为全局组件
if (typeof window !== 'undefined') {
    window.DifficultySelector = DifficultySelector;
}

// 导出供其他模块使用
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DifficultySelector;
}
