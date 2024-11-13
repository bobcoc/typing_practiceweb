// src/api/admin.ts
import apiClient from './apiClient';
export type PracticeLevel = 'keyword' | 'basic' | 'intermediate' | 'advanced';
export interface User {
  _id: string;
  username: string;
  email: string;
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
export const adminApi = {
  getUsers: async (): Promise<User[]> => {
    const response = await apiClient.get('/api/admin/users');
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
};

