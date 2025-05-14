// src/components/NavBar.tsx
import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Menu from 'antd/es/menu';
import Layout from 'antd/es/layout';
import message from 'antd/es/message';
import type { MenuProps } from 'antd/es/menu'; 
import './Navbar.css';

const { Header } = Layout;

interface UserInfo {
  username: string;
  fullname: string;
  isAdmin?: boolean;
}

const NavBar: React.FC = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<UserInfo | null>(null);
  const currentPath = window.location.pathname;

  // 添加一个函数来检查是否为打字练习相关页面
  const isTypingRelatedPage = (path: string): boolean => {
    const typingPaths = ['/typing', '/leaderboard', '/practice-history'];
    return typingPaths.some(p => path.startsWith(p));
  };

  useEffect(() => {
    // 统一处理用户状态更新
    const updateUserState = () => {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        try {
          const userInfo = JSON.parse(userStr);
          setUser(userInfo);
        } catch (error) {
          console.error('Failed to parse user info:', error);
          setUser(null);
        }
      } else {
        setUser(null);
      }
    };

    // 初始化用户状态
    updateUserState();

    // 监听所有用户状态变化事件
    window.addEventListener('storage', updateUserState);
    window.addEventListener('user-login', updateUserState);
    window.addEventListener('user-logout', updateUserState);

    return () => {
      window.removeEventListener('storage', updateUserState);
      window.removeEventListener('user-login', updateUserState);
      window.removeEventListener('user-logout', updateUserState);
    };
  }, []);

  const handleLogout = async () => {
    try {
      // 调用后端登出接口
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      // 清除 localStorage 中的数据
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      
      // 清除 cookie 中的 token
      document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; secure;';
      document.cookie = 'connect.sid=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; secure;';
      
      // 触发登出事件
      window.dispatchEvent(new Event('user-logout'));
      message.success('已退出登录');
      navigate('/login', { replace: true });
    } catch (error) {
      console.error('登出失败:', error);
      message.error('登出过程中发生错误');
      
      // 即使后端请求失败，也要清除本地数据
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; secure;';
      document.cookie = 'connect.sid=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; secure;';
      window.dispatchEvent(new Event('user-logout'));
      navigate('/login', { replace: true });
    }
  };

  // 使用 MenuProps['items'] 作为类型
  const getMenuItems = (): NonNullable<MenuProps['items']> => {
    const baseItems = [
      {
        key: 'd1ktc',
        label: <a href="https://c.d1kt.cn" target="_blank" rel="noopener noreferrer">第一课堂AI平台</a>,
      },
      {
        key: 'd1kt',
        label: <a href="https://m.d1kt.cn" target="_blank" rel="noopener noreferrer">第一课堂课程中心</a>,
      },
      // 打字练习分组
      {
        key: '/typing',
        label: <Link to="/typing">打字练习</Link>,
      },
      // 词汇学习菜单项
      {
        key: '/vocabulary-study',
        label: <Link to="/vocabulary-study">词汇学习</Link>,
      },
    ];
    const authenticatedItems = user ? [
      ...(user.isAdmin ? [{
        key: '/admin',
        label: <Link to="/admin">管理后台</Link>,
      }] : []),
      {
        key: '/profile',
        label: user.fullname || user.username,
        style: { marginLeft: 'auto' },
        children: [  // 添加子菜单
          {
            key: '/change-password',
            label: <Link to="/change-password">修改密码</Link>,
          },
          {
            key: 'logout',
            label: '退出登录',
            onClick: handleLogout,
          }
        ]
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

  // 选中逻辑：如果当前路径是/typing、/leaderboard、/practice-history，则高亮/typing-group和对应子项
  let selectedKeys: string[] = [window.location.pathname];
  if (["/typing", "/leaderboard", "/practice-history"].includes(window.location.pathname)) {
    selectedKeys = [window.location.pathname, '/typing-group'];
  }

  return (
    <Header className="navbar-header" style={{ 
      padding: '8px 0', 
      background: '#ffffff',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      height: '100px'
    }}>
      <div style={{ 
        display: 'flex', 
        alignItems: 'center',
        height: '100%',
        maxWidth: '1200px',
        margin: '0 auto',
        width: '100%'
      }}>
        <Link to="/" style={{ textDecoration: 'none' }}>
          <div className="logo-container">
            <div className="logo">
              <div className="icon">
                <div className="book"></div>
                <div className="bulb"></div>
                <div className="rays">
                  {[...Array(8)].map((_, i) => (
                    <div key={i} className="ray"></div>
                  ))}
                </div>
                <div className="charging-dots">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="dot"></div>
                  ))}
                </div>
              </div>
              <div className="brand-text">
                <div className="d1kt">
                  d<span className="one">1</span>kt<span className="cn">.cn</span>
                </div>
                <div className="tagline">AI教育· 第一课堂</div>
              </div>
            </div>
          </div>
        </Link>

        <Menu 
          mode="horizontal" 
          selectedKeys={selectedKeys}
          items={getMenuItems()}
          style={{
            background: 'transparent',
            borderBottom: 'none',
            flex: 1,
            minWidth: 0
          }}
        />
      </div>
    </Header>
  );
};

export default NavBar;