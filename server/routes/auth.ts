import express, { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken'; 
import { config } from '../config'; 
import { MongoError } from 'mongodb'; 
import { User, type IUser, type UserStats } from '../models/User'; 
const router = express.Router();

// 定义路由处理函数类型
type RouteHandler = (
  req: Request,
  res: Response,
  next: NextFunction
)  => Promise<void | any>;  // 允许任何返回值

// 登录处理函数
const loginHandler: RouteHandler = async (req, res) => {
  try {
    const { username, password } = req.body;
    
    console.log('Login attempt:', { username });
    
    const user = await User.findOne({ username });
    
    if (!user) {
      console.log('User not found');
      res.status(401).json({ message: '用户名不存在' });
      return;
    }
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      console.log('Password mismatch');
      return res.status(401).json({ message: '密码错误' });
    }


    // 生成 JWT token
    const token = jwt.sign(
      {
        _id: user._id,
        username: user.username,
        fullname: user.fullname,
        email: user.email,
        isAdmin: user.isAdmin
      },
      config.JWT_SECRET,
      { expiresIn: '24h' }
    );

    // 调试：打印 token 信息（不打印完整 token）
    console.log('Generated token info:', {
      username: user.username,
      tokenLength: token.length,
      tokenStart: token.substring(0, 20) + '...'
    });

    console.log('Login successful:', { 
      username, 
      isAdmin: user.isAdmin,
      hasToken: !!token 
    });
    
    res.json({
      token,
      user: {
        _id: user._id,
        username: user.username,
        fullname: user.fullname,
        email: user.email,
        isAdmin: user.isAdmin
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: '登录失败' });
  }
};

// 注册处理函数
const registerHandler: RouteHandler = async (req, res) => {
  try {
    const { username, password, email,fullname } = req.body;
    
    console.log('Registration attempt:', { username, email,fullname });
    if (!email) {
      return res.status(400).json({ message: '邮箱是必填项' });
    }
    // 检查用户名是否存在
    const existingUsername = await User.findOne({ username });
    if (existingUsername) {
      return res.status(400).json({ message: '用户名已存在' });
    }


      const existingEmail = await User.findOne({ email });
      if (existingEmail) {
        return res.status(400).json({ message: '邮箱已被使用' });
      }
    
    const userCount = await User.countDocuments();
    const isAdmin = userCount === 0;
    
    const user = new User({
      username,
      password,
      email,fullname ,
      isAdmin
    });
    
    await user.save();
    
    const token = jwt.sign(
      {
        _id: user._id,
        username: user.username,
        email: user.email,
        isAdmin: user.isAdmin
      },
      config.JWT_SECRET,
      { expiresIn: '24h' }
    );

    console.log('Registration successful:', {
      username: user.username,
      email: user.email,
      isAdmin: user.isAdmin,
      hasToken: !!token
    });
    
    res.status(201).json({
      token,
      user: {
        _id: user._id,
        username: user.username,
        fullname:user.fullname,
        email: user.email,
        isAdmin: user.isAdmin
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    
    if (error instanceof MongoError && error.code === 11000) {
      res.status(400).json({ message: '用户名或邮箱已存在' });
    } else {
      res.status(500).json({ 
        message: '注册失败：' + (error instanceof Error ? error.message : '未知错误') 
      });
    }
  }
};

// 注册路由
router.post('/login', loginHandler);
router.post('/register', registerHandler);

export default router;