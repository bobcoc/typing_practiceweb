import React, { useState, useEffect } from 'react';
import { message } from 'antd';
import Input from 'antd/lib/input';
import Card from 'antd/lib/card';
import Progress from 'antd/lib/progress';
import Modal from 'antd/lib/modal';
import Row from 'antd/lib/row';
import Col from 'antd/lib/col';
import Button from 'antd/lib/button';
import { useNavigate, useParams } from 'react-router-dom';
import { API_BASE_URL, API_PATHS } from '../config';
import type { ChangeEvent, KeyboardEvent } from 'react';

// 类型定义
interface PracticeStats {
  totalWords: number;
  correctWords: number;
  accuracy: number;
  wordsPerMinute: number;
  startTime: Date;
  endTime?: Date;
  duration: number;
}

interface CodeExampleResponse {
  content: string;
}

interface KeywordsResponse {
  content: string;
}

const Practice: React.FC = () => {
  const navigate = useNavigate();
  const { level } = useParams<{ level: string }>();
  const [content, setContent] = useState<string>('');
  const [currentKeyword, setCurrentKeyword] = useState<string>('');
  const [userInput, setUserInput] = useState<string>('');
  const [stats, setStats] = useState<PracticeStats>({
    totalWords: 0,
    correctWords: 0,
    accuracy: 0,
    wordsPerMinute: 0,
    startTime: new Date(),
    duration: 0,
  });
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [timer, setTimer] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    fetchContent();
    const intervalTimer = setInterval(updateTimer, 1000);
    setTimer(intervalTimer);

    return () => {
      if (timer) {
        clearInterval(timer);
      }
    };
  }, []);

  const updateTimer = () => {
    setStats(prev => {
      const duration = (new Date().getTime() - prev.startTime.getTime()) / 1000;
      const wordsPerMinute = (prev.totalWords / duration) * 60;
      return { ...prev, duration, wordsPerMinute };
    });
  };

  const fetchContent = async () => {
    try {
      const endpoint = level === 'keyword' 
        ? API_PATHS.KEYWORDS
        : `${API_PATHS.CODE_EXAMPLES}/${level}`;
        
      const response = await fetch(`${API_BASE_URL}${endpoint}`);
      if (!response.ok) {
        throw new Error('获取内容失败');
      }

      const data: KeywordsResponse | CodeExampleResponse = await response.json();
      
      if (level === 'keyword') {
        const keywordArray = data.content
          .split('\n')
          .filter(k => k.trim() !== '');
        setContent(data.content);
        getRandomKeyword(keywordArray);
      } else {
        setContent(data.content);
      }
    } catch (error) {
      message.error('获取内容失败');
      console.error('获取内容失败:', error);
    }
  };

  const getRandomKeyword = (keywordArray: string[]) => {
    if (keywordArray.length === 0) {
      setCurrentKeyword('');
      return;
    }
    const randomIndex = Math.floor(Math.random() * keywordArray.length);
    setCurrentKeyword(keywordArray[randomIndex]);
  };

  const handleInputChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setUserInput(e.target.value);
    if (level !== 'keyword') {
      updateStats(e.target.value);
    }
  };

  const handleKeywordInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    setUserInput(e.target.value);
  };

  const handleKeywordSubmit = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const isCorrect = userInput.trim() === currentKeyword;
      updateKeywordStats(isCorrect);
      setUserInput('');
      getRandomKeyword(content.split('\n').filter(k => k.trim() !== ''));
    }
  };

  const updateKeywordStats = (isCorrect: boolean) => {
    setStats(prev => ({
      ...prev,
      totalWords: prev.totalWords + 1,
      correctWords: prev.correctWords + (isCorrect ? 1 : 0),
      accuracy: ((prev.correctWords + (isCorrect ? 1 : 0)) / (prev.totalWords + 1)) * 100,
    }));

    if (isCorrect) {
      message.success('正确!');
    } else {
      message.error(`错误! 正确答案是: ${currentKeyword}`);
    }
  };

  const updateStats = (currentInput: string) => {
    const words = currentInput.split(/\s+/);
    const contentWords = content.split(/\s+/);
    const correctWords = words.filter((word, index) => word === contentWords[index]);

    setStats(prev => ({
      ...prev,
      totalWords: words.length,
      correctWords: correctWords.length,
      accuracy: words.length > 0 ? (correctWords.length / words.length) * 100 : 0,
    }));
  };

  const handleExit = () => {
    setIsModalVisible(true);
  };

  const confirmExit = async () => {
    try {
      const finalStats = {
        ...stats,
        endTime: new Date(),
      };

      const response = await fetch(`${API_BASE_URL}${API_PATHS.PRACTICE_RECORDS}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: level,
          stats: finalStats,
        }),
      });

      if (!response.ok) {
        throw new Error('保存记录失败');
      }

      message.success('练习记录已保存');
      navigate('/practice-history');
    } catch (error) {
      message.error('保存记录失败');
      console.error('保存记录失败:', error);
    }
    setIsModalVisible(false);
  };

  const renderStats = () => (
    <div style={{ marginBottom: 20 }}>
      <Progress
        type="circle"
        percent={Math.round(stats.accuracy)}
        format={(percent?: number) => `正确率: ${percent || 0}%`}
      />
      <div style={{ marginTop: 10 }}>
        <p>总单词数: {stats.totalWords}</p>
        <p>正确单词数: {stats.correctWords}</p>
        <p>每分钟单词数: {Math.round(stats.wordsPerMinute)}</p>
        <p>练习时间: {Math.round(stats.duration)}秒</p>
      </div>
    </div>
  );

  return (
    <Card title={`${level === 'keyword' ? '关键字' : '代码'}打字练习`}>
      {level === 'keyword' ? (
        <div style={{ textAlign: 'center' }}>
          {renderStats()}
          <div style={{ margin: '20px 0', fontSize: '24px', fontFamily: 'monospace' }}>
            {currentKeyword || '没有可用的关键字'}
          </div>
          <Input
            value={userInput}
            onChange={handleKeywordInputChange}
            onKeyPress={handleKeywordSubmit}
            placeholder="输入关键字，按回车确认"
            style={{ maxWidth: 300, marginBottom: 20 }}
            autoFocus
          />
        </div>
      ) : (
        <Row gutter={16}>
          <Col xs={24} md={12}>
            <pre style={{ 
              background: '#f5f5f5', 
              padding: 16, 
              borderRadius: 4,
              maxHeight: '70vh',
              overflow: 'auto',
              whiteSpace: 'pre-wrap',
              wordWrap: 'break-word'
            }}>
              {content}
            </pre>
          </Col>
          <Col xs={24} md={12}>
            {renderStats()}
            <Input.TextArea
              value={userInput}
              onChange={handleInputChange}
              placeholder="在此输入代码"
              style={{ height: '60vh' }}
              autoFocus
            />
          </Col>
        </Row>
      )}

      <div style={{ textAlign: 'center', marginTop: 20 }}>
        <Button type="primary" danger onClick={handleExit}>
          结束练习
        </Button>
      </div>

      <Modal
        title="确认结束练习"
        open={isModalVisible}
        onOk={confirmExit}
        onCancel={() => setIsModalVisible(false)}
      >
        <p>确定要结束本次练习吗？您的练习记录将被保存。</p>
        <p>当前正确率: {Math.round(stats.accuracy)}%</p>
        <p>每分钟单词数: {Math.round(stats.wordsPerMinute)}</p>
      </Modal>
    </Card>
  );
};

export default Practice;