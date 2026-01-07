// server/routes/towerDefense.ts
import express, { Request, Response } from 'express';
import { TowerDefenseRecord } from '../models/TowerDefenseRecord';
import { auth } from '../middleware/auth';

const router = express.Router();

// 提交塔防记录（需要登录）
router.post('/record', auth, async (req: Request, res: Response) => {
  try {
    const { wave, score, timeSeconds } = req.body;
    
    if (!req.user?._id) {
      return res.status(401).json({ error: '未登录' });
    }

    if (typeof wave !== 'number' || wave < 0) {
      return res.status(400).json({ error: '无效的波次数据' });
    }

    if (typeof score !== 'number' || score < 0) {
      return res.status(400).json({ error: '无效的分数数据' });
    }

    if (typeof timeSeconds !== 'number' || timeSeconds < 0) {
      return res.status(400).json({ error: '无效的游戏时长' });
    }

    const record = new TowerDefenseRecord({
      userId: req.user._id,
      username: req.user.username,
      fullname: req.user.fullname || req.user.username,
      wave,
      score,
      timeSeconds
    });

    await record.save();

    res.status(201).json({
      message: '记录保存成功',
      record
    });
  } catch (error) {
    console.error('保存塔防记录失败:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// 获取排行榜
router.get('/leaderboard', async (req: Request, res: Response) => {
  try {
    const { page = '1', limit = '10' } = req.query;
    const pageNum = parseInt(page as string);
    const pageSize = parseInt(limit as string);
    const skipCount = (pageNum - 1) * pageSize;

    const records = await TowerDefenseRecord.getLeaderboard(skipCount, pageSize);
    const totalUsers = await TowerDefenseRecord.distinct('userId');

    res.json({
      records,
      total: totalUsers.length,
      currentPage: pageNum,
      totalPages: Math.ceil(totalUsers.length / pageSize)
    });
  } catch (error) {
    console.error('获取排行榜失败:', error);
    res.status(500).json({ error: '获取排行榜失败' });
  }
});

// 获取个人最佳
router.get('/personal-best', auth, async (req: Request, res: Response) => {
  try {
    if (!req.user?._id) {
      return res.status(401).json({ error: '未登录' });
    }

    const bestRecord = await TowerDefenseRecord.findOne({
      userId: req.user._id
    }).sort({ score: -1 });

    if (!bestRecord) {
      return res.json({ hasBest: false });
    }

    res.json({
      hasBest: true,
      bestScore: bestRecord.score,
      bestWave: bestRecord.wave,
      createdAt: bestRecord.createdAt
    });
  } catch (error) {
    console.error('获取个人最佳失败:', error);
    res.status(500).json({ error: '获取个人最佳失败' });
  }
});

export default router;
