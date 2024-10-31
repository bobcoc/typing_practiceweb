// src/config.ts

// 环境变量类型声明
declare const process: {
  env: {
    REACT_APP_API_BASE_URL?: string;
    NODE_ENV?: string;
  }
};

// API 配置
export const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5001';

// 通用请求配置
export const DEFAULT_HEADERS = {
  'Content-Type': 'application/json',
};

// 环境判断
export const IS_DEVELOPMENT = process.env.NODE_ENV === 'development';

// API 路径配置
export const API_PATHS = {
  KEYWORDS: '/api/keywords',
  CODE_EXAMPLES: '/api/code-examples',
  PRACTICE_TYPES: '/api/practice-types',
  PRACTICE_RECORDS: '/api/practice-records',
  LEADERBOARD: '/api/leaderboard',
  AUTH: '/api/auth',
} as const;

// 练习类型枚举
export const PRACTICE_TYPES = {
  KEYWORD: 'keyword',
  BASIC: 'basic',
  INTERMEDIATE: 'intermediate',
  ADVANCED: 'advanced',
} as const;

// 本地存储键名
export const STORAGE_KEYS = {
  TOKEN: 'token',
  USER: 'user',
  PRACTICE_HISTORY: 'practice_history',
} as const;

// 分页配置
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 10,
  DEFAULT_PAGE: 1,
} as const;

// 练习相关配置
export const PRACTICE_CONFIG = {
  MIN_WORDS_PER_MINUTE: 0,
  MAX_WORDS_PER_MINUTE: 300,
  MIN_ACCURACY: 0,
  MAX_ACCURACY: 100,
  SESSION_TIMEOUT: 1800000, // 30分钟，单位：毫秒
} as const;

// 可选：用于调试
if (IS_DEVELOPMENT) {
  console.log('API Base URL:', API_BASE_URL);
}

// 导出配置对象
export const config = {
  API_BASE_URL,
  DEFAULT_HEADERS,
  IS_DEVELOPMENT,
  API_PATHS,
  PRACTICE_TYPES,
  STORAGE_KEYS,
  PAGINATION,
  PRACTICE_CONFIG,
} as const;

// 默认导出
export default config;