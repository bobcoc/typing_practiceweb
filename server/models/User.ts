// server/models/User.ts
import mongoose, { Document } from 'mongoose';

// 用户统计信息接口
export interface UserStats {
  totalPracticeCount: number;   // 练习总次数
  totalWords: number;           // 练习单词总数
  totalAccuracy: number;        // 累计正确率（用于计算平均值）
  accuracyHistory: number[];    // 正确率历史记录
  todayPracticeTime: number;    // 今日练习时长（秒）
  lastPracticeDate: Date;       // 最后练习日期
}


// 扩展用户接口，包含统计信息
export interface IUser extends Document {
  username: string;
  password: string;
  email: string;
  isAdmin: boolean;
  stats: UserStats;
  createdAt: Date;
  updatedAt: Date;

  // 方法
  resetTodayPracticeTime(): Promise<void>;
  updatePracticeStats(data: { words: number; accuracy: number; duration: number }): Promise<void>;
  getAccuracyTrend(limit?: number): number[];
}

const userStatsSchema = new mongoose.Schema({
  totalPracticeCount: {
    type: Number,
    default: 0,
    min: 0,
    validate: {
      validator: Number.isInteger,
      message: '练习次数必须是整数'
    }
  },
  totalWords: {
    type: Number,
    default: 0,
    min: 0,
    validate: {
      validator: Number.isInteger,
      message: '单词总数必须是整数'
    }
  },
  totalAccuracy: {
    type: Number,
    default: 0,
    min: 0,
    max: 100 * 1000000, // 假设最多100万次练习，每次100%
    validate: {
      validator: Number.isFinite,
      message: '累计正确率必须是有限数字'
    }
  },
  accuracyHistory: {
    type: [Number],
    default: [],
    validate: {
      validator: function (v: number[]) {
        return v.every(rate => rate >= 0 && rate <= 100);
      },
      message: '正确率必须在0到100之间'
    }
  },
  todayPracticeTime: {
    type: Number,
    default: 0,
    min: 0,
    validate: {
      validator: Number.isInteger,
      message: '练习时长必须是整数'
    }
  },
  lastPracticeDate: { 
    type: Date, 
    default: () => new Date()  // 修改这里
  }
}, { _id: false });  // 不为stats创建独立的_id

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, '用户名是必需的'],
    unique: true,
    trim: true,
    minlength: [3, '用户名至少需要3个字符'],
    maxlength: [20, '用户名最多20个字符']
  },
  password: {
    type: String,
    required: [true, '密码是必需的'],
    minlength: [6, '密码至少需要6个字符']
  },
  email: {
    type: String,
    required: [true, '邮箱是必需的'],
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, '请输入有效的邮箱地址']
  },
  isAdmin: {
    type: Boolean,
    default: false
  },
  stats: {
    type: userStatsSchema,
    default: () => ({
      totalPracticeCount: 0,
      totalWords: 0,
      totalAccuracy: 0,
      accuracyHistory: [],
      todayPracticeTime: 0,
      lastPracticeDate: new Date()
    })
  }
}, {
  timestamps: true
});

// 添加 pre save 中间件，确保 stats 字段存在
userSchema.pre('save', function (next) {
  if (!this.stats) {
    this.stats = {
      totalPracticeCount: 0,
      totalWords: 0,
      totalAccuracy: 0,
      accuracyHistory: [],
      todayPracticeTime: 0,
      lastPracticeDate: new Date()
    };
  }
  next();
});

// 添加 pre findOneAndUpdate 中间件，确保更新时 stats 字段存在
userSchema.pre('findOneAndUpdate', function (next) {
  const update = this.getUpdate() as any;
  if (update && !update.stats) {
    update.stats = {
      totalPracticeCount: 0,
      totalWords: 0,
      totalAccuracy: 0,
      accuracyHistory: [],
      todayPracticeTime: 0,
      lastPracticeDate: new Date()
    };
  }
  next();
});

// 添加虚拟属性：平均正确率
userSchema.virtual('averageAccuracy').get(function (this: IUser) {
  if (this.stats.totalPracticeCount === 0) return 0;
  return this.stats.totalAccuracy / this.stats.totalPracticeCount;
});

// 添加方法：重置今日练习时间
userSchema.methods.resetTodayPracticeTime = async function (this: IUser) {
  this.stats.todayPracticeTime = 0;
  await this.save();
};

// 添加方法：更新练习统计
userSchema.methods.updatePracticeStats = async function (this: IUser, {
  words,
  accuracy,
  duration
}: {
  words: number;
  accuracy: number;
  duration: number;
}) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // 如果是新的一天，重置今日练习时长
  if (!this.stats.lastPracticeDate || this.stats.lastPracticeDate < today) {
    this.stats.todayPracticeTime = 0;
  }

  // 更新统计信息
  this.stats.totalPracticeCount += 1;
  this.stats.totalWords += words;
  this.stats.totalAccuracy += accuracy;
  this.stats.accuracyHistory.push(accuracy);
  this.stats.todayPracticeTime += Math.round(duration);
  this.stats.lastPracticeDate = new Date();

  // 保存更新
  await this.save();
};

// 添加方法：获取正确率趋势
userSchema.methods.getAccuracyTrend = function (this: IUser, limit = 10): number[] {
  return this.stats.accuracyHistory.slice(-limit);
};

// 添加索引
userSchema.index({ username: 1 }, { unique: true });
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ 'stats.lastPracticeDate': 1 });

// 添加错误处理中间件
userSchema.post('save', function (error: any, doc: any, next: any) {
  if (error.name === 'MongoError' || error.name === 'MongoServerError') {
    if (error.code === 11000) {
      next(new Error('用户名或邮箱已存在'));
    } else {
      next(error);
    }
  } else {
    next(error);
  }
});

export const User = mongoose.model<IUser>('User', userSchema);