/**
 * 工具函数集合
 */

// DOM操作工具
const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => document.querySelectorAll(selector);

// 格式化时间 (秒 -> MM:SS)
function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// 计算WPM (每分钟字数)
function calculateWPM(startTime, endTime, correctChars) {
    const timeInMinutes = (endTime - startTime) / 60000; // 转换为分钟
    const words = correctChars / 5; // 标准：5个字符 = 1个单词
    return Math.round(words / timeInMinutes) || 0;
}

// 计算准确率
function calculateAccuracy(correctChars, totalChars) {
    if (totalChars === 0) return 100;
    return Math.round((correctChars / totalChars) * 100);
}

// 防抖函数
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// 节流函数
function throttle(func, limit) {
    let inThrottle;
    return function() {
        const args = arguments;
        const context = this;
        if (!inThrottle) {
            func.apply(context, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    }
}

// 随机选择数组元素
function randomChoice(array) {
    return array[Math.floor(Math.random() * array.length)];
}

// 打乱数组
function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

// 本地存储工具
const Storage = {
    set(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch (e) {
            console.warn('无法保存到本地存储:', e);
        }
    },
    
    get(key, defaultValue = null) {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : defaultValue;
        } catch (e) {
            console.warn('无法从本地存储读取:', e);
            return defaultValue;
        }
    },
    
    remove(key) {
        try {
            localStorage.removeItem(key);
        } catch (e) {
            console.warn('无法从本地存储删除:', e);
        }
    },
    
    clear() {
        try {
            localStorage.clear();
        } catch (e) {
            console.warn('无法清空本地存储:', e);
        }
    }
};

// API请求工具
const API = {
    async request(url, options = {}) {
        try {
            const response = await fetch(url, {
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                },
                ...options
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('API请求失败:', error);
            throw error;
        }
    },
    
    async get(url) {
        return this.request(url);
    },
    
    async post(url, data) {
        return this.request(url, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }
};

// 事件发射器
class EventEmitter {
    constructor() {
        this.events = {};
    }
    
    on(event, callback) {
        if (!this.events[event]) {
            this.events[event] = [];
        }
        this.events[event].push(callback);
    }
    
    off(event, callback) {
        if (!this.events[event]) return;
        this.events[event] = this.events[event].filter(cb => cb !== callback);
    }
    
    emit(event, ...args) {
        if (!this.events[event]) return;
        this.events[event].forEach(callback => callback(...args));
    }
    
    once(event, callback) {
        const onceCallback = (...args) => {
            callback(...args);
            this.off(event, onceCallback);
        };
        this.on(event, onceCallback);
    }
}

// 动画工具
const Animation = {
    // 平滑滚动到元素
    scrollToElement(element, duration = 500) {
        const targetPosition = element.offsetTop;
        const startPosition = window.pageYOffset;
        const distance = targetPosition - startPosition;
        let startTime = null;
        
        function animation(currentTime) {
            if (startTime === null) startTime = currentTime;
            const timeElapsed = currentTime - startTime;
            const run = ease(timeElapsed, startPosition, distance, duration);
            window.scrollTo(0, run);
            if (timeElapsed < duration) requestAnimationFrame(animation);
        }
        
        function ease(t, b, c, d) {
            t /= d / 2;
            if (t < 1) return c / 2 * t * t + b;
            t--;
            return -c / 2 * (t * (t - 2) - 1) + b;
        }
        
        requestAnimationFrame(animation);
    },
    
    // 淡入动画
    fadeIn(element, duration = 300) {
        element.style.opacity = 0;
        element.style.display = 'block';
        
        let start = null;
        function animate(timestamp) {
            if (!start) start = timestamp;
            const progress = timestamp - start;
            element.style.opacity = Math.min(progress / duration, 1);
            
            if (progress < duration) {
                requestAnimationFrame(animate);
            }
        }
        requestAnimationFrame(animate);
    },
    
    // 淡出动画
    fadeOut(element, duration = 300) {
        let start = null;
        function animate(timestamp) {
            if (!start) start = timestamp;
            const progress = timestamp - start;
            element.style.opacity = Math.max(1 - progress / duration, 0);
            
            if (progress < duration) {
                requestAnimationFrame(animate);
            } else {
                element.style.display = 'none';
            }
        }
        requestAnimationFrame(animate);
    }
};

// 键盘工具
const Keyboard = {
    // 检查是否为可打印字符
    isPrintable(key) {
        return key.length === 1 && key.match(/[\x20-\x7E]/);
    },
    
    // 检查是否为特殊键
    isSpecialKey(key) {
        const specialKeys = [
            'Backspace', 'Delete', 'Tab', 'Enter', 'Escape',
            'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown',
            'Home', 'End', 'PageUp', 'PageDown',
            'Control', 'Alt', 'Shift', 'Meta'
        ];
        return specialKeys.includes(key);
    },
    
    // 获取键盘布局信息
    getKeyInfo(key) {
        const keyMap = {
            ' ': 'Space',
            'Enter': 'Enter',
            'Backspace': 'Backspace',
            'Tab': 'Tab',
            'Escape': 'Escape'
        };
        return keyMap[key] || key;
    }
};

// 性能监控工具
const Performance = {
    marks: {},
    
    mark(name) {
        this.marks[name] = performance.now();
    },
    
    measure(name, startMark) {
        const endTime = performance.now();
        const startTime = this.marks[startMark];
        if (startTime) {
            const duration = endTime - startTime;
            console.log(`${name}: ${duration.toFixed(2)}ms`);
            return duration;
        }
        return 0;
    },
    
    // 监控FPS
    monitorFPS(callback) {
        let lastTime = performance.now();
        let frames = 0;
        
        function tick() {
            const now = performance.now();
            frames++;
            
            if (now - lastTime >= 1000) {
                const fps = Math.round((frames * 1000) / (now - lastTime));
                callback(fps);
                frames = 0;
                lastTime = now;
            }
            
            requestAnimationFrame(tick);
        }
        
        requestAnimationFrame(tick);
    }
};

// 导出全局变量
window.Utils = {
    $, $$,
    formatTime,
    calculateWPM,
    calculateAccuracy,
    debounce,
    throttle,
    randomChoice,
    shuffleArray,
    Storage,
    API,
    EventEmitter,
    Animation,
    Keyboard,
    Performance
};
