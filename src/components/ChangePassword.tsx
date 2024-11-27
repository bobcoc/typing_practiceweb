// src/components/ChangePassword.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TextField, Button, Typography, Paper, Grid } from '@mui/material';
import message from 'antd/es/message';
import { api, ApiError } from '../api/apiClient';
import { API_PATHS } from '../config';

const ChangePassword: React.FC = () => {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!oldPassword || !newPassword || !confirmPassword) {
      message.error('请填写所有字段');
      return;
    }

    if (newPassword.length < 6) {
      message.error('新密码长度至少6个字符');
      return;
    }

    if (newPassword !== confirmPassword) {
      message.error('两次输入的新密码不一致');
      return;
    }

    setLoading(true);
    try {
      await api.post(`${API_PATHS.AUTH}/change-password`, {
        oldPassword,
        newPassword
      });
      
      message.success('密码修改成功');
      navigate('/', { replace: true });
    } catch (error: any) {
      if (error instanceof ApiError) {
        if (error.statusCode === 401) {
          // 认证错误已经由 AuthWrapper 处理，这里不需要额外处理
          console.log('Authentication error handled by AuthWrapper');
        } else if (error.response?.message === 'Invalid old password') {
          message.error('原密码错误');
        } else {
          message.error(error.message);
        }
      } else {
        message.error('修改失败，请稍后重试');
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
            修改密码
          </Typography>
          <form onSubmit={handleSubmit}>
            <TextField
              label="原密码"
              type="password"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              fullWidth
              margin="normal"
              disabled={loading}
            />
            <TextField
              label="新密码"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              fullWidth
              margin="normal"
              disabled={loading}
            />
            <TextField
              label="确认新密码"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              fullWidth
              margin="normal"
              disabled={loading}
            />
            <Button
              type="submit"
              variant="contained"
              color="primary"
              fullWidth
              style={{ marginTop: 16 }}
              disabled={loading}
            >
              {loading ? '提交中...' : '确认修改'}
            </Button>
          </form>
        </Paper>
      </Grid>
    </Grid>
  );
};

export default ChangePassword;