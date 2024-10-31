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
  type: 'keyword' | 'basic' | 'intermediate' | 'advanced';  // 练习类型
  stats: IPracticeStats;           // 练习统计数据
  createdAt: Date;                 // 记录创建时间
  updatedAt: Date;                 // 记录更新时间
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

// 创建并导出模型
export const PracticeRecord = mongoose.model<IPracticeRecord>('PracticeRecord', practiceRecordSchema);