import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { TextField, Button, Typography, Paper, Grid } from '@mui/material';
import { api } from '../api/apiClient';
import { API_PATHS } from '../config';
import message from 'antd/es/message';
import { RegisterFormValues, LoginResponse } from '../types/auth';

interface RegisterResponse {
  token: string;
  user: {
    _id: string;
    username: string;
    isAdmin: boolean;
  };
}

const Register: React.FC = () => {
  const [formData, setFormData] = useState<RegisterFormValues>({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleRegister = async () => {
    if (!formData.username || !formData.password || !formData.confirmPassword|| !formData.email) {
      message.error('请填写必填字段');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      message.error('两次输入的密码不匹配');
      return;
    }

    if (formData.username.length < 3 || formData.username.length > 20) {
      message.error('用户名长度应在3-20个字符之间');
      return;
    }

    if (formData.password.length < 6) {
      message.error('密码长度至少6个字符');
      return;
    }

    if (!formData.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      message.error('请输入有效的邮箱地址');
      return;
    }

    setLoading(true);
    try {
      // 构造发送的数据，排除 confirmPassword
      const { confirmPassword, ...registerData } = formData;
      
      const response = await api.post<LoginResponse>(
        `${API_PATHS.AUTH}/register`, 
        registerData
      );

      localStorage.setItem('token', response.token);
      localStorage.setItem('user', JSON.stringify(response.user));

      message.success('注册成功');
      navigate('/', { replace: true });
      window.location.reload();
    } catch (error: any) {
      console.error('Registration failed:', error);
      if (error.response?.data?.message) {
        message.error(error.response.data.message);
      } else {
        message.error('注册失败，请稍后重试');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Grid container justifyContent="center" style={{ marginTop: '10%' }}>
      <Grid item xs={10} sm={6} md={4}>
        <Paper style={{ padding: 20 }}>
          <Typography variant="h5" align="center" gutterBottom>
            注册
          </Typography>
          <TextField
            label="用户名"
            name="username"
            value={formData.username}
            onChange={handleChange}
            fullWidth
            margin="normal"
            required
            disabled={loading}
          />
          <TextField
            label="邮箱"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            fullWidth
            margin="normal"
            required
            disabled={loading}
          />
          <TextField
            label="密码"
            name="password"
            type="password"
            value={formData.password}
            onChange={handleChange}
            fullWidth
            margin="normal"
            required
            disabled={loading}
          />
          <TextField
            label="确认密码"
            name="confirmPassword"
            type="password"
            value={formData.confirmPassword}
            onChange={handleChange}
            fullWidth
            margin="normal"
            required
            disabled={loading}
          />
          <Button
            variant="contained"
            color="primary"
            fullWidth
            onClick={handleRegister}
            style={{ marginTop: 16 }}
            disabled={loading}
          >
            {loading ? '注册中...' : '注册'}
          </Button>
          <Typography align="center" style={{ marginTop: 16 }}>
            已有账号？ <Link to="/login">登录</Link>
          </Typography>
        </Paper>
      </Grid>
    </Grid>
  );
};

export default Register;