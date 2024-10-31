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
  Box 
} from '@mui/material';
import axios from 'axios';

interface Score {
  username: string;
  level: number;
  accuracy: number;
  speed: number;
  timestamp: string;
}

interface LeaderboardResponse {
  scores: Score[];
  total: number;
  currentPage: number;
  totalPages: number;
}

const Leaderboard: React.FC = () => {
  const [scores, setScores] = useState<Score[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    const fetchScores = async () => {
      try {
        const response = await axios.get<LeaderboardResponse>(
          `http://localhost:5001/api/leaderboard?page=${page}`
        );
        setScores(response.data.scores);
        setTotalPages(response.data.totalPages);
      } catch (error) {
        console.error('Error fetching leaderboard:', error);
      }
    };
    fetchScores();
  }, [page]);

  const handlePageChange = (_event: React.ChangeEvent<unknown>, value: number) => {
    setPage(value);
  };

  return (
    <div style={{ padding: 20 }}>
      <Typography variant="h4" gutterBottom>
        排行榜
      </Typography>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>排名</TableCell>
              <TableCell>用户名</TableCell>
              <TableCell>级别</TableCell>
              <TableCell>准确率</TableCell>
              <TableCell>速度（字符/分钟）</TableCell>
              <TableCell>时间</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {scores.map((score, index) => (
              <TableRow key={index}>
                <TableCell>{(page - 1) * 10 + index + 1}</TableCell>
                <TableCell>{score.username}</TableCell>
                <TableCell>{score.level}</TableCell>
                <TableCell>{score.accuracy}%</TableCell>
                <TableCell>{score.speed}</TableCell>
                <TableCell>
                  {new Date(score.timestamp).toLocaleString()}
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
    </div>
  );
};

export default Leaderboard; 