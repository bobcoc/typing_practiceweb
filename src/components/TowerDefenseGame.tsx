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

  // 复刻原版布局与配色
  const boardBg = '#d8ecf6';
  const panelBg = '#e0f4fc';
  const canvasSize = 560; // 接近原版 16x16 网格（32px）+ padding
  const statItem = (label: string, value: number | string, color?: string) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
      <span>{label}</span>
      <span style={{ color }}>{value}</span>
    </div>
  );

  const towerButton = (type: string, label: string, circleColor: string) => (
    <Button
      size="small"
      style={{
        width: 44,
        height: 44,
        padding: 0,
        border: selectedTower === type ? '2px solid #f90' : '1px solid #999',
        background: '#fff'
      }}
      onClick={() => setSelectedTower(type)}
    >
      <span style={{
        display: 'inline-block',
        width: 20,
        height: 20,
        borderRadius: '50%',
        background: circleColor,
        border: '2px solid #444'
      }} />
      <div style={{ fontSize: 10, marginTop: 2 }}>{label}</div>
    </Button>
  );

  return (
    <div style={{ background: boardBg, minHeight: '100vh', padding: '16px 0' }}>
      <div style={{ width: 760, margin: '0 auto', background: panelBg, padding: '12px 16px 24px 16px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
        <h2 style={{ margin: '4px 0 12px', fontSize: 18, letterSpacing: '0.12em' }}>HTML5 塔防游戏</h2>

        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <div style={{ position: 'relative', background: '#fff', border: '1px solid #cdf', padding: 4 }}>
            <canvas
              ref={canvasRef}
              width={canvasSize}
              height={canvasSize}
              style={{ background: '#fff', display: 'block', cursor: 'crosshair' }}
            />

            {isGameOver && (
              <div style={{
                position: 'absolute', inset: 4, background: 'rgba(0,0,0,0.7)',
                display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
                color: '#fff', zIndex: 10
              }}>
                <Typography.Title level={3} style={{ color: '#fff', margin: 0, marginBottom: 8 }}>游戏结束</Typography.Title>
                <Text style={{ color: '#fff', fontSize: 16, marginBottom: 16 }}>最终得分: {stats.score}</Text>
                <Button type="primary" size="middle" onClick={() => window.location.reload()}>
                  重新开始
                </Button>
              </div>
            )}
          </div>

          <div style={{ width: 160, background: '#fff', border: '1px solid #ddd', padding: 8 }}>
            {statItem('金钱', stats.money, '#d26900')}
            {statItem('积分', stats.score, '#2a8a1f')}
            {statItem('生命', stats.life, '#d11')}
            {statItem('波次', stats.wave)}
            <div style={{ borderTop: '1px solid #eee', margin: '8px 0' }} />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6 }}>
              {towerButton('cannon', '炮', '#3a3')}
              {towerButton('LMG', '轻机', '#36f')}
              {towerButton('HMG', '重机', '#933')}
              {towerButton('wall', '墙', '#666')}
            </div>
            <div style={{ marginTop: 10, fontSize: 12 }}>第 {stats.wave} 波</div>
            <Button style={{ marginTop: 8, width: '100%' }} onClick={() => window.location.reload()}>重开</Button>
          </div>
        </div>

        <div style={{ marginTop: 8, fontSize: 12, color: '#666', display: 'flex', justifyContent: 'space-between' }}>
          <span>FPS: {Math.round(engineRef.current?.fps || 0)}</span>
          <span>version: 0.1.17 | oldj.net</span>
        </div>
      </div>
    </div>
  );
};


export default TowerDefenseGame;
