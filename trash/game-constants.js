/**
 * 游戏常量配置
 * 集中管理所有硬编码的配置参数
 */

// 游戏模式
export const GAME_MODES = {
    CLASSIC: 'classic',
    WORDS: 'words',
    RACING: 'racing',
    DEFENSE: 'defense'
};

// 游戏状态
export const GAME_STATES = {
    IDLE: 'idle',
    PLAYING: 'playing',
    PAUSED: 'paused',
    COMPLETED: 'completed'
};

// 难度等级
export const DIFFICULTY_LEVELS = {
    EASY: 'easy',
    NORMAL: 'normal',
    HARD: 'hard',
    EXPERT: 'expert'
};

// 游戏配置
export const GAME_CONFIG = {
    // 默认设置
    DEFAULT_TIME_LIMIT: 60,
    DEFAULT_DIFFICULTY: DIFFICULTY_LEVELS.NORMAL,
    DEFAULT_MODE: GAME_MODES.CLASSIC,

    // 统计计算
    CHARS_PER_WORD: 5,
    STATS_UPDATE_INTERVAL: 100,

    // 性能阈值
    MIN_FPS: 30,
    MAX_RENDER_TIME: 16,
    MAX_INPUT_LATENCY: 50,
    MAX_API_RESPONSE_TIME: 1000,
    MAX_MEMORY_USAGE: 100 * 1024 * 1024, // 100MB

    // UI 配置
    NOTIFICATION_DURATION: 3000,
    PROGRESS_UPDATE_INTERVAL: 100,

    // 单词模式配置
    WORDS_MODE: {
        DEFAULT_WORD_COUNT: 50,
        MIN_WORD_LENGTH: 3,
        MAX_WORD_LENGTH: 12
    },

    // 赛车模式配置
    RACING_MODE: {
        TIME_LIMIT: 60,
        AI_CARS: {
            SLOW: { speed: 30, name: '慢车' },
            MEDIUM: { speed: 50, name: '中速车' },
            FAST: { speed: 70, name: '快车' }
        },
        UPDATE_INTERVAL: 100
    },

    // 植物防御模式配置
    DEFENSE_MODE: {
        PLANT_HEALTH: 100,
        BULLET_SPEED: 300,
        SPAWN_INTERVAL: 2000,
        DIFFICULTIES: {
            EASY: { waves: 4, name: '简单' },
            MEDIUM: { waves: 7, name: '中等' },
            HARD: { waves: 10, name: '困难' }
        },
        ZOMBIE_TYPES: {
            BASIC: { health: 1, speed: 25, wordLength: [3, 4] },
            MEDIUM: { health: 2, speed: 18, wordLength: [5, 7] },
            STRONG: { health: 3, speed: 12, wordLength: [8, 12] },
            BOSS: { health: 5, speed: 8, wordLength: [13, 20] }
        }
    }
};

// 错误代码
export const ERROR_CODES = {
    NETWORK_ERROR: 'NETWORK_ERROR',
    API_ERROR: 'API_ERROR',
    GAME_ENGINE_ERROR: 'GAME_ENGINE_ERROR',
    AUDIO_ERROR: 'AUDIO_ERROR',
    STORAGE_ERROR: 'STORAGE_ERROR',
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    JAVASCRIPT_ERROR: 'JAVASCRIPT_ERROR',
    VUE_ERROR: 'VUE_ERROR',
    PROMISE_REJECTION: 'PROMISE_REJECTION'
};

// 通知类型
export const NOTIFICATION_TYPES = {
    INFO: 'info',
    SUCCESS: 'success',
    WARNING: 'warning',
    ERROR: 'error'
};

// API 端点
export const API_ENDPOINTS = {
    TEXTS: '/api/texts',
    WORDS: '/api/words',
    STATS: '/api/stats',
    LEADERBOARD: '/api/leaderboard',
    ANALYTICS: '/api/analytics',
    DEFENSE: {
        WORDS: '/api/defense/words',
        WAVE: '/api/defense/wave',
        CONFIG: '/api/defense/config',
        STATS: '/api/defense/stats',
        LEADERBOARD: '/api/defense/leaderboard'
    }
};

// 本地存储键
export const STORAGE_KEYS = {
    GAME_SETTINGS: 'gameSettings',
    GAME_HISTORY: 'gameHistory',
    ACHIEVEMENTS: 'achievements',
    USER_PREFERENCES: 'userPreferences',
    ERROR_LOGS: 'gameErrors',
    HAS_VISITED: 'hasVisited'
};

// CSS 类名
export const CSS_CLASSES = {
    GAME_CONTAINER: 'typing-game-app',
    TEXT_DISPLAY: 'text-display',
    TEXT_INPUT: 'text-input',
    NOTIFICATION: 'notification',
    PROGRESS_BAR: 'progress-bar',
    GAME_CONTROLS: 'game-controls',
    STATS_PANEL: 'stats-panel'
};

// 事件名称
export const EVENTS = {
    GAME_STARTED: 'gameStarted',
    GAME_PAUSED: 'gamePaused',
    GAME_RESUMED: 'gameResumed',
    GAME_ENDED: 'gameEnded',
    GAME_RESET: 'gameReset',
    MODE_CHANGED: 'modeChanged',
    STATS_UPDATED: 'statsUpdated',
    ERROR_OCCURRED: 'errorOccurred',
    PERFORMANCE_ISSUE: 'performanceIssue'
};

// 键盘按键
export const KEYS = {
    ENTER: 'Enter',
    ESCAPE: 'Escape',
    BACKSPACE: 'Backspace',
    SPACE: ' ',
    TAB: 'Tab'
};

// 浏览器兼容性
export const BROWSER_SUPPORT = {
    MIN_CHROME: 80,
    MIN_FIREFOX: 75,
    MIN_SAFARI: 13,
    MIN_EDGE: 80
};

// 导出给非模块环境使用
if (typeof window !== 'undefined') {
    window.GAME_CONSTANTS = {
        GAME_MODES,
        GAME_STATES,
        DIFFICULTY_LEVELS,
        GAME_CONFIG,
        ERROR_CODES,
        NOTIFICATION_TYPES,
        API_ENDPOINTS,
        STORAGE_KEYS,
        CSS_CLASSES,
        EVENTS,
        KEYS,
        BROWSER_SUPPORT
    };
}
