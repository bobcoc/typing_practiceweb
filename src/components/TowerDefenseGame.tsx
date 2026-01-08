// src/components/TowerDefenseGame.tsx
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Card, Space, Typography, Button, message } from 'antd';
import { API_BASE_URL } from '../config';

const { Text } = Typography;

/**
 * 塔防游戏组件
 * 已将原版 JS 逻辑移植并适配 React
 */
const TowerDefenseGame: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<any>(null);
  const [stats, setStats] = useState({ money: 0, score: 0, life: 0, wave: 0 });
  const [isGameOver, setIsGameOver] = useState(false);
  const [selectedTower, setSelectedTower] = useState<string>('cannon');
  const startTimeRef = useRef<number>(0);

  // 同步塔类型并设置建造模式
  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.selectedTowerType = selectedTower;
      engineRef.current.stage.mode = "build";
      if (engineRef.current.stage.map && engineRef.current.stage.map.pre_building) {
        engineRef.current.stage.map.pre_building.type = selectedTower;
      }
    }
  }, [selectedTower]);



  // 提交记录
  const submitRecord = useCallback(async (finalScore: number, finalWave: number) => {
    const token = localStorage.getItem('token');
    if (!token) return;

    const duration = Math.floor((Date.now() - startTimeRef.current) / 1000);
    try {
      await fetch(`${API_BASE_URL}/api/tower-defense/record`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          wave: finalWave,
          score: finalScore,
          timeSeconds: duration
        })
      });
      message.success('游戏记录已保存到排行榜');
    } catch (e) {
      console.error('Save record failed', e);
    }
  }, []);

  useEffect(() => {
    if (!canvasRef.current) return;

    // 核心游戏引擎移植 (由于篇幅限制，这里提供关键适配逻辑)
    // 实际运行时将加载已迁移至 src/components/TowerDefense/TDEngine 的代码
    // 此处为了演示，我们将整合后的引擎注入
    
    const initGame = async () => {
      // 动态导入引擎以减小主包体积
      const { TowerDefenseEngine } = await import('./TowerDefense/TowerDefenseEngine');
      
      const engine = new TowerDefenseEngine(canvasRef.current!, {
        onGameOver: (s, w) => {
          setIsGameOver(true);
          submitRecord(s, w);
        },
        onUpdateStats: (newStats) => {
          setStats(newStats);
        }
      });
      
      engineRef.current = engine;
      // 初始化建造模式
      engine.stage.mode = "build";
      engine.selectedTowerType = selectedTower;
      
      startTimeRef.current = Date.now();
      engine.start();

    };

    initGame();

    return () => {
      if (engineRef.current) {
        engineRef.current.destroy();
      }
    };
  }, [submitRecord]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
      <Card size="small" style={{ width: 800 }}>
        <Space size="large" style={{ width: '100%', justifyContent: 'space-between' }}>
          <Space size="middle">
            <Text strong>金钱: <Text type="warning">{stats.money}</Text></Text>
            <Text strong>积分: <Text type="success">{stats.score}</Text></Text>
            <Text strong>生命: <Text type="danger">{stats.life}</Text></Text>
            <Text strong>波次: {stats.wave}</Text>
          </Space>
          <Space>
            <Button 
              type={selectedTower === 'cannon' ? 'primary' : 'default'} 
              onClick={() => setSelectedTower('cannon')}
            >
              加农炮 ($100)
            </Button>
            <Button 
              type={selectedTower === 'LMG' ? 'primary' : 'default'} 
              onClick={() => setSelectedTower('LMG')}
            >
              轻机枪 ($150)
            </Button>
            <Button 
              type={selectedTower === 'HMG' ? 'primary' : 'default'} 
              onClick={() => setSelectedTower('HMG')}
            >
              重机枪 ($300)
            </Button>
            <Button 
              type={selectedTower === 'wall' ? 'primary' : 'default'} 
              onClick={() => setSelectedTower('wall')}
            >
              墙 ($10)
            </Button>
          </Space>

        </Space>
      </Card>


      <div style={{ position: 'relative', border: '2px solid #1A74BA', borderRadius: 8, overflow: 'hidden' }}>
        <canvas 
          ref={canvasRef} 
          width={800} 
          height={600} 
          style={{ background: '#E0F4FC', display: 'block', cursor: 'crosshair' }} 
        />
        
        {isGameOver && (
          <div style={{
            position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.7)',
            display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
            color: '#fff', zIndex: 10
          }}>
            <Typography.Title level={2} style={{ color: '#fff' }}>游戏结束</Typography.Title>
            <Text style={{ color: '#fff', fontSize: 18, marginBottom: 24 }}>最终得分: {stats.score}</Text>
            <Button type="primary" size="large" onClick={() => window.location.reload()}>
              重新开始
            </Button>
          </div>
        )}
      </div>
      
      <Card size="small" style={{ width: 800 }}>
        <Text type="secondary">
          玩法：从左侧面板选择防御塔，点击地图空白处建造。保护终点不被怪物侵入！
        </Text>
      </Card>
    </div>
  );
};

export default TowerDefenseGame;
