import express, { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken'; 
import { config } from '../config'; 
import { MongoError } from 'mongodb'; 
import { User, type IUser, type UserStats } from '../models/User'; 
import bcrypt from 'bcrypt';
import { Session } from 'express-session';
import mongoose from 'mongoose';

interface CustomSession extends Session {
  userId?: string;
  isAuthenticated?: boolean;
}

// 扩展 Request 类型
interface CustomRequest extends Request {
  session: CustomSession;
}

// 定义 JWT payload 的类型
interface UserPayload {
  _id: string;
  username: string;
  fullname: string;
  email: string;
  isAdmin: boolean;
  exp?: number;
}

// 扩展 Express 的 Request 类型
declare global {
  namespace Express {
    interface Request {
      user?: UserPayload;
    }
  }
}

const router = express.Router();

// 定义路由处理函数类型
type RouteHandler = (
  req: Request,
  res: Response,
  next: NextFunction
)  => Promise<void | any>;  // 允许任何返回值

// 登录处理函数
const loginHandler: RouteHandler = async (req: CustomRequest, res) => {
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

    // 确保设置这些session值
    req.session.userId = (user._id as mongoose.Types.ObjectId).toString();
    req.session.isAuthenticated = true;
    
    // 如果有重定向参数，则重定向回原始OAuth2请求
    const redirectUrl = req.query.redirect || '/';

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
      username, fullname:user.fullname,
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
      },
      success: true,
      redirectUrl
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
        fullname: user.fullname,
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
// 中间件：验证 token
const authMiddleware: RouteHandler = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ message: '未登录' });
    }
    
    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, config.JWT_SECRET) as UserPayload;
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ message: '登录已过期，请重新登录' });
  }
};

// 修改密码处理函数
const changePasswordHandler: RouteHandler = async (req, res) => {
  try {
    if (!req.user?._id) {
      return res.status(401).json({ message: '未登录' });
    }
    
    const { oldPassword, newPassword } = req.body;

    // 参数验证
    if (!oldPassword || !newPassword) {
      return res.status(400).json({ message: '请提供原密码和新密码' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: '新密码长度至少6个字符' });
    }

    // 查找用户
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: '用户不存在' });
    }

    // 验证原密码
    const isPasswordValid = await user.comparePassword(oldPassword);
    if (!isPasswordValid) {
      console.log('Old password mismatch for user:', user.username);
      return res.status(401).json({ message: '原密码错误' });
    }

    // 更新密码
    user.password = newPassword;
    await user.save();

    console.log('Password changed successfully for user:', user.username);
    res.json({ message: '密码修改成功' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ 
      message: '修改密码失败：' + (error instanceof Error ? error.message : '未知错误') 
    });
  }
};

// 登出处理函数
const logoutHandler: RouteHandler = async (req: CustomRequest, res) => {
  try {
    console.log('Logout request received');
    
    // 清除 session
    if (req.session) {
      req.session.destroy((err) => {
        if (err) {
          console.error('Session destruction error:', err);
          return res.status(500).json({ message: '登出失败' });
        }
        
        // 清除 cookie
        res.clearCookie('connect.sid');
        
        console.log('Logout successful');
        res.json({ success: true, message: '登出成功' });
      });
    } else {
      console.log('No session to destroy');
      res.json({ success: true, message: '登出成功' });
    }
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ message: '登出失败' });
  }
};

// 登录路由
router.post('/login', loginHandler);

// 注册路由
router.post('/register', registerHandler);

// 登出路由
router.post('/logout', logoutHandler);

// 修改密码路由
router.post('/change-password', authMiddleware, changePasswordHandler);

export default router;