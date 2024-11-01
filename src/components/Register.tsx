import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { TextField, Button, Typography, Paper, Grid } from '@mui/material';
import { api } from '../api/apiClient';
import { API_PATHS } from '../config';
import message from 'antd/es/message';

interface RegisterResponse {
  token: string;
  user: {
    _id: string;
    username: string;
    isAdmin: boolean;
  };
}

const Register: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleRegister = async () => {
    if (!username || !password || !confirmPassword) {
      message.error('请填写所有字段');
      return;
    }

    if (password !== confirmPassword) {
      message.error('两次输入的密码不匹配');
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
      // api.post 已经返回 data，不需要访问 .data 属性
      const response = await api.post<RegisterResponse>(
        `${API_PATHS.AUTH}/register`, 
        {
          username,
          password
        }
      );

      // 直接使用 response，因为它就是 RegisterResponse 类型
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
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            fullWidth
            margin="normal"
            disabled={loading}
          />
          <TextField
            label="密码"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            fullWidth
            margin="normal"
            disabled={loading}
          />
          <TextField
            label="确认密码"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            fullWidth
            margin="normal"
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