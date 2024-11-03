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

export default router;