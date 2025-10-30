// src/api/admin.ts
import { api } from './apiClient';

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
    return api.get<User[]>('/admin/users');
  },
  createUser: async (userData: CreateUserData): Promise<User> => {
    return api.post<User>('/admin/users', userData);
  },
  updateUser: async (userId: string, userData: Partial<User>): Promise<User> => {
    return api.put<User>(`/admin/users/${userId}`, userData);
  },
  deleteUser: async (userId: string): Promise<void> => {
    await api.delete(`/admin/users/${userId}`);
  },
  // Code example methods
  getCodeExamples: async (): Promise<CodeExample[]> => {
    return api.get<CodeExample[]>('/code-examples');
  },

  createCodeExample: async (codeData: Omit<CodeExample, '_id'>): Promise<CodeExample> => {
    return api.post<CodeExample>('/code-examples', codeData);
  },

  updateCodeExample: async (id: string, codeData: Partial<CodeExample>): Promise<CodeExample> => {
    return api.put<CodeExample>(`/code-examples/${id}`, codeData);
  },

  deleteCodeExample: async (id: string): Promise<void> => {
    await api.delete(`/code-examples/${id}`);
  },

  // 获取所有练习记录
  getPracticeRecords: async (params?: { date?: string; userId?: string }): Promise<PracticeRecord[]> => {
    return api.get<PracticeRecord[]>('/practice-records/all', { params });
  },

  // OAuth2 相关方法
  getOAuth2Clients: async (): Promise<OAuth2Client[]> => {
    return api.get<OAuth2Client[]>('/admin/oauth2/clients');
  },

  createOAuth2Client: async (data: CreateOAuth2ClientData): Promise<OAuth2Client> => {
    return api.post<OAuth2Client>('/admin/oauth2/clients', data);
  },

  updateOAuth2Client: async (id: string, clientData: Partial<OAuth2Client>): Promise<OAuth2Client> => {
    return api.put<OAuth2Client>(`/admin/oauth2/clients/${id}`, clientData);
  },

  deleteOAuth2Client: async (id: string): Promise<void> => {
    await api.delete(`/admin/oauth2/clients/${id}`);
  },

  // 词汇管理相关方法
  getVocabularyWordSets: async (): Promise<WordSet[]> => {
    return api.get<WordSet[]>('/admin/vocabulary/word-sets');
  },

  getVocabularyWordSetDetails: async (id: string): Promise<{ wordSet: WordSet, words: Word[] }> => {
    return api.get<{ wordSet: WordSet, words: Word[] }>(`/admin/vocabulary/word-sets/${id}/words`);
  },

  uploadVocabularyFile: async (formData: FormData): Promise<{ message: string, wordSet: WordSet }> => {
    return api.post<{ message: string, wordSet: WordSet }>('/admin/vocabulary/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  deleteVocabularyWordSet: async (id: string): Promise<{ message: string }> => {
    return api.delete<{ message: string }>(`/admin/vocabulary/word-sets/${id}`);
  },

  // 获取单词集单词的方法
  getWordsByWordSetId: async (wordSetId: string) => {
    return api.get(`/vocabulary/word-set/${wordSetId}/words`);
  },

  // 更新单词的方法
  updateWords: async (words: any[]) => {
    return api.put('/api/vocabulary/words', { words });
  },
};

