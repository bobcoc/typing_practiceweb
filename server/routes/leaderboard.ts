// server/routes/leaderboard.ts
import express, { Request, Response } from 'express';
import { PracticeRecord } from '../models/PracticeRecord';
import { auth } from '../middleware/auth';

// 定义排序字段类型
type SortField = 'totalWords' | 'accuracy' | 'duration' | 'speed';

// 排序字段映射
const sortFieldMapping = {
  totalWords: { field: '$totalWords', label: '总单词数' },
  accuracy: { field: '$avgAccuracy', label: '平均正确率' },
  duration: { field: '$totalDuration', label: '练习总时长' },
  speed: { field: '$avgSpeed', label: '平均速度' }
};

const router = express.Router();

// 获取排行榜数据
router.get('/:type', async (req: Request, res: Response) => {
  try {
    const { type } = req.params;
    const { 
      page = '1', 
      limit = '10',
      sortBy = 'totalWords' // 默认按总单词数排序
    } = req.query;

    const pageNum = parseInt(page as string);
    const pageSize = parseInt(limit as string);
    const skipCount = (pageNum - 1) * pageSize;
    const sortField = sortBy as SortField;

    if (!Object.keys(sortFieldMapping).includes(sortField)) {
      return res.status(400).json({ error: '无效的排序字段' });
    }

    // 聚合查询
    const records = await PracticeRecord.aggregate([
      { $match: { type } },
      {
        $group: {
          _id: '$userId',
          username: { $first: '$username' },
          fullname: { $first: '$fullname' },
          totalWords: { $sum: '$stats.totalWords' },
          avgAccuracy: { $avg: '$stats.accuracy' },
          totalDuration: { $sum: '$stats.duration' },
          avgSpeed: { $avg: '$stats.wordsPerMinute' },
          lastPractice: { $max: '$stats.endTime' },
          practiceCount: { $sum: 1 }
        }
      },
      { 
        $sort: { 
          [sortFieldMapping[sortField].field.substring(1)]: -1 
        } 
      },
      { $skip: skipCount },
      { $limit: pageSize },
      {
        $project: {
          userId: '$_id',
          username: 1,
          fullname: 1,
          stats: {
            totalWords: '$totalWords',
            accuracy: '$avgAccuracy',
            duration: '$totalDuration',
            wordsPerMinute: '$avgSpeed',
            practiceCount: '$practiceCount',
            lastPractice: '$lastPractice'
          }
        }
      }
    ]);

    // 获取总用户数
    const totalUsers = await PracticeRecord.distinct('userId', { type });

    res.json({
      records,
      total: totalUsers.length,
      currentPage: pageNum,
      totalPages: Math.ceil(totalUsers.length / pageSize),
      sortField,
      sortLabel: sortFieldMapping[sortField].label
    });
  } catch (error) {
    console.error('获取排行榜失败:', error);
    res.status(500).json({ error: '获取排行榜失败' });
  }
});

// 获取用户排名
router.get('/:type/my-rank', auth, async (req: Request, res: Response) => {
  try {
    const { type } = req.params;
    const { sortBy = 'totalWords' } = req.query;
    const sortField = sortBy as SortField;

    if (!req.user?._id) {
      return res.status(401).json({ error: '未登录' });
    }

    if (!Object.keys(sortFieldMapping).includes(sortField)) {
      return res.status(400).json({ error: '无效的排序字段' });
    }

    // 获取所有用户的排序后记录
    const allRecords = await PracticeRecord.aggregate([
      { $match: { type } },
      {
        $group: {
          _id: '$userId',
          totalWords: { $sum: '$stats.totalWords' },
          avgAccuracy: { $avg: '$stats.accuracy' },
          totalDuration: { $sum: '$stats.duration' },
          avgSpeed: { $avg: '$stats.wordsPerMinute' }
        }
      },
      { 
        $sort: { 
          [sortFieldMapping[sortField].field.substring(1)]: -1 
        } 
      }
    ]);

    // 找到用户的排名
    const userRank = allRecords.findIndex(record => 
      record._id.toString() === req.user!._id
    ) + 1;

    res.json({
      rank: userRank > 0 ? userRank : null,
      totalParticipants: allRecords.length,
      sortField,
      sortLabel: sortFieldMapping[sortField].label
    });
  } catch (error) {
    console.error('获取排名失败:', error);
    res.status(500).json({ error: '获取排名失败' });
  }
});

export default router;