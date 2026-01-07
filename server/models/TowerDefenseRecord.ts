// server/models/TowerDefenseRecord.ts

import mongoose, { Document, Schema } from 'mongoose';

export interface ITowerDefenseRecord extends Document {
  userId: mongoose.Types.ObjectId;
  username: string;
  fullname: string;
  wave: number;        // 到达的波次
  score: number;       // 最终积分
  timeSeconds: number; // 游戏持续时间（秒）
  createdAt: Date;
  updatedAt: Date;
}

export interface ITowerDefenseLeaderboardRecord {
  userId: mongoose.Types.ObjectId;
  username: string;
  fullname: string;
  bestWave: number;    // 最高波次
  bestScore: number;   // 最高积分
  totalGames: number;  // 总游戏次数
  lastPlayed: Date;    // 最后游玩时间
}

const towerDefenseRecordSchema = new Schema<ITowerDefenseRecord>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  username: {
    type: String,
    required: true
  },
  fullname: {
    type: String,
    required: true
  },
  wave: {
    type: Number,
    required: true,
    min: 0
  },
  score: {
    type: Number,
    required: true,
    min: 0
  },
  timeSeconds: {
    type: Number,
    required: true,
    min: 0
  }
}, {
  timestamps: true
});

// 索引优化
towerDefenseRecordSchema.index({ userId: 1, score: -1 });
towerDefenseRecordSchema.index({ score: -1 });
towerDefenseRecordSchema.index({ wave: -1 });

// 获取排行榜的静态方法
towerDefenseRecordSchema.statics.getLeaderboard = function(
  skipCount: number,
  pageSize: number
): mongoose.Aggregate<ITowerDefenseLeaderboardRecord[]> {
  return this.aggregate([
    {
      $group: {
        _id: '$userId',
        username: { $first: '$username' },
        fullname: { $first: '$fullname' },
        bestWave: { $max: '$wave' },
        bestScore: { $max: '$score' },
        totalGames: { $sum: 1 },
        lastPlayed: { $max: '$createdAt' }
      }
    },
    { $sort: { bestScore: -1 } }, // 优先按积分排
    { $skip: skipCount },
    { $limit: pageSize },
    {
      $addFields: {
        userId: '$_id'
      }
    }
  ]);
};

interface TowerDefenseRecordModel extends mongoose.Model<ITowerDefenseRecord> {
  getLeaderboard(
    skipCount: number,
    pageSize: number
  ): mongoose.Aggregate<ITowerDefenseLeaderboardRecord[]>;
}

export const TowerDefenseRecord = mongoose.model<ITowerDefenseRecord, TowerDefenseRecordModel>(
  'TowerDefenseRecord',
  towerDefenseRecordSchema
);
