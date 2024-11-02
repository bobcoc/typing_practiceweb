import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { authEvents } from './api/apiClient';
import Navbar from './components/Navbar';
import Home from './components/Home';
import Login from './components/Login';
import Register from './components/Register';
import Practice from './components/Practice';
import AdminCodeManager from './components/AdminCodeManager';

// 创建一个包装组件来处理认证
const AuthWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate();

  useEffect(() => {
    const handleAuthError = () => {
      navigate('/login');
    };

    // 订阅认证错误事件
    authEvents.onAuthError.add(handleAuthError);

    return () => {
      // 清理订阅
      authEvents.onAuthError.delete(handleAuthError);
    };
  }, [navigate]);

  return <>{children}</>;
};

const App: React.FC = () => {
  const [user, setUser] = useState(() => {
    try {
      const userString = localStorage.getItem('user');
      return userString ? JSON.parse(userString) : null;
    } catch (error) {
      console.error('Error parsing user data:', error);
      return null;
    }
  });

  useEffect(() => {
    // 处理存储变更和用户登录事件
    const handleStorageChange = () => {
      try {
        const userString = localStorage.getItem('user');
        setUser(userString ? JSON.parse(userString) : null);
      } catch (error) {
        console.error('Error handling storage change:', error);
        setUser(null);
      }
    };

    // 添加用户登录事件监听
    const handleUserLogin = () => {
      handleStorageChange();
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('user-login', handleUserLogin);  // 新增这一行

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('user-login', handleUserLogin);  // 新增这一行
    };
  }, []);

  return (
    <Router>
      <AuthWrapper>
        <Navbar />
        <Routes>
          {user ? (
            <>
              <Route path="/" element={<Home />} />
              <Route path="/practice/:level" element={<Practice />} />
              {user.isAdmin && (
                <Route path="/admin/code-manager" element={<AdminCodeManager />} />
              )}
              <Route path="*" element={<Navigate to="/" />} />
            </>
          ) : (
            <>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="*" element={<Navigate to="/login" />} />
            </>
          )}
        </Routes>
      </AuthWrapper>
    </Router>
  );
};

export default App;