// server/config.ts
import dotenv from 'dotenv';

// 加载环境变量
dotenv.config();

// 环境变量类型定义
interface Config {
  PORT: number;
  MONGODB_URI: string;
  JWT_SECRET: string;
  NODE_ENV: 'development' | 'production' | 'test';
  CORS_ORIGIN: string;
}

// 环境变量验证
const requiredEnvVars = ['MONGODB_URI', 'JWT_SECRET'] as const;
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}

// 配置对象
export const config: Config = {
  PORT: parseInt(process.env.PORT || '5001', 10),
  MONGODB_URI: process.env.MONGODB_URI!,
  JWT_SECRET: process.env.JWT_SECRET || 'your_jwt_secret_key_here',
  NODE_ENV: (process.env.NODE_ENV as Config['NODE_ENV']) || 'development',
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:3000',
};

// JWT 配置
export const JWT_CONFIG = {
  expiresIn: '7d', // token 有效期
  issuer: 'typeskill', // 签发者
};

// 数据库配置
export const DB_CONFIG = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  // 如果需要其他 MongoDB 配置选项，可以在这里添加
};

// API 路径配置
export const API_PATHS = {
  AUTH: '/api/auth',
  KEYWORDS: '/api/keywords',
  CODE_EXAMPLES: '/api/code-examples',
  PRACTICE_TYPES: '/api/practice-types',
  PRACTICE_RECORDS: '/api/practice-records',
  LEADERBOARD: '/api/leaderboard',
  ADMIN: {
    USERS: '/api/users',
    PRACTICE_RECORDS: '/api/practice-records/all'
  }
} as const;

// 分页配置
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 10,
  MAX_PAGE_SIZE: 100,
} as const;

// 安全配置
export const SECURITY = {
  SALT_ROUNDS: 10, // 密码加密轮数
  PASSWORD_MIN_LENGTH: 6,
  PASSWORD_MAX_LENGTH: 50,
} as const;

// 缓存配置
export const CACHE = {
  TTL: 60 * 60, // 1小时（秒）
} as const;

// 导出默认配置
export default config;