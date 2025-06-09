#!/usr/bin/env python3
"""
键盘打字竞速游戏 - FastAPI后端
"""

from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import json
import os
import random
from datetime import datetime

# 创建FastAPI应用
app = FastAPI(
    title="键盘打字竞速游戏",
    description="一款现代化的Web键盘打字练习游戏",
    version="1.2.0"
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
    """植物防御模式统计"""
    score: int
    wave: int
    total_waves: int
    zombies_killed: int
    plant_health: int
    difficulty: str
    victory: bool
    play_time: float
    timestamp: Optional[str] = None

class GameConfig(BaseModel):
    mode: str
    time_limit: Optional[int] = None
    difficulty: Optional[str] = "normal"

class DefenseWaveConfig(BaseModel):
    """植物防御波次配置"""
    difficulty: str
    wave: int

# API路由
@app.get("/api/texts")
async def get_practice_texts():
    """获取练习文本"""
    try:
        with open("data/texts.json", "r", encoding="utf-8") as f:
            texts = json.load(f)
        return {"status": "success", "data": texts}
    except FileNotFoundError:
        # 如果文件不存在，返回默认文本
        default_texts = [
            "The quick brown fox jumps over the lazy dog.",
            "Python is a powerful programming language.",
            "FastAPI makes building APIs fast and easy.",
            "Practice makes perfect in typing speed."
        ]
        return {"status": "success", "data": default_texts}

@app.get("/api/words")
async def get_practice_words():
    """获取练习单词"""
    try:
        with open("data/words.json", "r", encoding="utf-8") as f:
            words = json.load(f)
        return {"status": "success", "data": words}
    except FileNotFoundError:
        default_words = [
            "hello", "world", "python", "javascript", "typing", "speed",
            "keyboard", "practice", "game", "fast", "accurate", "skill"
        ]
        return {"status": "success", "data": default_words}

@app.get("/api/defense/words")
async def get_defense_words():
    """获取植物防御模式单词"""
    try:
        with open("data/defense_words.json", "r", encoding="utf-8") as f:
            words = json.load(f)
        return {"status": "success", "data": words}
    except FileNotFoundError:
        # 默认单词数据
        default_words = {
            "basic": ["cat", "dog", "run", "sun", "car", "hat", "bat", "rat"],
            "medium": ["house", "water", "quick", "brown", "jumps", "table"],
            "strong": ["computer", "keyboard", "beautiful", "wonderful"],
            "boss": ["extraordinary", "incomprehensible", "unbelievable"]
        }
        return {"status": "success", "data": default_words}

@app.post("/api/defense/wave")
async def generate_defense_wave(config: DefenseWaveConfig):
    """生成植物防御波次"""
    try:
        # 读取单词数据
        with open("data/defense_words.json", "r", encoding="utf-8") as f:
            all_words = json.load(f)
        
        # 难度配置
        difficulty_configs = {
            "easy": {
                "waves": 4,
                "zombies_per_wave": [3, 4, 5, 6],
                "zombie_types": {
                    "basic": 0.7,
                    "medium": 0.25,
                    "strong": 0.05,
                    "boss": 0
                }
            },
            "medium": {
                "waves": 7,
                "zombies_per_wave": [4, 5, 6, 7, 8, 9, 10],
                "zombie_types": {
                    "basic": 0.5,
                    "medium": 0.35,
                    "strong": 0.13,
                    "boss": 0.02
                }
            },
            "hard": {
                "waves": 10,
                "zombies_per_wave": [5, 6, 8, 10, 12, 14, 16, 18, 20, 25],
                "zombie_types": {
                    "basic": 0.3,
                    "medium": 0.4,
                    "strong": 0.25,
                    "boss": 0.05
                }
            }
        }
        
        difficulty_config = difficulty_configs.get(config.difficulty, difficulty_configs["easy"])
        wave_index = config.wave - 1
        
        if wave_index >= len(difficulty_config["zombies_per_wave"]):
            wave_index = len(difficulty_config["zombies_per_wave"]) - 1
        
        zombie_count = difficulty_config["zombies_per_wave"][wave_index]
        type_distribution = difficulty_config["zombie_types"]
        
        # 生成僵尸列表
        zombies = []
        for i in range(zombie_count):
            # 根据概率选择僵尸类型
            rand = random.random()
            cumulative = 0
            zombie_type = "basic"
            
            for ztype, probability in type_distribution.items():
                cumulative += probability
                if rand <= cumulative:
                    zombie_type = ztype
                    break
            
            # 选择单词
            type_words = all_words.get(zombie_type, all_words["basic"])
            word = random.choice(type_words)
            
            zombies.append({
                "type": zombie_type,
                "word": word,
                "id": i + 1
            })
        
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
        "easy": {
            "waves": 4,
            "name": "简单",
            "description": "4波基础僵尸，适合新手",
            "zombie_distribution": {
                "basic": 70,
                "medium": 25,
                "strong": 5,
                "boss": 0
            }
        },
        "medium": {
            "waves": 7,
            "name": "中等",
            "description": "7波混合僵尸，平衡挑战",
            "zombie_distribution": {
                "basic": 50,
                "medium": 35,
                "strong": 13,
                "boss": 2
            }
        },
        "hard": {
            "waves": 10,
            "name": "困难",
            "description": "10波强力僵尸，极限挑战",
            "zombie_distribution": {
                "basic": 30,
                "medium": 40,
                "strong": 25,
                "boss": 5
            }
        }
    }
    
    config = configs.get(difficulty)
    if not config:
        raise HTTPException(status_code=404, detail="难度配置不存在")
    
    return {"status": "success", "data": config}

