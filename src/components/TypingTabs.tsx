import React, { useMemo } from 'react';
import { Tabs } from 'antd';
import TypingPractice from './TypingPractice'; // 首页/模式选择页
import Leaderboard from './Leaderboard';
import PracticeHistory from './PracticeHistory';

const TypingTabs: React.FC = () => {
  // 选项卡内容
  const items = useMemo(() => [
    {
      key: 'home',
      label: '打字练习',
      children: <TypingPractice />,
    },
    {
      key: 'leaderboard',
      label: '排行榜',
      children: <Leaderboard />,
    },
    {
      key: 'history',
      label: '练习历史',
      children: <PracticeHistory />,
    },
  ], []);

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 0' }}>
      <Tabs
        defaultActiveKey="home"
        items={items}
        tabBarGutter={32}
        type="line"
      />
    </div>
  );
};

export default TypingTabs; 