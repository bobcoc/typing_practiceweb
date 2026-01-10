import React, { useEffect, useRef } from 'react';
import { submitTowerRecord } from '../api/towerDefense';
import { message } from 'antd';

const TowerDefenseEmbed: React.FC<{ width?: string | number; height?: string | number }> = ({
  width = '100%',
  height = 640
}) => {
  const lastSubmitRef = useRef<{ ts: number; key: string } | null>(null);

  useEffect(() => {
    const handler = (e: MessageEvent) => {
      try {
        // origin 校验，确保消息来自同源的游戏 iframe
        if (e.origin !== window.location.origin) return;

        if (!e.data || e.data.type !== 'tower-defense:complete') return;
        const { wave, score, timeSeconds } = e.data;
        if (typeof wave !== 'number' || typeof score !== 'number') return;

        const key = `${wave}:${score}:${timeSeconds}`;
        const now = Date.now();

        // 客户端去重：同一参赛结果在短时间内只提交一次
        if (lastSubmitRef.current && lastSubmitRef.current.key === key && (now - lastSubmitRef.current.ts) < 5000) {
          message.info('成绩已提交（防止重复）。');
          return;
        }

        lastSubmitRef.current = { ts: now, key };

        const msgKey = 'td-submit-' + Date.now();
        message.loading('正在提交成绩…');

        submitTowerRecord({ wave, score, timeSeconds })
          .then(() => {
            message.success('塔防成绩已提交到排行榜');
          })
          .catch((err) => {
            console.error('提交塔防成绩失败', err);
            message.error('提交成绩失败：' + (err?.message || '未知错误'));
          });
      } catch (err) {
        console.error('处理 postMessage 事件失败', err);
      }
    };

    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  const iframeStyle: React.CSSProperties = {
    width: typeof width === 'number' ? `${width}px` : width,
    height: typeof height === 'number' ? `${height}px` : height,
    border: 'none'
  };

  const containerStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'center'
  };

  // If width is '100%' we prefer to use a fixed iframe width matching the game's max-width
  const finalIframeStyle = { ...iframeStyle };
  if (iframeStyle.width === '100%') {
    finalIframeStyle.width = '960px';
  }

  return (
    <div style={containerStyle}>
      <iframe
        title="Tower Defense"
        src="/tower-defense/td.html"
        style={finalIframeStyle}
      />
    </div>
  );
};

export default TowerDefenseEmbed;
