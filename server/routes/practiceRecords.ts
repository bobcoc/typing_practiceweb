// server/routes/practiceRecords.ts
import express from 'express';
import { PracticeRecord } from '../models/PracticeRecord';
import { auth } from '../middleware/auth';

const router = express.Router();

// 保存练习记录
router.post('/', auth, async (req, res) => {
  try {
    const { type, stats } = req.body;
    const record = new PracticeRecord({
      userId: req.user?._id,
      username: req.user?.username,
      type,
      stats
    });
    await record.save();
    res.status(201).json(record);
  } catch (error) {
    console.error('保存练习记录失败:', error);
    res.status(500).json({ error: '保存练习记录失败' });
  }
});

// 获取用户的练习记录
router.get('/my-records', auth, async (req, res) => {
  try {
    const records = await PracticeRecord.find({ userId: req.user?._id })
      .sort({ createdAt: -1 });
    res.json(records);
  } catch (error) {
    res.status(500).json({ error: '获取记录失败' });
  }
});

// 获取特定记录的详情
router.get('/:id', auth, async (req, res) => {
  try {
    const record = await PracticeRecord.findById(req.params.id);
    if (!record) {
      return res.status(404).json({ error: '记录不存在' });
    }
    res.json(record);
  } catch (error) {
    res.status(500).json({ error: '获取记录失败' });
  }
});

export default router;