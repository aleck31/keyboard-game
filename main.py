#!/usr/bin/env python3
"""
键盘打字竞速游戏 - FastAPI后端 (重构版)
"""

from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import Optional
import json
import os
import random
from datetime import datetime

# 创建 FastAPI 应用
app = FastAPI(
    title="键盘打字竞速游戏",
    description="一款现代化的Web键盘打字练习游戏",
    version="2.1.0"
)

# 数据模型
class GameStats(BaseModel):
    wpm: float
    accuracy: float
    time_taken: int
    errors: int
    mode: str
    timestamp: Optional[str] = None

class DefenseGameStats(BaseModel):
    score: int
    wave: int
    total_waves: int
    zombies_killed: int
    plant_health: int
    difficulty: str
    victory: bool
    play_time: float
    timestamp: Optional[str] = None

class DefenseWaveConfig(BaseModel):
    """植物防御波次配置"""
    difficulty: str
    wave: int

# 工具函数
def load_json_file(filename: str, default_data):
    try:
        with open(filename, "r", encoding="utf-8") as f:
            return json.load(f)
    except FileNotFoundError:
        return default_data

def save_stats(filename: str, stats):
    try:
        stats.timestamp = datetime.now().isoformat()
        
        if os.path.exists(filename):
            with open(filename, "r", encoding="utf-8") as f:
                all_stats = json.load(f)
        else:
            all_stats = []
        
        all_stats.append(stats.dict())
        
        os.makedirs("data", exist_ok=True)
        with open(filename, "w", encoding="utf-8") as f:
            json.dump(all_stats, f, ensure_ascii=False, indent=2)
        
        return True
    except Exception:
        return False

# 注册路由
@app.get("/api/texts")
async def get_practice_texts():
    """获取练习文本"""
    default_texts = [
        "The quick brown fox jumps over the lazy dog.",
        "Python is a powerful programming language.",
        "FastAPI makes building APIs fast and easy.",
        "Practice makes perfect in typing speed."
    ]
    texts = load_json_file("data/texts.json", default_texts)
    return {"status": "success", "data": texts}

@app.get("/api/words")
async def get_practice_words():
    """获取练习单词"""
    default_words = [
        "hello", "world", "python", "javascript", "typing", "speed",
        "keyboard", "practice", "game", "fast", "accurate", "skill"
    ]
    words = load_json_file("data/words.json", default_words)
    return {"status": "success", "data": words}

@app.get("/api/defense/words")
async def get_defense_words():
    """获取植物防御模式单词"""
    default_words = {
        "basic": ["cat", "dog", "run", "sun", "car", "hat", "bat", "rat"],
        "medium": ["house", "water", "quick", "brown", "jumps", "table"],
        "strong": ["computer", "keyboard", "beautiful", "wonderful"],
        "boss": ["extraordinary", "incomprehensible", "unbelievable"]
    }
    words = load_json_file("data/defense_words.json", default_words)
    return {"status": "success", "data": words}

