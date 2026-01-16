// server/routes/towerDefense.ts
import express, { Request, Response } from 'express';
import { TowerDefenseRecord } from '../models/TowerDefenseRecord';
import { TowerDefenseSave } from '../models/TowerDefenseSave';
import { auth } from '../middleware/auth';

const router = express.Router();

// 简单的内存去重/速率限制（仅用于示例，生产环境请使用 Redis 等持久/分布式存储）
const lastSubmissionByUser = new Map<string, { ts: number; score: number; wave: number }>();
const submissionWindow = new Map<string, { windowStart: number; count: number }>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX = 20; // max submissions per user per window

// 提交塔防记录（需要登录）
router.post('/record', auth, async (req: Request, res: Response) => {
  try {
    const { wave, score, timeSeconds } = req.body;
    
    if (!req.user?._id) {
      return res.status(401).json({ error: '未登录' });
    }

    const uid = String(req.user._id);

    // rate limit
    try {
      const now = Date.now();
      const win = submissionWindow.get(uid) || { windowStart: now, count: 0 };
      if (now - win.windowStart > RATE_LIMIT_WINDOW_MS) {
        win.windowStart = now;
        win.count = 0;
      }
      win.count++;
      submissionWindow.set(uid, win);
      if (win.count > RATE_LIMIT_MAX) {
        return res.status(429).json({ error: '提交过于频繁，请稍后再试' });
      }
    } catch (e) {
      console.warn('rate limit check error', e);
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

    // dedupe:防止重复上报（比如 iframe 连续发送多次）
    try {
      const last = lastSubmissionByUser.get(uid);
      const now = Date.now();
      if (last && last.score === score && last.wave === wave && (now - last.ts) < 5000) {
        // 视为重复提交
        return res.status(200).json({ message: '重复提交，已忽略' });
      }
      // 保存最近提交摘要
      lastSubmissionByUser.set(uid, { ts: now, score, wave });
    } catch (e) {
      console.warn('dedupe check error', e);
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

    // 存储成功后可以清理或记录更多指标
    // (保留 lastSubmission 已记录)

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

// 保存当前游戏进度（需要登录）
router.post('/save', auth, async (req: Request, res: Response) => {
  try {
    if (!req.user?._id) {
      return res.status(401).json({ error: '未登录' });
    }

    const { state } = req.body;
    if (!state) {
      return res.status(400).json({ error: '缺少保存的游戏状态' });
    }

    const name = String(Date.now());

    const saveDoc = new TowerDefenseSave({
      userId: req.user._id,
      name,
      state
    });

    await saveDoc.save();

    res.status(201).json({ message: '已保存进度', save: saveDoc });
  } catch (error) {
    console.error('保存游戏进度失败:', error);
    res.status(500).json({ error: '保存游戏进度失败' });
  }
});

// 列出当前用户的保存记录
router.get('/saves', auth, async (req: Request, res: Response) => {
  try {
    if (!req.user?._id) {
      return res.status(401).json({ error: '未登录' });
    }

    const saves = await TowerDefenseSave.find({ userId: req.user._id }).sort({ createdAt: -1 }).limit(50);
    res.json({ saves });
  } catch (error) {
    console.error('获取保存列表失败:', error);
    res.status(500).json({ error: '获取保存列表失败' });
  }
});

// 获取指定的保存项
router.get('/save/:id', auth, async (req: Request, res: Response) => {
  try {
    if (!req.user?._id) {
      return res.status(401).json({ error: '未登录' });
    }

    const { id } = req.params;
    const save = await TowerDefenseSave.findById(id);
    if (!save) return res.status(404).json({ error: '未找到保存项' });
    if (String(save.userId) !== String(req.user._id)) return res.status(403).json({ error: '无权访问该保存项' });

    res.json({ save });
  } catch (error) {
    console.error('获取保存项失败:', error);
    res.status(500).json({ error: '获取保存项失败' });
  }
});

// 删除指定保存项
router.delete('/save/:id', auth, async (req: Request, res: Response) => {
  try {
    if (!req.user?._id) {
      return res.status(401).json({ error: '未登录' });
    }

    const { id } = req.params;
    const save = await TowerDefenseSave.findById(id);
    if (!save) return res.status(404).json({ error: '未找到保存项' });
    if (String(save.userId) !== String(req.user._id)) return res.status(403).json({ error: '无权删除该保存项' });

    await save.remove();
    res.json({ message: '已删除' });
  } catch (error) {
    console.error('删除保存项失败:', error);
    res.status(500).json({ error: '删除保存项失败' });
  }
});

export default router;

