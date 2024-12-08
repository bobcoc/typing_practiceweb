// server/routes/practiceRecords.ts
import express, { Request, Response } from 'express';
import { PracticeRecord } from '../models/PracticeRecord';
import { auth } from '../middleware/auth';
import { Types, Error as MongooseError, startSession } from 'mongoose';
import { User, type IUser, type UserStats } from '../models/User'; 
import { validatePracticeSubmission } from '../middleware/practiceValidation';
const router = express.Router();

// 验证练习记录数据
interface PracticeStats {
  totalWords: number;
  correctWords: number;
  accuracy: number;
  wordsPerMinute: number;
  startTime: Date;
  endTime: Date;
  duration: number;
}

interface PracticeRecordBody {
  type: string;
  stats: PracticeStats;
}

// 保存练习记录
router.post('/', auth, validatePracticeSubmission, async (req: Request, res: Response) => {
  try {
    console.log('Received practice record request:', {
      body: req.body,
      user: req.user
    });

    // 验证用户信息
    if (!req.user?._id || !req.user?.username) {
      console.error('Missing user information in request');
      return res.status(401).json({ 
        error: '用户信息无效',
        code: 'INVALID_USER'
      });
    }

    // 验证请求体
    const { type, stats } = req.body as PracticeRecordBody;
    if (!type || !stats) {
      console.error('Invalid request body:', { type, stats });
      return res.status(400).json({ 
        error: '练习记录数据不完整',
        code: 'INVALID_DATA'
      });
    }
    // 检查是否存在最近的重复提交
    const recentRecord = await PracticeRecord.findOne({
      userId: new Types.ObjectId(req.user._id),
      'stats.startTime': stats.startTime,
    });

    if (recentRecord) {
      console.log('Detected duplicate submission:', {
        userId: req.user._id,
        existingRecord: recentRecord._id
      });
      return res.status(409).json({
        error: '检测到重复提交',
        code: 'DUPLICATE_SUBMISSION',
        existingRecordId: recentRecord._id
      });
    }
    // 验证统计数据
    if (
      typeof stats.totalWords !== 'number' ||
      typeof stats.correctWords !== 'number' ||
      typeof stats.accuracy !== 'number' ||
      typeof stats.wordsPerMinute !== 'number' ||
      !stats.startTime ||
      !stats.endTime ||
      typeof stats.duration !== 'number'
    ) {
      console.error('Invalid stats data:', stats);
      return res.status(400).json({ 
        error: '练习统计数据无效',
        code: 'INVALID_STATS'
      });
    }

    // 创建记录
    const record = new PracticeRecord({
      userId: new Types.ObjectId(req.user._id),
      username: req.user.username,
      fullname: req.user.fullname,
      type,
      stats: {
        ...stats,
        startTime: new Date(stats.startTime),
        endTime: new Date(stats.endTime),
      },
      inputEvents: req.body.inputEvents
    });
    
    // 保存练习记录 (移除 session)
    await record.save();

    // 查找用户并更新统计信息
    const user = await User.findById(req.user._id);
    if (!user) {
      throw new Error('User not found');
    }

    // 更新用户统计信息
    if (!user.stats) {
      user.stats = {
        totalPracticeCount: 0,
        totalWords: 0,
        totalAccuracy: 0,
        totalSpeed: 0, 
        accuracyHistory: [],
        todayPracticeTime: 0,
        lastPracticeDate: new Date()
      };
    }
    await user.updatePracticeStats({
      words: stats.totalWords,
      accuracy: stats.accuracy,
      duration: stats.duration,
      speed: stats.wordsPerMinute
    });

    console.log('Practice record and user stats updated successfully');
    res.status(201).json(record);
    
  } catch (error: unknown) {
    console.error('保存练习记录失败:', {
      error,
      message: error instanceof Error ? error.message : '未知错误',
      stack: error instanceof Error ? error.stack : undefined
    });

    if (error instanceof MongooseError.ValidationError) {
      return res.status(400).json({ 
        error: '数据验证失败',
        details: error.message,
        code: 'VALIDATION_ERROR'
      });
    }

    res.status(500).json({ 
      error: '保存练习记录失败',
      code: 'SAVE_ERROR'
    });
  }
});

// 获取用户统计信息
router.get('/statistics', auth, async (req: Request, res: Response) => {
  try {
    if (!req.user?._id) {
      return res.status(401).json({ 
        error: '用户信息无效',
        code: 'INVALID_USER'
      });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({
        error: '用户不存在',
        code: 'USER_NOT_FOUND'
      });
    }

    res.json({
      practiceCount: user.stats.totalPracticeCount || 0,
      totalWords: user.stats.totalWords || 0,
      avgAccuracy: user.stats.totalAccuracy || 0, // 直接使用存储的平均准确率
      avgSpeed: user.stats.totalSpeed || 0,
      todayPracticeTime: user.stats.todayPracticeTime || 0,
      accuracyTrend: user.stats.accuracyHistory.slice(-10), // 取最近10次的准确率记录
      lastPracticeDate: user.stats.lastPracticeDate || null
    });

  } catch (error) {
    console.error('获取统计数据失败:', error);
    res.status(500).json({ 
      error: '获取统计数据失败',
      code: 'FETCH_ERROR'
    });
  }
});
// 获取用户的练习记录
router.get('/my-records', auth, async (req: Request, res: Response) => {
  try {
    if (!req.user?._id) {
      return res.status(401).json({ 
        error: '用户信息无效',
        code: 'INVALID_USER'
      });
    }

    const records = await PracticeRecord.find({ 
      userId: new Types.ObjectId(req.user._id) 
    })
    .sort({ createdAt: -1 })
    .select('-__v'); // 排除版本字段

    console.log('Retrieved records count:', records.length);

    res.json(records);
  } catch (error) {
    console.error('获取记录失败:', error);
    res.status(500).json({ 
      error: '获取记录失败',
      code: 'FETCH_ERROR'
    });
  }
});

// 获取特定记录的详情
router.get('/:id', auth, async (req: Request, res: Response) => {
  try {
    if (!Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ 
        error: '无效的记录ID',
        code: 'INVALID_ID'
      });
    }

    const record = await PracticeRecord.findById(req.params.id)
      .select('-__v');

    if (!record) {
      return res.status(404).json({ 
        error: '记录不存在',
        code: 'NOT_FOUND'
      });
    }

    // 验证用户是否有权限访问该记录
    if (record.userId.toString() !== req.user?._id) {
      return res.status(403).json({ 
        error: '无权访问此记录',
        code: 'FORBIDDEN'
      });
    }

    res.json(record);
  } catch (error) {
    console.error('获取记录失败:', error);
    res.status(500).json({ 
      error: '获取记录失败',
      code: 'FETCH_ERROR'
    });
  }
});

export default router;