import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Grid,
  Card,
  CardContent,
  CardActions,
  Typography,
  Button,
  Box,
  Skeleton
} from '@mui/material';
import {
  Code as CodeIcon,
  Keyboard as KeyboardIcon,
  School as SchoolIcon,
  Psychology as PsychologyIcon
} from '@mui/icons-material';
import { api,ApiError } from '../api/apiClient';

// 统计数据类型
interface Statistics {
  practiceCount: number;
  totalWords: number;
  avgAccuracy: number;
  todayPracticeTime: number;
  accuracyTrend: number[];
  lastPracticeDate: string | null;
  avgSpeed: number;
}


const TypingPractice: React.FC = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<Statistics>({
    practiceCount: 0,
    totalWords: 0,
    avgAccuracy: 0,
    todayPracticeTime: 0,
    accuracyTrend: [],
    lastPracticeDate: null,
    avgSpeed: 0
  });
  const [loading, setLoading] = useState(true);

  // 获取统计数据
  const fetchStatistics = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/practice-records/statistics');
      if (response) {
        setStats(response as Statistics);
      }
    } catch (error) {
      console.error('获取统计数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 组件加载时获取数据
  useEffect(() => {
    const fetchData = async () => {
      try {
        await fetchStatistics();
      } catch (error) {
        if (error instanceof ApiError && error.statusCode === 401) {
          // 认证错误已经由 AuthWrapper 处理，这里不需要额外处理
          console.log('Authentication error handled by AuthWrapper');
        }
      }
    };
    
    fetchData();
  }, []);

  const practiceTypes = [
    {
      title: '关键字练习',
      description: '练习常用的编程关键字，提高基础输入速度',
      icon: <KeyboardIcon sx={{ fontSize: 40 }} />,
      level: 'keyword',
      color: '#4CAF50'
    },
    {
      title: '基础算法',
      description: '练习基础算法实现，如冒泡排序、选择排序等',
      icon: <CodeIcon sx={{ fontSize: 40 }} />,
      level: 'basic',
      color: '#2196F3'
    },
    {
      title: '中级算法',
      description: '练习中级算法实现，如快速排序、归并排序等',
      icon: <SchoolIcon sx={{ fontSize: 40 }} />,
      level: 'intermediate',
      color: '#FF9800'
    },
    {
      title: '高级算法',
      description: '练习高级算法实现，如红黑树、图算法等',
      icon: <PsychologyIcon sx={{ fontSize: 40 }} />,
      level: 'advanced',
      color: '#F44336'
    }
  ];

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Typography variant="h4" gutterBottom>
        欢迎来到 Type Practice
      </Typography>
      <Typography variant="subtitle1" color="textSecondary" paragraph>
        请选择一个练习等级开始。
      </Typography>

      <Grid container spacing={4} sx={{ mt: 2 }}>
        {practiceTypes.map((type) => (
          <Grid item xs={12} sm={6} md={3} key={type.level}>
            <Card
              sx={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                transition: 'transform 0.2s',
                '&:hover': {
                  transform: 'scale(1.02)',
                  boxShadow: 3
                }
              }}
            >
              <Box
                sx={{
                  p: 2,
                  display: 'flex',
                  justifyContent: 'center',
                  bgcolor: type.color,
                  color: 'white'
                }}
              >
                {type.icon}
              </Box>
              <CardContent sx={{ flexGrow: 1 }}>
                <Typography gutterBottom variant="h5" component="h2">
                  {type.title}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  {type.description}
                </Typography>
              </CardContent>
              <CardActions>
                <Button
                  size="small"
                  color="primary"
                  onClick={() => navigate(`/practice/${type.level}`)}
                  fullWidth
                >
                  开始练习
                </Button>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* 统计信息区域 */}
      <Box sx={{ mt: 6, mb: 4 }}>
  <Typography variant="h5" gutterBottom>
    练习统计
  </Typography>
  <Grid container spacing={3}>
    {[
      {
        title: '今日练习时长',
        value: loading ? <Skeleton variant="text" width={100} /> : `${stats.todayPracticeTime} 秒`,
        color: '#4CAF50'
      },
      {
        title: '完成练习数',
        value: loading ? <Skeleton variant="text" width={100} /> : stats.practiceCount,
        color: '#2196F3'
      },
      {
        title: '平均正确率',
        value: loading ? <Skeleton variant="text" width={100} /> : `${(stats.avgAccuracy ?? 0).toFixed(1)}%`,
        color: '#FF9800'
      },
      {
        title: '练习单词总数',
        value: loading ? <Skeleton variant="text" width={100} /> : stats.totalWords,
        color: '#F44336'
      },
      {
        title: '平均速度',
        value: loading ? <Skeleton variant="text" width={100} /> : `${stats.avgSpeed.toFixed(0)} WPM`,
        color: '#9C27B0'
      }
    ].map((item, index) => (
      <Grid item xs={12} sm={6} md style={{ flex: 1 }} key={index}>
        <Card sx={{ 
          height: '100%',
          bgcolor: 'background.paper',
          transition: 'transform 0.2s',
          '&:hover': {
            transform: 'scale(1.02)',
            boxShadow: 2
          }
        }}>
          <CardContent>
            <Typography color="textSecondary" gutterBottom>
              {item.title}
            </Typography>
            <Typography variant="h4" sx={{ color: item.color }}>
              {item.value}
            </Typography>
          </CardContent>
        </Card>
      </Grid>
    ))}
  </Grid>
</Box>
    </Container>
  );
};

export default TypingPractice;