import dotenv from 'dotenv';
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';

// 加载环境变量
dotenv.config();

const app = express();

// 中间件配置
app.use(express.json());
app.use(cors({
  origin: `http://localhost:${process.env.CLIENT_PORT || 3001}`
}));

// MongoDB 连接
mongoose.connect(process.env.MONGODB_URI!)
  .then(() => {
    console.log('MongoDB connected successfully');
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err);
  });

// 路由配置
// ... 其他路由配置 ...

const port = process.env.SERVER_PORT || 5001;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});