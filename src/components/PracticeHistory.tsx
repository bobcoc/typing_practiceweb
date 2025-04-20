// src/components/PracticeHistory.tsx
import React, { useEffect, useState } from 'react';
import Table from 'antd/es/table';
import Card from 'antd/es/card';
import Tag from 'antd/es/tag';
import Spin from 'antd/es/spin';
import type { ColumnsType } from 'antd/es/table';
import { api, ApiError } from '../api/apiClient';
import { message } from 'antd';
import { API_PATHS } from '../config';

interface PracticeRecord {
    _id: string;
    type: string;
    stats: {
      totalWords: number;
      correctWords: number;
      accuracy: number;
      wordsPerMinute: number;
      startTime: string;
      endTime: string;
      duration: number;
    };
    createdAt: string;
  }
  
  const PracticeHistory: React.FC = () => {
    const [loading, setLoading] = useState(true);
    const [records, setRecords] = useState<PracticeRecord[]>([]);
    const fetchPracticeRecords = async () => {
      try {
        const response = await api.get<PracticeRecord[]>(`${API_PATHS.PRACTICE_RECORDS}/my-records`);
        setRecords(response);
      } catch (error) {
        console.error('Error fetching practice records:', error);
        message.error('获取练习记录失败');
      } finally {
        setLoading(false);
      }
    };
    useEffect(() => {
      fetchPracticeRecords();
    }, []);
  

  const getAccuracyColor = (accuracy: number) => {
    if (accuracy >= 95) return 'green';
    if (accuracy >= 85) return 'blue';
    if (accuracy >= 75) return 'orange';
    return 'red';
  };

  const columns: ColumnsType<PracticeRecord> = [
    {
      title: '练习类型',
      dataIndex: 'type',
      key: 'type',
      render: (type) => (
        <Tag color="blue">
          {type === 'keyword' ? '关键字练习' : '代码练习'}
        </Tag>
      ),
    },
    {
      title: '练习时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date) => new Date(date).toLocaleString('zh-CN'),
      sorter: (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    },
    {
      title: '打字速度',
      dataIndex: ['stats', 'wordsPerMinute'],
      key: 'speed',
      render: (wpm) => `${Math.round(wpm)} WPM`,
      sorter: (a, b) => a.stats.wordsPerMinute - b.stats.wordsPerMinute,
    },
    {
      title: '准确率',
      dataIndex: ['stats', 'accuracy'],
      key: 'accuracy',
      render: (accuracy) => (
        <Tag color={getAccuracyColor(accuracy)}>
          {accuracy.toFixed(2)}%
        </Tag>
      ),
      sorter: (a, b) => a.stats.accuracy - b.stats.accuracy,
    },
    {
      title: '练习时长',
      dataIndex: ['stats', 'duration'],
      key: 'duration',
      render: (duration) => `${Math.round(duration)}秒`,
    },
    {
      title: '总字数',
      dataIndex: ['stats', 'totalWords'],
      key: 'totalWords',
    },
    {
      title: '正确字数',
      dataIndex: ['stats', 'correctWords'],
      key: 'correctWords',
    },
  ];

  return (
    <Card title="练习历史记录" className="m-4">
      {loading ? (
        <div className="flex justify-center items-center p-8">
          <Spin size="large" />
        </div>
      ) : (
        <Table
          columns={columns}
          dataSource={records}
          rowKey="_id"
          pagination={{
            defaultPageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条记录`,
          }}
        />
      )}
    </Card>
  );
};

export default PracticeHistory;