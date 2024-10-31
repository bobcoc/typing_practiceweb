import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { TextField, Button, Typography, Paper, Grid } from '@mui/material';

const Login: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleLogin = () => {
    // 模拟登录逻辑
    const user = { username, isAdmin: false }; // 假设从服务器获取的用户信息
    localStorage.setItem('user', JSON.stringify(user));
    navigate('/'); // 确保导航到主页
    window.dispatchEvent(new Event('storage')); // 手动触发 storage 事件
  };

  return (
    <Grid container justifyContent="center" style={{ marginTop: '10%' }}>
      <Grid item xs={10} sm={6} md={4}>
        <Paper style={{ padding: 20 }}>
          <Typography variant="h5" align="center" gutterBottom>
            登录
          </Typography>
          <TextField
            label="用户名"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            fullWidth
            margin="normal"
          />
          <TextField
            label="密码"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            fullWidth
            margin="normal"
          />
          <Button
            variant="contained"
            color="primary"
            fullWidth
            onClick={handleLogin}
            style={{ marginTop: 16 }}
          >
            登录
          </Button>
          <Typography align="center" style={{ marginTop: 16 }}>
            还没有账号？ <Link to="/register">注册</Link>
          </Typography>
        </Paper>
      </Grid>
    </Grid>
  );
};

export default Login; 