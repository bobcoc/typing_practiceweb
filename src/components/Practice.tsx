// src/components/Practice.tsx
import React, { useState, useEffect, useRef} from 'react';
import { message } from 'antd';
import Input from 'antd/lib/input';
import Card from 'antd/lib/card';
import Progress from 'antd/lib/progress';
import Modal from 'antd/lib/modal';
import Row from 'antd/lib/row';
import Col from 'antd/lib/col';
import Button from 'antd/lib/button';
import { useNavigate, useParams } from 'react-router-dom';
import { api, ApiError} from '../api/apiClient';
import { API_PATHS } from '../config';
import type { ChangeEvent, KeyboardEvent } from 'react';

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
  title: string;
  content: string;
}

interface KeywordsResponse {
  title: string;
  content: string;
}

const Practice: React.FC = () => {
  const navigate = useNavigate();
  const { level } = useParams<{ level: string }>();
  const [content, setContent] = useState<string>('');
  const [currentKeyword, setCurrentKeyword] = useState<string>('');
  const [userInput, setUserInput] = useState<string>('');
  const textAreaRef = useRef<HTMLTextAreaElement>(null);

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
  const [loading, setLoading] = useState(false);

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

  const [title, setTitle] = useState<string>('');
  const [codeComment, setCodeComment] = useState<string>('');
  const [codeContent, setCodeContent] = useState<string>('');

  const fetchContent = async () => {
    try {
      setLoading(true);
      const endpoint = level === 'keyword' 
        ? API_PATHS.KEYWORDS
        : `${API_PATHS.CODE_EXAMPLES}/${level}`;
  
      const response = await api.get<KeywordsResponse | CodeExampleResponse>(endpoint);
      console.log('API response:', response);
      if (level === 'keyword') {
        const keywordArray = response.content
          .split('\n')
          .filter(k => k.trim() !== '');
        setContent(response.content);
        setTitle(response.title);
        getRandomKeyword(keywordArray);
      } else {
        // 分离注释和代码内容
        const lines = response.content.split('\n');
        const commentLine = lines.find(line => line.trim().startsWith('//')) || '';
        const codeLines = lines.filter(line => !line.trim().startsWith('//'));
        
        setCodeComment(commentLine);
        setCodeContent(codeLines.join('\n'));
        setContent(codeLines.join('\n')); // 用于比对的内容不包含注释
        setTitle(response.title);
      }
    } catch (error) {
      message.error('获取内容失败');
      console.error('获取内容失败:', error);
    } finally {
      setLoading(false);
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
    // 预处理函数：保留必要的空格，移除非必要空格
    const processCode = (code: string) => {
      // 1. 定义关键字和它们的空格规则
      const keywordRules = {
        // 必须后跟空格的关键字
        mustHaveSpace: ['int', 'char', 'float', 'double', 'void', 'long', 'short', 'unsigned'],
        // 可以直接跟符号的关键字
        canHaveSymbol: ['for', 'while', 'if', 'else', 'do']
      };
  
      let processed = code;
  
      // 2. 处理必须后跟空格的关键字
      keywordRules.mustHaveSpace.forEach(keyword => {
        // 关键字后必须有空格，且空格后必须是字母或下划线（变量名开头）
        const regex = new RegExp(`(${keyword})(\\s+)([a-zA-Z_])`, 'g');
        processed = processed.replace(regex, `$1§$3`);
      });
  
      // 3. 处理可以直接跟符号的关键字
      keywordRules.canHaveSymbol.forEach(keyword => {
        // 关键字后可以是空格或直接跟符号
        const regex = new RegExp(`(${keyword})(\\s*)([{(])`, 'g');
        processed = processed.replace(regex, `$1$3`);
      });
  
      // 4. 移除所有剩余的空格
      processed = processed.replace(/\s+/g, '');
  
      // 5. 还原必要的空格（§ 标记）
      processed = processed.replace(/§/g, ' ');
  
      return processed;
    };
  
    // 对输入和原始内容进行预处理
    const processedInput = processCode(currentInput);
    const processedContent = processCode(content);
  
    // 按行分割进行比对
    const inputLines = processedInput.split('\n');
    const contentLines = processedContent.split('\n');
  
    // 计算正确的标记数
    let correctCount = 0;
    let totalCount = 0;
  
    inputLines.forEach((line, lineIndex) => {
      if (contentLines[lineIndex]) {
        // 将每行分解为标记，包括所有可能的符号
        const inputTokens = line.split(/([;,(){}=+\-*/<>]|\s+)/g).filter(Boolean);
        const contentTokens = contentLines[lineIndex].split(/([;,(){}=+\-*/<>]|\s+)/g).filter(Boolean);
  
        inputTokens.forEach((token, tokenIndex) => {
          if (contentTokens[tokenIndex]) {
            // 忽略空格差异进行比较
            const normalizedToken = token.trim();
            const normalizedContent = contentTokens[tokenIndex].trim();
            if (normalizedToken === normalizedContent) {
              correctCount++;
            }
            totalCount++;
          }
        });
      }
    });
  
    setStats(prev => ({
      ...prev,
      totalWords: totalCount,
      correctWords: correctCount,
      accuracy: totalCount > 0 ? (correctCount / totalCount) * 100 : 0,
    }));
  };

  const handleExit = () => {
    setIsModalVisible(true);
  };
  const confirmExit = async () => {
    try {
      // 调试：检查用户信息
      const userStr = localStorage.getItem('user');
      const token = localStorage.getItem('token');
      console.log('Saving practice record:', {
        hasUser: !!userStr,
        hasToken: !!token,
        userInfo: userStr ? JSON.parse(userStr) : null
      });
  
      const finalStats = {
        ...stats,
        endTime: new Date(),
      };
  
      // 调试：打印请求数据
      console.log('Practice record data:', {
        type: level,
        stats: finalStats,
        endpoint: API_PATHS.PRACTICE_RECORDS
      });
  
      // 使用 apiClient 发送请求
      const response = await api.post(API_PATHS.PRACTICE_RECORDS, {
        type: level,
        stats: finalStats,
      });
  
      // 调试：打印响应
      console.log('Save practice record response:', response);
  
      message.success('练习记录已保存');
      navigate('/practice-history');
    } catch (error) {
      // 详细的错误日志
      console.error('Save practice record error:', {
        error,
        isApiError: error instanceof ApiError,
        statusCode: error instanceof ApiError ? error.statusCode : undefined,
        message: error instanceof Error ? error.message : 'Unknown error',
        token: localStorage.getItem('token') ? 'present' : 'missing',
        user: localStorage.getItem('user') ? 'present' : 'missing'
      });
  
      if (error instanceof ApiError) {
        if (error.statusCode === 401) {
          console.log('Authentication error detected, user info:', {
            token: localStorage.getItem('token'),
            user: localStorage.getItem('user')
          });
          message.error('请重新登录');
          // 保存当前路径
          localStorage.setItem('redirectPath', window.location.pathname);
          navigate('/login');
        } else {
          message.error(error.message || '保存记录失败');
        }
      } else {
        console.error('Unexpected error:', error);
        message.error('保存记录失败');
      }
    } finally {
      setIsModalVisible(false);
    }
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
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
// 处理 Tab 键
if (e.key === 'Tab') {
  e.preventDefault();
  const start = e.currentTarget.selectionStart;
  const end = e.currentTarget.selectionEnd;
  const value = e.currentTarget.value;
  
  // 插入两个空格作为缩进
  const newValue = value.substring(0, start) + '    ' + value.substring(end);
  setUserInput(newValue);
  
  // 使用 ref 设置光标位置
  if (textAreaRef.current) {
    textAreaRef.current.value = newValue;
    textAreaRef.current.selectionStart = textAreaRef.current.selectionEnd = start + 2;
  }
}

// 处理回车键
if (e.key === 'Enter') {
  e.preventDefault();
  const start = e.currentTarget.selectionStart;
  const value = e.currentTarget.value;
  const lineStart = value.lastIndexOf('\n', start - 1) + 1;
  const currentLine = value.slice(lineStart, start);
  
  // 添加空值检查
  const indentMatch = currentLine.match(/^\s*/);
  const indent = indentMatch ? indentMatch[0] : '';
  
  // 检查是否需要增加缩进
  const needsExtraIndent = value.slice(Math.max(0, start - 1), start) === '{';
  const extraIndent = needsExtraIndent ? '    ' : '';
  
  // 插入换行和缩进
  const newValue = value.substring(0, start) + '\n' + indent + extraIndent + value.substring(start);
  setUserInput(newValue);
  
  // 使用 ref 设置光标位置
  const newPosition = start + 1 + indent.length + extraIndent.length;
  if (textAreaRef.current) {
    textAreaRef.current.value = newValue;
    textAreaRef.current.selectionStart = textAreaRef.current.selectionEnd = newPosition;
  }
}

// 处理右大括号 }
if (e.key === '}') {
  const start = e.currentTarget.selectionStart;
  const value = e.currentTarget.value;
  const lineStart = value.lastIndexOf('\n', start - 1) + 1;
  const currentLine = value.slice(lineStart, start);
  
  // 如果当前行只有空白字符，减少缩进
  if (/^\s*$/.test(currentLine)) {
    e.preventDefault();
    // 减少一级缩进（两个空格）
    const newIndent = currentLine.slice(0, Math.max(0, currentLine.length - 4));
    const newValue = value.substring(0, lineStart) + newIndent + '}' + value.substring(start);
    setUserInput(newValue);
    
    // 使用 ref 设置光标位置
    if (textAreaRef.current) {
      textAreaRef.current.value = newValue;
      textAreaRef.current.selectionStart = textAreaRef.current.selectionEnd = lineStart + newIndent.length + 1;
    }
  }
}
};
  if (loading) {
    return (
      <Card>
        <div style={{ textAlign: 'center', padding: '20px' }}>
          加载中...
        </div>
      </Card>
    );
  }

  return (
    <Card title={`${level === 'keyword' ? '关键字' : '代码'}打字练习: ${title}`}>
      {level === 'keyword' ? (
        // 关键字练习的布局保持不变
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
          <div style={{ 
      textAlign: 'center', 
      marginTop: 20,
      marginBottom: 20
    }}>
      <Button type="primary" danger onClick={handleExit}>
        结束练习
      </Button>
    </div>
        </div>
      ) : (
        //{/* 代码练习模式的布局 */}{/* 代码练习模式的布局 */}
<div style={{ 
  maxWidth: 1200, 
  margin: '0 auto',
  padding: '20px 0',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center'  // 居中对齐
}}>
  {/* 统计信息区域 */}
  <div style={{
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    gap: 40,
    width: '100%'
  }}>
    <Progress
      type="circle"
      percent={Math.round(stats.accuracy)}
      format={(percent?: number) => `正确率: ${percent || 0}%`}
      width={120}
    />
    <div>
      <p style={{ margin: '5px 0' }}>总单词数: {stats.totalWords}</p>
      <p style={{ margin: '5px 0' }}>正确单词数: {stats.correctWords}</p>
      <p style={{ margin: '5px 0' }}>每分钟单词数: {Math.round(stats.wordsPerMinute)}</p>
      <p style={{ margin: '5px 0' }}>练习时间: {Math.round(stats.duration)}秒</p>
    </div>
  </div>

  {/* 代码练习区域容器 */}
  <div style={{ width: 1200 }}>  {/* 固定宽度的容器 */}
    {/* 注释显示区域 */}
    {codeComment && (
      <div style={{ 
        background: '#f5f5f5',
        padding: '8px 16px',
        marginBottom: 20,
        borderRadius: 4,
        color: '#666',
        fontFamily: 'Consolas, Monaco, "Andale Mono", "Ubuntu Mono", monospace',
        fontSize: '14px'
      }}>
        {codeComment}
      </div>
    )}

{/* 代码区域 */}
<Row gutter={16} style={{ justifyContent: 'space-between' }}>
  <Col style={{ width: 584 }}>
    <div style={{ 
      height: 400,
      background: '#f5f5f5', 
      borderRadius: 4,
      overflow: 'hidden'
    }}>
      <pre style={{ 
        height: '100%',
        margin: 0,
        padding: 16,
        whiteSpace: 'pre-wrap',
        wordWrap: 'break-word',
        fontSize: '14px',
        lineHeight: '1.5',
        fontFamily: 'Consolas, Monaco, "Andale Mono", "Ubuntu Mono", monospace',
        overflow: 'auto'
      }}>
        {codeContent}
      </pre>
    </div>
  </Col>
  <Col style={{ width: 584 }}>
    <div style={{ 
      height: 400,
      background: '#fff',
      borderRadius: 4,
    }}>
<Input.TextArea
  value={userInput}
  onChange={handleInputChange}
  onKeyDown={handleKeyDown}
  placeholder="在此输入代码"
  style={{ 
    height: '100%',
    fontSize: '14px',
    lineHeight: '1.5',
    fontFamily: 'Consolas, Monaco, "Andale Mono", "Ubuntu Mono", monospace',
    resize: 'none',
    padding: 16,
    border: '1px solid #d9d9d9',
    borderRadius: 4,
    whiteSpace: 'pre',  // 保持空格和换行
    tabSize: 2  // 设置 Tab 的大小
  }}
  autoFocus
/>
    </div>
  </Col>
</Row>

{/* 单独的按钮行 */}
<div style={{ 
  display: 'flex',
  justifyContent: 'flex-end',
  marginTop: 20
}}>
  <Button 
    type="primary" 
    danger 
    onClick={handleExit}
    style={{ 
      width: 120,  // 设置固定宽度
      height: 32 
    }}
  >
    结束练习
  </Button>
</div>
  </div>
</div>
      )}

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