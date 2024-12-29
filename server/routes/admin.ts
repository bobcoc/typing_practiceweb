// server/routes/admin.ts
import express from 'express';
import { adminAuth } from '../middleware/auth';
import { User } from '../models/User';
import bcrypt from 'bcrypt';
import { OAuth2Client } from '../models/oauth2';
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
router.post('/users', adminAuth, async (req, res) => {
  try {
    const { username, email, password, fullname, isAdmin } = req.body;
    // 验证必填字段
    if (!username || !email || !password || !fullname) {
      return res.status(400).json({ message: '请填写所有必填字段' });
    }

    // 检查用户名是否已存在
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ message: '用户名已被使用' });
    }

    // 检查邮箱是否已存在
    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
      return res.status(400).json({ message: '邮箱已被使用' });
    }

    // 创建新用户

    const newUser = new User({
      username,
      email,
      password: password,
      fullname,
      isAdmin: isAdmin || false
    });

    await newUser.save();

    // 返回用户信息（不包含密码）
    const userResponse = await User.findById(newUser._id).select('-password');
    res.status(201).json(userResponse);
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ message: '创建用户失败' });
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

// OAuth2 客户端管理路由
router.get('/oauth2/clients', adminAuth, async (req, res) => {
  try {
    const clients = await OAuth2Client.find().sort({ createdAt: -1 });
    res.json(clients);
  } catch (error) {
    console.error('Error fetching OAuth2 clients:', error);
    res.status(500).json({ message: '获取客户端列表失败' });
  }
});

router.post('/oauth2/clients', adminAuth, async (req, res) => {
  try {
    const newClient = new OAuth2Client(req.body);
    await newClient.save();
    res.status(201).json(newClient);
  } catch (error) {
    console.error('Error creating OAuth2 client:', error);
    res.status(500).json({ message: '创建客户端失败' });
  }
});

router.put('/oauth2/clients/:id', adminAuth, async (req, res) => {
  try {
    const client = await OAuth2Client.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    if (!client) {
      return res.status(404).json({ message: '客户端不存在' });
    }
    res.json(client);
  } catch (error) {
    console.error('Error updating OAuth2 client:', error);
    res.status(500).json({ message: '更新客户端失败' });
  }
});

router.delete('/oauth2/clients/:id', adminAuth, async (req, res) => {
  try {
    const client = await OAuth2Client.findByIdAndDelete(req.params.id);
    if (!client) {
      return res.status(404).json({ message: '客户端不存在' });
    }
    res.json({ message: '客户端已删除' });
  } catch (error) {
    console.error('Error deleting OAuth2 client:', error);
    res.status(500).json({ message: '删除客户端失败' });
  }
});

export default router;