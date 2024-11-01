// src/components/NavBar.tsx
import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Menu from 'antd/es/menu';
import Layout from 'antd/es/layout';
import message from 'antd/es/message';

const { Header } = Layout;

interface UserInfo {
  username: string;
  isAdmin?: boolean;
}

const NavBar: React.FC = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<UserInfo | null>(null);

  useEffect(() => {
    // 从localStorage获取用户信息
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const userInfo = JSON.parse(userStr);
        setUser(userInfo);
      } catch (error) {
        console.error('Failed to parse user info:', error);
      }
    }
  }, []); // 在组件加载时读取用户信息

  const handleLogout = () => {
    // 清除本地存储的认证信息
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    message.success('已退出登录');
    navigate('/login');
  };

  return (
    <Header style={{ padding: 0 }}>
      <Menu 
        theme="dark" 
        mode="horizontal" 
        selectedKeys={[window.location.pathname]}
      >
        <Menu.Item key="/">
          <Link to="/">打字练习</Link>
        </Menu.Item>
        
        {user ? (
          <>
            <Menu.Item key="/practice-history">
              <Link to="/practice-history">练习历史</Link>
            </Menu.Item>
            
            <Menu.Item key="/leaderboard">
              <Link to="/leaderboard">排行榜</Link>
            </Menu.Item>
            
            {user.isAdmin && (
              <Menu.Item key="/admin">
                <Link to="/admin">管理后台</Link>
              </Menu.Item>
            )}
            
            <Menu.Item key="/profile" style={{ marginLeft: 'auto' }}>
              <span>{user.username}</span>
            </Menu.Item>
            
            <Menu.Item key="logout" onClick={handleLogout}>
              退出登录
            </Menu.Item>
          </>
        ) : (
          <Menu.Item key="/login" style={{ marginLeft: 'auto' }}>
            <Link to="/login">登录</Link>
          </Menu.Item>
        )}
      </Menu>
    </Header>
  );
};

export default NavBar;