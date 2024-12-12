// src/components/Practice.tsx
import React, { useState, useEffect, useRef} from 'react';
import message from 'antd/es/message';
import Input from 'antd/lib/input';
import Card from 'antd/lib/card';
import Progress from 'antd/lib/progress';
import Modal from 'antd/lib/modal';
import Row from 'antd/lib/row';
import Col from 'antd/lib/col';
import Button from 'antd/lib/button';
import { useNavigate, useParams } from 'react-router-dom';
import { api, ApiError, authEvents} from '../api/apiClient';
import { API_PATHS } from '../config';
import type { ChangeEvent, KeyboardEvent, ClipboardEvent } from 'react';
import VirtualKeyboard from './VirtualKeyboard';
import CryptoJS from 'crypto-js';

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
  const [enterCount, setEnterCount] = useState(0); 
  const timeOffsetRef = useRef<number>(0);
  const [timeOffset, setTimeOffset] = useState<number>(0);
  const navigate = useNavigate();
  const { level } = useParams<{ level: string }>();
  const [content, setContent] = useState<string>('');
  const [currentKeyword, setCurrentKeyword] = useState<string>('');
  const [userInput, setUserInput] = useState<string>('');
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const codePreviewRef = useRef<HTMLPreElement>(null);

  // 将这两个状态定义移到组件开头
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [lastKey, setLastKey] = useState<string | null>(null);
  const [shiftPressed, setShiftPressed] = useState(false);
  const [lastComboShift, setLastComboShift] = useState<string | null>(null); // 记录最后组合键中的shift
