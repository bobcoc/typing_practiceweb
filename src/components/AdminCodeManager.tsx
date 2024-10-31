import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Navigate } from 'react-router-dom';
import { Button, TextField, Typography, Paper, Grid } from '@mui/material';

const AdminCodeManager: React.FC = () => {
  const userString = localStorage.getItem('user');
  const user = userString ? JSON.parse(userString) : null;

  if (!user || !user.isAdmin) {
    return <Navigate to="/" />;
  }

  const [codeExamples, setCodeExamples] = useState([]);
  const [newCode, setNewCode] = useState('');
  const [newLevel, setNewLevel] = useState(2);

  useEffect(() => {
    fetchCodeExamples();
  }, []);

  const fetchCodeExamples = async () => {
    try {
      const response = await axios.get('/api/codeExamples');
      setCodeExamples(response.data);
    } catch (error) {
      console.error('无法获取代码示例:', error);
    }
  };

  const addCodeExample = async () => {
    try {
      await axios.post('/api/codeExamples', { level: newLevel, code: newCode });
      fetchCodeExamples();
      setNewCode('');
    } catch (error) {
      console.error('无法添加代码示例:', error);
    }
  };

  const deleteCodeExample = async (id: string) => {
    try {
      await axios.delete(`/api/codeExamples/${id}`);
      fetchCodeExamples();
    } catch (error) {
      console.error('无法删除代码示例:', error);
    }
  };

  return (
    <Paper style={{ padding: 20, margin: 20 }}>
      <Typography variant="h6">代码示例管理</Typography>
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <TextField
            label="等级"
            type="number"
            value={newLevel}
            onChange={(e) => setNewLevel(parseInt(e.target.value))}
            fullWidth
          />
        </Grid>
        <Grid item xs={12}>
          <TextField
            label="代码"
            multiline
            rows={4}
            value={newCode}
            onChange={(e) => setNewCode(e.target.value)}
            fullWidth
          />
        </Grid>
        <Grid item xs={12}>
          <Button variant="contained" color="primary" onClick={addCodeExample}>
            添加代码示例
          </Button>
        </Grid>
      </Grid>
      <Typography variant="h6" style={{ marginTop: 20 }}>现有代码示例</Typography>
      {codeExamples.map((example: any) => (
        <Paper key={example._id} style={{ padding: 10, margin: 10 }}>
          <Typography>等级: {example.level}</Typography>
          <pre>{example.code}</pre>
          <Button variant="contained" color="secondary" onClick={() => deleteCodeExample(example._id)}>
            删除
          </Button>
        </Paper>
      ))}
    </Paper>
  );
};

export default AdminCodeManager; 