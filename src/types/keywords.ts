// 基础关键字数据接口
export interface IKeywords {
  _id: string;
  content: string;    // 所有关键字，用\n分隔
  updatedAt: Date;
}

// API 响应数据接口
export interface KeywordsResponse {
  content: string;
  error?: string;     // 添加错误信息字段
}

// 创建/更新关键字的请求数据接口
export interface KeywordsUpdateRequest {
  content: string;
}

// 单个关键字的类型
export interface IKeyword {
  id: number;
  text: string;
}

// API 错误类型
export interface ApiError {
  message: string;
  status?: number;
}

// 帮助函数：解析关键字字符串为数组
export const parseKeywords = (content: string): string[] => {
  return content.split('\n').filter(keyword => keyword.trim() !== '');
};

// 格式化函数：将关键字数组转为字符串
export const formatKeywords = (keywords: string[]): string => {
  return keywords.join('\n');
};

// 可选：验证关键字格式的函数
export const isValidKeyword = (keyword: string): boolean => {
  return keyword.trim().length > 0;
};