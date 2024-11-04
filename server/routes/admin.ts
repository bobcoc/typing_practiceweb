// server/routes/admin.ts
import express from 'express';
import { adminAuth } from '../middleware/auth';
import { User } from '../models/User';

const router = express.Router();

router.get('/users', adminAuth, async (req, res) => {
  try {
    const users = await User.find()
      .select('-password')
      .sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: '获取用户列表失败' });
  }
});
// 添加 PUT 路由用于更新用户
router.put('/users/:id', adminAuth, async (req, res) => {
  try {
    // 检查用户名是否已存在（排除当前用户）
    const existingUser = await User.findOne({
      username: req.body.username,
      _id: { $ne: req.params.id }
    });
    
    if (existingUser) {
      return res.status(400).json({ message: '用户名已被使用' });
    }

    // 检查邮箱是否已存在（排除当前用户）
    if (req.body.email) {
      const existingEmail = await User.findOne({
        email: req.body.email,
        _id: { $ne: req.params.id }
      });
      
      if (existingEmail) {
        return res.status(400).json({ message: '邮箱已被使用' });
      }
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, select: '-password' }
    );

    if (!user) {
      return res.status(404).json({ message: '用户不存在' });
    }

    res.json(user);
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ message: '更新用户失败' });
  }
});

// 添加删除用户路由
router.delete('/users/:id', adminAuth, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({ message: '用户不存在' });
    }

    // 防止删除最后一个管理员
    if (user.isAdmin) {
      const adminCount = await User.countDocuments({ isAdmin: true });
      if (adminCount <= 1) {
        return res.status(400).json({ message: '不能删除最后一个管理员' });
      }
    }

    await User.findByIdAndDelete(req.params.id);
    res.json({ message: '用户已删除' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ message: '删除用户失败' });
  }
});
export default router;