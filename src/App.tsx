import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import Practice from './components/Practice';
import AdminCodeManager from './components/AdminCodeManager';
import Navbar from './components/Navbar';
import Login from './components/Login';
import Register from './components/Register';

const Home: React.FC = () => (
  <div>
    <h1>欢迎来到 Type Practice</h1>
    <p>请选择一个练习等级开始。</p>
  </div>
);

const App: React.FC = () => {
  const [user, setUser] = useState(() => {
    const userString = localStorage.getItem('user');
    return userString ? JSON.parse(userString) : null;
  });

  useEffect(() => {
    const handleStorageChange = () => {
      const userString = localStorage.getItem('user');
      setUser(userString ? JSON.parse(userString) : null);
    };

    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  return (
    <Router>
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
    </Router>
  );
};

export default App;