// src/components/TowerDefenseLeaderboard.tsx
import React, { useState, useEffect } from 'react';
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  Pagination,
  Chip,
  CircularProgress
} from '@mui/material';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import { API_BASE_URL } from '../config';

interface LeaderboardRecord {
  userId: string;
  username: string;
  fullname: string;
  bestWave: number;
  bestScore: number;
  totalGames: number;
  lastPlayed: string;
}

interface LeaderboardResponse {
  records: LeaderboardRecord[];
  total: number;
  currentPage: number;
  totalPages: number;
}

const TowerDefenseLeaderboard: React.FC = () => {
  const [records, setRecords] = useState<LeaderboardRecord[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchLeaderboard();
  }, [page]);

  const fetchLeaderboard = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/tower-defense/leaderboard?page=${page}&limit=10`
      );

      if (!response.ok) {
        throw new Error('获取排行榜失败');
      }

      const data: LeaderboardResponse = await response.json();
      setRecords(data.records);
      setTotalPages(data.totalPages);
    } catch (error) {
      console.error('获取排行榜失败:', error);
      setError(error instanceof Error ? error.message : '获取排行榜失败');
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (_event: React.ChangeEvent<unknown>, value: number) => {
    setPage(value);
  };

  const getRankBadge = (rank: number) => {
    if (rank === 1) return { emoji: '🥇', color: 'success' as const };
    if (rank === 2) return { emoji: '🥈', color: 'primary' as const };
    if (rank === 3) return { emoji: '🥉', color: 'default' as const };
    return null;
  };

  if (loading && records.length === 0) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ padding: 3 }}>
      <Box display="flex" alignItems="center" justifyContent="center" mb={3}>
        <EmojiEventsIcon sx={{ fontSize: 40, color: 'gold', mr: 1 }} />
        <Typography variant="h4">
          塔防排行榜
        </Typography>
      </Box>

      <TableContainer component={Paper} sx={{ mb: 3 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell align="center" width="80px">排名</TableCell>
              <TableCell>姓名</TableCell>
              <TableCell align="center">最高积分</TableCell>
              <TableCell align="center">最高波次</TableCell>
              <TableCell align="center">总游戏次数</TableCell>
              <TableCell align="center">最后游玩</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {records.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  <Typography variant="body2" color="textSecondary" py={3}>
                    暂无排行榜数据
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              records.map((record, index) => {
                const rank = (page - 1) * 10 + index + 1;
                const badge = page === 1 ? getRankBadge(rank) : null;
                return (
                  <TableRow
                    key={record.userId}
                    sx={badge ? { backgroundColor: 'rgba(255, 215, 0, 0.1)' } : {}}
                  >
                    <TableCell align="center">
                      <Box display="flex" alignItems="center" justifyContent="center" gap={0.5}>
                        <Typography fontWeight={badge ? 'bold' : 'normal'}>
                          {rank}
                        </Typography>
                        {badge && (
                          <Chip size="small" label={badge.emoji} color={badge.color} />
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography fontWeight={badge ? 'bold' : 'normal'}>
                        {record.fullname || record.username}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Chip label={record.bestScore} color="primary" size="small" />
                    </TableCell>
                    <TableCell align="center">{record.bestWave}</TableCell>
                    <TableCell align="center">{record.totalGames}</TableCell>
                    <TableCell align="center">
                      {new Date(record.lastPlayed).toLocaleString('zh-CN')}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {totalPages > 1 && (
        <Box display="flex" justifyContent="center" mt={3}>
          <Pagination count={totalPages} page={page} onChange={handlePageChange} color="primary" />
        </Box>
      )}
    </Box>
  );
};

export default TowerDefenseLeaderboard;
