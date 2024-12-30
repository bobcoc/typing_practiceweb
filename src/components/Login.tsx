// src/components/Login.tsx
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { TextField, Button, Typography, Paper, Grid } from '@mui/material';
import message from 'antd/es/message';
import { api, ApiError } from '../api/apiClient';
import { API_PATHS } from '../config';

interface LoginResponse {
  token: string;
  user: {
    _id: string;
    username: string;
    fullname: string;
    email: string;
    isAdmin: boolean;
  };
}

const Login: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e?: React.FormEvent) => {
    // 如果是表单提交，阻止默认行为
    if (e) {
      e.preventDefault();
    }

    if (!username || !password) {
      message.error('请填写所有字段');
      return;
    }

    if (username.length < 3 || username.length > 20) {
      message.error('用户名长度应在3-20个字符之间');
      return;
    }

    if (password.length < 6) {
      message.error('密码长度至少6个字符');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post<LoginResponse>(`${API_PATHS.AUTH}/login`, {
        username,
        password
      });
      
      localStorage.setItem('token', response.token);
      localStorage.setItem('user', JSON.stringify(response.user));
      window.dispatchEvent(new Event('user-login'));
      
      // 使用 await 确保 sesskey 获取完成
      await silentMoodleLogin();
      
      message.success('登录成功');
      navigate('/', { replace: true });
    } catch (error: any) {
      if (error instanceof ApiError) {
        let errorMessage = error.message;
        
        if (error.response?.message === 'User not found') {
          errorMessage = '用户不存在';
        } else if (error.response?.message === 'Password mismatch') {
          errorMessage = '密码错误';
        }
        
        message.error(errorMessage);
      } else {
        const errorMessage = error?.message || '登录失败，请稍后重试';
        message.error(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const silentMoodleLogin = async () => {
    try {
      // 1. 先获取 sesskey
      const response = await fetch('https://m.d1kt.cn/login/index.php');
      const html = await response.text();
      const sesskeyMatch = html.match(/sesskey":"([^"]+)/);
      const sesskey = sesskeyMatch ? sesskeyMatch[1] : '';
      
      console.log('Found sesskey:', sesskey);

      if (!sesskey) {
        console.error('Failed to get sesskey');
        return;
      }

      // 2. 创建带有 sesskey 的 iframe
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      iframe.src = `https://m.d1kt.cn/auth/oauth2/login.php?id=1&wantsurl=/&sesskey=${sesskey}`;
      document.body.appendChild(iframe);
    } catch (error) {
      console.error('Silent Moodle login error:', error);
    }
  };

  return (
    <Grid container justifyContent="center" style={{ marginTop: '10%' }}>
      <Grid item xs={10} sm={6} md={4}>
        <Paper style={{ padding: 20 }}>
          <Typography variant="h5" align="center" gutterBottom>
            登录
          </Typography>
          <form onSubmit={handleLogin}>
            <TextField
              label="用户名"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              fullWidth
              margin="normal"
              disabled={loading}
              autoComplete="username"
            />
            <TextField
              label="密码"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              fullWidth
              margin="normal"
              disabled={loading}
              autoComplete="current-password"
            />
            <Button
              type="submit"
              variant="contained"
              color="primary"
              fullWidth
              style={{ marginTop: 16 }}
              disabled={loading}
            >
              {loading ? '登录中...' : '登录'}
            </Button>
          </form>
          <Typography align="center" style={{ marginTop: 16 }}>
            还没有账号？ <Link to="/register">立即注册</Link>
          </Typography>
        </Paper>
      </Grid>
    </Grid>
  );
};

export default Login;