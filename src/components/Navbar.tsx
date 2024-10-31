import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AppBar, Toolbar, Typography, Button } from '@mui/material';

const Navbar: React.FC = () => {
    const navigate = useNavigate();
    const userString = localStorage.getItem('user');
    const user = userString ? JSON.parse(userString) : null;

    const handleLogout = () => {
        localStorage.removeItem('user');
        window.dispatchEvent(new Event('storage'));
        navigate('/login', { replace: true });
    };

    return (
        <AppBar position="static">
            <Toolbar>
                <Typography variant="h6" style={{ flexGrow: 1 }}>
                    Type Practice
                </Typography>
                {user && (
                    <>
                        <Button color="inherit" component={Link} to="/">
                            首页
                        </Button>
                        <Button color="inherit" component={Link} to="/practice/1">
                            练习
                        </Button>
                        {user.isAdmin && (
                            <Button color="inherit" component={Link} to="/admin/code-manager">
                                管理代码示例
                            </Button>
                        )}
                        <Button color="inherit" onClick={handleLogout}>
                            注销
                        </Button>
                    </>
                )}
            </Toolbar>
        </AppBar>
    );
};

export default Navbar; 