// server/routes/admin.ts
import express from 'express';
import { adminAuth } from '../middleware/auth';
import { User } from '../models/User';  // 使用命名导入

const router = express.Router();

router.get('/users', adminAuth, async (req, res) => {

  console.log('Admin users route accessed'); 
  try {
    const users = await User.find()
      .select('-password')
      .sort({ createdAt: -1 });
    console.log('Found users:', users.length);  // 添加这行
    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ message: '获取用户列表失败' });
  }
});
// 添加 PUT 路由用于更新用户
router.put('/users/:id', adminAuth, async (req, res) => {
  try {
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
export default router;