const [lastNormalKey, setLastNormalKey] = useState<string | null>(null); // 记录最后按下的普通键
  // 添加实际按键计数器状态
  const [actualKeyCount, setActualKeyCount] = useState<number>(0);

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
  const [title, setTitle] = useState<string>('');
  const [codeComment, setCodeComment] = useState<string>('');
  const [codeContent, setCodeContent] = useState<string>('');

  // 添加调试信息的状态
  const [debugInfo, setDebugInfo] = useState<{
    keyCount: number;
    inputLength: number;
    lastInputChange: string;
    timestamp: number;
  }>({
    keyCount: 0,
    inputLength: 0,
    lastInputChange: '',
    timestamp: Date.now()
  });

  // 添加新的状态
  const [currentKeywordToType, setCurrentKeywordToType] = useState<string>(''); // 用户需要输入的部分

  // 防止复制粘贴的事件处理函数
  const handlePaste = (e: ClipboardEvent) => {
    e.preventDefault();
    message.warning('练习模式下不允许粘贴');
  };

  const handleCopy = (e: ClipboardEvent) => {
    e.preventDefault();
    message.warning('练习模式下不允许复制');
  };

  const preventContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
  };

  useEffect(() => {
    fetchContent();
    const intervalTimer = setInterval(() => {
      // 直接使用 ref 中的值
      updateTimer();
    }, 1000);
    setTimer(intervalTimer);
    
    const handleAuthError = (error: ApiError) => {
      message.error(error.message);
      setTimeout(() => {
        navigate('/login');
      }, 1500);
    };
    authEvents.onAuthError.add(handleAuthError);
    
    return () => {
      if (intervalTimer) {
        clearInterval(intervalTimer);
      }
      authEvents.onAuthError.delete(handleAuthError);
    };
  }, [navigate]); 

  const updateTimer = () => {
    const currentOffset = timeOffsetRef.current;
    setStats(prev => {
      const currentServerTime = Date.now() + currentOffset;
      const duration = (currentServerTime - prev.startTime.getTime()) / 1000;
      const wordsPerMinute = (prev.totalWords / duration) * 60;
      
      return { ...prev, duration, wordsPerMinute };
    });
  };

  const fetchContent = async () => {
    try {
      setLoading(true);
      const { serverTime } = await api.get<{ serverTime: number }>(API_PATHS.SYSTEM.SERVER_TIME);
      // 计算本地时间和服务器时间的差值
    const localTime = Date.now();
    const offset = serverTime - localTime;
    timeOffsetRef.current = offset;
    setTimeOffset(offset);
      setStats(prev => ({
        ...prev,
        startTime: new Date(serverTime)
      }));
      const endpoint = level === 'keyword' 
        ? API_PATHS.KEYWORDS
        : `${API_PATHS.CODE_EXAMPLES}/${level}`;
  
      const response = await api.get<KeywordsResponse | CodeExampleResponse>(endpoint);

      if (level === 'keyword') {
        const keywordArray = response.content
          .split('\n')
          .filter(k => k.trim() !== '');
        setContent(response.content);
        getRandomKeyword(keywordArray);
      } else {
        const lines = response.content.split('\n');
        const commentLine = lines.find(line => line.trim().startsWith('//')) || '';
        const codeLines = lines.filter(line => !line.trim().startsWith('//'));
        
        setCodeComment(commentLine);
        setCodeContent(codeLines.join('\n'));
        setContent(codeLines.join('\n'));
        setTitle(level === 'keyword'?'':':' + response.title);
      }
    } catch (error) {
      message.error('获取内容失败');
    } finally {
      setLoading(false);
    }
  };

  const getRandomKeyword = (keywordArray: string[]) => {
    if (keywordArray.length === 0) {
      setCurrentKeyword('');
      setCurrentKeywordToType('');
      return;
    }
    const randomIndex = Math.floor(Math.random() * keywordArray.length);
    const selectedKeyword = keywordArray[randomIndex];
    const keywordParts = selectedKeyword.split(',');
    
    setCurrentKeyword(selectedKeyword); // 保持完整内容显示
    setCurrentKeywordToType(keywordParts[0].trim()); // 设置用户需要输入的部分
    
    if (codePreviewRef.current) {
      const lineHeight = 21;
      const currentLine = randomIndex;
      codePreviewRef.current.scrollTop = currentLine * lineHeight;
    }
  };

  const handleInputChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    const oldLength = userInput.length;
    const newLength = newValue.length;
    
    console.log('输入变化:', {
      oldLength,
      newLength,
      lengthDiff: newLength - oldLength,
      actualKeyCount,
      timeSinceLastInput: Date.now() - debugInfo.timestamp,
      valueChanged: newValue.slice(Math.max(0, newValue.length - 10)) // 显示最后10个字符的变化
    });

    setUserInput(newValue);
    if (level !== 'keyword') {
      updateStats(newValue);
    }
  };

  const handleKeywordInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    setUserInput(e.target.value);
  };

  // 修改 handleKeyDown 函数
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement | HTMLInputElement>) => {
    setActiveKey(e.key);
    if (e.key === 'Shift') {
      setShiftPressed(true);
      setLastComboShift(e.key);
    } else {
      setLastNormalKey(e.key);
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      setEnterCount(prev => prev + 9937);
      
      const isCorrect = userInput.trim() === currentKeywordToType; // 使用 currentKeywordToType 进行验证
      
      if (isCorrect) {
        message.success('正确!');
        setStats(prev => ({
          ...prev,
          correctWords: prev.correctWords + 1,
          totalWords: prev.totalWords + 1,
          accuracy: ((prev.correctWords + 1) / (prev.totalWords + 1)) * 100
        }));
        setUserInput('');
        getRandomKeyword(content.split('\n'));
      } else {
        message.error(`错误! 正确答案是: ${currentKeywordToType}`);
        setStats(prev => ({
          ...prev,
          totalWords: prev.totalWords + 1,
          accuracy: (prev.correctWords / (prev.totalWords + 1)) * 100
        }));
        setUserInput('');
      }
      
      setActualKeyCount(prev => prev + 1);
      setDebugInfo(prev => ({
        ...prev,
        keyCount: prev.keyCount + 1,
        inputLength: 0,
        lastInputChange: isCorrect ? 'correct input' : 'incorrect input',
        timestamp: Date.now()
      }));
    }
  };

  // 修改 handleKeyUp 函数
  const handleKeyUp = (e: React.KeyboardEvent<HTMLTextAreaElement | HTMLInputElement>) => {
    if (e.key === 'Shift') {
      setShiftPressed(false);
      setActiveKey(null);
      // 松开 shift 时清除所有状态
      setLastKey(null);
      setLastComboShift(null);
      setLastNormalKey(null);
    } else {
      const key = e.key.toLowerCase();
      setActiveKey(null);
      // 松开普通键时，如果当前没有按着 shift，就清除最后的普通键记录
      if (!shiftPressed) {
        setLastNormalKey(null);
        setLastComboShift(null);
        setLastKey(key);
      }
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
    const processCode = (code: string) => {
      // 1. 标准化代码，处理不影响语法的空格差异
      let processed = code
        // 移除所有多余空格，包括行首行尾
        .replace(/^\s+|\s+$/gm, '')
        // 将多个空格替换为单个空格
        .replace(/\s+/g, ' ')
        // 处理冒周围的空格（构造函数初始化列表）
        .replace(/\s*:\s*/g, ':')
        // 处理等号周围的空格
        .replace(/\s*=\s*/g, '=')
        // 处理逗号后的空格
        .replace(/,\s*/g, ',')
        // 处理分号后的空格
        .replace(/;\s*/g, ';')
        // 处理括号周围的空格
        .replace(/\s*\(\s*/g, '(')
        .replace(/\s*\)\s*/g, ')')
        .replace(/\s*{\s*/g, '{')
        .replace(/\s*}\s*/g, '}')
        // 处理运算符周围的空格
        .replace(/\s*([+\-*/<>])\s*/g, '$1');

      // 2. 分割成标记
      return processed.split(/([{}()[\]*,;=<>])/g)
        .filter(token => token.trim() !== '')
        .map(token => token.trim());
    };

    // 处理输入和目标代码
    const inputTokens = processCode(currentInput);
    const contentTokens = processCode(content);

    // 只比较已输入的部分
    const tokensToCompare = contentTokens.slice(0, inputTokens.length);

    // 计算正确的标记数
    let correctCount = 0;
    inputTokens.forEach((token, index) => {
      if (index < tokensToCompare.length && token === tokensToCompare[index]) {
        correctCount++;
      }
    });

    // 更新统计信息
    setStats(prev => ({
      ...prev,
      totalWords: inputTokens.length || 1,
      correctWords: correctCount,
      accuracy: (correctCount / (inputTokens.length || 1)) * 100,
    }));

    // 调试输出
    console.log('Code comparison:', {
      input: inputTokens,
      expected: tokensToCompare,
      correctCount,
      totalTokens: inputTokens.length,
      accuracy: (correctCount / (inputTokens.length || 1)) * 100
    });
  };

  const handleExit = () => {
    setIsModalVisible(true);
  };

  // 修改 confirmExit 函数，补全被截断的部分
  const confirmExit = async () => {
    const accuracyThreshold = 90;
    if (stats.accuracy < accuracyThreshold) {
      message.warning(`因为你的准确率未达到${accuracyThreshold}%，所以本次练习不保存记录`);
      setIsModalVisible(false);
      navigate('/practice-history');
      return;
    }
    
    if(stats.totalWords*9937!==enterCount || Math.abs(stats.correctWords/stats.totalWords -stats.accuracy/100)>0.005){
      console.log(stats.totalWords*9937,enterCount,stats.correctWords/stats.totalWords,stats.accuracy/100);
      message.error('数据异常，保存失败');
      setIsModalVisible(false);
      navigate('/practice-history');
      return;
    }
    try {
      const { serverTime } = await api.get<{ serverTime: number }>(API_PATHS.SYSTEM.SERVER_TIME);
      const practiceData = {
        type: level,
        stats: {
          totalWords: stats.totalWords,
          correctWords: stats.correctWords,
          accuracy: stats.accuracy,
          wordsPerMinute: stats.wordsPerMinute,
          startTime: stats.startTime,
          endTime: new Date(serverTime),
          duration: (serverTime - stats.startTime.getTime()) / 1000
        }
      };
  
      const orderedData = JSON.stringify(practiceData, Object.keys(practiceData).sort());
    
      // 3. 生成签名
      const signature = CryptoJS.SHA256(orderedData + serverTime).toString();
  
      // 4. 发送数据
      await api.post(API_PATHS.PRACTICE_RECORDS, {
        ...practiceData,
        timestamp: serverTime,
        signature
      });
  
     message.success('练习记录已保存');
     navigate('/practice-history');
    } catch (error) {
      console.error('保存失败，错误详情:', {
        error,
        errorType: error.constructor.name,
        errorMessage: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : undefined,
        stats: {
          accuracy: stats.accuracy,
          duration: stats.duration,
          totalWords: stats.totalWords,
          correctWords: stats.correctWords,
          startTime: stats.startTime.toISOString(),
          level,
          inputLength: userInput.length
        },
        auth: {
          hasToken: !!localStorage.getItem('token'),
          hasUser: !!localStorage.getItem('user'),
          tokenExpired: false  // 如果有token解析功能可以添加过期检查
        },
        requestInfo: {
          endpoint: API_PATHS.PRACTICE_RECORDS,
          timestamp: new Date().toISOString()
        }
      });

      if (error instanceof ApiError) {
        message.error(`保存失败: ${error.message}`);
        // 如果是认证错误，重定向到登录页
        if (error.statusCode === 401) {
          localStorage.setItem('redirectPath', window.location.pathname);
          navigate('/login');
          return;
        }
        if (error.statusCode === 409) {
          message.warning('该练习记录已经保存，请勿重复提交');
        }
      } else {
        message.error('保存失败，请稍后重试');
      }
    } finally {
      setIsModalVisible(false);
    }
  };

  const renderStats = () => (
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
  );

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
    <Card title={`${level === 'keyword' ? '关键字' : '代码'}打字练习 ${title}`}>
      {level === 'keyword' ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', maxWidth: '1000px', margin: '0 auto' }}>
          {renderStats()}
          <div style={{ margin: '20px 0', fontSize: '24px', fontFamily: 'monospace' }}>
            {currentKeyword || '没有可用的关键字'}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', width: '80%', maxWidth: '600px', marginBottom: 20 }}>
            <Input
              value={userInput}
              onChange={handleKeywordInputChange}
              onKeyDown={handleKeyDown}
              onKeyUp={handleKeyUp}
              onPaste={handlePaste}
              onCopy={handleCopy}
              onContextMenu={preventContextMenu}
              placeholder="输入关键字，按回车确认"
              style={{ flex: 1, marginRight: '10px' }}
              autoFocus
            />
            <Button type="primary" danger onClick={handleExit} style={{ width: '120px' }}>
              结束练习
            </Button>
          </div>
        </div>
      ) : (
        <div style={{ 
          maxWidth: 1200, 
          margin: '0 auto',
          padding: '20px 0',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center'
        }}>
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

          <div style={{ width: 1200 }}>
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
                    ref={textAreaRef}
                    value={userInput}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    onKeyUp={handleKeyUp}
                    onPaste={handlePaste}
                    onCopy={handleCopy}
                    onContextMenu={preventContextMenu}
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
                      whiteSpace: 'pre',
                      tabSize: 2
                    }}
                    autoFocus
                  />
                </div>
              </Col>
            </Row>

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
                  width: 120,
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
      <div style={{ marginTop: 20 }}>
      <VirtualKeyboard 
  activeKey={activeKey} 
  lastKey={lastKey}
  shiftPressed={shiftPressed}
  lastComboShift={lastComboShift}
/>
      </div>
    </Card>
  );
};

export default Practice;