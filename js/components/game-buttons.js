/**
 * 游戏按钮组件
 * 负责开始、暂停、结束游戏的按钮UI和交互
 */
const GameButtons = {
    name: 'GameButtons',
    props: {
        gameState: {
            type: Object,
            required: true
        }
    },
    emits: ['start-game', 'pause-game', 'reset-game'],
    setup(props, { emit }) {
        const { computed } = Vue;
        
        const startButtonText = computed(() => {
            return props.gameState.isPlaying ? '游戏中...' : '开始游戏';
        });
        
        const pauseButtonText = computed(() => {
            return props.gameState.isPaused ? '继续' : '暂停';
        });
        
        const startGame = () => emit('start-game');
        const pauseGame = () => emit('pause-game');
        const resetGame = () => emit('reset-game');
        
        return {
            startButtonText,
            pauseButtonText,
            startGame,
            pauseGame,
            resetGame
        };
    },
    template: `
        <div class="game-buttons">
            <button 
                class="btn btn-primary" 
                :disabled="gameState.isPlaying"
                @click="startGame"
            >
                {{ startButtonText }}
            </button>
            
            <button 
                class="btn btn-warning" 
                :disabled="!gameState.isPlaying"
                @click="pauseGame"
            >
                {{ pauseButtonText }}
            </button>
            
            <button 
                class="btn btn-danger"
                @click="resetGame"
            >
                结束游戏
            </button>
        </div>
    `
};

// 注册为全局组件
if (typeof window !== 'undefined') {
    window.GameButtons = GameButtons;
}

// 导出供其他模块使用
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GameButtons;
}
