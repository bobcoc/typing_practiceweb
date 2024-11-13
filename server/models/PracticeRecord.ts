// server/models/PracticeRecord.ts

import mongoose, { Document, Schema } from 'mongoose';

// 练习记录的统计数据接口
interface IPracticeStats {
  totalWords: number;      // 总单词数
  correctWords: number;    // 正确单词数
  accuracy: number;        // 正确率
  wordsPerMinute: number; // 每分钟单词数
  duration: number;       // 持续时间（秒）
  startTime: Date;       // 开始时间
  endTime: Date;         // 结束时间
}

// 练习记录接口
export interface IPracticeRecord extends Document {
  userId: mongoose.Types.ObjectId;  // 用户ID
  username: string;                 // 用户名
  fullname: string;// 姓名
  type: 'keyword' | 'basic' | 'intermediate' | 'advanced';  // 练习类型
  stats: IPracticeStats;           // 练习统计数据
  createdAt: Date;                 // 记录创建时间
  updatedAt: Date;                 // 记录更新时间
}
// 排行榜聚合结果接口
export interface ILeaderboardRecord {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  username: string;
  fullname: string; 
  type: string;
  stats: {
    totalWords: number;
    accuracy: number;
    wordsPerMinute: number;
    duration: number;
    endTime: Date;
  };
  score: number;
}
// 创建 Schema
const practiceRecordSchema = new Schema<IPracticeRecord>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  username: {
    type: String,
    required: true
  }, 
   fullname: {                       // 姓名
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['keyword', 'basic', 'intermediate', 'advanced'],
    required: true
  },
  stats: {
    totalWords: {
      type: Number,
      required: true
    },
    correctWords: {
      type: Number,
      required: true
    },
    accuracy: {
      type: Number,
      required: true
    },
    wordsPerMinute: {
      type: Number,
      required: true
    },
    duration: {
      type: Number,
      required: true
    },
    startTime: {
      type: Date,
      required: true
    },
    endTime: {
      type: Date,
      required: true
    }
  }
}, {
  timestamps: true  // 自动添加 createdAt 和 updatedAt
});
practiceRecordSchema.statics.getLeaderboard = function(
  type: string,
  skipCount: number,
  pageSize: number
): mongoose.Aggregate<ILeaderboardRecord[]> {
  return this.aggregate([
    { $match: { type } },
    {
      $group: {
        _id: '$userId',
        username: { $first: '$username' },
        fullname: { $first: '$fullname' }, 
        totalDuration: { $sum: '$stats.duration' },
        avgAccuracy: { $avg: '$stats.accuracy' },
        totalWords: { $sum: '$stats.totalWords' },
        avgSpeed: { $avg: '$stats.wordsPerMinute' },
        lastPractice: { $max: '$stats.endTime' },
        originalRecord: { $first: '$$ROOT' }
      }
    },
    {
      $addFields: {
        score: {
          $add: [
            { $multiply: [{ $divide: ['$avgAccuracy', 100] }, 40] },
            { $multiply: [{ $divide: ['$avgSpeed', 100] }, 30] },
            { $multiply: [{ $divide: ['$totalWords', 1000] }, 20] },
            { $multiply: [{ $divide: ['$totalDuration', 3600] }, 10] }
          ]
        }
      }
    },
    { $sort: { score: -1 } },
    { $skip: skipCount },
    { $limit: pageSize },
    {
      $project: {
        _id: '$originalRecord._id',
        userId: '$_id',
        username: 1,
        fullname: 1, 
        type: '$originalRecord.type',
        stats: {
          totalWords: '$totalWords',
          accuracy: '$avgAccuracy',
          wordsPerMinute: '$avgSpeed',
          duration: '$totalDuration',
          endTime: '$lastPractice'
        },
        score: 1
      }
    }
  ]);
};

// 扩展模型的静态方法类型
interface PracticeRecordModel extends mongoose.Model<IPracticeRecord> {
  getLeaderboard(
    type: string,
    skipCount: number,
    pageSize: number
  ): mongoose.Aggregate<ILeaderboardRecord[]>;
}

// 创建并导出模型
export const PracticeRecord = mongoose.model<IPracticeRecord, PracticeRecordModel>(
  'PracticeRecord',
  practiceRecordSchema
);