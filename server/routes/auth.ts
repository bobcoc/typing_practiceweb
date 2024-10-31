import express, { Request, Response, NextFunction } from 'express';
import { User } from '../models/User';

const router = express.Router();

// 定义路由处理函数类型
type RouteHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => Promise<void>;

// 登录处理函数
const loginHandler: RouteHandler = async (req, res) => {
  try {
    const { username, password } = req.body;
    
    console.log('Login attempt:', { username });
    
    const user = await User.findOne({ username });
    
    if (!user) {
      console.log('User not found');
      res.status(401).json({ message: '用户名或密码错误' });
      return;
    }

    if (user.password !== password) {
      console.log('Password mismatch');
      res.status(401).json({ message: '用户名或密码错误' });
      return;
    }

    console.log('Login successful:', { username, isAdmin: user.isAdmin });
    
    res.json({
      username: user.username,
      isAdmin: user.isAdmin
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: '登录失败' });
  }
};

// 注册处理函数
const registerHandler: RouteHandler = async (req, res) => {
  try {
    const { username, password } = req.body;
    
    const userCount = await User.countDocuments();
    const isAdmin = userCount === 0;
    
    const user = new User({
      username,
      password,
      isAdmin
    });
    
    await user.save();
    
    res.status(201).json({
      username: user.username,
      isAdmin: user.isAdmin
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: '注册失败' });
  }
};

// 注册路由
router.post('/login', loginHandler);
router.post('/register', registerHandler);

export default router; 