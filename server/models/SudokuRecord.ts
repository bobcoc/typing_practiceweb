import mongoose, { Document, Schema } from 'mongoose';

export type SudokuDifficulty = 'easy' | 'medium' | 'hard';

export interface ISudokuRecord extends Document {
  userId: mongoose.Types.ObjectId;
  username: string;
  fullname: string;
  difficulty: SudokuDifficulty;
  timeSeconds: number;
  won: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ISudokuLeaderboardRecord {
  userId: mongoose.Types.ObjectId;
  username: string;
  fullname: string;
  bestTime: number;
  totalGames: number;
  wonGames: number;
  winRate: number;
  lastPlayed: Date;
}

const sudokuRecordSchema = new Schema<ISudokuRecord>({
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
    enum: ['easy', 'medium', 'hard'],
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

sudokuRecordSchema.index({ userId: 1, difficulty: 1 });
sudokuRecordSchema.index({ difficulty: 1, won: 1, timeSeconds: 1 });

sudokuRecordSchema.statics.getLeaderboard = function(
  difficulty: SudokuDifficulty,
  skipCount: number,
  pageSize: number
): mongoose.Aggregate<ISudokuLeaderboardRecord[]> {
  return this.aggregate([
    {
      $match: {
        difficulty
      }
    },
    {
      $group: {
        _id: '$userId',
        username: { $first: '$username' },
        fullname: { $first: '$fullname' },
        bestTime: {
          $min: {
            $cond: [{ $eq: ['$won', true] }, '$timeSeconds', null]
          }
        },
        totalGames: { $sum: 1 },
        wonGames: { $sum: { $cond: ['$won', 1, 0] } },
        lastPlayed: { $max: '$createdAt' }
      }
    },
    {
      $match: {
        bestTime: { $ne: null }
      }
    },
    {
      $addFields: {
        userId: '$_id',
        winRate: {
          $multiply: [
            { $cond: [{ $eq: ['$totalGames', 0] }, 0, { $divide: ['$wonGames', '$totalGames'] }] },
            100
          ]
        }
      }
    },
    { $sort: { bestTime: 1 } },
    { $skip: skipCount },
    { $limit: pageSize }
  ]);
};

interface SudokuRecordModel extends mongoose.Model<ISudokuRecord> {
  getLeaderboard(
    difficulty: SudokuDifficulty,
    skipCount: number,
    pageSize: number
  ): mongoose.Aggregate<ISudokuLeaderboardRecord[]>;
}

export const SudokuRecord = mongoose.model<ISudokuRecord, SudokuRecordModel>(
  'SudokuRecord',
  sudokuRecordSchema
);
