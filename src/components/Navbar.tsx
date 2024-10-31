import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AppBar, Toolbar, Typography, Button } from '@mui/material';

const Navbar: React.FC = () => {
    const navigate = useNavigate();
    const userString = localStorage.getItem('user');
    const user = userString ? JSON.parse(userString) : null;

    const handleLogout = () => {
        localStorage.removeItem('user');
        navigate('/login');
    };

    return (
        <AppBar position="static">
            <Toolbar>
                <Typography variant="h6" style={{ flexGrow: 1 }}>
                    Type Practice
                </Typography>
                <Button color="inherit" component={Link} to="/practice/1">
                    练习
                </Button>
                {user && user.isAdmin && (
                    <Button color="inherit" component={Link} to="/admin/code-manager">
                        管理代码示例
                    </Button>
                )}
                {user ? (
                    <Button color="inherit" onClick={handleLogout}>
                        注销
                    </Button>
                ) : (
                    <>
                        <Button color="inherit" component={Link} to="/login">
                            登录
                        </Button>
                        <Button color="inherit" component={Link} to="/register">
                            注册
                        </Button>
                    </>
                )}
            </Toolbar>
        </AppBar>
    );
};

export default Navbar; 