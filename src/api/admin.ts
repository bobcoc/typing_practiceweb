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

// 添加 OAuth2Client 接口
export interface OAuth2Client {
  _id: string;
  clientId: string;
  clientSecret: string;
  name: string;
  redirectUris: string[];
  grants: string[];
  scope: string[];
  createdAt: string;
  updatedAt?: Date;
}

export interface CreateOAuth2ClientData {
  name: string;
  redirectUris: string[];
  scope: string;
}

// 添加词汇相关接口
export interface WordSet {
  _id: string;
  name: string;
  description?: string;
  totalWords: number;
  createdAt: string;
  owner: {
    _id: string;
    username: string;
    fullname: string;
  };
}

export interface Word {
  _id: string;
  word: string;
  translation: string;
  pronunciation?: string;
  example?: string;
  wordSet: string;
  createdAt: string;
}

export const adminApi = {
  getUsers: async (): Promise<User[]> => {
    const response = await apiClient.get('/admin/users');
    return response.data;
  },
  createUser: async (userData: CreateUserData): Promise<User> => {
    const response = await apiClient.post('/admin/users', userData);
    return response.data;
  },
  updateUser: async (userId: string, userData: Partial<User>): Promise<User> => {
    const response = await apiClient.put(`/admin/users/${userId}`, userData);
    return response.data;
  },
  deleteUser: async (userId: string): Promise<void> => {
    await apiClient.delete(`/admin/users/${userId}`);
  },
  // Code example methods
  getCodeExamples: async (): Promise<CodeExample[]> => {
    const response = await apiClient.get('/code-examples');
    return response.data;
  },

  createCodeExample: async (codeData: Omit<CodeExample, '_id'>): Promise<CodeExample> => {
    const response = await apiClient.post('/code-examples', codeData);
    return response.data;
  },

  updateCodeExample: async (id: string, codeData: Partial<CodeExample>): Promise<CodeExample> => {
    const response = await apiClient.put(`/code-examples/${id}`, codeData);
    return response.data;
  },

  deleteCodeExample: async (id: string): Promise<void> => {
    await apiClient.delete(`/code-examples/${id}`);
  },

  // 获取所有练习记录
  getPracticeRecords: async (params?: { date?: string; userId?: string }): Promise<PracticeRecord[]> => {
    const response = await apiClient.get('/practice-records/all', { params });
    return response.data;
  },

  // OAuth2 相关方法
  getOAuth2Clients: async (): Promise<OAuth2Client[]> => {
    const response = await apiClient.get('/admin/oauth2/clients');
    return response.data;
  },

  createOAuth2Client: async (data: CreateOAuth2ClientData): Promise<OAuth2Client> => {
    const response = await apiClient.post('/admin/oauth2/clients', data);
    return response.data;
  },

  updateOAuth2Client: async (id: string, clientData: Partial<OAuth2Client>): Promise<OAuth2Client> => {
    const response = await apiClient.put(`/admin/oauth2/clients/${id}`, clientData);
    return response.data;
  },

  deleteOAuth2Client: async (id: string): Promise<void> => {
    await apiClient.delete(`/admin/oauth2/clients/${id}`);
  },

  // 词汇管理相关方法
  getVocabularyWordSets: async (): Promise<WordSet[]> => {
    const response = await apiClient.get('/admin/vocabulary/word-sets');
    return response.data;
  },

  getVocabularyWordSetDetails: async (id: string): Promise<{ wordSet: WordSet, words: Word[] }> => {
    const response = await apiClient.get(`/admin/vocabulary/word-sets/${id}/words`);
    return response.data;
  },

  uploadVocabularyFile: async (formData: FormData): Promise<{ message: string, wordSet: WordSet }> => {
    const response = await apiClient.post('/admin/vocabulary/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  deleteVocabularyWordSet: async (id: string): Promise<{ message: string }> => {
    const response = await apiClient.delete(`/admin/vocabulary/word-sets/${id}`);
    return response.data;
  },
};

