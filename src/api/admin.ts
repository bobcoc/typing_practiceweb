// src/api/admin.ts
import apiClient from './apiClient';

export interface User {
  _id: string;
  username: string;
  email: string;
  isAdmin: boolean;
  createdAt: string;
  status?: string;
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
};