// src/components/Login.tsx
import React from 'react';
import Form from 'antd/es/form';
import Input from 'antd/es/input';
import Button from 'antd/es/button';
import Card from 'antd/es/card';
import message from 'antd/es/message';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../api/apiClient';
import { API_PATHS } from '../config';
import { AxiosError } from 'axios';
import type { ErrorResponse } from '../types/auth';

interface LoginFormValues {
  username: string;
  password: string;
}

interface LoginResponse {
  token: string;
  user: {
    _id: string;
    username: string;
    isAdmin: boolean;
  };
}

const Login: React.FC = () => {
  const navigate = useNavigate();
  const [form] = Form.useForm();

  const handleLogin = async (values: LoginFormValues) => {
    try {
      const response = await api.post<LoginResponse>(`${API_PATHS.AUTH}/login`, values);
      
      localStorage.setItem('token', response.token);
      localStorage.setItem('user', JSON.stringify(response.user));
      
      console.log('Login successful:', {
        username: response.user.username,
        hasToken: !!response.token
      });

      message.success('登录成功'); 
      navigate('/', { replace: true });
      window.location.reload();
    } catch (error) {
      console.error('Login failed:', error);
      if (error instanceof AxiosError) {
        const errorMessage = (error.response?.data as ErrorResponse)?.message || '登录失败：用户名或密码错误';
        message.error(errorMessage);
      } else {
        message.error('登录失败：网络错误');
      }

      form.setFields([
        {
          name: 'password',
          errors: ['密码错误']
        }
      ]);
    }
  };

  return (
    <div style={{ 
      maxWidth: 400, 
      margin: '40px auto', 
      padding: '0 20px' 
    }}>
      <Card title="用户登录" bordered={false}>
        <Form
          form={form}
          name="login"
          onFinish={handleLogin}
          layout="vertical"
          requiredMark={false}
        >
          <Form.Item
            name="username"
            label="用户名"
            rules={[
              { required: true, message: '请输入用户名' },
              { min: 3, message: '用户名至少3个字符' },
              { max: 20, message: '用户名最多20个字符' }
            ]}
          >
            <Input placeholder="请输入用户名" />
          </Form.Item>

          <Form.Item
            name="password"
            label="密码"
            rules={[
              { required: true, message: '请输入密码' },
              { min: 6, message: '密码至少6个字符' }
            ]}
          >
            <Input.Password placeholder="请输入密码" />
          </Form.Item>

          <Form.Item>
            <Button 
              type="primary" 
              htmlType="submit" 
              block
            >
              登录
            </Button>
          </Form.Item>
          
          <div style={{ 
            textAlign: 'center',
            marginTop: '16px'
          }}>
            还没有账号？ <Link to="/register">立即注册</Link>
          </div>
        </Form>
      </Card>
    </div>
  );
};

export default Login;