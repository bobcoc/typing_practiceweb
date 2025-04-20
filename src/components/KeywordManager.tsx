import React, { useState, useEffect } from 'react';
import { message } from 'antd';
import Button from 'antd/lib/button';
import TextArea from 'antd/lib/input/TextArea';
import { api } from '../api/apiClient';
import { API_PATHS } from '../config';

const KeywordManager: React.FC = () => {
  const [keywords, setKeywords] = useState('');

  useEffect(() => {
    fetchKeywords();
  }, []);

  const fetchKeywords = async () => {
    try {
      const response = await api.get<{ content: string }>(API_PATHS.KEYWORDS);
      setKeywords(response.content);
    } catch (error) {
      console.error('Error fetching keywords:', error);
      message.error('获取关键词列表失败');
    }
  };

  const handleSubmit = async () => {
    try {
      await api.post(API_PATHS.KEYWORDS, { content: keywords });
      message.success('保存成功');
    } catch (error) {
      console.error('Error saving keywords:', error);
      message.error('保存失败');
    }
  };

  return (
    <div>
      <h2>关键字管理</h2>
      <div>
        <TextArea
          rows={10}
          placeholder="请输入关键字，每行一个"
          value={keywords}
          onChange={(e) => setKeywords(e.target.value)}
        />
      </div>
      <div style={{ marginTop: '16px' }}>
        <Button 
          type="primary" 
          onClick={handleSubmit}
        >
          保存
        </Button>
      </div>
    </div>
  );
};

export default KeywordManager;