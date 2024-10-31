import React from 'react';
import { Link } from 'react-router-dom';
import { Button, Grid, Typography, Card, CardContent } from '@mui/material';

interface Level {
  id: number;
  name: string;
  description: string;
}

const Home: React.FC = () => {
  const levels: Level[] = [
    { id: 1, name: '关键字训练', description: '训练C/C++基础关键字的输入' },
    { id: 2, name: '初级算法', description: '训练基础算法代码的输入' },
    { id: 3, name: '中级算法', description: '训练中级算法代码的输入' },
    { id: 4, name: '高级算法', description: '训练高级算法代码的输入' },
  ];

  return (
    <Grid container spacing={3} padding={3}>
      {levels.map((level) => (
        <Grid item xs={12} sm={6} md={3} key={level.id}>
          <Card>
            <CardContent>
              <Typography variant="h5" component="h2">
                {level.name}
              </Typography>
              <Typography color="textSecondary">
                {level.description}
              </Typography>
              <Button
                component={Link}
                to={`/practice/${level.id}`}
                variant="contained"
                color="primary"
                style={{ marginTop: 16 }}
              >
                开始训练
              </Button>
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
};

export default Home; 