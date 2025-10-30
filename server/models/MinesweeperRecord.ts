// server/models/MinesweeperRecord.ts

import mongoose, { Document, Schema } from 'mongoose';

// 扫雷难度级别
export type MinesweeperDifficulty = 'beginner' | 'intermediate' | 'expert';

// 扫雷游戏记录接口
export interface IMinesweeperRecord extends Document {
  userId: mongoose.Types.ObjectId;
  username: string;
  fullname: string;
  difficulty: MinesweeperDifficulty;
  timeSeconds: number;  // 完成时间（秒）
  won: boolean;         // 是否获胜
  createdAt: Date;
  updatedAt: Date;
}

// 排行榜聚合结果接口
export interface IMinesweeperLeaderboardRecord {
  userId: mongoose.Types.ObjectId;
  username: string;
  fullname: string;
  bestTime: number;     // 最佳时间
  totalGames: number;   // 总游戏次数
  wonGames: number;     // 获胜次数
  winRate: number;      // 胜率
  lastPlayed: Date;     // 最后游玩时间
}

// 创建 Schema
const minesweeperRecordSchema = new Schema<IMinesweeperRecord>({
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
  difficulty: {
    type: String,
    enum: ['beginner', 'intermediate', 'expert'],
    required: true
  },
  timeSeconds: {
    type: Number,
    required: true,
    min: 0
  },
  won: {
    type: Boolean,
    required: true
  }
}, {
  timestamps: true
});

// 创建索引以优化查询性能
minesweeperRecordSchema.index({ userId: 1, difficulty: 1 });
minesweeperRecordSchema.index({ difficulty: 1, won: 1, timeSeconds: 1 });

// 获取排行榜的静态方法
minesweeperRecordSchema.statics.getLeaderboard = function(
  difficulty: MinesweeperDifficulty,
  skipCount: number,
  pageSize: number
): mongoose.Aggregate<IMinesweeperLeaderboardRecord[]> {
  return this.aggregate([
    { 
      $match: { 
        difficulty  // 统计所有记录（包括获胜和失败）
      } 
    },
    {
      $group: {
        _id: '$userId',
        username: { $first: '$username' },
        fullname: { $first: '$fullname' },
        // 最佳时间只统计获胜的记录
        bestTime: { 
          $min: { 
            $cond: [{ $eq: ['$won', true] }, '$timeSeconds', null] 
          } 
        },
        totalGames: { $sum: 1 },  // 所有游戏次数（获胜+失败）
        wonGames: { $sum: { $cond: ['$won', 1, 0] } },  // 获胜次数
        lastPlayed: { $max: '$createdAt' }
      }
    },
    {
      // 过滤掉没有获胜记录的用户（因为排行榜需要最佳时间）
      $match: {
        bestTime: { $ne: null }
      }
    },
    {
      $addFields: {
        userId: '$_id',
        winRate: { 
          $multiply: [
            { $divide: ['$wonGames', '$totalGames'] },
            100
          ]
        }
      }
    },
    { $sort: { bestTime: 1 } },  // 按最佳时间升序排序（时间越短越好）
    { $skip: skipCount },
    { $limit: pageSize }
  ]);
};

// 扩展模型的静态方法类型
interface MinesweeperRecordModel extends mongoose.Model<IMinesweeperRecord> {
  getLeaderboard(
    difficulty: MinesweeperDifficulty,
    skipCount: number,
    pageSize: number
  ): mongoose.Aggregate<IMinesweeperLeaderboardRecord[]>;
}

// 创建并导出模型
export const MinesweeperRecord = mongoose.model<IMinesweeperRecord, MinesweeperRecordModel>(
  'MinesweeperRecord',
  minesweeperRecordSchema
);
