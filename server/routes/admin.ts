// server/routes/admin.ts
import express from 'express';
import { adminAuth } from '../middleware/auth';
import { User } from '../models/User';
import bcrypt from 'bcrypt';
import { OAuth2Client } from '../models/oauth2';
import { AdminController } from './admin.controller';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import csv from 'csv-parser';
import { Word, WordSet } from '../models/Vocabulary';
import mongoose from 'mongoose';

const router = express.Router();
const adminController = new AdminController();

// 配置 multer 用于文件上传
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../uploads');
    // 确保上传目录存在
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 限制5MB
  },
  fileFilter: function (req, file, cb) {
    // 只允许上传CSV文件
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('只支持CSV文件'));
    }
  }
});

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
router.get('/oauth2/clients', adminAuth, (req, res) => adminController.listOAuth2Clients(req, res));

router.post('/oauth2/clients', adminAuth, (req, res) => adminController.createOAuth2Client(req, res));

router.put('/oauth2/clients/:id', adminAuth, (req, res) => adminController.updateOAuth2Client(req, res));

router.delete('/oauth2/clients/:id', adminAuth, (req, res) => adminController.deleteOAuth2Client(req, res));

// ===== 单词库管理路由 =====

// 获取所有单词集
router.get('/vocabulary/word-sets', adminAuth, async (req, res) => {
  try {
    const wordSets = await WordSet.find()
      .select('name description totalWords createdAt owner')
      .populate('owner', 'username fullname')
      .sort({ createdAt: -1 });
    
    res.json(wordSets);
  } catch (error) {
    console.error('获取单词集失败:', error);
    res.status(500).json({ message: '获取单词集失败' });
  }
});

// 上传单词文件并创建单词集（管理员版本）
router.post('/vocabulary/upload', adminAuth, upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: '请上传文件' });
  }
  
  try {
    const { name, description, ownerId } = req.body;
    const fileName = req.file.filename;
    const filePath = req.file.path;
    
    // 如果没有指定所有者，默认为当前管理员
    const owner = ownerId || req.user._id;
    
    // 检查是否已存在同名单词集
    const existingSet = await WordSet.findOne({ 
      name: name || path.basename(fileName, '.csv'),
      owner: owner
    });
    
    if (existingSet) {
      // 删除上传的文件
      fs.unlinkSync(filePath);
      return res.status(400).json({ message: '已存在同名单词集' });
    }
    
    // 创建单词集
    const wordSet = await WordSet.create({
      name: name || path.basename(fileName, '.csv'),
      description: description || '',
      owner: owner,
      totalWords: 0
    });
    
    const results: any[] = [];
    let wordCount = 0;
    
    // 处理CSV文件
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (data) => {
        // 检查必要的字段是否存在
        if (data.word && data.translation) {
          results.push({
            word: data.word.trim(),
            translation: data.translation.trim(),
            pronunciation: data.pronunciation?.trim(),
            example: data.example?.trim(),
            wordSet: wordSet._id
          });
          wordCount++;
        }
      })
      .on('end', async () => {
        try {
          // 批量插入单词
          if (results.length > 0) {
            await Word.insertMany(results);
            
            // 更新单词集的单词数量
            await WordSet.findByIdAndUpdate(wordSet._id, { totalWords: wordCount });
          }
          
          // 删除上传的文件
          fs.unlinkSync(filePath);
          
          res.status(201).json({ 
            message: `成功创建单词集并导入${wordCount}个单词`,
            wordSet
          });
        } catch (error) {
          // 如果插入单词失败，删除创建的单词集
          await WordSet.findByIdAndDelete(wordSet._id);
          
          console.error('导入单词失败:', error);
          res.status(500).json({ message: '导入单词失败' });
        }
      })
      .on('error', (error) => {
        console.error('处理CSV文件失败:', error);
        res.status(500).json({ message: '处理CSV文件失败' });
      });
  } catch (error) {
    console.error('上传文件失败:', error);
    res.status(500).json({ message: '上传文件失败' });
  }
});

// 删除单词集
router.delete('/vocabulary/word-sets/:id', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    
    // 检查单词集是否存在
    const wordSet = await WordSet.findById(id);
    if (!wordSet) {
      return res.status(404).json({ message: '未找到单词集' });
    }
    
    // 删除单词集及其关联的所有单词
    await Word.deleteMany({ wordSet: id });
    await WordSet.findByIdAndDelete(id);
    
    res.json({ message: '单词集已删除' });
  } catch (error) {
    console.error('删除单词集失败:', error);
    res.status(500).json({ message: '删除单词集失败' });
  }
});

// 单词集详情（包括所有单词）
router.get('/vocabulary/word-sets/:id/words', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    
    // 检查单词集是否存在
    const wordSet = await WordSet.findById(id);
    if (!wordSet) {
      return res.status(404).json({ message: '未找到单词集' });
    }
    
    // 获取单词集中的所有单词
    const words = await Word.find({ wordSet: id });
    
    res.json({
      wordSet,
      words
    });
  } catch (error) {
    console.error('获取单词集详情失败:', error);
    res.status(500).json({ message: '获取单词集详情失败' });
  }
});

export default router;