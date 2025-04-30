// server/routes/vocabulary.ts
import express from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { auth as authMiddleware } from '../middleware/auth';
import { Word, WordSet, WordRecord, VocabularyTestRecord } from '../models/Vocabulary';
import mongoose from 'mongoose';
import csv from 'csv-parser';
import { User } from '../models/User';

const router = express.Router();

// 配置 multer 用于文件上传
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../uploads');
    // 确保上传目录存在
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 限制5MB
  },
  fileFilter: function (req, file, cb) {
    // 只允许上传CSV文件
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('只支持CSV文件'));
    }
  }
});

// 获取所有单词集
router.get('/word-sets', authMiddleware, async (req, res) => {
  try {
    const wordSets = await WordSet.find()
      .select('name description totalWords createdAt')
      .sort({ createdAt: -1 });
    
    res.json(wordSets);
  } catch (error) {
    console.error('获取单词集失败:', error);
    res.status(500).json({ message: '获取单词集失败' });
  }
});

// 创建新的单词集
router.post('/word-sets', authMiddleware, async (req, res) => {
  try {
    const { name, description } = req.body;
    
    // 检查是否已存在同名单词集
    const existingSet = await WordSet.findOne({ 
      name: name
    });
    
    if (existingSet) {
      return res.status(400).json({ message: '已存在同名单词集' });
    }
    
    const newWordSet = await WordSet.create({
      name,
      description,
      totalWords: 0
    });
    
    res.status(201).json(newWordSet);
  } catch (error) {
    console.error('创建单词集失败:', error);
    res.status(500).json({ message: '创建单词集失败' });
  }
});

// 上传单词文件并创建单词集
router.post('/upload', authMiddleware, upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: '请上传文件' });
  }
  
  try {
    const { name } = req.body;
    const fileName = req.file.filename;
    const filePath = req.file.path;
    
    // 检查是否已存在同名单词集
    const existingSet = await WordSet.findOne({ 
      name: name || path.basename(fileName, '.csv')
    });
    
    if (existingSet) {
      // 删除上传的文件
      fs.unlinkSync(filePath);
      return res.status(400).json({ message: '已存在同名单词集' });
    }
    
    // 创建单词集
    const wordSet = await WordSet.create({
      name: name || path.basename(fileName, '.csv'),
      totalWords: 0
    });
    
    const results: any[] = [];
    let wordCount = 0;
    
    // 处理CSV文件
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (data) => {
        // 检查必要的字段是否存在
        if (data.word && data.translation) {
          results.push({
            word: data.word.trim(),
            translation: data.translation.trim(),
            pronunciation: data.pronunciation?.trim(),
            example: data.example?.trim(),
            wordSet: wordSet._id
          });
          wordCount++;
        }
      })
      .on('end', async () => {
        try {
          // 批量插入单词
          if (results.length > 0) {
            await Word.insertMany(results);
            
            // 更新单词集的单词数量
            await WordSet.findByIdAndUpdate(wordSet._id, { totalWords: wordCount });
          }
          
          // 删除上传的文件
          fs.unlinkSync(filePath);
          
          res.status(201).json({ 
            message: `成功创建单词集并导入${wordCount}个单词`,
            wordSet
          });
        } catch (error) {
          // 如果插入单词失败，删除创建的单词集
          await WordSet.findByIdAndDelete(wordSet._id);
          
          console.error('导入单词失败:', error);
          res.status(500).json({ message: '导入单词失败' });
        }
      })
      .on('error', (error) => {
        console.error('处理CSV文件失败:', error);
        res.status(500).json({ message: '处理CSV文件失败' });
      });
  } catch (error) {
    console.error('上传文件失败:', error);
    res.status(500).json({ message: '上传文件失败' });
  }
});

