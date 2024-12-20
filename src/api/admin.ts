// src/api/admin.ts
import apiClient from './apiClient';
export type PracticeLevel = 'keyword' | 'basic' | 'intermediate' | 'advanced';
export interface User {
  _id: string;
  username: string;
  email: string;
  fullname: string;
  isAdmin: boolean;
  createdAt: string;
  status?: string;
}
export interface CodeExample {
  _id: string;
  title: string;
  content: string;
  level: PracticeLevel;
  description?: string;
  difficulty?: number;
  createdAt?: Date;
  updatedAt?: Date;
}
export interface UserUpdateData extends Partial<User> {
  password?: string;  // 添加可选的密码字段
}
export interface CreateUserData {
  username: string;
  email: string;
  fullname: string;
  password: string;
  isAdmin?: boolean;
}

// 添加练习记录相关的接口
export interface PracticeRecord {
  _id: string;
  userId: string;
  username: string;
  fullname: string;
  type: string;
  stats: {
    totalWords: number;
    correctWords: number;
    accuracy: number;
    wordsPerMinute: number;
    startTime: string;
    endTime: string;
    duration: number;
  };
  createdAt: string;
}

export const adminApi = {
  getUsers: async (): Promise<User[]> => {
    const response = await apiClient.get('/api/admin/users');
    return response.data;
  },
  createUser: async (userData: CreateUserData): Promise<User> => {
    const response = await apiClient.post('/api/admin/users', userData);
    return response.data;
  },
  updateUser: async (userId: string, userData: Partial<User>): Promise<User> => {
    const response = await apiClient.put(`/api/admin/users/${userId}`, userData);
    return response.data;
  },
  deleteUser: async (userId: string): Promise<void> => {
    await apiClient.delete(`/api/admin/users/${userId}`);
  },
  // Code example methods
  getCodeExamples: async (): Promise<CodeExample[]> => {
    const response = await apiClient.get('/api/code-examples');
    return response.data;
  },

  createCodeExample: async (codeData: Omit<CodeExample, '_id'>): Promise<CodeExample> => {
    const response = await apiClient.post('/api/code-examples', codeData);
    return response.data;
  },

  updateCodeExample: async (id: string, codeData: Partial<CodeExample>): Promise<CodeExample> => {
    const response = await apiClient.put(`/api/code-examples/${id}`, codeData);
    return response.data;
  },

  deleteCodeExample: async (id: string): Promise<void> => {
    await apiClient.delete(`/api/code-examples/${id}`);
  },

  // 获取所有练习记录
  getPracticeRecords: async (params?: { date?: string; userId?: string }): Promise<PracticeRecord[]> => {
    const response = await apiClient.get('/api/practice-records/all', { params });
    return response.data;
  },
};

