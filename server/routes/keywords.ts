import express from 'express';
import { CodeExample } from '../models/CodeExample';  // 改用 CodeExample 模型

const router = express.Router();

// 获取关键字
router.get('/', async (req, res) => {
    try {
        // 从 CodeExample 集合中查询 level 为 'keyword' 的数据
        const keywordExample = await CodeExample.findOne({ level: 'keyword' });
        
        if (!keywordExample) {
            return res.status(404).json({ error: '未找到关键字数据' });
        }
        
        res.json({ content: keywordExample.content });
    } catch (error) {
        console.error('获取关键字失败:', error);
        res.status(500).json({ error: '获取关键字失败' });
    }
});


// 添加创建/更新关键字的路由
router.post('/', async (req, res) => {
    try {
        const { content } = req.body;
        if (!content) {
            return res.status(400).json({ error: '关键字内容不能为空' });
        }

        const keywords = await CodeExample.create({
            content,
            updatedAt: new Date()
        });

        res.status(201).json(keywords);
    } catch (error) {
        console.error('创建关键字失败:', error);
        res.status(500).json({ error: '创建关键字失败' });
    }
});

// 更新关键字
router.put('/', async (req, res) => {
    try {
        const { content } = req.body;
        if (!content) {
            return res.status(400).json({ error: '关键字内容不能为空' });
        }

        const keywords = await CodeExample.findOneAndUpdate(
            {},
            { content, updatedAt: new Date() },
            { new: true, upsert: true }
        );

        res.json(keywords);
    } catch (error) {
        console.error('更新关键字失败:', error);
        res.status(500).json({ error: '更新关键字失败' });
    }
});

export default router;