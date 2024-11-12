// src/components/Leaderboard.tsx
import React, { useState, useEffect } from 'react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow, 
  Paper,
  Typography,
  Pagination,
  Box,
  Tabs,
  Tab,
  Chip,
  CircularProgress,
  FormControl,
  Select,
  MenuItem
} from '@mui/material';
import { API_BASE_URL, API_PATHS } from '../config';
import type { ChipProps } from '@mui/material/Chip';
import type { SxProps, Theme } from '@mui/material/styles';

// 类型定义
interface PracticeRecord {
  userId: string;
  username: string;
  stats: {
    totalWords: number;
    accuracy: number;
    wordsPerMinute: number;
    duration: number;
    practiceCount: number;
    lastPractice: string;
  };
}

interface LeaderboardResponse {
  records: PracticeRecord[];
  total: number;
  currentPage: number;
  totalPages: number;
  sortField: string;
  sortLabel: string;
}

interface PracticeType {
  value: 'keyword' | 'basic' | 'intermediate' | 'advanced';
  label: string;
}

const practiceTypes: PracticeType[] = [
  { value: 'keyword', label: '关键字' },
  { value: 'basic', label: '基础算法' },
  { value: 'intermediate', label: '中级算法' },
  { value: 'advanced', label: '高级算法' }
];

const sortOptions = [
  { value: 'totalWords', label: '总单词数' },
  { value: 'accuracy', label: '平均正确率' },
  { value: 'duration', label: '练习总时长' },
  { value: 'speed', label: '平均速度' }
];

// 排名徽章配置
const rankBadges: Array<{
  label: string;
  color: ChipProps['color'];
  sx?: SxProps<Theme>;
}> = [
  { label: '🥇', color: 'success', sx: { ml: 1 } },
  { label: '🥈', color: 'primary', sx: { ml: 1 } },
  { label: '🥉', color: 'default', sx: { ml: 1 } }
];

const Leaderboard: React.FC = () => {
  const [records, setRecords] = useState<PracticeRecord[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [practiceType, setPracticeType] = useState<PracticeType['value']>('keyword');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState('totalWords');

  useEffect(() => {
    fetchLeaderboard();
  }, [page, practiceType, sortBy]);

  const fetchLeaderboard = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `${API_BASE_URL}${API_PATHS.LEADERBOARD}/${practiceType}?page=${page}&sortBy=${sortBy}`
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

  const handleTypeChange = (_event: React.SyntheticEvent, newValue: string) => {
    setPracticeType(newValue as PracticeType['value']);
    setPage(1);
  };

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = Math.round(seconds % 60);
    if (hours > 0) {
      return `${hours}小时${minutes}分${remainingSeconds}秒`;
    }
    return `${minutes}分${remainingSeconds}秒`;
  };

  if (loading) {
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
      <Typography variant="h4" gutterBottom align="center">
        打字练习排行榜
      </Typography>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs
          value={practiceType}
          onChange={handleTypeChange}
          centered
          textColor="primary"
          indicatorColor="primary"
        >
          {practiceTypes.map(type => (
            <Tab 
              key={type.value}
              value={type.value}
              label={type.label}
            />
          ))}
        </Tabs>
      </Box>

      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'flex-end' }}>
        <FormControl variant="outlined" size="small">
          <Select
            value={sortBy}
            onChange={(e) => {
              setSortBy(e.target.value);
              setPage(1);
            }}
            sx={{ minWidth: 150 }}
          >
            {sortOptions.map(option => (
              <MenuItem key={option.value} value={option.value}>
                按{option.label}排序
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      <TableContainer component={Paper} sx={{ mb: 3 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell align="center">排名</TableCell>
              <TableCell>用户名</TableCell>
              <TableCell align="center">练习次数</TableCell>
              <TableCell align="center">正确率</TableCell>
              <TableCell align="center">单词总数</TableCell>
              <TableCell align="center">平均速度(词/分钟)</TableCell>
              <TableCell align="center">练习总时长</TableCell>
              <TableCell align="center">最近练习时间</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {records.map((record, index) => (
              <TableRow 
                key={record.userId}
                sx={index < 3 ? { backgroundColor: 'rgba(0, 0, 0, 0.02)' } : {}}
              >
                <TableCell align="center">
                  {(page - 1) * 10 + index + 1}
                  {index < 3 && (
                    <Chip
                      size="small"
                      label={rankBadges[index].label}
                      color={rankBadges[index].color}
                      sx={rankBadges[index].sx}
                    />
                  )}
                </TableCell>
                <TableCell>{record.username}</TableCell>
                <TableCell align="center">{record.stats.practiceCount}</TableCell>
                <TableCell align="center">
                  <Chip
                    label={`${record.stats.accuracy.toFixed(1)}%`}
                    color={record.stats.accuracy > 95 ? 'success' : 'default'}
                    size="small"
                  />
                </TableCell>
                <TableCell align="center">{record.stats.totalWords}</TableCell>
                <TableCell align="center">{Math.round(record.stats.wordsPerMinute)}</TableCell>
                <TableCell align="center">{formatDuration(record.stats.duration)}</TableCell>
                <TableCell align="center">
                  {new Date(record.stats.lastPractice).toLocaleString()}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      
      <Box display="flex" justifyContent="center" mt={3} mb={3}>
        <Pagination 
          count={totalPages} 
          page={page} 
          onChange={handlePageChange}
          color="primary"
          size="large"
        />
      </Box>
    </Box>
  );
};

export default Leaderboard;