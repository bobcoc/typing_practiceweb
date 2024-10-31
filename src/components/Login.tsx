import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TextField, Button, Typography, Paper, Grid } from '@mui/material';

const Login: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async () => {
    try {
      setError(''); // 清除之前的错误
      
      const response = await fetch('http://localhost:5001/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem('user', JSON.stringify(data));
        window.dispatchEvent(new Event('storage'));
        navigate('/', { replace: true });
      } else {
        setError(data.message || '登录失败');
      }
    } catch (error) {
      console.error('Login error:', error);
      setError('登录失败，请稍后重试');
    }
  };

  return (
    <Grid container justifyContent="center" style={{ marginTop: '10%' }}>
      <Grid item xs={10} sm={6} md={4}>
        <Paper style={{ padding: 20 }}>
          <Typography variant="h5" align="center" gutterBottom>
            登录
          </Typography>
          {error && (
            <Typography color="error" align="center" gutterBottom>
              {error}
            </Typography>
          )}
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
        </Paper>
      </Grid>
    </Grid>
  );
};

export default Login; 