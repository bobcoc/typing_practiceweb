import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { authEvents } from './api/apiClient';
import Navbar from './components/Navbar';
import Home from './components/Home';
import Login from './components/Login';
import Register from './components/Register';
import Practice from './components/Practice';
import AdminCodeManager from './components/AdminCodeManager';
import AdminDashboard from './components/AdminDashboard';
import Footer from './components/Footer';
import PracticeHistory from './components/PracticeHistory';
import Leaderboard from './components/Leaderboard';
import ChangePassword from './components/ChangePassword';
import LandingPage from './components/LandingPage';
import TypingPractice from './components/TypingPractice';
import StudentSearch from './components/StudentSearch';

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
          {/* 公共路由 - 不需要登录就能访问 */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/typing" element={<TypingPractice />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/leaderboard" element={<Leaderboard />} />

          {/* 需要登录的路由 */}
          {user ? (
            <>
              <Route path="/practice/:level" element={<Practice />} />
              <Route path="/practice-history" element={<PracticeHistory />} />
              <Route path="/change-password" element={<ChangePassword />} />
              {user.isAdmin && (
                <>
                  <Route path="/admin" element={<AdminDashboard />} />
                  <Route path="/admin/code-manager" element={<AdminCodeManager />} />
                </>
              )}
            </>
          ) : (
            // 访问需要登录的页面时重定向到登录页
            <>
              <Route path="/practice/*" element={<Navigate to="/login" replace />} />
              <Route path="/practice-history" element={<Navigate to="/login" replace />} />
              <Route path="/admin/*" element={<Navigate to="/login" replace />} />
            </>
          )}
          
          <Route path="/student-search" element={<StudentSearch />} />
          
          {/* 处理未匹配的路径 */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <Footer />
      </AuthWrapper>
    </Router>
  );
};

export default App;