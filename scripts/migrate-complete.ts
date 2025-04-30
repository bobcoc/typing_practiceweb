import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// 加载环境变量
dotenv.config({ path: path.resolve(__dirname, '../server/.env') });

// 定义模型类型接口
interface IModeStats {
  streak?: number;
  totalCorrect?: number;
  totalWrong?: number;
  mastered?: boolean;
  inWrongBook?: boolean;
  lastTestedAt?: Date;
  lastMasteredAt?: Date;
}

interface IWordRecord {
  _id: mongoose.Types.ObjectId;
  user: mongoose.Types.ObjectId;
  word: mongoose.Types.ObjectId;
  multipleChoice?: IModeStats;
  audioToEnglish?: IModeStats;
  chineseToEnglish?: IModeStats;
  isFullyMastered?: boolean;
  lastFullyMasteredAt?: Date;
  createdAt?: Date;
  [key: string]: any;
}

// 定义模型结构
const ModeStatsSchema = new mongoose.Schema({
  streak: { type: Number, default: 0 },
  totalCorrect: { type: Number, default: 0 },
  totalWrong: { type: Number, default: 0 },
  mastered: { type: Boolean, default: false },
  inWrongBook: { type: Boolean, default: false },
  lastTestedAt: Date,
  lastMasteredAt: Date
}, { _id: false });

const WordRecordSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  word: { type: mongoose.Schema.Types.ObjectId, ref: 'Word', required: true },
  multipleChoice: { type: ModeStatsSchema, default: () => ({}) },
  audioToEnglish: { type: ModeStatsSchema, default: () => ({}) },
  chineseToEnglish: { type: ModeStatsSchema, default: () => ({}) },
  isFullyMastered: { type: Boolean, default: false },
  lastFullyMasteredAt: Date,
  createdAt: { type: Date, default: Date.now }
}, { strict: false });

// 注册模型
const WordRecord = mongoose.model<IWordRecord>('WordRecord', WordRecordSchema);

// 获取数据库URI
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/typeskill';

console.log('使用数据库连接:', MONGODB_URI);

// 连接数据库
mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('数据库连接成功，开始检查数据...');
    return migrateWordRecords();
  })
  .then(() => {
    console.log('处理完成！');
    mongoose.connection.close();
    process.exit(0);
  })
  .catch(err => {
    console.error('处理失败:', err);
    mongoose.connection.close();
    process.exit(1);
  });

