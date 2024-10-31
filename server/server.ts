import express from 'express';
import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import cors from 'cors';

const app = express();

// 中间件配置
app.use(cors({
    origin: 'http://localhost:3001',
    methods: ['GET', 'POST'],
    credentials: true
}));

app.use(express.json());

// 接口定义
interface IUser extends mongoose.Document {
    username: string;
    password: string;
    createdAt: Date;
}

interface IScore extends mongoose.Document {
    userId: mongoose.Types.ObjectId;
    username: string;
    level: number;
    accuracy: number;
    speed: number;
    timestamp: Date;
}

// 请求体接口
interface RegisterLoginRequest {
    username: string;
    password: string;
}

interface ScoreRequest {
    userId: string;
    username: string;
    level: number;
    accuracy: number;
    speed: number;
}

// Schema 定义
const UserSchema = new mongoose.Schema({
    username: { type: String, unique: true, required: true },
    password: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});

const ScoreSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    username: String,
    level: Number,
    accuracy: Number,
    speed: Number,
    timestamp: { type: Date, default: Date.now }
});

const User = mongoose.model<IUser>('User', UserSchema);
const Score = mongoose.model<IScore>('Score', ScoreSchema);

// API 路由处理器
const registerHandler = async (req: Request, res: Response): Promise<void> => {
    try {
        const { username, password } = req.body as RegisterLoginRequest;
        const existingUser = await User.findOne({ username });
        if (existingUser) {
            res.status(400).json({ message: '用户名已存在' });
            return;
        }
        const user = new User({ username, password });
        await user.save();
        res.status(201).json({ message: '注册成功', userId: user._id });
    } catch (error) {
        res.status(500).json({ message: error instanceof Error ? error.message : '注册失败' });
    }
};

const loginHandler = async (req: Request, res: Response): Promise<void> => {
    try {
        const { username, password } = req.body as RegisterLoginRequest;
        const user = await User.findOne({ username, password });
        if (!user) {
            res.status(401).json({ message: '用户名或密码错误' });
            return;
        }
        res.json({ 
            message: '登录成功',
            user: {
                id: user._id,
                username: user.username
            }
        });
    } catch (error) {
        res.status(500).json({ message: error instanceof Error ? error.message : '登录失败' });
    }
};

const submitScoreHandler = async (req: Request, res: Response): Promise<void> => {
    try {
        const { userId, username, level, accuracy, speed } = req.body as ScoreRequest;
        const newScore = new Score({
            userId,
            username,
            level,
            accuracy,
            speed
        });
        await newScore.save();
        res.status(201).json(newScore);
    } catch (error) {
        res.status(400).json({ message: error instanceof Error ? error.message : '保存失败' });
    }
};

const getLeaderboardHandler = async (req: Request, res: Response): Promise<void> => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const pageSize = 10;
        const skip = (page - 1) * pageSize;

        const total = await Score.countDocuments();
        const scores = await Score.find()
            .sort({ accuracy: -1, speed: -1 })
            .skip(skip)
            .limit(pageSize);

        res.json({
            scores,
            total,
            currentPage: page,
            totalPages: Math.ceil(total / pageSize)
        });
    } catch (error) {
        res.status(500).json({ message: error instanceof Error ? error.message : 'Unknown error' });
    }
};

// 路由注册
app.post('/api/register', registerHandler);
app.post('/api/login', loginHandler);
app.post('/api/scores', submitScoreHandler);
app.get('/api/leaderboard', getLeaderboardHandler);

// 错误处理中间件
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error(err.stack);
    res.status(500).json({ message: 'Something went wrong!' });
});

// 启动服务器和数据库连接
const startServer = async () => {
    try {
        await mongoose.connect('mongodb://localhost:27017/type_practice');
        console.log('MongoDB connected successfully');
        
        const PORT = process.env.PORT || 5001;
        app.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`);
        });
    } catch (err) {
        console.error('MongoDB connection error:', err);
        process.exit(1);
    }
};

startServer();