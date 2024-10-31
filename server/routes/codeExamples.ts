import express from 'express';
import CodeExample from '../models/CodeExample';
import { isAdmin } from '../middleware/auth';

const router = express.Router();

// 获取所有代码示例
router.get('/', isAdmin, async (req, res) => {
  try {
    const examples = await CodeExample.find();
    res.json(examples);
  } catch (error) {
    res.status(500).json({ error: '无法获取代码示例' });
  }
});

// 添加新的代码示例
router.post('/', isAdmin, async (req, res) => {
  const { level, code } = req.body;
  try {
    const newExample = new CodeExample({ level, code });
    await newExample.save();
    res.status(201).json(newExample);
  } catch (error) {
    res.status(500).json({ error: '无法添加代码示例' });
  }
});

// 更新代码示例
router.put('/:id', isAdmin, async (req, res) => {
  const { id } = req.params;
  const { level, code } = req.body;
  try {
    const example = await CodeExample.findById(id);
    if (example) {
      example.level = level;
      example.code = code;
      await example.save();
      res.json(example);
    } else {
      res.status(404).json({ error: '代码示例未找到' });
    }
  } catch (error) {
    res.status(500).json({ error: '无法更新代码示例' });
  }
});

// 删除代码示例
router.delete('/:id', isAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    const example = await CodeExample.findByIdAndDelete(id);
    if (example) {
      res.json({ message: '代码示例已删除' });
    } else {
      res.status(404).json({ error: '代码示例未找到' });
    }
  } catch (error) {
    res.status(500).json({ error: '无法删除代码示例' });
  }
});

export default router; 