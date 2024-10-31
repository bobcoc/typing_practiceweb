// src/api/apiClient.ts
import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { API_BASE_URL, DEFAULT_HEADERS } from '../config';

// 自定义错误类
export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public response?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// API客户端配置
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: DEFAULT_HEADERS,
  timeout: 10000, // 10秒超时
});

// 请求拦截器
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // 添加认证token
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // 添加时间戳防止缓存（可选）
    if (config.method?.toLowerCase() === 'get') {
      config.params = {
        ...config.params,
        _t: Date.now()
      };
    }

    return config;
  },
  (error: AxiosError) => {
    console.error('Request Error:', error);
    return Promise.reject(new ApiError('请求配置错误'));
  }
);

// 响应拦截器
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (axios.isAxiosError(error)) {
      const statusCode = error.response?.status;
      const responseData = error.response?.data;

      // 处理特定状态码
      switch (statusCode) {
        case 401:
          // 未认证，清除token并重定向到登录页
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          window.location.href = '/login';
          return Promise.reject(new ApiError('请先登录', statusCode, responseData));

        case 403:
          return Promise.reject(new ApiError('没有权限访问', statusCode, responseData));

        case 404:
          return Promise.reject(new ApiError('请求的资源不存在', statusCode, responseData));

        case 500:
          return Promise.reject(new ApiError('服务器内部错误', statusCode, responseData));

        default:
          return Promise.reject(
            new ApiError(
              responseData?.message || '请求失败',
              statusCode,
              responseData
            )
          );
      }
    }

    // 处理网络错误
    if (error.message === 'Network Error') {
      return Promise.reject(new ApiError('网络连接失败，请检查网络设置'));
    }

    // 处理超时
    if (error.code === 'ECONNABORTED') {
      return Promise.reject(new ApiError('请求超时，请稍后重试'));
    }

    // 其他错误
    console.error('API Error:', error);
    return Promise.reject(new ApiError('请求失败，请稍后重试'));
  }
);

// 导出常用的请求方法
export const api = {
  get: <T>(url: string, config = {}) => 
    apiClient.get<T>(url, config).then(response => response.data),
    
  post: <T>(url: string, data = {}, config = {}) =>
    apiClient.post<T>(url, data, config).then(response => response.data),
    
  put: <T>(url: string, data = {}, config = {}) =>
    apiClient.put<T>(url, data, config).then(response => response.data),
    
  delete: <T>(url: string, config = {}) =>
    apiClient.delete<T>(url, config).then(response => response.data),
};

export default apiClient;