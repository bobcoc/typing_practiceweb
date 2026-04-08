import express, { Request, Response } from 'express';
import { SudokuRecord, SudokuDifficulty } from '../models/SudokuRecord';
import { auth } from '../middleware/auth';

const router = express.Router();

// 提交数独记录（需要登录）
router.post('/record', auth, async (req: Request, res: Response) => {
  try {
    const { difficulty, timeSeconds, won } = req.body;

    if (!req.user?._id) {
      return res.status(401).json({ error: '未登录' });
    }

    const validDifficulties: SudokuDifficulty[] = ['easy', 'medium', 'hard'];
    if (!validDifficulties.includes(difficulty)) {
      return res.status(400).json({ error: '无效的难度级别' });
    }

    if (typeof timeSeconds !== 'number' || timeSeconds < 0) {
      return res.status(400).json({ error: '无效的时间' });
    }

    if (typeof won !== 'boolean') {
      return res.status(400).json({ error: '无效的游戏结果' });
    }

    const record = new SudokuRecord({
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
    console.error('保存数独记录失败:', error);
    res.status(500).json({ error: '保存数独记录失败' });
  }
});

// 获取数独排行榜
router.get('/leaderboard/:difficulty', async (req: Request, res: Response) => {
  try {
    const { difficulty } = req.params;
    const { page = '1', limit = '10' } = req.query;

    const validDifficulties: SudokuDifficulty[] = ['easy', 'medium', 'hard'];
    if (!validDifficulties.includes(difficulty as SudokuDifficulty)) {
      return res.status(400).json({ error: '无效的难度级别' });
    }

    const pageNum = parseInt(page as string, 10);
    const pageSize = parseInt(limit as string, 10);
    const skipCount = (pageNum - 1) * pageSize;

    const records = await SudokuRecord.getLeaderboard(
      difficulty as SudokuDifficulty,
      skipCount,
      pageSize
    );

    const totalUsers = await SudokuRecord.distinct('userId', {
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
    console.error('获取数独排行榜失败:', error);
    res.status(500).json({ error: '获取数独排行榜失败' });
  }
});

export default router;
