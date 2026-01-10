import React, { useEffect, useState } from 'react';
import { fetchLeaderboard } from '../api/towerDefense';

interface LeaderRec {
  userId: string;
  username: string;
  fullname: string;
  bestWave: number;
  bestScore: number;
  totalGames: number;
  lastPlayed: string;
}

const TowerLeaderboard: React.FC = () => {
  const [records, setRecords] = useState<LeaderRec[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetchLeaderboard(1, 50)
      .then((res: any) => {
        setRecords(res.records || []);
      })
      .catch((err: any) => {
        console.error('加载排行榜失败', err);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ padding: 16 }}>
      <h2>塔防排行榜</h2>
      {loading ? (
        <div>加载中…</div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', padding: 8 }}>排名</th>
              <th style={{ textAlign: 'left', padding: 8 }}>用户</th>
              <th style={{ textAlign: 'left', padding: 8 }}>最高关卡</th>
              <th style={{ textAlign: 'left', padding: 8 }}>最高分</th>
              <th style={{ textAlign: 'left', padding: 8 }}>次数</th>
              <th style={{ textAlign: 'left', padding: 8 }}>最后游玩</th>
            </tr>
          </thead>
          <tbody>
            {records.map((r, idx) => (
              <tr key={r.userId} style={{ borderTop: '1px solid #eee' }}>
                <td style={{ padding: 8 }}>{idx + 1}</td>
                <td style={{ padding: 8 }}>{r.fullname || r.username}</td>
                <td style={{ padding: 8 }}>{r.bestWave}</td>
                <td style={{ padding: 8 }}>{r.bestScore}</td>
                <td style={{ padding: 8 }}>{r.totalGames}</td>
                <td style={{ padding: 8 }}>{new Date(r.lastPlayed).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default TowerLeaderboard;
