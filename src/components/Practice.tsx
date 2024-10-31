import React, { useEffect, useState, KeyboardEvent } from 'react';
import { useParams } from 'react-router-dom';
import { 
  Container, 
  Typography,
  Box,
  TextField,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Grid,
  Paper
} from '@mui/material';
import { CodeExample } from '../types';

const Practice: React.FC = () => {
  const { level } = useParams<{ level: string }>();
  const [examples, setExamples] = useState<CodeExample[]>([]);
  const [currentExample, setCurrentExample] = useState<CodeExample | null>(null);
  const [userInput, setUserInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalAttempts: 0,
    correctAttempts: 0,
    accuracy: 0,
    averageTime: 0,
    startTime: Date.now()
  });

  useEffect(() => {
    console.log('Current level:', level);
    fetchExamples();
  }, [level]);

  const fetchExamples = async () => {
    try {
      setLoading(true);
      console.log('Fetching examples for level:', level);
      
      const url = `http://localhost:5001/api/code-examples?level=${encodeURIComponent(level || '')}`;
      console.log('Fetching URL:', url);
      
      const response = await fetch(url);
      console.log('Response status:', response.status);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Received data:', data);
      
      if (Array.isArray(data) && data.length > 0) {
        setExamples(data);
        const randomExample = data[Math.floor(Math.random() * data.length)];
        console.log('Setting current example:', randomExample);
        setCurrentExample(randomExample);
      } else {
        console.log('No examples found or invalid data format');
        setExamples([]);
        setCurrentExample(null);
      }
    } catch (error) {
      console.error('Error fetching examples:', error);
      setExamples([]);
      setCurrentExample(null);
    } finally {
      setLoading(false);
    }
  };

  const handleKeywordInput = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' && level === 'keyword') {
      checkKeywordAnswer();
    }
  };

  const getNextExample = () => {
    if (examples.length > 0) {
      const randomIndex = Math.floor(Math.random() * examples.length);
      const nextExample = examples[randomIndex];
      console.log('Next example:', nextExample);
      setCurrentExample(nextExample);
      setUserInput('');
      setStats(prev => ({
        ...prev,
        startTime: Date.now()
      }));
    }
  };

  const checkKeywordAnswer = () => {
    if (!currentExample) return;

    const timeTaken = (Date.now() - stats.startTime) / 1000;
    const isCorrect = userInput.trim() === currentExample.content.trim();
    console.log('Answer check:', { isCorrect, timeTaken });

    setStats(prev => {
      const newStats = {
        totalAttempts: prev.totalAttempts + 1,
        correctAttempts: prev.correctAttempts + (isCorrect ? 1 : 0),
        accuracy: ((prev.correctAttempts + (isCorrect ? 1 : 0)) / (prev.totalAttempts + 1)) * 100,
        averageTime: (prev.averageTime * prev.totalAttempts + timeTaken) / (prev.totalAttempts + 1),
        startTime: Date.now()
      };
      console.log('Updated stats:', newStats);
      return newStats;
    });

    getNextExample();
  };

  const renderStats = () => (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Grid container spacing={2}>
          <Grid item xs={3}>
            <Typography variant="subtitle2">总尝试次数</Typography>
            <Typography variant="h6">{stats.totalAttempts}</Typography>
          </Grid>
          <Grid item xs={3}>
            <Typography variant="subtitle2">正确次数</Typography>
            <Typography variant="h6">{stats.correctAttempts}</Typography>
          </Grid>
          <Grid item xs={3}>
            <Typography variant="subtitle2">正确率</Typography>
            <Typography variant="h6">{stats.accuracy.toFixed(1)}%</Typography>
          </Grid>
          <Grid item xs={3}>
            <Typography variant="subtitle2">平均用时</Typography>
            <Typography variant="h6">{stats.averageTime.toFixed(1)}秒</Typography>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );

  const renderKeywordPractice = () => (
    <Box sx={{ mt: 4 }}>
      {renderStats()}
      <Box sx={{ textAlign: 'center', mb: 4 }}>
        {currentExample ? (
          <Typography variant="h2" gutterBottom sx={{ 
            fontFamily: 'monospace',
            letterSpacing: '0.1em',
            color: '#1976d2'
          }}>
            {currentExample.content}
          </Typography>
        ) : (
          <Typography variant="h5" color="text.secondary">
            暂无练习内容
          </Typography>
        )}
      </Box>
      <TextField
        fullWidth
        value={userInput}
        onChange={(e) => setUserInput(e.target.value)}
        onKeyPress={(e) => {
          if (e.key === 'Enter') {
            console.log('Checking answer:', {
              input: userInput,
              expected: currentExample?.content
            });
            checkKeywordAnswer();
          }
        }}
        variant="outlined"
        placeholder="输入关键字后按回车继续"
        disabled={!currentExample}
        sx={{ 
          '& .MuiInputBase-input': {
            fontSize: '2rem',
            textAlign: 'center',
            fontFamily: 'monospace',
            letterSpacing: '0.1em'
          }
        }}
      />
    </Box>
  );

  const renderAlgorithmPractice = () => (
    <Box sx={{ mt: 4 }}>
      {renderStats()}
      <Grid container spacing={3}>
        <Grid item xs={6}>
          <Paper sx={{ p: 2, height: '70vh', overflow: 'auto' }}>
            <Typography variant="h6" gutterBottom>
              {currentExample?.title}
            </Typography>
            <Typography
              component="pre"
              sx={{
                fontFamily: 'monospace',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-all'
              }}
            >
              {currentExample?.content}
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={6}>
          <TextField
            fullWidth
            multiline
            rows={25}
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            variant="outlined"
            sx={{ 
              height: '70vh',
              '& .MuiInputBase-root': {
                height: '100%'
              },
              '& .MuiInputBase-input': {
                fontFamily: 'monospace'
              }
            }}
          />
          <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between' }}>
            <Button 
              variant="contained" 
              color="secondary"
              onClick={getNextExample}
            >
              跳过
            </Button>
            <Button 
              variant="contained" 
              color="primary"
              onClick={checkKeywordAnswer}
            >
              提交
            </Button>
          </Box>
        </Grid>
      </Grid>
    </Box>
  );

  if (loading) {
    return (
      <Container sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      <Typography variant="h4" align="center" gutterBottom sx={{ mt: 4 }}>
        {level === 'keyword' ? '关键字练习' : 
         level === 'basic' ? '基础算法练习' :
         level === 'intermediate' ? '中级算法练习' : '高级算法练习'}
      </Typography>
      
      {level === 'keyword' ? renderKeywordPractice() : renderAlgorithmPractice()}
    </Container>
  );
};

export default Practice;