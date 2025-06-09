// API客户端 - 与Python后端通信
class APIClient {
    constructor() {
        this.baseURL = '';  // 相对路径，因为前后端在同一域名
    }
    
    // 通用请求方法
    async request(endpoint, options = {}) {
        try {
            const url = `${this.baseURL}/api${endpoint}`;
            const response = await fetch(url, {
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                },
                ...options
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            return data;
        } catch (error) {
            console.error(`API请求失败 [${endpoint}]:`, error);
            throw error;
        }
    }
    
    // 获取练习文本
    async getTexts() {
        return await this.request('/texts');
    }
    
    // 获取练习单词
    async getWords() {
        return await this.request('/words');
    }
    
    // 获取植物防御单词
    async getDefenseWords() {
        return await this.request('/defense/words');
    }
    
    // 生成植物防御波次
    async generateDefenseWave(difficulty, wave) {
        return await this.request('/defense/wave', {
            method: 'POST',
            body: JSON.stringify({
                difficulty: difficulty,
                wave: wave
            })
        });
    }
    
    // 获取植物防御难度配置
    async getDefenseConfig(difficulty) {
        return await this.request(`/defense/config/${difficulty}`);
    }
    
    // 保存游戏统计
    async saveGameStats(stats) {
        return await this.request('/stats', {
            method: 'POST',
            body: JSON.stringify(stats)
        });
    }
    
    // 保存植物防御统计
    async saveDefenseStats(stats) {
        return await this.request('/defense/stats', {
            method: 'POST',
            body: JSON.stringify(stats)
        });
    }
    
    // 获取游戏统计
    async getGameStats() {
        return await this.request('/stats');
    }
    
    // 获取植物防御统计
    async getDefenseStats() {
        return await this.request('/defense/stats');
    }
    
    // 获取排行榜
    async getLeaderboard() {
        return await this.request('/leaderboard');
    }
    
    // 获取植物防御排行榜
    async getDefenseLeaderboard() {
        return await this.request('/defense/leaderboard');
    }
    
    // 获取游戏分析数据
    async getAnalytics() {
        return await this.request('/analytics');
    }
}

// 创建全局API客户端实例
window.apiClient = new APIClient();

console.log('✅ API客户端已初始化');
