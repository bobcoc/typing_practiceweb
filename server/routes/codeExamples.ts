import express from 'express';
import { CodeExample } from '../models/CodeExample';

const router = express.Router();

// 获取所有代码示例
router.get('/', async (req, res) => {
  try {
    const examples = await CodeExample.find().sort({ createdAt: -1 });
    res.json(examples);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching code examples' });
  }
});

// 获取特定难度级别的代码示例
router.get('/:level', async (req, res) => {
  try {
    const { level } = req.params;
    // 验证难度级别是否有效
    const validLevels = ['basic', 'intermediate', 'advanced'];
    if (!validLevels.includes(level)) {
      return res.status(400).json({ message: '无效的代码难度级别' });
    }

    // 查找匹配难度级别的代码示例
    const example = await CodeExample.findOne({ level }).sort({ createdAt: -1 });
    
    if (!example) {
      return res.status(404).json({ message: '未找到该难度级别的代码示例' });
    }

    // 返回代码示例内容
    res.json({
      content: example.content,
      level: example.level,
      title: example.title
    });
  } catch (error) {
    console.error('获取代码示例错误:', error);
    res.status(500).json({ message: '获取代码示例失败' });
  }
});

// 创建新代码示例
router.post('/', async (req, res) => {
  try {
    const example = new CodeExample(req.body);
    await example.save();
    res.status(201).json(example);
  } catch (error) {
    res.status(500).json({ message: 'Error creating code example' });
  }
});

// 更新代码示例
router.put('/:id', async (req, res) => {
  try {
    const example = await CodeExample.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    res.json(example);
  } catch (error) {
    res.status(500).json({ message: 'Error updating code example' });
  }
});

// 删除代码示例
router.delete('/:id', async (req, res) => {
  try {
    await CodeExample.findByIdAndDelete(req.params.id);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ message: 'Error deleting code example' });
  }
});

export default router;