async function migrateWordRecords() {
  try {
    // 获取所有记录
    const records = await WordRecord.find({}).lean();
    console.log(`共找到 ${records.length} 条记录`);
    
    // 准备批量更新
    const updateOperations = [];
    let needUpdateCount = 0;
    
    // 检查每个记录
    for (const record of records) {
      const modes = ['chineseToEnglish', 'audioToEnglish', 'multipleChoice'];
      
      // 检查是否所有模式都存在并计算掌握状态
      let allModesExist = true;
      let allMastered = true;
      
      for (const mode of modes) {
        if (!record[mode] || typeof record[mode] !== 'object') {
          allModesExist = false;
          allMastered = false;
          break;
        }
        if (record[mode].mastered !== true) {
          allMastered = false;
        }
      }
      
      // 计算是否完全掌握
      const shouldBeFullyMastered = allModesExist && allMastered;
      
      // 计算最新掌握时间和最新测试时间
      let latestMasteredDate = null;
      let latestTestedDate = null;
      if (shouldBeFullyMastered) {
        for (const mode of modes) {
          const modeMasteredDate = record[mode]?.lastMasteredAt;
          if (modeMasteredDate && (!latestMasteredDate || new Date(modeMasteredDate) > new Date(latestMasteredDate))) {
            latestMasteredDate = modeMasteredDate;
          }
          const modeTestedDate = record[mode]?.lastTestedAt;
          if (modeTestedDate && (!latestTestedDate || new Date(modeTestedDate) > new Date(latestTestedDate))) {
            latestTestedDate = modeTestedDate;
          }
        }
      }
      
      // 取最大值
      let lastFullyMasteredAt = null;
      if (shouldBeFullyMastered) {
        if (latestMasteredDate && latestTestedDate) {
          lastFullyMasteredAt = new Date(latestMasteredDate) > new Date(latestTestedDate)
            ? latestMasteredDate : latestTestedDate;
        } else if (latestMasteredDate) {
          lastFullyMasteredAt = latestMasteredDate;
        } else if (latestTestedDate) {
          lastFullyMasteredAt = latestTestedDate;
        }
      }
      
      // 检查是否需要更新
      let needsUpdate = false;
      
      // 情况1: isFullyMastered字段与计算结果不一致
      if (record.isFullyMastered !== shouldBeFullyMastered) {
        needsUpdate = true;
      }
      
      // 情况2: 应该完全掌握，但缺少lastFullyMasteredAt字段或值不正确
      if (shouldBeFullyMastered && 
          (!record.lastFullyMasteredAt || 
           (lastFullyMasteredAt && new Date(record.lastFullyMasteredAt).getTime() !== new Date(lastFullyMasteredAt).getTime()))) {
        needsUpdate = true;
      }
      
      // 如果需要更新，添加到批量操作
      if (needsUpdate) {
        needUpdateCount++;
        
        const updateOperation = {
          updateOne: {
            filter: { _id: record._id },
            update: { 
              $set: { 
                isFullyMastered: shouldBeFullyMastered,
                ...(lastFullyMasteredAt ? { lastFullyMasteredAt: new Date(lastFullyMasteredAt) } : {})
              } 
            }
          }
        };
        
        updateOperations.push(updateOperation);
      }
    }
    
    console.log(`检查完成，发现 ${needUpdateCount} 条记录需要更新`);
    
    // 执行批量更新
    if (updateOperations.length > 0) {
      const result = await WordRecord.bulkWrite(updateOperations);
      console.log(`成功更新 ${result.modifiedCount} 条记录`);
    } else {
      console.log('没有记录需要更新');
    }
    
    // 验证更新后的状态
    const missingFieldCount = await WordRecord.countDocuments({
      isFullyMastered: { $exists: false }
    });
    
    if (missingFieldCount > 0) {
      console.log(`警告：仍有 ${missingFieldCount} 条记录缺少isFullyMastered字段`);
    } else {
      console.log('所有记录现在都包含isFullyMastered字段');
    }
    
    // 检查掌握一致性
    const inconsistentRecords = await WordRecord.find({
      $or: [
        // 情况1: 三种模式都掌握了，但isFullyMastered为false
        {
          'chineseToEnglish.mastered': true,
          'audioToEnglish.mastered': true,
          'multipleChoice.mastered': true,
          isFullyMastered: false
        },
        // 情况2: 至少一种模式未掌握，但isFullyMastered为true
        {
          $or: [
            { 'chineseToEnglish.mastered': { $ne: true } },
            { 'audioToEnglish.mastered': { $ne: true } },
            { 'multipleChoice.mastered': { $ne: true } }
          ],
          isFullyMastered: true
        }
      ]
    }).limit(5);
    
    if (inconsistentRecords.length > 0) {
      console.log(`警告：发现 ${inconsistentRecords.length} 条记录的掌握状态不一致，显示前5条：`);
      inconsistentRecords.forEach(r => {
        console.log(`ID: ${r._id}, Word: ${r.word}, Modes: ${r.chineseToEnglish?.mastered}, ${r.audioToEnglish?.mastered}, ${r.multipleChoice?.mastered}, isFullyMastered: ${r.isFullyMastered}`);
      });
    } else {
      console.log('所有记录的掌握状态一致');
    }
  } catch (error) {
    console.error('处理过程中发生错误:', error);
    throw error;
  }
}
