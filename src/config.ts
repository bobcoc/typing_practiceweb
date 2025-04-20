// src/config.ts

// 环境变量类型声明
declare const process: {
  env: {
    REACT_APP_API_BASE_URL?: string;
    REACT_APP_API_PREFIX?: string;
    NODE_ENV?: string;
  }
};

// API 配置
export const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || '/api';

// API路径前缀 - 根据环境变量决定是否添加/api前缀
export const API_PREFIX = '/api';

// 通用请求配置
export const DEFAULT_HEADERS = {
  'Content-Type': 'application/json',
};

// 环境判断
export const IS_DEVELOPMENT = process.env.NODE_ENV === 'development';

// API 路径配置 - 在实际使用时会自动添加前缀
export const API_PATHS = {
  AUTH: '/auth',
  AUTH2: '/oauth2',
  KEYWORDS: '/keywords',
  CODE_EXAMPLES: '/code-examples',
  PRACTICE_TYPES: '/practice-types',
  PRACTICE_RECORDS: '/practice-records',
  LEADERBOARD: '/leaderboard',
  VISITOR: '/visitor',
  SYSTEM: {
    SERVER_TIME: '/system/server-time'
  },
  VOCABULARY: {
    WORD_SETS: '/vocabulary/word-sets',
    STUDY_WORDS: '/vocabulary/study-words',
    UPLOAD: '/vocabulary/upload',
    WORD_RECORD: '/vocabulary/word-record',
    TEST_RECORD: '/vocabulary/test-record',
    STUDY_RECORDS: '/vocabulary/test-records',
    LEADERBOARD: '/vocabulary/leaderboard'
  }
} as const;

// 练习类型枚举
export const PRACTICE_TYPES = {
  KEYWORD: 'keyword',
  BASIC: 'basic',
  INTERMEDIATE: 'intermediate',
  ADVANCED: 'advanced',
  VOCABULARY: 'vocabulary'
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
  console.log('API Prefix:', API_PREFIX);
}

// 获取完整API路径的辅助函数
export const getFullApiPath = (path: string): string => {
  // 移除路径开头的斜杠以避免重复
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  return cleanPath;
};

// 导出配置对象
export const config = {
  API_BASE_URL,
  API_PREFIX,
  DEFAULT_HEADERS,
  IS_DEVELOPMENT,
  API_PATHS,
  PRACTICE_TYPES,
  STORAGE_KEYS,
  PAGINATION,
  PRACTICE_CONFIG,
  getFullApiPath,
} as const;

// 默认导出
export default config;