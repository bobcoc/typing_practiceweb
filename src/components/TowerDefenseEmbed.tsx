import React, { useEffect, useRef, useState } from 'react';
import { submitTowerRecord, saveGame, fetchSaves, fetchSave } from '../api/towerDefense';
import { message, Button, Modal, List, Space } from 'antd';

const TowerDefenseEmbed: React.FC<{ width?: string | number; height?: string | number }> = ({
  width = '100%',
  height = 640
}) => {
  const lastSubmitRef = useRef<{ ts: number; key: string } | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const pendingSaveRef = useRef(false);
  const [saves, setSaves] = useState<any[]>([]);
  const [loadingSaves, setLoadingSaves] = useState(false);
  const [showSavesModal, setShowSavesModal] = useState(false);

  useEffect(() => {
    const handler = (e: MessageEvent) => {
      try {
        // origin 校验，确保消息来自同源的游戏 iframe
        console.debug('TowerDefenseEmbed received postMessage', e.origin, e.data);
        if (e.origin !== window.location.origin) {
          console.debug('postMessage origin mismatch', e.origin, window.location.origin);
          return;
        }

        if (!e.data) {
          console.debug('postMessage has no data');
          return;
        }

        // 保存/读取进度时，iframe 会回传 state
        if (e.data.type === 'tower-defense:state') {
          const state = e.data.state;
          console.debug('Received tower-defense:state', state);
          if (pendingSaveRef.current) {
            pendingSaveRef.current = false;
            message.loading('正在保存进度…');
            saveGame(state)
                .then(() => {
                  message.success('进度已保存');
                  // refresh saves list
                  return fetchSaves();
                })
                .then((res: any) => {
                  // api wrapper sometimes returns { data: { saves: [...] } } or { saves: [...] }
                  const payload = (res && (res.saves ? res : res.data)) || null;
                  if (payload && payload.saves) setSaves(payload.saves);
              })
              .catch((err) => {
                console.error('保存游戏进度失败', err);
                message.error('保存进度失败：' + (err?.message || '未知错误'));
              });
          }
          return;
        }

        if (e.data.type !== 'tower-defense:complete') return;
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

  const requestSave = () => {
    if (!iframeRef.current || !iframeRef.current.contentWindow) {
      message.error('无法访问游戏 iframe');
      return;
    }
    pendingSaveRef.current = true;
    // 请求 iframe 将当前游戏状态 postMessage 回来
    console.debug('Sending postMessage to iframe: request-state', window.location.origin);
    iframeRef.current.contentWindow.postMessage({ type: 'tower-defense:request-state' }, window.location.origin);
    message.info('正在请求游戏状态以保存…');
  };

  const openSaves = () => {
    setShowSavesModal(true);
    setLoadingSaves(true);
    fetchSaves()
      .then((res: any) => {
        console.debug('fetchSaves response', res);
        const payload = (res && (res.saves ? res : res.data)) || null;
        console.debug('fetchSaves payload', payload);
        if (payload && payload.saves) setSaves(payload.saves);
      })
      .catch((err) => {
        console.error('获取保存列表失败', err);
        message.error('获取保存列表失败');
      })
      .finally(() => setLoadingSaves(false));
  };

  const loadSaveToIframe = (saveId: string) => {
    if (!iframeRef.current || !iframeRef.current.contentWindow) {
      message.error('无法访问游戏 iframe');
      return;
    }
    message.loading('正在加载存档…');
    fetchSave(saveId)
      .then((res: any) => {
        console.debug('fetchSave response', res);
        const payload = res?.save ? res : res?.data;
        console.debug('fetchSave payload', payload);
        const save = payload?.save;
        if (!save) throw new Error('无效的保存项');
        iframeRef.current!.contentWindow!.postMessage({ type: 'tower-defense:load', state: save.state }, window.location.origin);
        message.success('已向游戏发送加载请求');
        setShowSavesModal(false);
      })
      .catch((err) => {
        console.error('加载存档失败', err);
        message.error('加载存档失败');
      });
  };

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
  // 使用 PUBLIC_URL 支持不同部署环境
  const gameUrl = `${process.env.PUBLIC_URL || ''}/tower-defense/td.html`;

  return (

    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <Space style={{ marginBottom: 12 }}>
        <Button type="primary" onClick={requestSave}>保存进度</Button>
        <Button onClick={openSaves}>读取进度</Button>
      </Space>
      <div style={containerStyle}>
        <iframe
          ref={iframeRef}
          title="Tower Defense"
          src={gameUrl}
          style={finalIframeStyle}
        />
      </div>

      <Modal
        title="已保存的进度"
        visible={showSavesModal}
        onCancel={() => setShowSavesModal(false)}
        footer={null}
      >
        <List
          loading={loadingSaves}
          dataSource={saves}
          renderItem={(item: any) => (
            <List.Item
              actions={[
                <Button key="load" type="link" onClick={() => loadSaveToIframe(item._id)}>加载</Button>,
                <Button key="delete" type="link" danger onClick={() => {
                  // 删除后刷新列表
                  fetch(`/api/tower-defense/save/${item._id}`, { method: 'DELETE' })
                    .then(() => openSaves())
                    .catch(() => message.error('删除失败'));
                }}>删除</Button>
              ]}
            >
              <List.Item.Meta
                title={new Date(item.createdAt).toLocaleString()}
                description={item.name}
              />
            </List.Item>
          )}
        />
      </Modal>
    </div>
  );
};

export default TowerDefenseEmbed;
