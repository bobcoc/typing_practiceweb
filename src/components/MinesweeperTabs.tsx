import React, { useMemo } from 'react';
import { Tabs } from 'antd';
import { useLocation } from 'react-router-dom';
import MinesweeperGame from './MinesweeperGame';
import MinesweeperLeaderboard from './MinesweeperLeaderboard';
import SpectatorMinesweeper from './SpectatorMinesweeper';

const MinesweeperTabs: React.FC = () => {
  const location = useLocation();
  
  // 检查是否在旁观模式
  const isSpectatorMode = location.pathname.startsWith('/spectate/');
  const roomId = isSpectatorMode ? location.pathname.split('/')[2] : null;

  // 选项卡内容
  const items = useMemo(() => {
    if (isSpectatorMode && roomId) {
      // 旁观模式：只显示旁观组件
      return [
        {
          key: 'spectator',
          label: '旁观模式',
          children: <SpectatorMinesweeper roomId={roomId} />,
        },
      ];
    } else {
      // 正常模式：显示游戏和排行榜
      return [
        {
          key: 'game',
          label: '扫雷游戏',
          children: <MinesweeperGame />,
        },
        {
          key: 'leaderboard',
          label: '排行榜',
          children: <MinesweeperLeaderboard />,
        },
      ];
    }
  }, [isSpectatorMode, roomId]);

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto', padding: '24px 0' }}>
      {isSpectatorMode && roomId ? (
        <SpectatorMinesweeper roomId={roomId} />
      ) : (
        <Tabs
          defaultActiveKey="game"
          items={items}
          tabBarGutter={32}
          type="line"
        />
      )}
    </div>
  );
};

export default MinesweeperTabs;
