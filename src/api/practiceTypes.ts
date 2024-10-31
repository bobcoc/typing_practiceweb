// src/api/practiceTypes.ts
import apiClient from './apiClient';
import { API_PATHS } from '../config';
import { PracticeType } from '../types';

export const getPracticeTypes = async (): Promise<PracticeType[]> => {
    try {
        const response = await apiClient.get<PracticeType[]>(API_PATHS.PRACTICE_TYPES);
        return response.data;
    } catch (error) {
        console.error('获取练习类型失败:', error);
        return [];
    }
};