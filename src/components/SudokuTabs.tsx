import React, { useMemo } from 'react';
import { Tabs } from 'antd';
import SudokuGame from './SudokuGame';
import SudokuLeaderboard from './SudokuLeaderboard';

const SudokuTabs: React.FC = () => {
  const items = useMemo(() => {
    return [
      {
        key: 'game',
        label: '数独游戏',
        children: <SudokuGame />,
      },
      {
        key: 'leaderboard',
        label: '排行榜',
        children: <SudokuLeaderboard />,
      },
    ];
  }, []);

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

export default SudokuTabs;
