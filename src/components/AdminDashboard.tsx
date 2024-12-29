// src/components/AdminDashboard.tsx
import React, { useState } from 'react';
import {
  Container,
  Paper,
  Tabs,
  Tab,
  Box,
  Typography,
} from '@mui/material';
import AdminUserManager from './AdminUserManager';
import AdminCodeManager from './AdminCodeManager';
import AdminPracticeRecords from './AdminPracticeRecords';
import AdminOAuth2Manager from './AdminOAuth2Manager';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const AdminDashboard: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const handleChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  return (
    <Container>
      <Paper sx={{ width: '100%', marginTop: 2 }}>
        <Typography variant="h4" component="h1" sx={{ p: 2 }}>
          管理后台
        </Typography>
        <Tabs
          value={tabValue}
          onChange={handleChange}
          indicatorColor="primary"
          textColor="primary"
        >
          <Tab label="用户管理" />
          <Tab label="代码管理" />
          <Tab label="练习记录" />
          {user.username === 'bobcoc' && <Tab label="OAuth2管理" />}
        </Tabs>
        
        <TabPanel value={tabValue} index={0}>
          <AdminUserManager />
        </TabPanel>
        <TabPanel value={tabValue} index={1}>
          <AdminCodeManager />
        </TabPanel>
        <TabPanel value={tabValue} index={2}>
          <AdminPracticeRecords />
        </TabPanel>
        {user.username === 'bobcoc' && (
          <TabPanel value={tabValue} index={3}>
            <AdminOAuth2Manager />
          </TabPanel>
        )}
      </Paper>
    </Container>
  );
};

export default AdminDashboard;