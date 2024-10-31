import dotenv from 'dotenv';
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import practiceTypesRouter from './routes/practiceTypes';
import codeExamplesRouter from './routes/codeExamples';
import authRouter from './routes/auth';

// 加载环境变量
dotenv.config();

const app = express();

// 中间件配置
app.use(express.json());
app.use(cors());

// MongoDB 连接
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/typeskill';

mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('Connected to MongoDB');
  })
  .catch((error) => {
    console.error('MongoDB connection error:', error);
  });

// 路由配置
app.use('/api/practice-types', practiceTypesRouter);
app.use('/api/code-examples', codeExamplesRouter);
app.use('/api/auth', authRouter);

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});