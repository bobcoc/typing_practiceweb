import React, { useState, useEffect } from 'react';
import { Container, Typography, Card, CardContent, Grid, Button, Box, CircularProgress } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { QAConfig, defaultQaConfig, getQaConfig } from '../config/qaConfig';

const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const [config, setConfig] = useState<QAConfig>(defaultQaConfig);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadConfig = async () => {
      try {
        setLoading(true);
        const remoteConfig = await getQaConfig();
        setConfig(remoteConfig);
      } catch (error) {
        console.error('Error loading config:', error);
      } finally {
        setLoading(false);
      }
    };

    loadConfig();
  }, []);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  const firstSection = config.qaContent.slice(0, config.firstSectionCount);
  const secondSection = config.qaContent.slice(
    config.firstSectionCount,
    config.firstSectionCount + config.secondSectionCount
  );

  return (
    <Container maxWidth="lg" sx={{ py: 8 }}>
      {/* 头部区域 */}
      <Box sx={{ mb: 8, textAlign: 'center' }}>
        <Typography variant="h3" component="h1" gutterBottom>
          AI教育 · 第一课堂
        </Typography>
        <Typography variant="h5" color="text.secondary" paragraph>
          赋能教育，智启未来
        </Typography>
      </Box>

      {/* 第一组QA内容区域 */}
      <Box sx={{ mb: 8 }}>
        <Typography variant="h4" sx={{ mb: 2 }}>
          {config.firstSectionTitle}
        </Typography>
        <Typography variant="h5" color="text.secondary" sx={{ mb: 4 }}>
          {config.firstSectionSubtitle}
        </Typography>
        <Grid container spacing={4}>
          {firstSection.map((qa, index) => (
            <Grid item xs={12} md={6} key={index}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <CardContent>
                  <Typography variant="overline" color="primary">
                    {qa.category}
                  </Typography>
                  <Typography variant="h6" component="h2" gutterBottom>
                    {qa.question}
                  </Typography>
                  <Typography variant="body1" color="text.secondary" sx={{ whiteSpace: 'pre-line' }}>
                    {qa.answer}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>

      {/* 第二组QA内容区域 */}
      <Box sx={{ mb: 8 }}>
        <Typography variant="h4" sx={{ mb: 2 }}>
          {config.secondSectionTitle}
        </Typography>
        <Typography variant="h5" color="text.secondary" sx={{ mb: 4 }}>
          {config.secondSectionSubtitle}
        </Typography>
        <Grid container spacing={4}>
          {secondSection.map((qa, index) => (
            <Grid item xs={12} md={6} key={index}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <CardContent>
                  <Typography variant="overline" color="primary">
                    {qa.category}
                  </Typography>
                  <Typography variant="h6" component="h2" gutterBottom>
                    {qa.question}
                  </Typography>
                  <Typography variant="body1" color="text.secondary" sx={{ whiteSpace: 'pre-line' }}>
                    {qa.answer}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>

      {/* 平台入口按钮 */}
      <Box sx={{ mt: 6, textAlign: 'center' }}>
        <Button 
          variant="contained" 
          size="large" 
          onClick={() => window.open('https://c.d1kt.cn', '_blank')}
          sx={{ mt: 2 }}
        >
          进入第一课堂AI平台
        </Button>
      </Box>
    </Container>
  );
};

export default LandingPage; 