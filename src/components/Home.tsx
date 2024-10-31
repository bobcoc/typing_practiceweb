import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Grid, Card, CardContent, Typography, Button, Container } from '@mui/material';
import { getPracticeTypes } from '../api/practiceTypes';
import { PracticeType, PracticeLevel } from '../types';

const Home: React.FC = () => {
  const [practiceTypes, setPracticeTypes] = useState<PracticeType[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchPracticeTypes = async () => {
      const types = await getPracticeTypes();
      setPracticeTypes(types);
    };

    fetchPracticeTypes();
  }, []);

  const handleStartPractice = (level: PracticeLevel) => {
    navigate(`/practice/${level}`);
  };

  return (
    <Container>
      <Grid container spacing={3} style={{ marginTop: '20px' }}>
        {practiceTypes.map((type) => (
          <Grid item xs={12} sm={6} md={3} key={type._id}>
            <Card>
              <CardContent>
                <Typography variant="h5" component="h2">
                  {type.title}
                </Typography>
                <Typography color="textSecondary">
                  {type.description}
                </Typography>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={() => handleStartPractice(type.level)}
                  style={{ marginTop: '10px' }}
                >
                  开始训练
                </Button>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Container>
  );
};

export default Home; 