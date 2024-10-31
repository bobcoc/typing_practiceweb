import { Request, Response, NextFunction } from 'express';
import User from '../models/User';

export const isAdmin = async (req: Request, res: Response, next: NextFunction) => {
  const userId = req.userId; // 假设你有某种方式获取当前用户ID
  const user = await User.findById(userId);
  if (user && user.isAdmin) {
    next();
  } else {
    res.status(403).json({ error: '无权访问' });
  }
}; 