// 获取学习单词（智能抽取算法，嵌套结构版）
router.get('/study-words/:wordSetId', authMiddleware, async (req, res) => {
  try {
    const { wordSetId } = req.params;
    let targetCount = 100;
    if (req.query.count) {
      const parsed = parseInt(req.query.count as string, 10);
      if (!isNaN(parsed) && parsed > 0) {
        targetCount = Math.min(parsed, 100);
      }
    }

    // 检查单词集是否存在
    const wordSet = await WordSet.findOne({ _id: wordSetId });
    if (!wordSet) {
      return res.status(404).json({ message: '未找到单词集' });
    }

    // 1. 获取该单词集下所有单词
    const allWords = await Word.find({ wordSet: wordSetId });
    const allWordIds = allWords.map(w => w._id.toString());

    // 2. 获取该用户所有WordRecord（嵌套结构）
    const allRecords = await WordRecord.find({ user: req.user._id, word: { $in: allWordIds } });
    // 用 wordId 做 key
    const recordMap = new Map();
    allRecords.forEach(r => {
      recordMap.set(r.word.toString(), r);
    });

    // 3. 分类
    const wrongBookWords: any[] = [];
    const notMasteredWords: any[] = [];
    const masteredWords: { word: any, lastMasteredAt: Date }[] = [];
    const neverLearnedWords: any[] = [];

    for (const word of allWords) {
      const wordId = word._id.toString();
      const record = recordMap.get(wordId);

      // 没有任何记录
      if (!record) {
        neverLearnedWords.push(word);
        continue;
      }

      // 判断是否在错词本
      const modes = ['chineseToEnglish', 'audioToEnglish', 'multipleChoice'];
      const anyInWrongBook = modes.some(m => record[m]?.inWrongBook);
      if (anyInWrongBook) {
        wrongBookWords.push(word);
        continue;
      }

      // 判断是否全部掌握
      if (record.isFullyMastered) {
        masteredWords.push({ word, lastMasteredAt: record.lastFullyMasteredAt });
        continue;
      }

      // 未完全掌握但有学习记录
      if (modes.some(m => record[m] && Object.keys(record[m]).length > 0)) {
        notMasteredWords.push(word);
        continue;
      }
    }

    // 过滤一周内掌握的单词
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    let eligibleMasteredWords = masteredWords.filter(item => 
      item.lastMasteredAt && item.lastMasteredAt < oneWeekAgo
    );

    // 4. 按比例抽取
    let wrongBookQuota = Math.round(targetCount * 0.4);
    let masteredQuota = Math.round(targetCount * 0.1);
    let neverLearnedQuota = targetCount - wrongBookQuota - masteredQuota; // 剩下的给未学和新词

    // 错词本优先
    let selectedWrongBook = wrongBookWords.slice(0, wrongBookQuota);
    let selectedMastered = eligibleMasteredWords
      .sort((a, b) => (a.lastMasteredAt?.getTime() || 0) - (b.lastMasteredAt?.getTime() || 0))
      .slice(0, masteredQuota)
      .map(item => item.word);

    function shuffle(arr) {
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      return arr;
    }

    let selectedNeverLearned = shuffle([...neverLearnedWords]).slice(0, neverLearnedQuota);

    // 补足不足部分
    let remain = targetCount - (selectedWrongBook.length + selectedMastered.length + selectedNeverLearned.length);
    // 先补未掌握（不在错词本的）
    let notMasteredPool = notMasteredWords.filter(w => !selectedWrongBook.includes(w));
    let selectedNotMastered: any[] = [];
    if (remain > 0 && notMasteredPool.length > 0) {
      selectedNotMastered = notMasteredPool.slice(0, remain);
      remain -= selectedNotMastered.length;
    }
    // 再补新词
    if (remain > 0) {
      const moreNew = neverLearnedWords.slice(neverLearnedQuota, neverLearnedQuota + remain);
      selectedNeverLearned = selectedNeverLearned.concat(moreNew);
      remain -= moreNew.length;
    }
    // 再补已掌握
    if (remain > 0) {
      const moreMastered = eligibleMasteredWords
        .sort((a, b) => (a.lastMasteredAt?.getTime() || 0) - (b.lastMasteredAt?.getTime() || 0))
        .slice(masteredQuota, masteredQuota + remain)
        .map(item => item.word);
      selectedMastered = selectedMastered.concat(moreMastered);
      remain -= moreMastered.length;
    }
    // 再补错词本
    if (remain > 0) {
      const moreWrong = wrongBookWords.slice(wrongBookQuota, wrongBookQuota + remain);
      selectedWrongBook = selectedWrongBook.concat(moreWrong);
      remain -= moreWrong.length;
    }

    // 合并所有选中的单词
    let finalWords = [
      ...selectedWrongBook,
      ...selectedNotMastered,
      ...selectedMastered,
      ...selectedNeverLearned
    ];
    // 去重
    const seen = new Set();
    finalWords = finalWords.filter(w => {
      const id = w._id.toString();
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    });
    // 最终数量限制
    finalWords = finalWords.slice(0, targetCount);

    res.json(finalWords);
  } catch (error) {
    console.error('获取学习单词失败:', error);
    res.status(500).json({ message: '获取学习单词失败' });
  }
});

