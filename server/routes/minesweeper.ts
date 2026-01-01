// server/routes/minesweeper.ts
import express, { Request, Response } from 'express';
import { MinesweeperRecord, MinesweeperDifficulty } from '../models/MinesweeperRecord';
import { auth } from '../middleware/auth';

const router = express.Router();

// 提交游戏记录（需要登录）
router.post('/record', auth, async (req: Request, res: Response) => {
  try {
    const { difficulty, timeSeconds, won } = req.body;
    
    if (!req.user?._id) {
      return res.status(401).json({ error: '未登录' });
    }

    // 验证难度级别
    const validDifficulties: MinesweeperDifficulty[] = ['beginner', 'intermediate', 'expert', 'brutal'];
    if (!validDifficulties.includes(difficulty)) {
      return res.status(400).json({ error: '无效的难度级别' });
    }

    // 验证时间
    if (typeof timeSeconds !== 'number' || timeSeconds < 0) {
      return res.status(400).json({ error: '无效的时间' });
    }

    // 验证胜负
    if (typeof won !== 'boolean') {
      return res.status(400).json({ error: '无效的游戏结果' });
    }

    // 创建游戏记录
    const record = new MinesweeperRecord({
      userId: req.user._id,
      username: req.user.username,
      fullname: req.user.fullname || req.user.username,
      difficulty,
      timeSeconds,
      won
    });

    await record.save();

    res.status(201).json({
      message: '游戏记录保存成功',
      record
    });
  } catch (error) {
    console.error('保存游戏记录失败:', error);
    res.status(500).json({ error: '保存游戏记录失败' });
  }
});

// 获取排行榜
router.get('/leaderboard/:difficulty', async (req: Request, res: Response) => {
  try {
    const { difficulty } = req.params;
    const { page = '1', limit = '10' } = req.query;

    // 验证难度级别
    const validDifficulties: MinesweeperDifficulty[] = ['beginner', 'intermediate', 'expert', 'brutal'];
    if (!validDifficulties.includes(difficulty as MinesweeperDifficulty)) {
      return res.status(400).json({ error: '无效的难度级别' });
    }

    const pageNum = parseInt(page as string);
    const pageSize = parseInt(limit as string);
    const skipCount = (pageNum - 1) * pageSize;

    // 获取排行榜数据
    const records = await MinesweeperRecord.getLeaderboard(
      difficulty as MinesweeperDifficulty,
      skipCount,
      pageSize
    );

    // 获取总用户数（只统计获胜的用户）
    const totalUsers = await MinesweeperRecord.distinct('userId', { 
      difficulty,
      won: true 
    });

    res.json({
      records,
      total: totalUsers.length,
      currentPage: pageNum,
      totalPages: Math.ceil(totalUsers.length / pageSize),
      difficulty
    });
  } catch (error) {
    console.error('获取排行榜失败:', error);
    res.status(500).json({ error: '获取排行榜失败' });
  }
});

// 获取用户的个人最佳成绩（需要登录）
router.get('/personal-best/:difficulty', auth, async (req: Request, res: Response) => {
  try {
    const { difficulty } = req.params;

    if (!req.user?._id) {
      return res.status(401).json({ error: '未登录' });
    }

    // 验证难度级别
    const validDifficulties: MinesweeperDifficulty[] = ['beginner', 'intermediate', 'expert', 'brutal'];
    if (!validDifficulties.includes(difficulty as MinesweeperDifficulty)) {
      return res.status(400).json({ error: '无效的难度级别' });
    }

    // 查找用户的最佳成绩
    const bestRecord = await MinesweeperRecord.findOne({
      userId: req.user._id,
      difficulty,
      won: true
    }).sort({ timeSeconds: 1 });

    if (!bestRecord) {
      return res.json({
        hasBest: false,
        message: '暂无最佳成绩'
      });
    }

    res.json({
      hasBest: true,
      bestTime: bestRecord.timeSeconds,
      createdAt: bestRecord.createdAt
    });
  } catch (error) {
    console.error('获取个人最佳成绩失败:', error);
    res.status(500).json({ error: '获取个人最佳成绩失败' });
  }
});

// 获取用户的游戏统计（需要登录）
router.get('/stats', auth, async (req: Request, res: Response) => {
  try {
    if (!req.user?._id) {
      return res.status(401).json({ error: '未登录' });
    }

    const stats = await MinesweeperRecord.aggregate([
      { $match: { userId: req.user._id } },
      {
        $group: {
          _id: '$difficulty',
          totalGames: { $sum: 1 },
          wonGames: { $sum: { $cond: ['$won', 1, 0] } },
          bestTime: { $min: { $cond: ['$won', '$timeSeconds', null] } }
        }
      }
    ]);

    res.json({ stats });
  } catch (error) {
    console.error('获取游戏统计失败:', error);
    res.status(500).json({ error: '获取游戏统计失败' });
  }
});

export default router;
