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
  Tabs,
  Tab,
  Chip,
  CircularProgress
} from '@mui/material';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import { API_BASE_URL } from '../config';

type Difficulty = 'easy' | 'medium' | 'hard';

interface LeaderboardRecord {
  userId: string;
  username: string;
  fullname: string;
  bestTime: number;
  totalGames: number;
  wonGames: number;
  winRate: number;
  lastPlayed: string;
}

interface LeaderboardResponse {
  records: LeaderboardRecord[];
  total: number;
  currentPage: number;
  totalPages: number;
  difficulty: string;
}

const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: '简单',
  medium: '中等',
  hard: '困难'
};

const SudokuLeaderboard: React.FC = () => {
  const [difficulty, setDifficulty] = useState<Difficulty>('hard');
  const [records, setRecords] = useState<LeaderboardRecord[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchLeaderboard();
  }, [difficulty, page]);

  const fetchLeaderboard = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/sudoku/leaderboard/${difficulty}?page=${page}&limit=10`
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

  const handleDifficultyChange = (_event: React.SyntheticEvent, newValue: Difficulty) => {
    setDifficulty(newValue);
    setPage(1);
  };

  const handlePageChange = (_event: React.ChangeEvent<unknown>, value: number) => {
    setPage(value);
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
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
        <Typography variant="h4">数独排行榜</Typography>
      </Box>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs
          value={difficulty}
          onChange={handleDifficultyChange}
          centered
          textColor="primary"
          indicatorColor="primary"
        >
          <Tab value="easy" label={DIFFICULTY_LABELS.easy} />
          <Tab value="medium" label={DIFFICULTY_LABELS.medium} />
          <Tab value="hard" label={DIFFICULTY_LABELS.hard} />
        </Tabs>
      </Box>

      <TableContainer component={Paper} sx={{ mb: 3 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell align="center" width="80px">排名</TableCell>
              <TableCell>姓名</TableCell>
              <TableCell align="center">最佳时间</TableCell>
              <TableCell align="center">总游戏次数</TableCell>
              <TableCell align="center">获胜次数</TableCell>
              <TableCell align="center">胜率</TableCell>
              <TableCell align="center">最后游玩</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {records.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center">
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
                        <Typography fontWeight={badge ? 'bold' : 'normal'}>{rank}</Typography>
                        {badge && <Chip size="small" label={badge.emoji} color={badge.color} />}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography fontWeight={badge ? 'bold' : 'normal'}>
                        {record.fullname || record.username}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Chip
                        label={formatTime(record.bestTime)}
                        color={rank <= 3 && page === 1 ? 'success' : 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="center">{record.totalGames}</TableCell>
                    <TableCell align="center">{record.wonGames}</TableCell>
                    <TableCell align="center">
                      <Chip
                        label={`${record.winRate.toFixed(1)}%`}
                        color={record.winRate >= 50 ? 'success' : 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="center">
                      {new Date(record.lastPlayed).toLocaleString('zh-CN', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {totalPages > 1 && (
        <Box display="flex" justifyContent="center" mt={3} mb={3}>
          <Pagination
            count={totalPages}
            page={page}
            onChange={handlePageChange}
            color="primary"
            size="large"
          />
        </Box>
      )}

      <Paper sx={{ padding: 2, marginTop: 3, backgroundColor: '#f5f5f5' }}>
        <Typography variant="body2" color="textSecondary">
          💡 提示：排行榜按最佳完成时间排序，时间越短排名越高。只有登录用户的获胜记录才会计入排行榜。
        </Typography>
      </Paper>
    </Box>
  );
};

export default SudokuLeaderboard;
