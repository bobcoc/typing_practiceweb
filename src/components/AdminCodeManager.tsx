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
  description?: string;
  difficulty?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

const AdminCodeManager: React.FC = () => {
  const [codeExamples, setCodeExamples] = useState<CodeExample[]>([]);
  const [open, setOpen] = useState(false);
  const [editingExample, setEditingExample] = useState<EditingExample>({
    content: '',
    level: '',
    description: '',
    difficulty: 1
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
        level: example.level,
        description: example.description || '',
        difficulty: example.difficulty || 1
      });
      setIsEditing(true);
    } else {
      setEditingExample({
        content: '',
        level: '',
        description: '',
        difficulty: 1
      });
      setIsEditing(false);
    }
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setEditingExample({
      content: '',
      level: '',
      description: '',
      difficulty: 1
    });
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
        level: editingExample.level,
        description: editingExample.description || '',
        difficulty: editingExample.difficulty || 1
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

  const getTemplateForLevel = (level: PracticeLevel): string => {
    switch(level) {
      case 'keyword':
        return '请输入关键字，每行一个：\n\nfor\nwhile\nif\nelse\nreturn';
        
      case 'basic':
        return `// 基础算法示例 - 冒泡排序
void bubbleSort(int arr[], int n) {
    for(int i = 0; i < n-1; i++) {
        for(int j = 0; j < n-i-1; j++) {
            if(arr[j] > arr[j+1]) {
                int temp = arr[j];
                arr[j] = arr[j+1];
                arr[j+1] = temp;
            }
        }
    }
}`;
        
      case 'intermediate':
        return `// 中级算法示例 - 快速排序
int partition(int arr[], int low, int high) {
    int pivot = arr[high];
    int i = (low - 1);
    
    for(int j = low; j <= high - 1; j++) {
        if(arr[j] < pivot) {
            i++;
            swap(&arr[i], &arr[j]);
        }
    }
    swap(&arr[i + 1], &arr[high]);
    return (i + 1);
}`;
        
      case 'advanced':
        return `// 高级算法示例 - 红黑树节点插入
void insertFixup(Node* k) {
    Node* u;
    while(k->parent->color == RED) {
        if(k->parent == k->parent->parent->right) {
            u = k->parent->parent->left;
            if(u->color == RED) {
                u->color = BLACK;
                k->parent->color = BLACK;
                k->parent->parent->color = RED;
                k = k->parent->parent;
            }
        }
        // ... 其余情况处理
    }
    root->color = BLACK;
}`;
    }
  };

  const handleLevelChange = (event: SelectChangeEvent) => {
    const newLevel = event.target.value as PracticeLevel;
    setEditingExample({
      ...editingExample,
      level: newLevel,
      content: getTemplateForLevel(newLevel)
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
        <DialogTitle>
          {isEditing ? '编辑代码示例' : '添加新代码示例'}
        </DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="标题"
            value={editingExample.title || ''}
            onChange={(e) => setEditingExample({ 
              ...editingExample, 
              title: e.target.value 
            })}
            margin="normal"
            helperText="请输入算法名称，例如：'冒泡排序'"
          />
          
          <TextField
            fullWidth
            label="描述"
            value={editingExample.description || ''}
            onChange={(e) => setEditingExample({ 
              ...editingExample, 
              description: e.target.value 
            })}
            margin="normal"
            multiline
            rows={2}
            helperText="简要描述算法的功能和用途"
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
              {editingExample.level === 'keyword' 
                ? '每个关键字占一行' 
                : '请输入一个完整的函数实现'}
            </FormHelperText>
          </FormControl>

          {editingExample.level !== 'keyword' && (
            <FormControl fullWidth margin="normal">
              <InputLabel>难度等级</InputLabel>
              <Select
                value={editingExample.difficulty || 1}
                onChange={(e) => setEditingExample({
                  ...editingExample,
                  difficulty: Number(e.target.value)
                })}
                label="难度等级"
              >
                {[1,2,3,4,5].map(level => (
                  <MenuItem key={level} value={level}>
                    {level} {level === 1 ? '(最简单)' : level === 5 ? '(最难)' : ''}
                  </MenuItem>
                ))}
              </Select>
              <FormHelperText>设置算法的难度等级</FormHelperText>
            </FormControl>
          )}

          <TextField
            fullWidth
            label="代码内容"
            multiline
            rows={12}
            value={editingExample.content || ''}
            onChange={(e) => setEditingExample({
              ...editingExample,
              content: e.target.value
            })}
            margin="normal"
            placeholder={getTemplateForLevel(editingExample.level as PracticeLevel)}
            helperText={
              editingExample.level === 'keyword'
                ? '每行输入一个关键字'
                : '请输入完整的函数实现，包含函数声明和实现'
            }
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>取消</Button>
          <Button onClick={handleSave} color="primary">保存</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default AdminCodeManager; 