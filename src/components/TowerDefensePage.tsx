import React from 'react';
import { Button, Space, Typography } from 'antd';

const TowerDefensePage: React.FC = () => {
  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: 16 }}>
      <Space align="center" style={{ marginBottom: 4 }}>
        <Typography.Title level={3} style={{ margin: 0 }}>
          塔防游戏
        </Typography.Title>
        <Button type="link" href="/tower-defense/td.html" target="_blank" rel="noreferrer">
          新窗口打开
        </Button>
      </Space>
      <Typography.Paragraph type="secondary" style={{ marginTop: 0 }}>
        参考：{' '}
        <a href="https://oldj.net/static/html5-tower-defense/td.html" target="_blank" rel="noreferrer">
          oldj.net
        </a>
        {' '}|{' '}
        <a href="https://github.com/oldj/html5-tower-defense" target="_blank" rel="noreferrer">
          GitHub 源码
        </a>
      </Typography.Paragraph>

      <div

        style={{
          width: '100%',
          height: 'calc(100vh - 240px)',
          minHeight: 600,
          border: '1px solid #e5e7eb',
          borderRadius: 8,
          overflow: 'hidden',
          background: '#fff'
        }}
      >
        <iframe
          title="塔防游戏"
          src="/tower-defense/td.html"
          style={{ width: '100%', height: '100%', border: 0 }}
          sandbox="allow-scripts allow-same-origin"
        />
      </div>
    </div>
  );
};

export default TowerDefensePage;
