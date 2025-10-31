import React, { useMemo } from 'react';
import { Tabs } from 'antd';
import MinesweeperGame from './MinesweeperGame';
import MinesweeperLeaderboard from './MinesweeperLeaderboard';

const MinesweeperTabs: React.FC = () => {
  // 选项卡内容
  const items = useMemo(() => [
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
  ], []);

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto', padding: '24px 0' }}>
      <Tabs
        defaultActiveKey="game"
        items={items}
        tabBarGutter={32}
        type="line"
      />
    </div>
  );
};

export default MinesweeperTabs;
