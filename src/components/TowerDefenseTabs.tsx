// src/components/TowerDefenseTabs.tsx
import React, { useMemo } from 'react';
import { Tabs, Card } from 'antd';
import TowerDefenseEmbed from './TowerDefenseEmbed';
import TowerDefenseLeaderboard from './TowerDefenseLeaderboard';

const TowerDefenseTabs: React.FC = () => {
  const items = useMemo(() => {
    return [
      {
        key: 'game',
        label: '塔防游戏',
        children: <TowerDefenseEmbed />,

      },
      {
        key: 'leaderboard',
        label: '排行榜',
        children: <TowerDefenseLeaderboard />,
      },
    ];
  }, []);

  return (
    <div style={{ padding: '24px', maxWidth: 1200, margin: '0 auto' }}>
      <Card bordered={false} bodyStyle={{ padding: 0 }}>
        <Tabs
          defaultActiveKey="game"
          items={items}
          size="large"
          centered
          destroyInactiveTabPane={false}
        />
      </Card>
    </div>
  );
};

export default TowerDefenseTabs;
