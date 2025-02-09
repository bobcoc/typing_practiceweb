import React from 'react';
import { Container, Typography, Card, CardContent, Grid, Button, Box } from '@mui/material';
import { useNavigate } from 'react-router-dom';

const qaContent = [
  {
    question: "中小学老师应该怎么利用AI?",
    answer: "1. 备课助手：利用AI生成教案大纲、课件素材和教学建议\n2. 个性化辅导：根据学生学习数据制定针对性教学策略\n3. 作业批改：使用AI辅助批改作业，提供详细的错误分析\n4. 教学反馈：通过AI分析课堂数据，优化教学方法",
    category: "教师指南"
  },
  {
    question: "如何引导学生正确使用AI工具？",
    answer: "1. 强调AI是辅助工具，不是替代思考的工具\n2. 教导学生验证AI输出的准确性\n3. 培养学生的信息素养和批判性思维\n4. 设置合理的AI使用边界和规范",
    category: "学生指导"
  },
  {
    question: "AI如何促进因材施教？",
    answer: "1. 精准识别学生知识掌握程度\n2. 自动生成适应性练习题\n3. 提供个性化学习路径建议\n4. 实时跟踪学习进度并调整教学策略",
    category: "教学策略"
  },
  {
    question: "如何将AI融入课堂教学？",
    answer: "1. 使用AI进行实时语言翻译和解释\n2. 创建交互式教学内容\n3. 利用AI进行课堂提问和讨论引导\n4. 应用AI辅助教学评估和反馈",
    category: "课堂应用"
  }
];

const LandingPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <Container maxWidth="lg" sx={{ py: 8 }}>
      {/* 头部区域 */}
      <Box sx={{ mb: 8, textAlign: 'center' }}>
        <Typography variant="h3" component="h1" gutterBottom>
          AI教育创新平台
        </Typography>
        <Typography variant="h5" color="text.secondary" paragraph>
          赋能教育，智启未来
        </Typography>
        <Button 
          variant="contained" 
          size="large" 
          onClick={() => navigate('/typing')}
          sx={{ mt: 2 }}
        >
          进入打字练习
        </Button>
      </Box>

      {/* QA内容区域 */}
      <Typography variant="h4" sx={{ mb: 4 }}>
        AI教育常见问题解答
      </Typography>
      <Grid container spacing={4}>
        {qaContent.map((qa, index) => (
          <Grid item xs={12} md={6} key={index}>
            <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <CardContent>
                <Typography variant="overline" color="primary">
                  {qa.category}
                </Typography>
                <Typography variant="h6" component="h2" gutterBottom>
                  {qa.question}
                </Typography>
                <Typography variant="body1" color="text.secondary" 
                  sx={{ whiteSpace: 'pre-line' }}>
                  {qa.answer}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Container>
  );
};

export default LandingPage; 