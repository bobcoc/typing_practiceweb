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