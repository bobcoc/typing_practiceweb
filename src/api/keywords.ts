// src/api/keywords.ts
import apiClient from './apiClient';
import { API_PATHS } from '../config';
import { 
    IKeywords, 
    KeywordsResponse, 
    KeywordsUpdateRequest 
} from '../types/keywords';

/**
 * 获取关键字列表
 * @returns {Promise<KeywordsResponse>} 关键字响应数据
 */
export const fetchKeywords = async (): Promise<KeywordsResponse> => {
    try {
        const response = await apiClient.get<KeywordsResponse>(API_PATHS.KEYWORDS);
        return response.data;
    } catch (error) {
        console.error('获取关键字失败:', error);
        throw error;
    }
};

/**
 * 创建新的关键字
 * @param {string} content - 关键字内容
 * @returns {Promise<KeywordsResponse>} 创建成功的响应数据
 */
export const createKeywords = async (content: string): Promise<KeywordsResponse> => {
    try {
        const request: KeywordsUpdateRequest = { content };
        const response = await apiClient.post<KeywordsResponse>(API_PATHS.KEYWORDS, request);
        return response.data;
    } catch (error) {
        console.error('创建关键字失败:', error);
        throw error;
    }
};

/**
 * 更新关键字
 * @param {string} content - 更新的关键字内容
 * @returns {Promise<KeywordsResponse>} 更新成功的响应数据
 */
export const updateKeywords = async (content: string): Promise<KeywordsResponse> => {
    try {
        const request: KeywordsUpdateRequest = { content };
        const response = await apiClient.put<KeywordsResponse>(API_PATHS.KEYWORDS, request);
        return response.data;
    } catch (error) {
        console.error('更新关键字失败:', error);
        throw error;
    }
};

/**
 * 将关键字字符串转换为数组
 * @param {string} keywords - 包含多个关键字的字符串
 * @returns {string[]} 处理后的关键字数组
 */
export const formatKeywordsContent = (keywords: string): string[] => {
    return keywords.split('\n')
        .map(keyword => keyword.trim())
        .filter(keyword => keyword !== '');
};

/**
 * 将关键字数组转换为字符串
 * @param {string[]} keywords - 关键字数组
 * @returns {string} 合并后的关键字字符串
 */
export const joinKeywords = (keywords: string[]): string => {
    return keywords.join('\n');
};

// 导出类型
export type { IKeywords, KeywordsResponse, KeywordsUpdateRequest };