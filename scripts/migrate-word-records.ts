import mongoose from 'mongoose';
import { config } from '../server/config';
// 连接数据库
mongoose.connect(config.MONGODB_URI)
  .then(() => {
    console.log('数据库连接成功，开始迁移...');
    migrateWordRecords();
  }).catch(err => {
    console.error('数据库连接失败:', err);
    process.exit(1);
  });

// 导入 Vocabulary 模型定义
import '../server/models/Vocabulary';  // 确保模型已注册

async function migrateWordRecords() {
  try {
    // 获取WordRecord模型
    const WordRecord = mongoose.model('WordRecord');
    
    // 获取所有WordRecord记录
    console.log('正在获取所有单词记录...');
    const records = await WordRecord.find({});
    console.log(`共找到 ${records.length} 条记录需要迁移`);
    
    // 批量处理，每批次1000条
    const batchSize = 1000;
    const totalBatches = Math.ceil(records.length / batchSize);
    
    for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
      const start = batchIndex * batchSize;
      const end = Math.min(start + batchSize, records.length);
      const batch = records.slice(start, end);
      
      console.log(`处理批次 ${batchIndex + 1}/${totalBatches}, 记录 ${start + 1} 到 ${end}`);
      
      const updatePromises = batch.map(async (record) => {
        try {
          // 判断是否全部掌握
          const modes = ['chineseToEnglish', 'audioToEnglish', 'multipleChoice'];
          const isFullyMastered = modes.every(mode => record[mode]?.mastered === true);
          
          // 如果全部掌握，找出最近的掌握时间
          let lastFullyMasteredAt: Date | null = null;
          if (isFullyMastered) {
            let latestDate: Date | null = null;
            modes.forEach(mode => {
              const modeDate = record[mode]?.lastMasteredAt;
              if (modeDate && (!latestDate || modeDate > latestDate)) {
                latestDate = modeDate;
              }
            });
            lastFullyMasteredAt = latestDate;
          }
          
          // 修复: 显式定义updateData类型
          const updateData: { 
            isFullyMastered: boolean; 
            lastFullyMasteredAt?: Date 
          } = {
            isFullyMastered: isFullyMastered
          };
          
          if (lastFullyMasteredAt) {
            updateData.lastFullyMasteredAt = lastFullyMasteredAt;
          }
          
          // 执行更新
          await WordRecord.updateOne({ _id: record._id }, { $set: updateData });
          return true;
        } catch (error) {
          console.error(`更新记录 ${record._id} 失败:`, error);
          return false;
        }
      });
      
      // 等待批次完成
      const results = await Promise.all(updatePromises);
      const successCount = results.filter(Boolean).length;
      console.log(`批次 ${batchIndex + 1} 完成: ${successCount}/${batch.length} 条记录成功更新`);
    }
    
    console.log('迁移完成!');
    mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('迁移过程中发生错误:', error);
    mongoose.connection.close();
    process.exit(1);
  }
}
