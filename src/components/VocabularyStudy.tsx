import React, { useState, useEffect, useRef } from 'react';
import { Card, Button, Input, Progress, Modal, message, Tabs, Radio, Spin, Select, Table, Tag, InputNumber, Space } from 'antd';
import { SoundOutlined, CaretLeftOutlined, CaretRightOutlined, TrophyOutlined, HistoryOutlined, ReloadOutlined, SettingOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { api, ApiError, authEvents } from '../api/apiClient';
import { API_PATHS } from '../config';
import type { TabsProps } from 'antd';
import type { RadioChangeEvent } from 'antd/lib/radio';

interface Word {
  id: string;
  word: string;
  translation: string;
  pronunciation?: string;
  example?: string;
  lastStudied?: Date;
  correctCount?: number;
  incorrectCount?: number;
  masteryLevel?: number; // 掌握程度：0-未学习，1-学习中，2-已掌握
}

interface WordSet {
  id: string;
  name: string;
  description?: string;
  totalWords: number;
  createdAt: Date;
}

interface StudyStats {
  totalWords: number;
  correctWords: number;
  accuracy: number;
  startTime: Date;
  endTime?: Date;
  duration: number;
}

interface StudyRecord {
  id: string;
  wordSetId: string;
  wordSetName: string;
  testType: string;
  totalWords: number;
  correctWords: number;
  accuracy: number;
  duration: number;
  createdAt: Date;
}

interface LeaderboardItem {
  userId: string;
  username: string;
  totalWordsLearned: number;
  accuracy: number;
  rank: number;
}

const VocabularyStudy: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [wordSets, setWordSets] = useState<WordSet[]>([]);
  const [selectedWordSet, setSelectedWordSet] = useState<string>('');
  const [currentWords, setCurrentWords] = useState<Word[]>([]);
  const [studyStats, setStudyStats] = useState<StudyStats>({
    totalWords: 0,
    correctWords: 0,
    accuracy: 0,
    startTime: new Date(),
    duration: 0,
  });
  const [activeTab, setActiveTab] = useState('study'); // 'study', 'test', 'records', 'leaderboard'
  const [testType, setTestType] = useState<'chinese-to-english' | 'audio-to-english' | 'multiple-choice'>('chinese-to-english');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState('');
  const [showAnswer, setShowAnswer] = useState(false);
  const [testStarted, setTestStarted] = useState(false);
  const [testFinished, setTestFinished] = useState(false);
  const [testResults, setTestResults] = useState<{
    word: string;
    userAnswer: string;
    correctAnswer: string;
    isCorrect: boolean;
  }[]>([]);
  const [options, setOptions] = useState<string[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const timeOffsetRef = useRef<number>(0);
  const [timer, setTimer] = useState<NodeJS.Timeout | null>(null);
  const [studyRecords, setStudyRecords] = useState<StudyRecord[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardItem[]>([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  const [wordCount, setWordCount] = useState<number>(100); // 默认学习单词数量
  const [directSelected, setDirectSelected] = useState<boolean>(false);
  // 硬编码的备用ID，确保至少有一个可用ID
  const BACKUP_ID = "608319a1bc1c6a99de2a6a";
  
  // 使用ref存储当前选中ID，这样可以立即访问
  const currentWordSetIdRef = useRef<string>('');

  // 测试输入框ref
  const inputRef = useRef<any>(null);

  // 新增 state
  const [studyWords, setStudyWords] = useState<Word[]>([]);
  const [studyIndex, setStudyIndex] = useState(0);
  const [testWords, setTestWords] = useState<Word[]>([]);
  const [testIndex, setTestIndex] = useState(0);

  // 添加声音相关的状态
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null);
  const [voiceSettingsVisible, setVoiceSettingsVisible] = useState(false);

  // 获取所有单词集
  const fetchWordSets = async () => {
    try {
      setLoading(true);
      console.log('开始获取单词集...');
      const response = await api.get<any[]>(API_PATHS.VOCABULARY.WORD_SETS);
      // 这里做一次映射，把 _id 转成 id
      const wordSets = response.map(item => ({
        ...item,
        id: item.id || item._id, // 兼容两种情况
      }));
      setWordSets(wordSets);
      if (wordSets.length > 0) {
        const wordSetId = wordSets[0].id;
        console.log('设置初始选中的单词集ID:', wordSetId);
        
        // 使用更明确的方式设置ID - 同时更新state和ref
        if (wordSetId) {
          console.log('有效的ID，设置状态和ref:', wordSetId);
          setSelectedWordSet(wordSetId);
          // 立即更新ref
          currentWordSetIdRef.current = wordSetId;
          setDirectSelected(true);
        }
        
        // 记录单词集数据，便于调试
        console.log('单词集完整数据:', {
          id: wordSetId,
          name: wordSets[0].name,
          totalWords: wordSets[0].totalWords
        });
      } else {
        console.log('没有可用的单词集');
      }
    } catch (error) {
      if (error instanceof ApiError) {
        console.error('API错误:', error);
        message.error(`获取单词集失败: ${error.message}`);
      } else {
        console.error('未知错误:', error);
        message.error('获取单词集失败');
      }
    } finally {
      setLoading(false);
    }
  };

  // 获取学习单词
  const fetchStudyWords = async () => {
    try {
      // 优先使用ref中存储的ID，因为它可以立即更新
      let effectiveId = currentWordSetIdRef.current;
      
      // 如果ref中没有ID，使用备用方案
      if (!effectiveId) {
        // 检查状态
        if (selectedWordSet) {
          effectiveId = selectedWordSet;
        } 
        // 如果状态中没有ID，使用备用ID
        else if (wordSets.length > 0) {
          effectiveId = wordSets[0].id;
        }
        // 如果以上都失败，使用硬编码备用ID
        else {
          effectiveId = BACKUP_ID;
        }
      }
      
      console.log('开始获取学习单词，使用ID:', effectiveId, '数量:', wordCount);
      
      setLoading(true);
      // 构建URL并记录
      const url = `${API_PATHS.VOCABULARY.STUDY_WORDS}/${effectiveId}?count=${wordCount}`;
      console.log('请求URL:', url);
      
      // 发送请求获取单词
      const response = await api.get<Word[]>(url);
      console.log('获取到的学习单词:', response);
      
      if (response && response.length > 0) {
        const shuffledWords = shuffleArray(response);
        setStudyWords(shuffledWords);
        setStudyIndex(0);
        setActiveTab('study');
        message.success(`成功加载 ${shuffledWords.length} 个单词`);
      } else {
        message.warning('未获取到单词数据，请重试');
      }
    } catch (error) {
      if (error instanceof ApiError) {
        console.error('API错误:', error);
        message.error(`获取单词失败: ${error.message}`);
      } else {
        console.error('未知错误:', error);
        message.error('获取单词失败');
      }
    } finally {
      setLoading(false);
    }
  };

  // 修改单词集选择处理函数
  const handleWordSetSelect = (event: React.MouseEvent, id: string) => {
    // 阻止事件冒泡
    event.preventDefault();
    event.stopPropagation();
    
    console.log('手动选择单词集，当前ID值为:', id);
    
    // 确保ID非空且有效
    if (id && typeof id === 'string') {
      // 立即更新ref和状态
      currentWordSetIdRef.current = id;
      setSelectedWordSet(id);
      setDirectSelected(true);
      
      console.log('已更新选中状态:', {
        ref: currentWordSetIdRef.current,
        state: id,
        isDirectSelected: true
      });
    } else {
      console.error('选择的单词集ID无效:', id);
    }
  };

  // 处理单词数量变更
  const handleWordCountChange = (value: number | null) => {
    if (value !== null) {
      setWordCount(value);
    }
  };

  // 更新学习时间
  const updateTimer = () => {
    const currentOffset = timeOffsetRef.current;
    setStudyStats(prev => {
      const currentServerTime = Date.now() + currentOffset;
      const duration = (currentServerTime - prev.startTime.getTime()) / 1000;
      
      return { ...prev, duration };
    });
  };

  // 获取可用的语音列表
  useEffect(() => {
    const fetchVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      // 过滤出英文语音
      const englishVoices = voices.filter(voice => voice.lang.includes('en'));
      setAvailableVoices(englishVoices.length > 0 ? englishVoices : voices);
      
      // 尝试从localStorage获取上次选择的声音
      const savedVoiceName = localStorage.getItem('selectedVoiceName');
      if (savedVoiceName) {
        const savedVoice = voices.find(v => v.name === savedVoiceName);
        if (savedVoice) {
          setSelectedVoice(savedVoice);
        } else if (voices.length > 0) {
          // 如果找不到保存的声音，使用第一个可用的声音
          setSelectedVoice(voices[0]);
        }
      } else if (englishVoices.length > 0) {
        // 默认选择第一个英文声音
        setSelectedVoice(englishVoices[0]);
      } else if (voices.length > 0) {
        // 如果没有英文声音，使用第一个可用的声音
        setSelectedVoice(voices[0]);
      }
    };

    // 初始获取
    fetchVoices();
    
    // 监听voiceschanged事件
    window.speechSynthesis.onvoiceschanged = fetchVoices;
    
    // 组件卸载时清除事件监听
    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  // 保存选择的声音到localStorage
  const saveSelectedVoice = (voice: SpeechSynthesisVoice) => {
    localStorage.setItem('selectedVoiceName', voice.name);
    setSelectedVoice(voice);
    setVoiceSettingsVisible(false);
    message.success(`已选择语音: ${voice.name}`);
  };

  // 修改播放声音函数，使用选择的声音
  const playWordSound = (word: string) => {
    if (!('speechSynthesis' in window)) {
      message.info('您的浏览器不支持语音合成功能');
      return;
    }

    try {
      // 先尝试取消所有挂起的发音
      window.speechSynthesis.cancel();
      
      const utterance = new SpeechSynthesisUtterance(word);
      utterance.lang = 'en-US';
      utterance.rate = 0.9;
      utterance.pitch = 1;
      utterance.volume = 1;
      
      // 使用选择的声音
      if (selectedVoice) {
        utterance.voice = selectedVoice;
      }

      // 添加播放失败处理
      utterance.onerror = (event) => {
        console.error('语音播放失败:', event);
        message.error('当前语音引擎播放失败，将尝试使用默认语音');
        
        // 尝试使用系统默认语音
        const defaultUtterance = new SpeechSynthesisUtterance(word);
        window.speechSynthesis.speak(defaultUtterance);
        
        // 重置语音选择
        const voices = window.speechSynthesis.getVoices();
        if (voices.length > 0) {
          setSelectedVoice(voices[0]);
          localStorage.removeItem('selectedVoiceName'); // 清除之前保存的选择
        }
      };

      window.speechSynthesis.speak(utterance);
    } catch (error) {
      console.error('语音合成错误:', error);
      message.error('语音播放异常，请刷新页面后重试');
    }
  };

  // 切换到下一个单词
  const handleNextWord = () => {
    if (currentIndex < currentWords.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setShowAnswer(false);
    }
  };

  // 切换到上一个单词
  const handlePrevWord = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setShowAnswer(false);
    }
  };

  // 开始测试
  const startTest = () => {
    if (studyWords.length === 0) {
      message.error('请先加载单词');
      return;
    }
    const shuffled = shuffleArray([...studyWords]);
    setTestWords(shuffled);
    setTestIndex(0);
    setTestStarted(true);
    setTestFinished(false);
    setUserAnswer('');
    setShowAnswer(false);
    setTestResults([]);
    // 重置统计信息
    setStudyStats({
      totalWords: 0,
      correctWords: 0,
      accuracy: 0,
      startTime: new Date(),
      duration: 0
    });
    setActiveTab('test');
  };

  // 生成多选题选项
  const generateMultipleChoiceOptions = (index: number, wordsArr?: Word[]) => {
    const arr = wordsArr || testWords;
    const correctTranslation = arr[index].translation;
    let availableOptions = arr
      .filter(w => w.translation !== correctTranslation)
      .map(w => w.translation);
    
    // 如果可用选项太少，添加一些假选项
    if (availableOptions.length < 3) {
      const fakeOptions = [
        '假选项1', '假选项2', '假选项3', '假选项4', '假选项5'
      ].filter(opt => opt !== correctTranslation);
      availableOptions = [...availableOptions, ...fakeOptions];
    }
    
    // 打乱并选择3个错误选项
    availableOptions = shuffleArray(availableOptions);
    const incorrectOptions = availableOptions.slice(0, 3);
    
    // 合并正确选项和错误选项，然后打乱
    const allOptions = shuffleArray([correctTranslation, ...incorrectOptions]);
    setOptions(allOptions);
  };

  // 数组随机排序
  const shuffleArray = <T,>(array: T[]): T[] => {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
  };

  function normalizeAnswer(str: string): string {
    return str
      .replace(/（/g, '(')
      .replace(/）/g, ')')
      .replace(/，/g, ',')      // 全角逗号转半角
      .replace(/\s+/g, '')      // 去除所有空格
      .replace(/,/g, '')        // 去除所有逗号
      .replace(/[^\w()]/g, '')  // 只保留字母、数字、括号
      .toLowerCase();
  }

  // 提交答案
  const submitAnswer = async () => {
    if (!testStarted || testWords.length === 0) return;

    const currentWord = testWords[testIndex];
    let isCorrect = false;
    let correctAnswer = '';

    switch (testType) {
      case 'chinese-to-english':
      case 'audio-to-english':
        correctAnswer = currentWord.word;
        const normUser = normalizeAnswer(userAnswer);
        const normCorrect = normalizeAnswer(correctAnswer);
        isCorrect = normUser === normCorrect;
        break;
      case 'multiple-choice':
        correctAnswer = currentWord.translation;
        isCorrect = userAnswer === correctAnswer;
        break;
    }

    // 更新测试结果数组
    const updatedResults = [
      ...testResults,
      {
        word: currentWord.word,
        userAnswer,
        correctAnswer,
        isCorrect
      }
    ];
    setTestResults(updatedResults);

    // 更新学习统计信息
    const correctCount = updatedResults.filter(r => r.isCorrect).length;
    const totalCount = updatedResults.length;
    
    setStudyStats(prev => ({
      ...prev,
      totalWords: totalCount,
      correctWords: correctCount,
      accuracy: (correctCount / totalCount) * 100
    }));

    // 记录学习记录
    try {
      await api.post(API_PATHS.VOCABULARY.WORD_RECORD, {
        wordId: currentWord._id || currentWord.id,
        isCorrect,
        testType
      });
    } catch (error) {
      console.error('记录单词学习结果失败', error);
    }

    if (isCorrect) {
      message.success('正确!');
    } else {
      message.error(`错误! 正确答案是: ${correctAnswer}`);
    }

    setShowAnswer(true);

    setTimeout(() => {
      if (testIndex < testWords.length - 1) {
        setTestIndex(testIndex + 1);
        setUserAnswer('');
        setShowAnswer(false);
        // 多选题生成选项
        if (testType === 'multiple-choice') {
          generateMultipleChoiceOptions(testIndex + 1);
        }
        // 听力自动播放
        if (testType === 'audio-to-english') {
          setTimeout(() => {
            playWordSound(testWords[testIndex + 1].word);
          }, 500);
        }
      } else {
        // 最后一题，使用本地更新的结果，避免异步状态更新问题
        finishTestWithResults(updatedResults);
      }
    }, 1500);
  };

  // 使用指定结果完成测试
  const finishTestWithResults = async (finalResults: any[]) => {
    try {
      setTestFinished(true);
      
      // 获取服务器时间
      const { serverTime } = await api.get<{ serverTime: number }>(API_PATHS.SYSTEM.SERVER_TIME);
      
      const correctCount = finalResults.filter(r => r.isCorrect).length;
      const totalCount = finalResults.length;

      // 添加调试信息
      console.log('测试完成状态(带结果):', {
        finalResultsLength: finalResults.length,
        testWordsLength: testWords.length,
        correctCount,
        totalCount,
        currentStudyStats: studyStats
      });

      // 直接使用传入的测试结果计算
      const updatedStats = {
        totalWords: totalCount,
        correctWords: correctCount,
        accuracy: totalCount > 0 ? (correctCount / totalCount) * 100 : 0,
        startTime: studyStats.startTime,
        endTime: new Date(serverTime),
        duration: (serverTime - studyStats.startTime.getTime()) / 1000
      };
      
      // 更新统计信息
      setStudyStats(updatedStats);
      
      // 提交测试记录 - 使用计算好的最新数据
      await api.post(API_PATHS.VOCABULARY.TEST_RECORD, {
        wordSetId: selectedWordSet,
        testType,
        stats: updatedStats,
        results: finalResults // 发送详细的测试结果，包括每道题的回答情况
      });
      
      message.success('测试完成，记录已保存');
      setIsModalVisible(true);
    } catch (error) {
      if (error instanceof ApiError) {
        message.error(`保存测试记录失败: ${error.message}`);
      } else {
        message.error('保存测试记录失败');
      }
    }
  };

  // 完成测试 - 兼容原来的调用方式
  const finishTest = async () => {
    // 使用当前的测试结果完成测试
    await finishTestWithResults([...testResults]);
  };

  // 重新开始测试
  const restartTest = () => {
    const shuffled = shuffleArray([...testWords]);
    setTestWords(shuffled);
    setTestIndex(0);
    setTestStarted(false); // 回到模式选择界面
    setTestFinished(false);
    setUserAnswer('');
    setShowAnswer(false);
    setTestResults([]);
    // 重置统计信息
    setStudyStats({
      totalWords: 0,
      correctWords: 0,
      accuracy: 0,
      startTime: new Date(),
      duration: 0
    });
  };

  // 获取学习记录
  const fetchStudyRecords = async () => {
    try {
      setLoading(true);
      const response = await api.get<StudyRecord[]>(API_PATHS.VOCABULARY.STUDY_RECORDS);
      const records = response.map(item => ({
        ...item,
        totalWords: item.stats?.totalWords ?? 0,
        correctWords: item.stats?.correctWords ?? 0,
        accuracy: item.stats?.accuracy ?? 0,
        duration: item.stats?.duration ?? 0,
        createdAt: item.createdAt,
        wordSetName: item.wordSet?.name ?? '', // 如果有嵌套
      }));
      setStudyRecords(records);
    } catch (error) {
      if (error instanceof ApiError) {
        message.error(`获取学习记录失败: ${error.message}`);
      } else {
        message.error('获取学习记录失败');
      }
    } finally {
      setLoading(false);
    }
  };

  // 获取排行榜
  const fetchLeaderboard = async () => {
    try {
      setLeaderboardLoading(true);
      const response = await api.get<LeaderboardItem[]>(API_PATHS.VOCABULARY.LEADERBOARD);
      setLeaderboard(response);
    } catch (error) {
      if (error instanceof ApiError) {
        message.error(`获取排行榜失败: ${error.message}`);
      } else {
        message.error('获取排行榜失败');
      }
    } finally {
      setLeaderboardLoading(false);
    }
  };

  useEffect(() => {
    fetchWordSets();
    
    // 处理认证错误
    const handleAuthError = (error: ApiError) => {
      message.error(error.message);
      setTimeout(() => {
        navigate('/login');
      }, 1500);
    };
    
    authEvents.onAuthError.add(handleAuthError);
    
    return () => {
      authEvents.onAuthError.delete(handleAuthError);
      if (timer) {
        clearInterval(timer);
      }
    };
  }, [navigate]);

  // 当切换到记录或排行榜标签时，加载相应数据
  useEffect(() => {
    if (activeTab === 'records') {
      fetchStudyRecords();
    } else if (activeTab === 'leaderboard') {
      fetchLeaderboard();
    }
  }, [activeTab]);

  useEffect(() => {
    console.log('当前选中的单词集:', selectedWordSet);
  }, [selectedWordSet]);

  // 添加调试用的 useEffect
  useEffect(() => {
    console.log('VocabularyStudy 状态变化:', {
      selectedWordSet,
      wordSets,
      directSelected
    });
  }, [selectedWordSet, wordSets, directSelected]);

  // 自动播放单词发音：currentIndex变化时
  useEffect(() => {
    if (activeTab === 'study' && studyWords.length > 0) {
      playWordSound(studyWords[studyIndex].word);
    }
  }, [activeTab, studyIndex, studyWords]);

  // 自动聚焦输入框（仅在测试模式下需要输入时）
  useEffect(() => {
    if (
      testStarted &&
      !testFinished &&
      (testType === 'chinese-to-english' || testType === 'audio-to-english')
    ) {
      inputRef.current?.focus();
    }
  }, [testIndex, testStarted, testType, testFinished]);

  // 切换题目时自动生成选项
  useEffect(() => {
    if (
      testStarted &&
      !testFinished &&
      testType === 'multiple-choice' &&
      testWords.length > 0
    ) {
      generateMultipleChoiceOptions(testIndex);
    }
  }, [testIndex, testType, testStarted, testFinished, testWords]);

  // 自动播放第一个听力单词
  useEffect(() => {
    if (
      testStarted &&
      !testFinished &&
      testType === 'audio-to-english' &&
      testWords.length > 0 &&
      testIndex === 0 // 只在第一题
    ) {
      playWordSound(testWords[0].word);
    }
  }, [testStarted, testType, testWords, testFinished, testIndex]);

  // Tab 切换
  const items: TabsProps['items'] = [
    {
      key: 'study',
      label: '学习单词',
      children: (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ marginBottom: 20, width: '100%' }}>
            <Card title="选择学习内容" style={{ marginBottom: 15 }}>
              <div style={{ marginBottom: 15 }}>
                <h4>选择单词集:</h4>
                {wordSets.map(set => (
                  <div 
                    key={set.id}
                    onClick={(e) => handleWordSetSelect(e, set.id)}
                    style={{ 
                      padding: '10px 15px',
                      marginBottom: 10,
                      border: currentWordSetIdRef.current === set.id ? '3px solid #1890ff' : '1px solid #d9d9d9',
                      borderRadius: 6,
                      cursor: 'pointer',
                      backgroundColor: currentWordSetIdRef.current === set.id ? '#e6f7ff' : 'transparent',
                      boxShadow: currentWordSetIdRef.current === set.id ? '0 2px 8px rgba(24, 144, 255, 0.15)' : 'none',
                      transition: 'all 0.3s'
                    }}
                  >
                    <div style={{ 
                      fontWeight: currentWordSetIdRef.current === set.id ? 'bold' : 'normal',
                      pointerEvents: 'none' // 防止内部元素触发点击事件
                    }}>
                      {set.name} ({set.totalWords}词)
                    </div>
                    {set.description && (
                      <div style={{ 
                        color: '#999', 
                        fontSize: '0.9em', 
                        marginTop: 5,
                        pointerEvents: 'none'
                      }}>
                        {set.description}
                      </div>
                    )}
                    {currentWordSetIdRef.current === set.id && (
                      <div style={{ 
                        color: '#1890ff', 
                        fontSize: '0.9em', 
                        marginTop: 5,
                        pointerEvents: 'none'
                      }}>
                        ✓ 已选择 (ID: {set.id})
                      </div>
                    )}
                  </div>
                ))}
                {!selectedWordSet && wordSets.length > 0 && (
                  <div style={{ color: '#ff4d4f', marginBottom: 10 }}>请先选择一个单词集</div>
                )}
                {wordSets.length > 0 && (
                  <div style={{ color: '#666', marginBottom: 10 }}>
                    当前选中: {selectedWordSet || '无'} | 可用单词集数量: {wordSets.length}
                  </div>
                )}

                <h4>学习单词数量:</h4>
                <InputNumber
                  min={5}
                  max={100}
                  value={wordCount}
                  onChange={handleWordCountChange}
                  style={{ width: 120 }}
                />
                <span style={{ marginLeft: 10, color: '#888' }}>
                  (范围: 5-100个单词)
                </span>
              </div>

              <Button 
                type="primary" 
                onClick={() => {
                  // 这里优先使用ref中的ID
                  const idToUse = currentWordSetIdRef.current || selectedWordSet || BACKUP_ID;
                  console.log('点击开始学习按钮，实际使用ID:', idToUse);
                  fetchStudyWords();
                }}
                disabled={!directSelected && wordSets.length === 0}
                style={{ 
                  width: '100%',
                  opacity: (!directSelected) ? 0.5 : 1,
                  cursor: (!directSelected) ? 'not-allowed' : 'pointer',
                  backgroundColor: directSelected ? '#1890ff' : '#f5f5f5',
                  borderColor: directSelected ? '#1890ff' : '#d9d9d9',
                  color: directSelected ? '#fff' : '#bfbfbf',
                  fontWeight: 'bold',
                  padding: '10px 0',
                  height: 'auto',
                  fontSize: '16px'
                }}
              >
                {directSelected 
                  ? `开始学习选中的单词集`
                  : '请先选择一个单词集'}
              </Button>
            </Card>
          </div>
          
          {studyWords.length > 0 && (
            <div style={{ width: '100%', maxWidth: 600, textAlign: 'center' }}>
              <Card
                title={
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>单词学习</span>
                    <span style={{ fontSize: '0.9em', color: '#666' }}>
                      进度: {studyIndex + 1} / {studyWords.length}
                    </span>
                  </div>
                }
                style={{ marginBottom: 20 }}
              >
                <Progress 
                  percent={Math.round(((studyIndex + 1) / studyWords.length) * 100)} 
                  status="active" 
                  strokeColor={{
                    '0%': '#108ee9',
                    '100%': '#87d068',
                  }}
                />
  
                <div style={{ marginTop: 20 }}>
                  <div style={{ fontSize: 32, marginBottom: 10 }}>
                    <span
                      style={{ userSelect: 'none', WebkitUserSelect: 'none', MozUserSelect: 'none' }}
                      onCopy={e => e.preventDefault()}
                    >
                      {studyWords[studyIndex].word}
                    </span>
                    {studyWords[studyIndex].pronunciation && (
                      <span style={{ marginLeft: 10, color: '#888', fontSize: 22 }}>
                        [{studyWords[studyIndex].pronunciation}]
                      </span>
                    )}
                    <SoundOutlined 
                      onClick={() => playWordSound(studyWords[studyIndex].word)}
                      style={{ marginLeft: 10, cursor: 'pointer', fontSize: 24 }}
                    />
                  </div>
                  <div style={{ fontSize: 20, color: '#666' }}>
                    {studyWords[studyIndex].translation}
                  </div>
                  {studyWords[studyIndex].example && (
                    <div style={{ marginTop: 15, fontStyle: 'italic', color: '#888' }}>
                      例句: {studyWords[studyIndex].example}
                    </div>
                  )}
  
                  {studyWords[studyIndex].masteryLevel !== undefined && (
                    <div style={{ marginTop: 15 }}>
                      <Tag color={
                        studyWords[studyIndex].masteryLevel === 0 ? 'default' :
                        studyWords[studyIndex].masteryLevel === 1 ? 'processing' : 'success'
                      }>
                        {
                          studyWords[studyIndex].masteryLevel === 0 ? '未学习' :
                          studyWords[studyIndex].masteryLevel === 1 ? '学习中' : '已掌握'
                        }
                      </Tag>
                      {(studyWords[studyIndex].correctCount !== undefined && 
                        studyWords[studyIndex].incorrectCount !== undefined) && (
                        <span style={{ color: '#888', marginLeft: 10, fontSize: '0.9em' }}>
                          正确: {studyWords[studyIndex].correctCount} / 
                          错误: {studyWords[studyIndex].incorrectCount}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </Card>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Button 
                  icon={<CaretLeftOutlined />} 
                  onClick={() => setStudyIndex(studyIndex - 1)}
                  disabled={studyIndex === 0}
                >
                  上一个
                </Button>
                <Space>
                  <Button
                    type="default"
                    icon={<ReloadOutlined />}
                    onClick={() => {
                      const reshuffled = shuffleArray([...studyWords]);
                      setStudyWords(reshuffled);
                      setStudyIndex(0);
                    }}
                  >
                    重新洗牌
                  </Button>
                  <Button 
                    type="primary"
                    onClick={() => {
                      setActiveTab('test');      // 切换到测试Tab
                      setTestStarted(false);     // 强制回到模式选择界面
                    }}
                  >
                    开始测试
                  </Button>
                </Space>
                <Button 
                  icon={<CaretRightOutlined />} 
                  onClick={() => setStudyIndex(studyIndex + 1)}
                  disabled={studyIndex === studyWords.length - 1}
                >
                  下一个
                </Button>
              </div>
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'test',
      label: '测试模式',
      children: (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          {!testStarted ? (
            <div style={{ width: '100%', maxWidth: 600 }}>
              <Card title="选择测试方式" style={{ marginBottom: 20 }}>
                <div style={{ marginBottom: 20 }}>
                  <h4>选择测试类型:</h4>
                  <Radio.Group 
                    value={testType} 
                    onChange={e => setTestType(e.target.value)}
                    style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 10 }}
                  >
                    <Radio value="chinese-to-english" style={{ height: 'auto', lineHeight: '1.5', marginBottom: 5 }}>
                      看中文写英文 <span style={{ color: '#999', fontSize: '0.9em' }}>根据中文提示输入对应的英文单词</span>
                    </Radio>
                    <Radio value="audio-to-english" style={{ height: 'auto', lineHeight: '1.5', marginBottom: 5 }}>
                      听发音写单词 <span style={{ color: '#999', fontSize: '0.9em' }}>根据单词发音输入英文单词</span>
                    </Radio>
                    <Radio value="multiple-choice" style={{ height: 'auto', lineHeight: '1.5', marginBottom: 5 }}>
                      选择正确翻译 <span style={{ color: '#999', fontSize: '0.9em' }}>为英文单词选择正确的中文含义</span>
                    </Radio>
                  </Radio.Group>
                </div>
                <Button 
                  type="primary" 
                  onClick={() => {
                    // 只有这里才初始化测试
                    const shuffled = shuffleArray([...studyWords]);
                    setTestWords(shuffled);
                    setTestIndex(0);
                    setTestStarted(true);
                    setTestFinished(false);
                    setUserAnswer('');
                    setShowAnswer(false);
                    setTestResults([]);
                    // 重置统计信息
                    setStudyStats({
                      totalWords: 0,
                      correctWords: 0,
                      accuracy: 0,
                      startTime: new Date(),
                      duration: 0
                    });
                    // 如果是选择翻译，生成选项
                    if (testType === 'multiple-choice') {
                      generateMultipleChoiceOptions(0, shuffled);
                    }
                  }}
                  disabled={studyWords.length === 0}
                  style={{ 
                    width: '100%',
                    background: studyWords.length === 0 ? '#f5f5f5' : undefined,
                    color: studyWords.length === 0 ? '#d9d9d9' : undefined,
                    cursor: studyWords.length === 0 ? 'not-allowed' : 'pointer'
                  }}
                >
                  开始测试
                </Button>
              </Card>
              <div style={{ textAlign: 'center', color: studyWords.length === 0 ? '#ff4d4f' : '#999' }}>
                {studyWords.length === 0 ? (
                  <div>
                    <p style={{ fontWeight: 'bold' }}>请先从"学习单词"标签页中选择单词集并开始学习</p>
                    <Button type="link" onClick={() => setActiveTab('study')}>
                      前往学习单词
                    </Button>
                  </div>
                ) : (
                  <p>测试将包含 {studyWords.length} 个单词</p>
                )}
              </div>
            </div>
          ) : testFinished ? (
            <div style={{ width: '100%', maxWidth: 600 }}>
              <Card title="测试结果" style={{ marginBottom: 20 }}>
                <div style={{ textAlign: 'center', marginBottom: 20 }}>
                  <Progress 
                    type="circle" 
                    percent={Math.round(studyStats.accuracy)} 
                    format={percent => `${percent}%`} 
                    status={studyStats.accuracy >= 80 ? "success" : studyStats.accuracy >= 60 ? "normal" : "exception"}
                  />
                  <div style={{ marginTop: 15 }}>
                    <p>总题数: {studyStats.totalWords} 个单词</p>
                    <p>正确数: {studyStats.correctWords} 个单词</p>
                    <p>用时: {Math.round(studyStats.duration)} 秒</p>
                    <Tag color={
                      studyStats.accuracy >= 90 ? 'success' : 
                      studyStats.accuracy >= 80 ? 'processing' : 
                      studyStats.accuracy >= 60 ? 'warning' : 
                      'error'
                    } style={{ margin: '10px 0', padding: '5px 10px', fontSize: '14px' }}>
                      评价: {
                        studyStats.accuracy >= 90 ? '优秀！你已经掌握了这些单词！' :
                        studyStats.accuracy >= 80 ? '良好！继续努力！' :
                        studyStats.accuracy >= 60 ? '及格，需要更多练习！' :
                        '需要加强记忆，再接再厉！'
                      }
                    </Tag>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                  <Button type="primary" onClick={restartTest}>重新开始</Button>
                  <Button onClick={() => setActiveTab('records')}>
                    <HistoryOutlined /> 查看测试记录
                  </Button>
                  <Button onClick={() => setActiveTab('leaderboard')}>
                    <TrophyOutlined /> 查看排行榜
                  </Button>
                </div>
              </Card>

              {testResults.filter(result => !result.isCorrect).length > 0 && (
                <Card title="错题记录" style={{ marginBottom: 20 }}>
                  <div style={{ maxHeight: 300, overflow: 'auto' }}>
                    {testResults
                      .filter(result => !result.isCorrect)
                      .map((result, index) => (
                        <div key={index} style={{ 
                          marginBottom: 10, 
                          padding: 10, 
                          borderBottom: '1px solid #f0f0f0',
                          backgroundColor: '#fff2f0',
                          borderRadius: 4
                        }}>
                          <div style={{ fontWeight: 'bold' }}>单词: {result.word}</div>
                          <div>正确答案: {result.correctAnswer}</div>
                          <div>你的答案: {result.userAnswer}</div>
                        </div>
                      ))}
                  </div>
                </Card>
              )}
            </div>
          ) : (
            <div style={{ width: '100%', maxWidth: 600 }}>
              <Card title={
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>{
                    testType === 'chinese-to-english' ? '看中文写英文' :
                    testType === 'audio-to-english' ? '听发音写单词' :
                    '选择正确翻译'
                  }</span>
                  <span style={{ fontSize: '0.9em', color: '#666' }}>
                    进度: {testIndex + 1} / {testWords.length}
                  </span>
                </div>
              }>
                <Progress 
                  percent={Math.round(((testIndex + 1) / testWords.length) * 100)} 
                  status="active"
                  strokeColor={{
                    '0%': '#108ee9',
                    '100%': '#87d068',
                  }}
                />
                
                <div style={{ margin: '20px 0' }}>
                  {testType === 'chinese-to-english' && (
                    <div style={{ fontSize: 24, marginBottom: 15, textAlign: 'center' }}>
                      <div style={{ color: '#666', fontSize: '0.8em', marginBottom: 5 }}>请输入对应的英文单词</div>
                      <div style={{ fontWeight: 'bold' }}>
                        {testWords[testIndex].translation}
                      </div>
                      {testWords[testIndex].pronunciation && (
                        <div style={{ color: '#888', fontSize: 20, marginTop: 5 }}>
                          [{testWords[testIndex].pronunciation}]
                        </div>
                      )}
                    </div>
                  )}
                  
                  {testType === 'audio-to-english' && (
                    <div style={{ fontSize: 24, marginBottom: 15, textAlign: 'center' }}>
                      <div style={{ color: '#666', fontSize: '0.8em', marginBottom: 5 }}>请听发音并输入单词</div>
                      <div style={{ fontWeight: 'bold', marginBottom: 8 }}>
                        {testWords[testIndex].pronunciation && (
                          <span style={{ marginLeft: 10, color: '#888', fontSize: 20 }}>
                            [{testWords[testIndex].pronunciation}]
                          </span>
                        )}
                        <SoundOutlined 
                          onClick={() => playWordSound(testWords[testIndex].word)}
                          style={{ marginLeft: 10, fontSize: 28, cursor: 'pointer' }}
                        />
                      </div>
                      <div>点击图标播放单词发音</div>
                      <Button 
                        type="link" 
                        onClick={() => playWordSound(testWords[testIndex].word)}
                        style={{ marginTop: 5 }}
                      >
                        再次播放
                      </Button>
                    </div>
                  )}
                  
                  {testType === 'multiple-choice' && (
                    <div style={{ fontSize: 24, marginBottom: 15, textAlign: 'center' }}>
                      <div style={{ color: '#666', fontSize: '0.8em', marginBottom: 5 }}>请选择正确的中文翻译</div>
                      <div style={{ fontWeight: 'bold' }}>
                        {testWords[testIndex].word}
                        <SoundOutlined 
                          onClick={() => playWordSound(testWords[testIndex].word)}
                          style={{ marginLeft: 10, cursor: 'pointer', fontSize: 20 }}
                        />
                      </div>
                      {testWords[testIndex].pronunciation && (
                        <div style={{ color: '#888', fontSize: 20, marginTop: 5 }}>
                          [{testWords[testIndex].pronunciation}]
                        </div>
                      )}
                    </div>
                  )}
                  
                  {testType === 'multiple-choice' ? (
                    <Radio.Group
                      value={userAnswer}
                      onChange={e => setUserAnswer(e.target.value)}
                      style={{ width: '100%', display: 'flex', flexDirection: 'column' }}
                    >
                      {options.map(option => (
                        <Radio key={option} value={option} style={{ marginBottom: 10, height: 'auto', padding: '8px 5px' }}>
                          {option}
                        </Radio>
                      ))}
                    </Radio.Group>
                  ) : (
                    <Input
                      ref={inputRef}
                      placeholder="请输入英文单词"
                      value={userAnswer}
                      onChange={e => setUserAnswer(e.target.value)}
                      disabled={showAnswer}
                      style={{ marginBottom: 15 }}
                      onPressEnter={e => {
                        e.stopPropagation();
                        submitAnswer();
                      }}
                      autoFocus
                      size="large"
                      onPaste={e => e.preventDefault()}
                    />
                  )}
                  
                  {showAnswer && (
                    <div style={{ 
                      padding: 15, 
                      backgroundColor: testResults[testResults.length - 1]?.isCorrect ? '#f6ffed' : '#fff2f0', 
                      borderRadius: 4, 
                      marginBottom: 15,
                      border: `1px solid ${testResults[testResults.length - 1]?.isCorrect ? '#b7eb8f' : '#ffccc7'}`
                    }}>
                      <div style={{ 
                        fontWeight: 'bold', 
                        color: testResults[testResults.length - 1]?.isCorrect ? '#52c41a' : '#f5222d',
                        marginBottom: 5
                      }}>
                        {testResults[testResults.length - 1]?.isCorrect ? '✓ 回答正确' : '✗ 回答错误'}
                      </div>
                      <div>正确答案: {testType === 'multiple-choice' 
                        ? testWords[testIndex].translation 
                        : testWords[testIndex].word}
                      </div>
                      <div>你的答案: {userAnswer}</div>
                    </div>
                  )}
                  
                  <Button 
                    type="primary" 
                    onClick={submitAnswer}
                    disabled={!userAnswer || showAnswer}
                    style={{ width: '100%' }}
                  >
                    提交答案
                  </Button>
                </div>
              </Card>
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'records',
      label: '测试记录',
      children: (
        <div style={{ width: '100%' }}>
          <h3>我的测试记录</h3>
          <Table 
            dataSource={studyRecords}
            rowKey="id"
            pagination={{ pageSize: 10 }}
            loading={loading}
            columns={[
              {
                title: '单词集',
                dataIndex: 'wordSetName',
                key: 'wordSetName',
              },
              {
                title: '测试类型',
                dataIndex: 'testType',
                key: 'testType',
                render: (type) => {
                  let label = '未知';
                  switch(type) {
                    case 'chinese-to-english':
                      label = '看中文写英文';
                      break;
                    case 'audio-to-english':
                      label = '听发音写单词';
                      break;
                    case 'multiple-choice':
                      label = '选择正确翻译';
                      break;
                  }
                  return <Tag color="blue">{label}</Tag>;
                }
              },
              {
                title: '总单词数',
                dataIndex: 'totalWords',
                key: 'totalWords',
              },
              {
                title: '正确数',
                dataIndex: 'correctWords',
                key: 'correctWords',
              },
              {
                title: '正确率',
                dataIndex: 'accuracy',
                key: 'accuracy',
                render: (accuracy) => `${Math.round(accuracy)}%`,
              },
              {
                title: '用时(秒)',
                dataIndex: 'duration',
                key: 'duration',
                render: (duration) => Math.round(duration),
              },
              {
                title: '测试时间',
                dataIndex: 'createdAt',
                key: 'createdAt',
                render: (date) => new Date(date).toLocaleString(),
              },
            ]}
          />
        </div>
      ),
    },
    {
      key: 'leaderboard',
      label: '单词排行榜',
      children: (
        <div style={{ width: '100%' }}>
          <h3>单词掌握排行榜</h3>
          <Table 
            dataSource={leaderboard}
            rowKey="userId"
            pagination={{ pageSize: 10 }}
            loading={leaderboardLoading}
            columns={[
              {
                title: '排名',
                dataIndex: 'rank',
                key: 'rank',
                render: (rank) => (
                  <span style={{ fontWeight: 'bold' }}>
                    {rank <= 3 ? (
                      <TrophyOutlined style={{ 
                        color: rank === 1 ? 'gold' : rank === 2 ? 'silver' : '#cd7f32',
                        marginRight: 5
                      }} />
                    ) : null}
                    {rank}
                  </span>
                ),
              },
              {
                title: '用户名',
                dataIndex: 'fullname',
                key: 'fullname',
              },
              {
                title: '已掌握单词数',
                dataIndex: 'totalWordsLearned',
                key: 'totalWordsLearned',
              },
              {
                title: '平均正确率',
                dataIndex: 'accuracy',
                key: 'accuracy',
                render: (accuracy) => `${Math.round(accuracy)}%`,
              },
            ]}
          />
        </div>
      ),
    },
  ];

  // 渲染声音设置弹窗
  const renderVoiceSettings = () => {
    return (
      <Modal
        title="选择播放角色"
        open={voiceSettingsVisible}
        onCancel={() => setVoiceSettingsVisible(false)}
        footer={[
          <Button key="diagnose" type="primary" onClick={() => {
            const result = diagnoseVoiceIssue();
            message.info(result);
          }}>
            诊断语音问题
          </Button>,
          <Button key="reset" type="danger" onClick={() => {
            // 取消所有挂起的语音
            window.speechSynthesis.cancel();
            
            // 清除localStorage中保存的语音选择
            localStorage.removeItem('selectedVoiceName');
            
            // 重新获取默认语音
            const voices = window.speechSynthesis.getVoices();
            const englishVoices = voices.filter(voice => voice.lang.includes('en'));
            
            if (englishVoices.length > 0) {
              setSelectedVoice(englishVoices[0]);
            } else if (voices.length > 0) {
              setSelectedVoice(voices[0]);
            } else {
              setSelectedVoice(null);
            }
            
            message.success('语音引擎已重置，请尝试播放');
            
            // 尝试播放测试声音
            try {
              const testUtterance = new SpeechSynthesisUtterance('Reset complete');
              window.speechSynthesis.speak(testUtterance);
            } catch (error) {
              console.error('重置后测试播放失败:', error);
            }
          }}>
            重置语音引擎
          </Button>,
          <Button key="close" onClick={() => setVoiceSettingsVisible(false)}>
            关闭
          </Button>
        ]}
      >
        <div style={{ marginBottom: 16 }}>
          <p>选择想要的语音角色:</p>
          <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
            {availableVoices.map((voice) => (
              <div 
                key={voice.name} 
                style={{
                  padding: '10px', 
                  margin: '5px 0', 
                  border: '1px solid #f0f0f0',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  background: selectedVoice?.name === voice.name ? '#e6f7ff' : 'white'
                }}
                onClick={() => saveSelectedVoice(voice)}
              >
                <div style={{ fontWeight: 'bold' }}>{voice.name}</div>
                <div style={{ fontSize: '12px', color: '#666' }}>
                  {voice.lang} {voice.localService ? ' (本地)' : ' (在线)'}
                  {voice.default ? ' (默认)' : ''}
                </div>
                <Button 
                  size="small" 
                  type="text" 
                  icon={<SoundOutlined />}
                  onClick={(e) => {
                    e.stopPropagation();
                    const utterance = new SpeechSynthesisUtterance('Hello, this is a sample of my voice.');
                    utterance.voice = voice;
                    window.speechSynthesis.speak(utterance);
                  }}
                >
                  试听
                </Button>
              </div>
            ))}
          </div>
        </div>
      </Modal>
    );
  };

  // 诊断功能
  const diagnoseVoiceIssue = () => {
    try {
      // 检查语音合成API是否可用
      if (!('speechSynthesis' in window)) {
        return "您的浏览器不支持语音合成功能";
      }
      
      // 检查可用语音
      const voices = window.speechSynthesis.getVoices();
      if (!voices || voices.length === 0) {
        return "系统没有发现可用的语音包";
      }
      
      // 尝试使用默认语音播放
      const testUtterance = new SpeechSynthesisUtterance("Test");
      window.speechSynthesis.speak(testUtterance);
      
      return `系统发现${voices.length}个语音包，已尝试播放测试音频`;
    } catch (error) {
      return `诊断过程发生错误: ${error.message}`;
    }
  };

  if (loading) {
    return (
      <Card>
        <Spin spinning={loading} tip="加载中..." size="large">
          <div style={{ textAlign: 'center', padding: '20px', minHeight: 200 }}>
            {/* 内容 */}
          </div>
        </Spin>
      </Card>
    );
  }

  return (
    <Card title="英语单词背诵">
      <div style={{ textAlign: 'right', marginBottom: 16 }}>
        <Button 
          icon={<SettingOutlined />} 
          onClick={() => setVoiceSettingsVisible(true)}
        >
          选择播放角色
        </Button>
      </div>
      
      <Tabs activeKey={activeTab} items={items} onChange={setActiveTab} />
      
      {/* 添加声音设置弹窗 */}
      {renderVoiceSettings()}
      
      <Modal
        title="测试结果"
        open={isModalVisible}
        onOk={() => setIsModalVisible(false)}
        onCancel={() => setIsModalVisible(false)}
        footer={[
          <Button key="back" onClick={() => setIsModalVisible(false)}>
            关闭
          </Button>,
          <Button key="records" onClick={() => {
            setIsModalVisible(false);
            setActiveTab('records');
          }}>
            <HistoryOutlined /> 查看测试记录
          </Button>,
          <Button key="leaderboard" type="primary" onClick={() => {
            setIsModalVisible(false);
            setActiveTab('leaderboard');
          }}>
            <TrophyOutlined /> 查看排行榜
          </Button>,
        ]}
      >
        <h3>测试统计</h3>
        <p>总题数: {studyStats.totalWords}</p>
        <p>正确数: {studyStats.correctWords}</p>
        <p>正确率: {Math.round(studyStats.accuracy)}%</p>
        <p>用时: {Math.round(studyStats.duration)}秒</p>
        
        <h3>错题记录</h3>
        <div style={{ maxHeight: 200, overflow: 'auto' }}>
          {testResults
            .filter(result => !result.isCorrect)
            .map((result, index) => (
              <div key={index} style={{ marginBottom: 10, padding: 5, borderBottom: '1px solid #f0f0f0' }}>
                <div>单词: {result.word}</div>
                <div>正确答案: {result.correctAnswer}</div>
                <div>你的答案: {result.userAnswer}</div>
              </div>
            ))}
          {testResults.filter(result => !result.isCorrect).length === 0 && (
            <div>恭喜你，没有错题！</div>
          )}
        </div>
      </Modal>
    </Card>
  );
};

export default VocabularyStudy; 