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
  },
  {
    question: "第一课堂AI平台有哪些特色功能？",
    answer: "1. 多模型集成：整合了deepseek、阿里千问、智谙AI等主流大模型\n2. 智能教学助手：为教师提供备课、出题、批改作业等全方位支持\n3. 个性化学习：根据学生水平推荐适合的学习内容和练习\n4. 实时互动：支持师生在线交流和即时答疑",
    category: "平台介绍"
  },
  {
    question: "第一课堂AI平台如何帮助教师？",
    answer: "1. 自动生成教案和课件，节省备课时间\n2. 智能分析学生作业和考试数据，掌握学情\n3. 提供个性化教学建议和教学策略优化方案\n4. 协助设计多样化的课堂活动和互动环节",
    category: "教师服务"
  },
  {
    question: "学生如何充分利用第一课堂AI平台？",
    answer: "1. 获取个性化学习建议和解答\n2. 利用AI辅助完成作业和自主学习\n3. 通过智能练习系统巩固知识点\n4. 使用AI工具进行学习规划和时间管理",
    category: "学生服务"
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