// 记录单词学习结果（嵌套结构版，upsert防止重复）
router.post('/word-record', (req, res, next) => {
  console.log('收到 /word-record 请求', req.method, req.body);
  next();
}, authMiddleware, async (req, res) => {
  try {
    const { wordId, isCorrect, testType } = req.body;
    const userId = req.user._id;

    // 检查单词是否存在
    const word = await Word.findById(wordId);
    if (!word) {
      return res.status(404).json({ message: '未找到单词' });
    }

    // 嵌套字段名映射
    const modeMap = {
      'chinese-to-english': 'chineseToEnglish',
      'audio-to-english': 'audioToEnglish',
      'multiple-choice': 'multipleChoice'
    };
    const modeKey = modeMap[testType];
    if (!modeKey) {
      return res.status(400).json({ message: '未知的测试类型' });
    }

    // 先查当前记录
    let record = await WordRecord.findOne({ user: userId, word: wordId });
    let modeObj = record ? (record[modeKey] || {}) : {};

    // 更新 streak、totalCorrect、totalWrong
    if (isCorrect) {
      modeObj.streak = (modeObj.streak || 0) + 1;
      modeObj.totalCorrect = (modeObj.totalCorrect || 0) + 1;
    } else {
      modeObj.streak = 0;
      modeObj.totalWrong = (modeObj.totalWrong || 0) + 1;
    }
    modeObj.lastTestedAt = new Date();

    // 判定是否掌握
    if (!modeObj.mastered && modeObj.streak >= 1) {
      modeObj.mastered = true;
      modeObj.lastMasteredAt = new Date();
      modeObj.inWrongBook = false; // 掌握后自动移出错词本
    }

    // 判定是否进入错词本
    if (!modeObj.mastered && modeObj.totalWrong >= 5) {
      modeObj.inWrongBook = true;
    }

    // 构造更新对象
    const updateObj = {};
    updateObj[modeKey] = modeObj;

    record = await WordRecord.findOneAndUpdate(
      { user: userId, word: wordId },
      { $set: updateObj, $setOnInsert: { user: userId, word: wordId, createdAt: new Date() } },
      { upsert: true, new: true }
    );

    // 检查三种模式是否都已掌握
    const allModes = ['chineseToEnglish', 'audioToEnglish', 'multipleChoice'];
    const isFullyMastered = allModes.every(m => record[m]?.mastered);
    let lastMasteredAt: Date | null = null;
    if (isFullyMastered) {
      // 取三种模式中最近一次掌握的时间
      lastMasteredAt = allModes.reduce((latest: Date | null, m) => {
        const t = record[m]?.lastMasteredAt;
        if (!latest && t) return t;
        if (t instanceof Date && latest instanceof Date && t > latest) {
          return t;
        }
        return latest;
      }, null);

      // 取三种模式中最近一次测试的时间，如果比掌握时间更新则使用测试时间
      const lastTestedAt = allModes.reduce((latest: Date | null, m) => {
        const t = record[m]?.lastTestedAt;
        if (!latest && t) return t;
        if (t instanceof Date && latest instanceof Date && t > latest) {
          return t;
        }
        return latest;
      }, null);

      // 使用最新的日期（掌握时间或测试时间）
      if (lastTestedAt && (!lastMasteredAt || lastTestedAt > lastMasteredAt)) {
        lastMasteredAt = lastTestedAt;
      }

      // 更新isFullyMastered和lastFullyMasteredAt字段
      if (!record.isFullyMastered || !record.lastFullyMasteredAt || 
          (lastMasteredAt && record.lastFullyMasteredAt < lastMasteredAt)) {
        record = await WordRecord.findOneAndUpdate(
          { _id: record._id },
          { 
            $set: { 
              isFullyMastered: true,
              lastFullyMasteredAt: lastMasteredAt 
            } 
          },
          { new: true }
        );
      }
    } else if (record.isFullyMastered) {
      // 如果之前标记为完全掌握，但现在不是，更新状态
      record = await WordRecord.findOneAndUpdate(
        { _id: record._id },
        { $set: { isFullyMastered: false } },
        { new: true }
      );
    }

    // 返回当前单词的所有模式掌握状态和是否在错词本
    const masteryStatus = {};
    allModes.forEach(m => {
      masteryStatus[m] = {
        mastered: record[m]?.mastered || false,
        streak: record[m]?.streak || 0,
        totalCorrect: record[m]?.totalCorrect || 0,
        totalWrong: record[m]?.totalWrong || 0,
        inWrongBook: record[m]?.inWrongBook || false,
        lastMasteredAt: record[m]?.lastMasteredAt || null
      };
    });

    res.status(201).json({
      message: '记录已保存',
      masteryStatus,
      isFullyMastered: record.isFullyMastered,
      lastMasteredAt: record.lastFullyMasteredAt,
      inWrongBook: allModes.some(m => record[m]?.inWrongBook)
    });
  } catch (error) {
    console.error('保存单词学习记录失败:', error);
    res.status(500).json({ message: '保存单词学习记录失败' });
  }
});