@app.post("/api/defense/wave")
async def generate_defense_wave(config: DefenseWaveConfig):
    """生成植物防御波次"""
    try:
        all_words = load_json_file("data/defense_words.json", {})
        
        configs = {
            "easy": {"waves": 4, "zombies": [3, 4, 5, 6], "types": {"basic": 0.7, "medium": 0.3}},
            "medium": {"waves": 7, "zombies": [4, 5, 6, 7, 8, 9, 10], "types": {"basic": 0.5, "medium": 0.35, "strong": 0.15}},
            "hard": {"waves": 10, "zombies": [5, 6, 8, 10, 12, 14, 16, 18, 20, 25], "types": {"basic": 0.3, "medium": 0.4, "strong": 0.25, "boss": 0.05}}
        }
        
        difficulty_config = configs.get(config.difficulty, configs["easy"])
        wave_index = min(config.wave - 1, len(difficulty_config["zombies"]) - 1)
        zombie_count = difficulty_config["zombies"][wave_index]
        
        zombies = []
        for i in range(zombie_count):
            # 根据概率选择僵尸类型
            rand = random.random()
            cumulative = 0
            zombie_type = "basic"
            
            for ztype, probability in difficulty_config["types"].items():
                cumulative += probability
                if rand <= cumulative:
                    zombie_type = ztype
                    break
            
            type_words = all_words.get(zombie_type, all_words.get("basic", ["test"]))
            word = random.choice(type_words) if type_words else "test"
            
            zombies.append({"type": zombie_type, "word": word, "id": i + 1})
        
        return {
            "status": "success",
            "data": {
                "wave": config.wave,
                "difficulty": config.difficulty,
                "zombie_count": zombie_count,
                "zombies": zombies
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"生成波次失败: {str(e)}")

@app.get("/api/defense/config/{difficulty}")
async def get_defense_config(difficulty: str):
    """获取植物防御难度配置"""
    configs = {
        "easy": {"waves": 4, "name": "简单", "description": "4波基础僵尸，适合新手"},
        "medium": {"waves": 7, "name": "中等", "description": "7波混合僵尸，平衡挑战"},
        "hard": {"waves": 10, "name": "困难", "description": "10波强力僵尸，极限挑战"}
    }
    
    config = configs.get(difficulty)
    if not config:
        raise HTTPException(status_code=404, detail="难度配置不存在")
    
    return {"status": "success", "data": config}

@app.post("/api/stats")
async def save_game_stats(stats: GameStats):
    """保存游戏统计"""
    success = save_stats("data/game_stats.json", stats)
    if success:
        return {"status": "success", "message": "统计数据已保存"}
    else:
        raise HTTPException(status_code=500, detail="保存统计数据失败")

@app.post("/api/defense/stats")
async def save_defense_stats(stats: DefenseGameStats):
    """保存植物防御模式统计"""
    success = save_stats("data/defense_stats.json", stats)
    if success:
        return {"status": "success", "message": "植物防御统计数据已保存"}
    else:
        raise HTTPException(status_code=500, detail="保存植物防御统计失败")

@app.get("/api/stats")
async def get_game_stats():
    """获取游戏统计"""
    try:
        stats = load_json_file("data/game_stats.json", [])
        return {"status": "success", "data": stats}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取统计数据失败: {str(e)}")

@app.get("/api/defense/stats")
async def get_defense_stats():
    try:
        stats = load_json_file("data/defense_stats.json", [])
        return {"status": "success", "data": stats}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取植物防御统计失败: {str(e)}")

@app.get("/api/leaderboard")
async def get_leaderboard():
    """获取排行榜"""
    try:
        all_stats = load_json_file("data/game_stats.json", [])
        leaderboard = sorted(all_stats, key=lambda x: x['wpm'], reverse=True)[:10]
        return {"status": "success", "data": leaderboard}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取排行榜失败: {str(e)}")

@app.get("/api/defense/leaderboard")
async def get_defense_leaderboard():
    """获取植物防御排行榜"""
    try:
        all_stats = load_json_file("data/defense_stats.json", [])
        leaderboard = sorted(all_stats, key=lambda x: x['score'], reverse=True)[:10]
        return {"status": "success", "data": leaderboard}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取植物防御排行榜失败: {str(e)}")

@app.get("/api/analytics")
async def get_game_analytics():
    """获取游戏分析数据"""
    try:
        traditional_stats = load_json_file("data/game_stats.json", [])
        defense_stats = load_json_file("data/defense_stats.json", [])
        
        analytics = {
            "total_games": len(traditional_stats) + len(defense_stats),
            "traditional_games": len(traditional_stats),
            "defense_games": len(defense_stats),
            "mode_distribution": {},
            "average_performance": {}
        }
        
        # 传统模式分析
        if traditional_stats:
            mode_counts = {}
            total_wpm = 0
            total_accuracy = 0
            
            for stat in traditional_stats:
                mode = stat.get('mode', 'unknown')
                mode_counts[mode] = mode_counts.get(mode, 0) + 1
                total_wpm += stat.get('wpm', 0)
                total_accuracy += stat.get('accuracy', 0)
            
            analytics["mode_distribution"] = mode_counts
            analytics["average_performance"]["traditional"] = {
                "avg_wpm": total_wpm / len(traditional_stats),
                "avg_accuracy": total_accuracy / len(traditional_stats)
            }
        
        # 植物防御模式分析
        if defense_stats:
            total_score = 0
            victory_count = 0
            
            for stat in defense_stats:
                total_score += stat.get('score', 0)
                if stat.get('victory', False):
                    victory_count += 1
            
            analytics["average_performance"]["defense"] = {
                "avg_score": total_score / len(defense_stats),
                "victory_rate": (victory_count / len(defense_stats)) * 100
            }
        
        return {"status": "success", "data": analytics}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取分析数据失败: {str(e)}")

# 挂载静态文件
app.mount("/", StaticFiles(directory=".", html=True), name="static")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
