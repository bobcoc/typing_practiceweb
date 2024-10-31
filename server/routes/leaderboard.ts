// server/routes/leaderboard.ts
import express from 'express';
import { PracticeRecord } from '../models/PracticeRecord';
import { auth } from '../middleware/auth';

const router = express.Router();

// 获取排行榜数据
router.get('/:type', async (req, res) => {
  try {
    const { type } = req.params;
    const {
      page = '1',
      limit = '10',
      timeRange,
      userId,
      minAccuracy,
    } = req.query;

    const pageNum = parseInt(page as string);
    const pageSize = parseInt(limit as string);

    // 构建查询条件
    const query: any = { type };

    // 添加时间范围过滤
    if (timeRange) {
      const [start, end] = (timeRange as string).split(',');
      query.createdAt = {
        $gte: new Date(start),
        $lte: new Date(end),
      };
    }

    // 添加用户过滤
    if (userId) {
      query.userId = userId;
    }

    // 添加正确率过滤
    if (minAccuracy) {
      query['stats.accuracy'] = { $gte: parseFloat(minAccuracy as string) };
    }

    const records = await PracticeRecord
      .find(query)
      .sort({ 'stats.accuracy': -1, 'stats.totalWords': -1 })
      .skip((pageNum - 1) * pageSize)
      .limit(pageSize);

    const total = await PracticeRecord.countDocuments(query);

    res.json({
      records,
      total,
      currentPage: pageNum,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    console.error('获取排行榜失败:', error);
    res.status(500).json({ error: '获取排行榜失败' });
  }
});

// 获取用户在排行榜中的排名
router.get('/:type/my-rank', auth, async (req, res) => {
  try {
    const { type } = req.params;
    const userId = req.user?._id;

    // 获取用户最好的记录
    const userBestRecord = await PracticeRecord
      .findOne({ type, userId })
      .sort({ 'stats.accuracy': -1, 'stats.totalWords': -1 });

    if (!userBestRecord) {
      return res.json({ rank: null });
    }

    // 计算排名
    const betterRecordsCount = await PracticeRecord.countDocuments({
      type,
      $or: [
        { 'stats.accuracy': { $gt: userBestRecord.stats.accuracy } },
        {
          'stats.accuracy': userBestRecord.stats.accuracy,
          'stats.totalWords': { $gt: userBestRecord.stats.totalWords },
        },
      ],
    });

    res.json({
      rank: betterRecordsCount + 1,
      record: userBestRecord,
    });
  } catch (error) {
    res.status(500).json({ error: '获取排名失败' });
  }
});

// 获取统计数据
router.get('/:type/stats', async (req, res) => {
  try {
    const { type } = req.params;
    
    const stats = await PracticeRecord.aggregate([
      { $match: { type } },
      {
        $group: {
          _id: null,
          averageAccuracy: { $avg: '$stats.accuracy' },
          averageWPM: { $avg: '$stats.wordsPerMinute' },
          totalParticipants: { $addToSet: '$userId' },
          totalAttempts: { $sum: 1 },
        },
      },
    ]);

    res.json(stats[0] || {});
  } catch (error) {
    res.status(500).json({ error: '获取统计数据失败' });
  }
});

export default router;