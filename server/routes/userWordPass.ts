import express from 'express';
import { User } from '../models/User';
import { WordRecord } from '../models/Vocabulary';

const router = express.Router();

/**
 * 查询指定用户名前缀的用户及其通过单词数
 * GET /api/user-word-pass?prefix=2023101
 */
router.get('/user-word-pass', async (req, res) => {
  try {
    const { prefix } = req.query;
    if (!prefix || typeof prefix !== 'string') {
      return res.status(400).json({ message: '缺少前缀参数' });
    }

    // 1. 查找所有以 prefix 开头的用户
    const users = await User.find({ username: { $regex: `^${prefix}` } })
      .select('_id username fullname')
      .lean();

    if (users.length === 0) {
      return res.json([]);
    }

    // 2. 查找这些用户的通过单词数
    const userIds = users.map(u => u._id);

    // 聚合统计每个用户 isFullyMastered 为 true 的数量
    const wordPassStats = await WordRecord.aggregate([
      { $match: { user: { $in: userIds }, isFullyMastered: true } },
      { $group: { _id: '$user', passCount: { $sum: 1 } } }
    ]);

    // 组装统计结果
    const passMap = new Map<string, number>();
    wordPassStats.forEach(item => {
      passMap.set(item._id.toString(), item.passCount);
    });

    // 3. 合并并排序
    const result = users.map(u => ({
      username: u.username,
      fullname: u.fullname,
      passCount: passMap.get(u._id.toString()) || 0
    })).sort((a, b) => b.passCount - a.passCount);

    res.json(result);
  } catch (error) {
    console.error('查询用户通过单词数失败:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

export default router;
