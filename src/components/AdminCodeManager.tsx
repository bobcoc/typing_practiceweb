import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  SelectChangeEvent,
  FormHelperText,
} from '@mui/material';
import { CodeExample, PracticeLevel } from '../types';

interface EditingExample {
  _id?: string;
  title?: string;
  content: string;
  level: PracticeLevel | '';
  createdAt?: Date;
  updatedAt?: Date;
}

const AdminCodeManager: React.FC = () => {
  const [codeExamples, setCodeExamples] = useState<CodeExample[]>([]);
  const [open, setOpen] = useState(false);
  const [editingExample, setEditingExample] = useState<EditingExample>({
    content: '',
    level: ''
  });
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    fetchCodeExamples();
  }, []);

  const fetchCodeExamples = async () => {
    try {
      const response = await fetch('http://localhost:5001/api/code-examples');
      const data = await response.json();
      setCodeExamples(data);
    } catch (error) {
      console.error('Error fetching code examples:', error);
    }
  };

  const handleOpen = (example?: CodeExample) => {
    if (example) {
      setEditingExample({
        ...example,
        content: example.content,
        level: example.level
      });
      setIsEditing(true);
    } else {
      setEditingExample({ content: '', level: '' });
      setIsEditing(false);
    }
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setEditingExample({ content: '', level: '' });
    setIsEditing(false);
  };

  const handleSave = async () => {
    try {
      if (editingExample.level === '') {
        alert('请选择代码类型');
        return;
      }

      let processedContent = editingExample.content;
      if (editingExample.level === 'keyword') {
        processedContent = editingExample.content
          .split('\n')
          .map(line => line.trim())
          .filter(line => line.length > 0)
          .join('\n');
      } else {
        processedContent = editingExample.content.trim();
      }

      const dataToSave: Omit<CodeExample, '_id'> = {
        title: editingExample.title || '',
        content: processedContent,
        level: editingExample.level
      };

      const url = isEditing && editingExample._id
        ? `http://localhost:5001/api/code-examples/${editingExample._id}`
        : 'http://localhost:5001/api/code-examples';
      
      const method = isEditing ? 'PUT' : 'POST';
      
      await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dataToSave),
      });

      handleClose();
      fetchCodeExamples();
    } catch (error) {
      console.error('Error saving code example:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('确定要删除这个代码示例吗？')) {
      try {
        await fetch(`http://localhost:5001/api/code-examples/${id}`, {
          method: 'DELETE',
        });
        fetchCodeExamples();
      } catch (error) {
        console.error('Error deleting code example:', error);
      }
    }
  };

  const getPlaceholderText = (level: string) => {
    switch(level) {
      case 'keyword':
        return '请输入关键字，每行一个\n例如：\nfor\nwhile\nif';
      case 'basic':
        return '// 请输入基础算法代码\n// 例如：冒泡排序\nvoid bubbleSort() {\n    // 代码内容\n}';
      case 'intermediate':
        return '// 请输入中级算法代码\n// 例如：快速排序\nvoid quickSort() {\n    // 代码内容\n}';
      case 'advanced':
        return '// 请输入高级算法代码\n// 例如：红黑树\nclass RedBlackTree {\n    // 代码内容\n}';
      default:
        return '';
    }
  };

  const handleLevelChange = (event: SelectChangeEvent) => {
    const newLevel = event.target.value as PracticeLevel;
    setEditingExample({
      ...editingExample,
      level: newLevel,
      content: getPlaceholderText(newLevel)
    });
  };

  return (
    <Container>
      <Button
        variant="contained"
        color="primary"
        onClick={() => handleOpen()}
        style={{ margin: '20px 0' }}
      >
        添加新代码示例
      </Button>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>标题</TableCell>
              <TableCell>级别</TableCell>
              <TableCell>操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {codeExamples.map((example) => (
              <TableRow key={example._id}>
                <TableCell>{example.title}</TableCell>
                <TableCell>{example.level}</TableCell>
                <TableCell>
                  <Button onClick={() => handleOpen(example)}>编辑</Button>
                  <Button onClick={() => handleDelete(example._id)}>删除</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
        <DialogTitle>{isEditing ? '编辑代码示例' : '添加新代码示例'}</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="标题"
            value={editingExample.title || ''}
            onChange={(e) => setEditingExample({ ...editingExample, title: e.target.value })}
            margin="normal"
          />
          <FormControl fullWidth margin="normal">
            <InputLabel>代码类型</InputLabel>
            <Select
              value={editingExample.level || ''}
              onChange={handleLevelChange}
              label="代码类型"
            >
              <MenuItem value="keyword">关键字</MenuItem>
              <MenuItem value="basic">初级算法</MenuItem>
              <MenuItem value="intermediate">中级算法</MenuItem>
              <MenuItem value="advanced">高级算法</MenuItem>
            </Select>
            <FormHelperText>
              {editingExample.level === 'keyword' ? 
                '每个关键字占一行' : 
                '请输入完整的函数或类定义'}
            </FormHelperText>
          </FormControl>
          <TextField
            fullWidth
            label="代码内容"
            multiline
            rows={10}
            value={editingExample.content || ''}
            onChange={(e) => setEditingExample({
              ...editingExample,
              content: e.target.value
            })}
            placeholder={getPlaceholderText(editingExample.level || '')}
            margin="normal"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>取消</Button>
          <Button onClick={handleSave} color="primary">
            保存
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default AdminCodeManager; 