// src/components/NavBar.tsx
import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Menu from 'antd/es/menu';
import Layout from 'antd/es/layout';
import message from 'antd/es/message';
import type { MenuProps } from 'antd/es/menu'; 

const { Header } = Layout;

interface UserInfo {
  username: string;
  isAdmin?: boolean;
}

const NavBar: React.FC = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<UserInfo | null>(null);

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const userInfo = JSON.parse(userStr);
        setUser(userInfo);
      } catch (error) {
        console.error('Failed to parse user info:', error);
      }
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    message.success('已退出登录');
    navigate('/login');
  };

  // 使用 MenuProps['items'] 作为类型
  const getMenuItems = (): NonNullable<MenuProps['items']> => {
    const baseItems = [
      {
        key: '/',
        label: <Link to="/">打字练习</Link>,
      }
    ];

    const authenticatedItems = user ? [
      {
        key: '/practice-history',
        label: <Link to="/practice-history">练习历史</Link>,
      },
      {
        key: '/leaderboard',
        label: <Link to="/leaderboard">排行榜</Link>,
      },
      ...(user.isAdmin ? [{
        key: '/admin',
        label: <Link to="/admin">管理后台</Link>,
      }] : []),
      {
        key: '/profile',
        label: user.username,
        style: { marginLeft: 'auto' },
      },
      {
        key: 'logout',
        label: '退出登录',
        onClick: handleLogout,
      }
    ] : [
      {
        key: '/login',
        label: <Link to="/login">登录</Link>,
        style: { marginLeft: 'auto' },
      }
    ];

    return [...baseItems, ...authenticatedItems];
  };

  return (
    <Header style={{ padding: 0 }}>
      <Menu 
        theme="dark" 
        mode="horizontal" 
        selectedKeys={[window.location.pathname]}
        items={getMenuItems()}
      />
    </Header>
  );
};

export default NavBar;