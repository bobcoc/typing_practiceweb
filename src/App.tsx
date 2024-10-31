import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './components/Home';
import Login from './components/Login';
import Register from './components/Register';
import Practice from './components/Practice';
import AdminCodeManager from './components/AdminCodeManager';

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
    return () => window.removeEventListener('storage', handleStorageChange);
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