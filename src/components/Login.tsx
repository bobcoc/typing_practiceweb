import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { TextField, Button, Typography, Paper, Grid } from '@mui/material';

const Login: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleLogin = async () => {
    try {
      // 假设这是您的登录逻辑
      const user = { username, isAdmin: false }; // 这里应该是实际的登录API调用
      
      // 1. 先存储用户信息
      localStorage.setItem('user', JSON.stringify(user));
      
      // 2. 强制更新应用状态（如果您使用了全局状态管理）
      window.dispatchEvent(new Event('storage'));
      
      // 3. 清空表单
      setUsername('');
      setPassword('');
      
      // 4. 使用 replace 而不是 push 进行导航
      navigate('/', { replace: true });
      
      // 5. 可选：强制刷新页面（如果其他方法都不起作用）
      // window.location.href = '/';
    } catch (error) {
      console.error('Login failed:', error);
      // 处理登录错误
    }
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