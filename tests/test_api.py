"""
后端 API 测试
测试重构后的 main.py 是否正常工作
"""

import sys
import os
import json
import tempfile
import shutil
from pathlib import Path

# 添加项目根目录到 Python 路径
sys.path.insert(0, str(Path(__file__).parent.parent))

from fastapi.testclient import TestClient
from main import app

class TestAPI:
    def __init__(self):
        self.client = TestClient(app)
        self.temp_dir = None
        self.original_cwd = None
    
    def setup(self):
        """设置测试环境"""
        # 创建临时目录用于测试
        self.temp_dir = tempfile.mkdtemp()
        self.original_cwd = os.getcwd()
        os.chdir(self.temp_dir)
        
        # 创建测试数据目录
        os.makedirs("data", exist_ok=True)
        
        # 创建测试数据文件
        test_texts = ["Hello world", "Python is great", "FastAPI rocks"]
        with open("data/texts.json", "w", encoding="utf-8") as f:
            json.dump(test_texts, f)
        
        test_words = ["hello", "world", "python", "test"]
        with open("data/words.json", "w", encoding="utf-8") as f:
            json.dump(test_words, f)
        
        test_defense_words = {
            "basic": ["cat", "dog"],
            "medium": ["house", "water"],
            "strong": ["computer"],
            "boss": ["extraordinary"]
        }
        with open("data/defense_words.json", "w", encoding="utf-8") as f:
            json.dump(test_defense_words, f)
        
        print("✅ 测试环境设置完成")
    
    def teardown(self):
        """清理测试环境"""
        if self.original_cwd:
            os.chdir(self.original_cwd)
        if self.temp_dir and os.path.exists(self.temp_dir):
            shutil.rmtree(self.temp_dir)
        print("✅ 测试环境清理完成")
    
    def test_get_texts(self):
        """测试获取练习文本"""
        response = self.client.get("/api/texts")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"
        assert isinstance(data["data"], list)
        assert len(data["data"]) > 0
        print("✅ 获取练习文本测试通过")
    
    def test_get_words(self):
        """测试获取练习单词"""
        response = self.client.get("/api/words")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"
        assert isinstance(data["data"], list)
        assert len(data["data"]) > 0
        print("✅ 获取练习单词测试通过")
    
    def test_get_defense_words(self):
        """测试获取植物防御单词"""
        response = self.client.get("/api/defense/words")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"
        assert isinstance(data["data"], dict)
        assert "basic" in data["data"]
        print("✅ 获取植物防御单词测试通过")
    
    def test_defense_config(self):
        """测试植物防御配置"""
        for difficulty in ["easy", "medium", "hard"]:
            response = self.client.get(f"/api/defense/config/{difficulty}")
            assert response.status_code == 200
            data = response.json()
            assert data["status"] == "success"
            assert "waves" in data["data"]
            assert "name" in data["data"]
        print("✅ 植物防御配置测试通过")
    
    def test_defense_wave_generation(self):
        """测试植物防御波次生成"""
        wave_config = {
            "difficulty": "easy",
            "wave": 1
        }
        response = self.client.post("/api/defense/wave", json=wave_config)
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"
        assert "zombies" in data["data"]
        assert len(data["data"]["zombies"]) > 0
        print("✅ 植物防御波次生成测试通过")
    
    def test_save_game_stats(self):
        """测试保存游戏统计"""
        stats = {
            "wpm": 45.5,
            "accuracy": 95.2,
            "time_taken": 60,
            "errors": 3,
            "mode": "classic"
        }
        response = self.client.post("/api/stats", json=stats)
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"
        print("✅ 保存游戏统计测试通过")
    
    def test_save_defense_stats(self):
        """测试保存植物防御统计"""
        stats = {
            "score": 1500,
            "wave": 3,
            "total_waves": 4,
            "zombies_killed": 15,
            "plant_health": 80,
            "difficulty": "easy",
            "victory": True,
            "play_time": 120.5
        }
        response = self.client.post("/api/defense/stats", json=stats)
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"
        print("✅ 保存植物防御统计测试通过")
    
    def test_get_stats(self):
        """测试获取统计数据"""
        response = self.client.get("/api/stats")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"
        assert isinstance(data["data"], list)
        print("✅ 获取统计数据测试通过")
    
    def test_get_leaderboard(self):
        """测试获取排行榜"""
        response = self.client.get("/api/leaderboard")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"
        assert isinstance(data["data"], list)
        print("✅ 获取排行榜测试通过")
    
    def test_get_analytics(self):
        """测试获取分析数据"""
        response = self.client.get("/api/analytics")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"
        assert "total_games" in data["data"]
        print("✅ 获取分析数据测试通过")
    
    def run_all_tests(self):
        """运行所有测试"""
        print("🧪 开始运行后端 API 测试...")
        
        try:
            self.setup()
            
            # 运行所有测试
            self.test_get_texts()
            self.test_get_words()
            self.test_get_defense_words()
            self.test_defense_config()
            self.test_defense_wave_generation()
            self.test_save_game_stats()
            self.test_save_defense_stats()
            self.test_get_stats()
            self.test_get_leaderboard()
            self.test_get_analytics()
            
            print("🎉 所有后端 API 测试通过！")
            return True
            
        except Exception as e:
            print(f"❌ 测试失败: {e}")
            return False
        
        finally:
            self.teardown()

if __name__ == "__main__":
    tester = TestAPI()
    success = tester.run_all_tests()
    exit(0 if success else 1)
