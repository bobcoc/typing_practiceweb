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
      navigate('/login', { replace: true });
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
    // 统一处理所有用户状态变化
    const handleUserStateChange = () => {
      try {
        const userString = localStorage.getItem('user');
        setUser(userString ? JSON.parse(userString) : null);
      } catch (error) {
        console.error('Error handling user state change:', error);
        setUser(null);
      }
    };

    // 监听所有相关事件
    window.addEventListener('storage', handleUserStateChange);
    window.addEventListener('user-login', handleUserStateChange);
    window.addEventListener('user-logout', handleUserStateChange);

    return () => {
      // 清理所有事件监听
      window.removeEventListener('storage', handleUserStateChange);
      window.removeEventListener('user-login', handleUserStateChange);
      window.removeEventListener('user-logout', handleUserStateChange);
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
              <Route path="*" element={<Navigate to="/" replace />} />
            </>
          ) : (
            <>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="*" element={<Navigate to="/login" replace />} />
            </>
          )}
        </Routes>
      </AuthWrapper>
    </Router>
  );
};

export default App;