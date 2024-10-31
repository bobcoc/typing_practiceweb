import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { TextField, Button, Typography, Paper, Grid } from '@mui/material';

const Register: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const navigate = useNavigate();

  const handleRegister = () => {
    if (password !== confirmPassword) {
      alert('密码不匹配');
      return;
    }
    // 模拟注册逻辑
    const user = { username, isAdmin: false }; // 假设从服务器获取的用户信息
    localStorage.setItem('user', JSON.stringify(user));
    navigate('/'); // 确保导航到主页
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
          />
          <TextField
            label="密码"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            fullWidth
            margin="normal"
          />
          <TextField
            label="确认密码"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            fullWidth
            margin="normal"
          />
          <Button
            variant="contained"
            color="primary"
            fullWidth
            onClick={handleRegister}
            style={{ marginTop: 16 }}
          >
            注册
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