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

interface SessKeyResponse {
  sesskey: string;
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

    if (username.length < 2 || username.length > 20) {
      message.error('用户名长度应在2-20个字符之间');
      return;
    }

    if (password.length < 6) {
      message.error('密码长度至少6个字符');
      return;
    }

    setLoading(true);
    try {
      // 获取 URL 中的 redirect 参数
      const params = new URLSearchParams(window.location.search);
      const redirectUrl = params.get('redirect');

      const response = await api.post<LoginResponse>(`${API_PATHS.AUTH}/login`, {
        username,
        password
      });
      
      // 保存 token 到 localStorage
      localStorage.setItem('token', response.token);
      localStorage.setItem('user', JSON.stringify(response.user));
      
      // 同时保存 token 到 cookie，确保跨域请求也能携带 token
      // secure 表示只在 HTTPS 下发送，根据环境设置
      // 设置 cookie 最大有效期为 7 天
      const secure = window.location.protocol === 'https:' ? '; secure' : '';
      const maxAge = 60 * 60 * 24 * 7; // 7天，单位：秒
      document.cookie = `token=${response.token}; path=/; max-age=${maxAge}${secure}`;
      
      window.dispatchEvent(new Event('user-login'));
      
      message.success('登录成功');

      // 如果有 redirect 参数且是 OAuth2 相关的路径，则跳转
      if (redirectUrl && redirectUrl.includes('oauth2/authorize')) {
        console.log('Original redirect URL:', redirectUrl);
        // 直接使用原始的重定向 URL，在 cookie 中已经有 token 了
        console.log('Redirecting to OAuth flow:', redirectUrl);
        window.location.href = redirectUrl;
      } else {
        // 否则跳转到首页
        navigate('/', { replace: true });
      }
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
      const { sesskey } = await api.get<SessKeyResponse>(`${API_PATHS.AUTH2}/moodle-sesskey`);
      
      if (!sesskey) {
        console.error('Failed to get sesskey');
        return;
      }

      // 使用获取到的 sesskey 构建完整的登录 URL
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