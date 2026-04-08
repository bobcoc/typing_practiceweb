import React from 'react';

interface LeaderboardEntry {
  rank: number;
  name: string;
  time: string;
  date: string;
}

const SudokuLeaderboard: React.FC = () => {
  const dummyData: LeaderboardEntry[] = [
    { rank: 1, name: '玩家 A', time: '3:25', date: '2024-01-15' },
    { rank: 2, name: '玩家 B', time: '4:12', date: '2024-01-14' },
    { rank: 3, name: '玩家 C', time: '4:45', date: '2024-01-13' },
    { rank: 4, name: '玩家 D', time: '5:03', date: '2024-01-12' },
    { rank: 5, name: '玩家 E', time: '5:28', date: '2024-01-11' },
    { rank: 6, name: '玩家 F', time: '5:55', date: '2024-01-10' },
    { rank: 7, name: '玩家 G', time: '6:10', date: '2024-01-09' },
    { rank: 8, name: '玩家 H', time: '6:33', date: '2024-01-08' },
    { rank: 9, name: '玩家 I', time: '7:01', date: '2024-01-07' },
    { rank: 10, name: '玩家 J', time: '7:22', date: '2024-01-06' },
  ];

  return (
    <div style={{ maxWidth: 600, margin: '0 auto' }}>
      <h3 style={{ textAlign: 'center', marginBottom: '20px' }}>数独排行榜</h3>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ backgroundColor: '#fafafa' }}>
            <th style={{ padding: '12px', textAlign: 'center', border: '1px solid #ddd' }}>排名</th>
            <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #ddd' }}>玩家</th>
            <th style={{ padding: '12px', textAlign: 'center', border: '1px solid #ddd' }}>用时</th>
            <th style={{ padding: '12px', textAlign: 'center', border: '1px solid #ddd' }}>日期</th>
          </tr>
        </thead>
        <tbody>
          {dummyData.map((entry) => (
            <tr
              key={entry.rank}
              style={{
                backgroundColor: entry.rank === 1 ? '#fffbe6' : entry.rank === 2 ? '#f6ffed' : '#fff',
              }}
            >
              <td
                style={{
                  padding: '12px',
                  textAlign: 'center',
                  border: '1px solid #ddd',
                  fontWeight: 'bold',
                  color: entry.rank === 1 ? '#faad14' : '#333',
                }}
              >
                {entry.rank}
              </td>
              <td
                style={{ padding: '12px', textAlign: 'left', border: '1px solid #ddd' }}
              >
                {entry.name}
              </td>
              <td
                style={{ padding: '12px', textAlign: 'center', border: '1px solid #ddd' }}
              >
                {entry.time}
              </td>
              <td
                style={{ padding: '12px', textAlign: 'center', border: '1px solid #ddd' }}
              >
                {entry.date}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default SudokuLeaderboard;