// 保存测试记录
router.post('/test-record', authMiddleware, async (req, res) => {
  try {
    const { wordSetId, testType, stats } = req.body;
    
    // 检查单词集是否存在并属于当前用户
    const wordSet = await WordSet.findOne({
      _id: wordSetId
    });
    
    if (!wordSet) {
      return res.status(404).json({ message: '未找到单词集' });
    }
    
    // 创建测试记录
    await VocabularyTestRecord.create({
      user: req.user._id,
      wordSet: wordSetId,
      testType,
      stats: {
        totalWords: stats.totalWords,
        correctWords: stats.correctWords,
        accuracy: stats.accuracy,
        startTime: new Date(stats.startTime),
        endTime: new Date(stats.endTime),
        duration: stats.duration
      }
    });
    
    res.status(201).json({ message: '测试记录已保存' });
  } catch (error) {
    console.error('保存测试记录失败:', error);
    res.status(500).json({ message: '保存测试记录失败' });
  }
});

// 获取单词详情
router.get('/word/:wordId', authMiddleware, async (req, res) => {
  try {
    const { wordId } = req.params;
    
    const word = await Word.findById(wordId);
    if (!word) {
      return res.status(404).json({ message: '未找到单词' });
    }
    
    // 检查用户是否有权限访问这个单词
    const wordSet = await WordSet.findOne({
      _id: word.wordSet
    });
    
    if (!wordSet) {
      return res.status(403).json({ message: '没有权限访问该单词' });
    }
    
    res.json(word);
  } catch (error) {
    console.error('获取单词详情失败:', error);
    res.status(500).json({ message: '获取单词详情失败' });
  }
});

// 获取单词测试记录
router.get('/test-records', authMiddleware, async (req, res) => {
  try {
    const testRecords = await VocabularyTestRecord.find({
      user: req.user._id
    }).populate('wordSet', 'name').sort({ createdAt: -1 });
    
    res.json(testRecords);
  } catch (error) {
    console.error('获取测试记录失败:', error);
    res.status(500).json({ message: '获取测试记录失败' });
  }
});

// 排行榜接口：按掌握单词数和正确率排序
router.get('/leaderboard', authMiddleware, async (req, res) => {
  try {
    // 1. 查出所有 WordRecord
    const allRecords = await WordRecord.find({});

    // 2. 直接使用isFullyMastered统计每个用户掌握的单词数
    const userMasteredCount = {};
    const userStats = {};
    
    for (const rec of allRecords) {
      const userId = rec.user.toString();
      
      // 初始化用户统计数据
      if (!userStats[userId]) {
        userStats[userId] = { correct: 0, total: 0 };
      }
      
      // 使用isFullyMastered直接统计掌握单词数
      if (rec.isFullyMastered) {
        userMasteredCount[userId] = (userMasteredCount[userId] || 0) + 1;
      }
      
      // 统计正确率
      ['chineseToEnglish', 'audioToEnglish', 'multipleChoice'].forEach(mode => {
        const m = rec[mode];
        if (m) {
          userStats[userId].correct += m.totalCorrect || 0;
          userStats[userId].total += (m.totalCorrect || 0) + (m.totalWrong || 0);
        }
      });
    }

    // 3. 查询用户名
    const userIds = Object.keys(userMasteredCount);
    const users = await mongoose.model('User').find({ _id: { $in: userIds } }, { fullname: 1 });
    const userMap = {};
    users.forEach(u => { userMap[u._id.toString()] = u.fullname; });

    // 4. 组装排行榜数组
    const leaderboard = userIds.map(userId => ({
      userId,
      fullname: userMap[userId] || '未知用户',
      totalWordsLearned: userMasteredCount[userId],
      accuracy: userStats[userId] && userStats[userId].total > 0
        ? Math.round((userStats[userId].correct / userStats[userId].total) * 100)
        : 0,
      rank: 0  // 添加rank属性，初始值为0
    }));

    // 5. 排序
    leaderboard.sort((a, b) => {
      if (b.totalWordsLearned !== a.totalWordsLearned) {
        return b.totalWordsLearned - a.totalWordsLearned;
      }
      return b.accuracy - a.accuracy;
    });

    // 6. 添加排名
    leaderboard.forEach((item, idx) => {
      item.rank = idx + 1;
    });

    res.json(leaderboard);
  } catch (error) {
    console.error('获取排行榜失败:', error);
    res.status(500).json({ message: '获取排行榜失败' });
  }
});

export default router; 