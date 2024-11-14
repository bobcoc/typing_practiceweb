// server/models/User.ts
import mongoose, { Document } from 'mongoose';
import bcrypt from 'bcrypt';
// 用户统计信息接口
export interface UserStats {
  totalPracticeCount: number;   // 练习总次数
  totalWords: number;           // 练习单词总数
  totalAccuracy: number;        // 累计正确率（用于计算平均值）
  accuracyHistory: number[];    // 正确率历史记录
  todayPracticeTime: number;    // 今日练习时长（秒）
  lastPracticeDate: Date;       // 最后练习日期
  totalSpeed: number;           // 累计速度，用于计算平均值
}

// 扩展用户接口，包含统计信息
export interface IUser extends Document {
  username: string;
  password: string;
  email: string;
  fullname: string;
  isAdmin: boolean;
  stats: UserStats;
  createdAt: Date;
  updatedAt: Date;

  // 方法
  resetTodayPracticeTime(): Promise<void>;
  updatePracticeStats(data: { words: number; accuracy: number; duration: number; speed: number }): Promise<void>;
  getAccuracyTrend(limit?: number): number[];
  comparePassword(candidatePassword: string): Promise<boolean>;
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
    default: () => new Date()
  },
  totalSpeed: { 
    type: Number, 
    default: 0,
    min: 0,
    validate: {
      validator: Number.isFinite,
      message: '速度必须是有效数字'
    }
  }
}, { _id: false });

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, '用户名是必需的'],
    unique: true,
    trim: true,
    minlength: [3, '用户名至少需要3个字符'],
    maxlength: [20, '用户名最多20个字符']
  },
  fullname: {
    type: String,
    required: [true, '姓名是必需的'],
    trim: true,
    minlength: [2, '姓名至少需要2个字符'],
    maxlength: [50, '姓名最多50个字符']
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
      totalSpeed: 0,
      accuracyHistory: [],
      todayPracticeTime: 0,
      lastPracticeDate: new Date()
    })
  }
}, {
  timestamps: true
});

// 中间件
userSchema.pre('save', function (next) {
  if (!this.stats) {
    this.stats = {
      totalPracticeCount: 0,
      totalWords: 0,
      totalAccuracy: 0,
      totalSpeed: 0,
      accuracyHistory: [],
      todayPracticeTime: 0,
      lastPracticeDate: new Date()
    };
  }
  next();
});
userSchema.pre('save', async function(next) {
  const user = this;
  
  // 只有在密码被修改时才进行加密
  if (!user.isModified('password')) {
    return next();
  }

  try {
    // 生成盐值并加密密码
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(user.password, salt);
    user.password = hashedPassword;
    next();
  } catch (error) {
    next(error as Error);
  }
});
userSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw new Error('密码比较失败');
  }
};
userSchema.pre('findOneAndUpdate', function (next) {
  const update = this.getUpdate() as any;
  if (update && !update.stats) {
    update.stats = {
      totalPracticeCount: 0,
      totalWords: 0,
      totalAccuracy: 0,
      totalSpeed: 0,
      accuracyHistory: [],
      todayPracticeTime: 0,
      lastPracticeDate: new Date()
    };
  }
  next();
});

// 虚拟属性
userSchema.virtual('averageAccuracy').get(function (this: IUser) {
  if (this.stats.totalPracticeCount === 0) return 0;
  return this.stats.totalAccuracy / this.stats.totalPracticeCount;
});

userSchema.virtual('averageSpeed').get(function(this: IUser) {
  if (this.stats.totalPracticeCount === 0) return 0;
  return this.stats.totalSpeed / this.stats.totalPracticeCount;
});

// 方法
userSchema.methods.resetTodayPracticeTime = async function (this: IUser) {
  this.stats.todayPracticeTime = 0;
  await this.save();
};

userSchema.methods.updatePracticeStats = async function (this: IUser, {
  words,
  accuracy,
  duration,
  speed
}: {
  words: number;
  accuracy: number;
  duration: number;
  speed: number;
}) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (!this.stats.lastPracticeDate || this.stats.lastPracticeDate < today) {
    this.stats.todayPracticeTime = 0;
  }

  this.stats.totalPracticeCount += 1;
  this.stats.totalWords += words;
  this.stats.totalAccuracy += accuracy;
  this.stats.accuracyHistory.push(accuracy);
  this.stats.todayPracticeTime += Math.round(duration);
  this.stats.lastPracticeDate = new Date();
  this.stats.totalSpeed += speed;

  await this.save();
};

userSchema.methods.getAccuracyTrend = function (this: IUser, limit = 10): number[] {
  return this.stats.accuracyHistory.slice(-limit);
};

// 索引
userSchema.index({ username: 1 }, { unique: true });
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ 'stats.lastPracticeDate': 1 });

// 错误处理
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

// 创建模型并导出
export const User = mongoose.model<IUser>('User', userSchema);