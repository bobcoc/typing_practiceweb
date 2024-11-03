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
};