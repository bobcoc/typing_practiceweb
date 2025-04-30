import dotenv from 'dotenv';
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import session from 'express-session';
import MongoStore from 'connect-mongo';
import practiceTypesRouter from './routes/practiceTypes';
import codeExamplesRouter from './routes/codeExamples';
import authRouter from './routes/auth';
import keywordsRouter from './routes/keywords';
import practiceRecordsRouter from './routes/practiceRecords';
import leaderboardRouter from './routes/leaderboard';
import adminRoutes from './routes/admin';
import systemRoutes from './routes/system';
import oauth2Routes from './routes/oauth2.routes';
import visitorRoutes from './routes/visitor';
import vocabularyRoutes from './routes/vocabulary';
import userWordPassRouter from './routes/userWordPass';
// 加载环境变量
dotenv.config();

const app = express();

// 中间件配置
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

// MongoDB 连接
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/typeskill';

// 添加 session 配置
app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
        mongoUrl: MONGODB_URI,
        ttl: 24 * 60 * 60
    }),
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

// 如果使用了代理（如 nginx），添加这行
app.set('trust proxy', 1);

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
app.use('/api/oauth2', oauth2Routes);
app.use('/api/keywords', keywordsRouter);
app.use('/api/practice-records', practiceRecordsRouter);
app.use('/api/leaderboard', leaderboardRouter);
app.use('/api/admin', adminRoutes);
app.use('/api/system', systemRoutes);
app.use('/api/visitor', visitorRoutes);
app.use('/api/vocabulary', vocabularyRoutes);
app.use('/api', userWordPassRouter);
// 错误处理中间件
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});