@app.post("/api/stats")
async def save_game_stats(stats: GameStats):
    """保存游戏统计"""
    try:
        # 添加时间戳
        stats.timestamp = datetime.now().isoformat()
        
        # 读取现有统计数据
        stats_file = "data/game_stats.json"
        if os.path.exists(stats_file):
            with open(stats_file, "r", encoding="utf-8") as f:
                all_stats = json.load(f)
        else:
            all_stats = []
        
        # 添加新统计
        all_stats.append(stats.dict())
        
        # 保存统计数据
        os.makedirs("data", exist_ok=True)
        with open(stats_file, "w", encoding="utf-8") as f:
            json.dump(all_stats, f, ensure_ascii=False, indent=2)
        
        return {"status": "success", "message": "统计数据已保存"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"保存统计数据失败: {str(e)}")

@app.post("/api/defense/stats")
async def save_defense_stats(stats: DefenseGameStats):
    """保存植物防御模式统计"""
    try:
        # 添加时间戳
        stats.timestamp = datetime.now().isoformat()
        
        # 读取现有统计数据
        stats_file = "data/defense_stats.json"
        if os.path.exists(stats_file):
            with open(stats_file, "r", encoding="utf-8") as f:
                all_stats = json.load(f)
        else:
            all_stats = []
        
        # 添加新统计
        all_stats.append(stats.dict())
        
        # 保存统计数据
        os.makedirs("data", exist_ok=True)
        with open(stats_file, "w", encoding="utf-8") as f:
            json.dump(all_stats, f, ensure_ascii=False, indent=2)
        
        return {"status": "success", "message": "植物防御统计数据已保存"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"保存植物防御统计失败: {str(e)}")

@app.get("/api/stats")
async def get_game_stats():
    """获取游戏统计"""
    try:
        stats_file = "data/game_stats.json"
        if os.path.exists(stats_file):
            with open(stats_file, "r", encoding="utf-8") as f:
                stats = json.load(f)
            return {"status": "success", "data": stats}
        else:
            return {"status": "success", "data": []}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取统计数据失败: {str(e)}")

@app.get("/api/defense/stats")
async def get_defense_stats():
    """获取植物防御统计"""
    try:
        stats_file = "data/defense_stats.json"
        if os.path.exists(stats_file):
            with open(stats_file, "r", encoding="utf-8") as f:
                stats = json.load(f)
            return {"status": "success", "data": stats}
        else:
            return {"status": "success", "data": []}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取植物防御统计失败: {str(e)}")

@app.get("/api/leaderboard")
async def get_leaderboard():
    """获取排行榜"""
    try:
        stats_file = "data/game_stats.json"
        if os.path.exists(stats_file):
            with open(stats_file, "r", encoding="utf-8") as f:
                all_stats = json.load(f)
            
            # 按WPM排序，取前10名
            leaderboard = sorted(all_stats, key=lambda x: x['wpm'], reverse=True)[:10]
            return {"status": "success", "data": leaderboard}
        else:
            return {"status": "success", "data": []}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取排行榜失败: {str(e)}")

@app.get("/api/defense/leaderboard")
async def get_defense_leaderboard():
    """获取植物防御排行榜"""
    try:
        stats_file = "data/defense_stats.json"
        if os.path.exists(stats_file):
            with open(stats_file, "r", encoding="utf-8") as f:
                all_stats = json.load(f)
            
            # 按分数排序，取前10名
            leaderboard = sorted(all_stats, key=lambda x: x['score'], reverse=True)[:10]
            return {"status": "success", "data": leaderboard}
        else:
            return {"status": "success", "data": []}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取植物防御排行榜失败: {str(e)}")

@app.get("/api/analytics")
async def get_game_analytics():
    """获取游戏分析数据"""
    try:
        # 读取传统模式统计
        traditional_stats = []
        if os.path.exists("data/game_stats.json"):
            with open("data/game_stats.json", "r", encoding="utf-8") as f:
                traditional_stats = json.load(f)
        
        # 读取植物防御统计
        defense_stats = []
        if os.path.exists("data/defense_stats.json"):
            with open("data/defense_stats.json", "r", encoding="utf-8") as f:
                defense_stats = json.load(f)
        
        # 分析数据
        analytics = {
            "total_games": len(traditional_stats) + len(defense_stats),
            "traditional_games": len(traditional_stats),
            "defense_games": len(defense_stats),
            "mode_distribution": {},
            "difficulty_distribution": {},
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
            difficulty_counts = {}
            total_score = 0
            victory_count = 0
            
            for stat in defense_stats:
                difficulty = stat.get('difficulty', 'unknown')
                difficulty_counts[difficulty] = difficulty_counts.get(difficulty, 0) + 1
                total_score += stat.get('score', 0)
                if stat.get('victory', False):
                    victory_count += 1
            
            analytics["difficulty_distribution"] = difficulty_counts
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
