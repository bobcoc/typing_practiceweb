import React, { useState, useEffect } from 'react';
import { message } from 'antd';
import Button from 'antd/lib/button';
import TextArea from 'antd/lib/input/TextArea';

const KeywordManager: React.FC = () => {
  const [keywords, setKeywords] = useState('');

  useEffect(() => {
    fetchKeywords();
  }, []);

  const fetchKeywords = async () => {
    try {
      const response = await fetch('http://localhost:5001/api/keywords');
      const data = await response.json();
      setKeywords(data.content || '');
    } catch (error) {
      message.error('获取关键字失败');
    }
  };

  const handleSubmit = () => {
    fetch('http://localhost:5001/api/keywords', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ content: keywords }),
    })
      .then(() => {
        message.success('保存成功');
      })
      .catch(() => {
        message.error('保存失败');
      });
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