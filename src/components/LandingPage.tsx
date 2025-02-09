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
  const thirdSection = config.qaContent.slice(
    config.firstSectionCount + config.secondSectionCount,
    config.firstSectionCount + config.secondSectionCount + config.thirdSectionCount
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

      {/* 直接显示第一组QA内容，不需要标题 */}
      <Box sx={{ mb: 8 }}>
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

      {/* 第二部分 - AI平台 */}
      <Box sx={{ mb: 8 }}>
        <Typography variant="h3" component="h2" gutterBottom>
          {config.secondSectionTitle}
        </Typography>
        <Typography variant="h5" color="text.secondary" paragraph>
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
        {/* AI平台按钮 */}
        <Box sx={{ mt: 4, textAlign: 'center' }}>
          <Button 
            variant="contained" 
            size="large" 
            onClick={() => window.open('https://c.d1kt.cn', '_blank')}
            sx={{ mt: 2 }}
          >
            进入第一课堂AI平台
          </Button>
        </Box>
      </Box>

      {/* 第三部分 - 课程中心 */}
      <Box sx={{ mb: 8 }}>
        <Typography variant="h3" component="h2" gutterBottom>
          {config.thirdSectionTitle}
        </Typography>
        <Typography variant="h5" color="text.secondary" paragraph>
          {config.thirdSectionSubtitle}
        </Typography>
        <Grid container spacing={4}>
          {thirdSection.map((qa, index) => (
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
        {/* 课程中心按钮 */}
        <Box sx={{ mt: 4, textAlign: 'center' }}>
          <Button 
            variant="contained" 
            size="large" 
            onClick={() => window.open('https://m.d1kt.cn', '_blank')}
            sx={{ mt: 2 }}
          >
            进入课程中心
          </Button>
        </Box>
      </Box>
    </Container>
  );
};

export default LandingPage; 