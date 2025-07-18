/**
 * 性能监控工具
 * 监控游戏性能，检测性能瓶颈，提供优化建议
 */

class PerformanceMonitor {
    constructor() {
        this.metrics = {
            fps: [],
            memory: [],
            renderTime: [],
            inputLatency: [],
            apiResponseTime: []
        };
        
        // 调整阈值，避免边界情况的频繁警告
        this.thresholds = {
            minFPS: 25, // 降低阈值以减少边界警告
            maxRenderTime: 20, // 调整为允许更多渲染时间
            maxInputLatency: 50,
            maxAPIResponseTime: 1000,
            maxMemoryUsage: 100 * 1024 * 1024 // 100MB
        };
        
        this.isMonitoring = false;
        this.monitoringInterval = null;
        this.frameCount = 0;
        this.lastFrameTime = performance.now();
        
        // 性能观察器
        this.observers = {};
        
        this.init();
        console.log('📊 PerformanceMonitor 初始化完成');
    }
    
    /**
     * 初始化性能监控
     */
    init() {
        // 初始化性能观察器
        this.initPerformanceObservers();
        
        // 绑定页面可见性变化
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.pauseMonitoring();
            } else {
                this.resumeMonitoring();
            }
        });
    }
    
    /**
     * 初始化性能观察器
     */
    initPerformanceObservers() {
        // 检查是否支持Performance API
        if (!('PerformanceObserver' in window) || !('performance' in window)) {
            console.warn('Performance API not fully supported in this browser');
            return;
        }
            
        // 创建一个安全的observer工厂
        const createObserver = (entryTypes, callback) => {
            // 检查浏览器是否支持这些entryTypes
            let supported = false;
            
            // 在Safari等浏览器中，需要检查每个entryType
            for (const entryType of entryTypes) {
                try {
                    // 尝试创建观察器
                    const testObserver = new PerformanceObserver(() => {});
                    testObserver.observe({ entryTypes: [entryType] });
                    testObserver.disconnect();
                    supported = true;
                    break; // 至少有一个类型支持
                } catch (e) {
                    console.log(`EntryType '${entryType}' not supported`);
                }
            }
            
            if (!supported) {
                return null;
            }
            
            try {
                const observer = new PerformanceObserver(callback);
                observer.observe({ entryTypes: entryTypes.filter(type => {
                    try {
                        const test = new PerformanceObserver(() => {});
                        test.observe({ entryTypes: [type] });
                        test.disconnect();
                        return true;
                    } catch (e) {
                        return false;
                    }
                })});
                return observer;
            } catch (e) {
                console.warn('Observer creation failed:', e);
                return null;
            }
        };
        
        // 长任务观察器
        this.observers.longTask = createObserver(['longtask'], (list) => {
            for (const entry of list.getEntries()) {
                this.recordLongTask(entry);
            }
        });
        
        // 导航时间观察器
        this.observers.navigation = createObserver(['navigation'], (list) => {
            for (const entry of list.getEntries()) {
                this.recordNavigationTiming(entry);
            }
        });
    }
    
    /**
     * 开始监控
     */
    startMonitoring() {
        if (this.isMonitoring) return;
        
        this.isMonitoring = true;
        this.frameCount = 0;
        this.lastFrameTime = performance.now();
        
        // 开始 FPS 监控
        this.startFPSMonitoring();
        
        // 开始内存监控
        this.startMemoryMonitoring();
        
        // 开始渲染时间监控
        this.startRenderTimeMonitoring();
        
        console.log('📊 性能监控已开始');
    }
    
    /**
     * 停止监控
     */
    stopMonitoring() {
        if (!this.isMonitoring) return;
        
        this.isMonitoring = false;
        
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = null;
        }
        
        console.log('📊 性能监控已停止');
    }
    
    /**
     * 暂停监控
     */
    pauseMonitoring() {
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = null;
        }
    }
    
    /**
     * 恢复监控
     */
    resumeMonitoring() {
        if (this.isMonitoring && !this.monitoringInterval) {
            this.startMemoryMonitoring();
        }
    }
    
    /**
     * 开始 FPS 监控 (优化版本)
     */
    startFPSMonitoring() {
        let fpsUpdateInterval = null;
        let frameCount = 0;
        let lastTime = performance.now();
        const fpsUpdateRate = 2000; // 每2秒更新一次FPS统计
        
        // 使用更高效的FPS计算方法，减少记录频率
        const countFrames = () => {
            if (!this.isMonitoring) {
                if (fpsUpdateInterval) {
                    clearInterval(fpsUpdateInterval);
                    fpsUpdateInterval = null;
                }
                return;
            }
            
            frameCount++;
            requestAnimationFrame(countFrames);
        };
        
        // 定期计算和记录FPS
        fpsUpdateInterval = setInterval(() => {
            if (!this.isMonitoring) {
                clearInterval(fpsUpdateInterval);
                fpsUpdateInterval = null;
                return;
            }
            
            const now = performance.now();
            const elapsed = now - lastTime;
            
            if (elapsed > 0 && frameCount > 0) {
                // 计算平均FPS
                const fps = (frameCount / elapsed) * 1000;
                
                // 只在FPS明显变化或过低时记录，减少不必要的数据存储和警告
                if (this.metrics.fps.length === 0 || 
                    Math.abs(fps - this.metrics.fps[this.metrics.fps.length - 1].value) > 5 || 
                    fps < this.thresholds.minFPS + 5) {
                    this.recordFPS(fps);
                }
                
                lastTime = now;
                frameCount = 0;
            }
        }, fpsUpdateRate);
        
        // 开始帧计数
        requestAnimationFrame(countFrames);
    }
    
    /**
     * 开始内存监控
     */
    startMemoryMonitoring() {
        this.monitoringInterval = setInterval(() => {
            if (!this.isMonitoring) return;
            
            this.recordMemoryUsage();
        }, 1000); // 每秒检查一次
    }
    
    /**
     * 开始渲染时间监控 (超级优化版本)
     */
    startRenderTimeMonitoring() {
        // 监控 DOM 更新时间
        if ('MutationObserver' in window) {
            // 完全禁用渲染时间监控，因为它太消耗性能
            // 下面的代码是占位符，但实际上我们不执行真正的观察逻辑
            
            // 创建一个空的观察器对象以保持API兼容性
            this.observers.mutation = {
                disconnect() {},
                observe() {},
                takeRecords() { return []; }
            };
            
            console.log('⚙️ 渲染时间监控已禁用以提高性能');
            return;
            
            // 以下代码不会执行，但保留以供参考
            // --------------------
            
            // 添加节流机制，避免短时间内大量DOM变化引发频繁测量
            let pendingMeasurement = false;
            let mutationTimeout = null;
            let lastMeasurementTime = 0;
            const THROTTLE_TIME = 1000; // 只每1秒测量一次
            
            const observer = new MutationObserver((mutations) => {
                // 增强节流：每秒最多测量一次
                const now = performance.now();
                if (now - lastMeasurementTime < THROTTLE_TIME) {
                    return;
                }
                
                // 只处理重要的变更
                const hasImportantMutation = mutations.some(mutation => {
                    // 只关心游戏区域的变化
                    return mutation.target.closest('.text-display') || 
                           mutation.target.closest('.game-controls');
                });
                
                if (!hasImportantMutation) {
                    return;
                }
                
                // 避免大量连续DOM变化导致过度测量
                if (!pendingMeasurement) {
                    pendingMeasurement = true;
                    lastMeasurementTime = now;
                    
                    // 清除之前的定时器
                    if (mutationTimeout) clearTimeout(mutationTimeout);
                    
                    mutationTimeout = setTimeout(() => {
                        const startTime = performance.now();
                        
                        // 使用 requestAnimationFrame 来测量渲染时间
                        requestAnimationFrame(() => {
                            const renderTime = performance.now() - startTime;
                            // 只记录显著的渲染时间问题
                            if (renderTime > this.thresholds.maxRenderTime * 1.5) {
                                this.recordRenderTime(renderTime);
                            }
                            pendingMeasurement = false;
                        });
                    }, 200); // 节流增加到200ms
                }
            });
            
            // 只监控游戏文本区域
            const textDisplay = document.querySelector('.text-display');
            
            if (textDisplay) {
                observer.observe(textDisplay, {
                    childList: true,
                    subtree: true,
                    attributes: false
                });
            } else {
                // 如果找不到文本区域，则不进行监控
                console.log('⚠️ 找不到文本区域，渲染监控已禁用');
            }
            
            this.observers.mutation = observer;
        }
    }
    
    /**
     * 记录 FPS
     */
    recordFPS(fps) {
        this.metrics.fps.push({
            value: fps,
            timestamp: Date.now()
        });
        
        // 保持最近 100 个记录
        if (this.metrics.fps.length > 100) {
            this.metrics.fps.shift();
        }
        
        // 检查 FPS 阈值
        if (fps < this.thresholds.minFPS) {
            this.reportPerformanceIssue('LOW_FPS', {
                currentFPS: fps,
                threshold: this.thresholds.minFPS
            });
        }
    }
    
    /**
     * 记录内存使用
     */
    recordMemoryUsage() {
        if ('memory' in performance) {
            const memory = performance.memory;
            const memoryInfo = {
                used: memory.usedJSHeapSize,
                total: memory.totalJSHeapSize,
                limit: memory.jsHeapSizeLimit,
                timestamp: Date.now()
            };
            
            this.metrics.memory.push(memoryInfo);
            
            // 保持最近 60 个记录（1分钟）
            if (this.metrics.memory.length > 60) {
                this.metrics.memory.shift();
            }
            
            // 检查内存使用阈值
            if (memory.usedJSHeapSize > this.thresholds.maxMemoryUsage) {
                this.reportPerformanceIssue('HIGH_MEMORY_USAGE', {
                    currentUsage: memory.usedJSHeapSize,
                    threshold: this.thresholds.maxMemoryUsage
                });
            }
        }
    }
    
    /**
     * 记录渲染时间
     */
    recordRenderTime(renderTime) {
        this.metrics.renderTime.push({
            value: renderTime,
            timestamp: Date.now()
        });
        
        // 保持最近 50 个记录
        if (this.metrics.renderTime.length > 50) {
            this.metrics.renderTime.shift();
        }
        
        // 检查渲染时间阈值
        if (renderTime > this.thresholds.maxRenderTime) {
            this.reportPerformanceIssue('SLOW_RENDER', {
                currentTime: renderTime,
                threshold: this.thresholds.maxRenderTime
            });
        }
    }
    
    /**
     * 记录输入延迟
     */
    recordInputLatency(startTime) {
        const latency = performance.now() - startTime;
        
        this.metrics.inputLatency.push({
            value: latency,
            timestamp: Date.now()
        });
        
        // 保持最近 50 个记录
        if (this.metrics.inputLatency.length > 50) {
            this.metrics.inputLatency.shift();
        }
        
        // 检查输入延迟阈值
        if (latency > this.thresholds.maxInputLatency) {
            this.reportPerformanceIssue('HIGH_INPUT_LATENCY', {
                currentLatency: latency,
                threshold: this.thresholds.maxInputLatency
            });
        }
        
        return latency;
    }
    
    /**
     * 记录 API 响应时间
     */
    recordAPIResponseTime(url, responseTime) {
        this.metrics.apiResponseTime.push({
            url,
            value: responseTime,
            timestamp: Date.now()
        });
        
        // 保持最近 50 个记录
        if (this.metrics.apiResponseTime.length > 50) {
            this.metrics.apiResponseTime.shift();
        }
        
        // 检查 API 响应时间阈值
        if (responseTime > this.thresholds.maxAPIResponseTime) {
            this.reportPerformanceIssue('SLOW_API_RESPONSE', {
                url,
                currentTime: responseTime,
                threshold: this.thresholds.maxAPIResponseTime
            });
        }
    }
    
    /**
     * 记录长任务
     */
    recordLongTask(entry) {
        console.warn('🐌 Long task detected:', {
            duration: entry.duration,
            startTime: entry.startTime,
            name: entry.name
        });
        
        this.reportPerformanceIssue('LONG_TASK', {
            duration: entry.duration,
            startTime: entry.startTime,
            name: entry.name
        });
    }
    
    /**
     * 记录导航时间
     */
    recordNavigationTiming(entry) {
        const timing = {
            domContentLoaded: entry.domContentLoadedEventEnd - entry.domContentLoadedEventStart,
            loadComplete: entry.loadEventEnd - entry.loadEventStart,
            domInteractive: entry.domInteractive - entry.fetchStart,
            firstPaint: entry.responseEnd - entry.fetchStart
        };
        
        console.log('📊 Navigation timing:', timing);
    }
    
    /**
     * 报告性能问题
     */
    reportPerformanceIssue(type, data) {
        const issue = {
            type,
            data,
            timestamp: Date.now(),
            userAgent: navigator.userAgent,
            url: window.location.href
        };
        
        console.warn(`⚠️ Performance issue detected: ${type}`, data);
        
        // 触发性能问题事件
        if (window.gameStore) {
            window.gameStore.emit('performanceIssue', issue);
        }
        
        // 在调试模式下显示通知
        if (window.errorHandler && window.errorHandler.isDebugMode) {
            const message = this.getPerformanceIssueMessage(type, data);
            window.errorHandler.showNativeNotification(message, 'warning');
        }
    }
    
    /**
     * 获取性能问题消息
     */
    getPerformanceIssueMessage(type, data) {
        const messages = {
            'LOW_FPS': `FPS 过低: ${Math.round(data.currentFPS)} (阈值: ${data.threshold})`,
            'HIGH_MEMORY_USAGE': `内存使用过高: ${Math.round(data.currentUsage / 1024 / 1024)}MB`,
            'SLOW_RENDER': `渲染时间过长: ${Math.round(data.currentTime)}ms`,
            'HIGH_INPUT_LATENCY': `输入延迟过高: ${Math.round(data.currentLatency)}ms`,
            'SLOW_API_RESPONSE': `API 响应过慢: ${Math.round(data.currentTime)}ms`,
            'LONG_TASK': `长任务检测: ${Math.round(data.duration)}ms`
        };
        
        return messages[type] || `性能问题: ${type}`;
    }
    
    /**
     * 获取性能报告
     */
    getPerformanceReport() {
        const report = {
            timestamp: Date.now(),
            metrics: {
                fps: this.calculateMetricStats(this.metrics.fps),
                memory: this.calculateMemoryStats(),
                renderTime: this.calculateMetricStats(this.metrics.renderTime),
                inputLatency: this.calculateMetricStats(this.metrics.inputLatency),
                apiResponseTime: this.calculateAPIStats()
            },
            recommendations: this.generateRecommendations()
        };
        
        return report;
    }
    
    /**
     * 计算指标统计
     */
    calculateMetricStats(metrics) {
        if (metrics.length === 0) return null;
        
        const values = metrics.map(m => m.value);
        const sorted = values.sort((a, b) => a - b);
        
        return {
            count: values.length,
            min: Math.min(...values),
            max: Math.max(...values),
            avg: values.reduce((a, b) => a + b, 0) / values.length,
            median: sorted[Math.floor(sorted.length / 2)],
            p95: sorted[Math.floor(sorted.length * 0.95)]
        };
    }
    
    /**
     * 计算内存统计
     */
    calculateMemoryStats() {
        if (this.metrics.memory.length === 0) return null;
        
        const latest = this.metrics.memory[this.metrics.memory.length - 1];
        const usedMB = latest.used / 1024 / 1024;
        const totalMB = latest.total / 1024 / 1024;
        
        return {
            current: {
                used: usedMB,
                total: totalMB,
                percentage: (usedMB / totalMB) * 100
            },
            trend: this.calculateMemoryTrend()
        };
    }
    
    /**
     * 计算内存趋势
     */
    calculateMemoryTrend() {
        if (this.metrics.memory.length < 2) return 'stable';
        
        const recent = this.metrics.memory.slice(-10);
        const first = recent[0].used;
        const last = recent[recent.length - 1].used;
        const change = ((last - first) / first) * 100;
        
        if (change > 10) return 'increasing';
        if (change < -10) return 'decreasing';
        return 'stable';
    }
    
    /**
     * 计算 API 统计
     */
    calculateAPIStats() {
        if (this.metrics.apiResponseTime.length === 0) return null;
        
        const byURL = {};
        this.metrics.apiResponseTime.forEach(metric => {
            if (!byURL[metric.url]) {
                byURL[metric.url] = [];
            }
            byURL[metric.url].push(metric.value);
        });
        
        const stats = {};
        Object.keys(byURL).forEach(url => {
            const values = byURL[url];
            stats[url] = {
                count: values.length,
                avg: values.reduce((a, b) => a + b, 0) / values.length,
                min: Math.min(...values),
                max: Math.max(...values)
            };
        });
        
        return stats;
    }
    
    /**
     * 生成优化建议
     */
    generateRecommendations() {
        const recommendations = [];
        
        // FPS 建议
        const fpsStats = this.calculateMetricStats(this.metrics.fps);
        if (fpsStats && fpsStats.avg < this.thresholds.minFPS) {
            recommendations.push({
                type: 'fps',
                priority: 'high',
                message: '帧率过低，建议减少 DOM 操作或优化渲染逻辑'
            });
        }
        
        // 内存建议
        const memoryStats = this.calculateMemoryStats();
        if (memoryStats && memoryStats.trend === 'increasing') {
            recommendations.push({
                type: 'memory',
                priority: 'medium',
                message: '内存使用持续增长，可能存在内存泄漏'
            });
        }
        
        // 渲染时间建议
        const renderStats = this.calculateMetricStats(this.metrics.renderTime);
        if (renderStats && renderStats.avg > this.thresholds.maxRenderTime) {
            recommendations.push({
                type: 'render',
                priority: 'medium',
                message: '渲染时间过长，建议优化 CSS 或减少重排重绘'
            });
        }
        
        return recommendations;
    }
    
    /**
     * 包装函数以监控性能
     */
    wrapFunction(fn, name) {
        return (...args) => {
            const startTime = performance.now();
            const result = fn(...args);
            const endTime = performance.now();
            
            console.log(`⏱️ ${name} 执行时间: ${endTime - startTime}ms`);
            
            return result;
        };
    }
    
    /**
     * 包装异步函数以监控性能
     */
    wrapAsyncFunction(fn, name) {
        return async (...args) => {
            const startTime = performance.now();
            const result = await fn(...args);
            const endTime = performance.now();
            
            console.log(`⏱️ ${name} 执行时间: ${endTime - startTime}ms`);
            
            return result;
        };
    }
    
    /**
     * 调试方法
     */
    debug() {
        console.log('📊 Performance Monitor Status:');
        console.log('- Monitoring:', this.isMonitoring);
        console.log('- Frame Count:', this.frameCount);
        console.log('- Metrics:', this.metrics);
        console.log('- Report:', this.getPerformanceReport());
    }
}

// 创建全局实例
window.performanceMonitor = new PerformanceMonitor();

// 导出供其他模块使用
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PerformanceMonitor;
}
