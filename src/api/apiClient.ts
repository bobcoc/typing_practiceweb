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
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

// API响应数据接口
interface ApiErrorResponse {
  error?: string;
  message?: string;
  statusCode?: number;
  [key: string]: any;
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
    console.log('Request interceptor - token:', token ? 'present' : 'missing');
    
    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // 调试信息
    console.log('Request config:', {
      url: config.url,
      method: config.method,
      hasAuth: !!config.headers?.Authorization
    });
    
    return config;
  },
  (error: AxiosError) => {
    console.error('Request Error:', error);
    return Promise.reject(new ApiError('请求配置错误'));
  }
);
// 创建一个自定义事件用于处理认证失败
export const authEvents = {
  onAuthError: new Set<() => void>(),
  emitAuthError() {
    this.onAuthError.forEach(handler => handler());
  }
};
// 响应拦截器
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiErrorResponse>) => {
    if (axios.isAxiosError(error) && error.response) {
      const statusCode = error.response.status;
      const responseData = error.response.data as ApiErrorResponse;

      // 处理特定状态码
      switch (statusCode) {
        case 401:
          // 未认证，清除token并重定向到登录页
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          authEvents.emitAuthError();
           // 使用后端返回的具体错误信息
           return Promise.reject(
            new ApiError(
              responseData?.message || '认证失败', // 使用后端返回的消息
              statusCode,
              responseData
            )
          );


        case 403:
          return Promise.reject(new ApiError('没有权限访问', statusCode, responseData));

        case 404:
          return Promise.reject(new ApiError('请求的资源不存在', statusCode, responseData));

        case 500:
          return Promise.reject(new ApiError('服务器内部错误', statusCode, responseData));

        default:
          return Promise.reject(
            new ApiError(
              responseData?.error || responseData?.message || '请求失败',
              statusCode,
              responseData
            )
          );
      }
    }

    // 处理网络错误
    const networkErrorMessage = error?.message;
    if (typeof networkErrorMessage === 'string' && networkErrorMessage === 'Network Error') {
      return Promise.reject(new ApiError('网络连接失败，请检查网络设置'));
    }

    // 处理超时
    const errorCode = error?.code;
    if (typeof errorCode === 'string' && errorCode === 'ECONNABORTED') {
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
    
  post: async <T>(url: string, data = {}, config = {}) => {
    try {
      console.log('API request:', { url, data }); // 调试日志
      const response = await apiClient.post<T>(url, data, config);
      console.log('API response:', response); // 调试日志
      return response.data;
    } catch (error: any) {
      console.log('API error caught:', error); // 调试日志
      
      if (axios.isAxiosError(error)) {
        const statusCode = error.response?.status;
        const responseData = error.response?.data;
        
        throw new ApiError(
          responseData?.message || error.message,
          statusCode,
          responseData
        );
      }
      
      // 重新抛出其他类型的错误
      throw error;
    }
  },
  put: <T>(url: string, data = {}, config = {}) =>
    apiClient.put<T>(url, data, config).then(response => response.data),
    
  delete: <T>(url: string, config = {}) =>
    apiClient.delete<T>(url, config).then(response => response.data),
};

export default apiClient;