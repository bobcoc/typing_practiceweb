import React, { useEffect, useState } from 'react';
import { DatePicker } from 'antd';
import Spin from 'antd/es/spin';
import Table from 'antd/es/table';
import Select from 'antd/lib/select';
import Card from 'antd/lib/card';
import type { ColumnsType } from 'antd/es/table';
import Tag from 'antd/es/tag';
import { adminApi, PracticeRecord, User } from '../api/admin';
import Input from 'antd/lib/input';
import { SearchOutlined } from '@ant-design/icons';

const AdminPracticeRecords: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<PracticeRecord[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // 获取用户列表
  const fetchUsers = async () => {
    try {
      const response = await adminApi.getUsers();
      setUsers(response);
    } catch (error) {
      console.error('获取用户列表失败:', error);
    }
  };

  // 获取练习记录
  const fetchPracticeRecords = async () => {
    try {
      setLoading(true);
      const params: Record<string, string> = {};
      
      if (selectedDate) {
        params.date = selectedDate;
      }
      if (searchTerm) {
        params.search = searchTerm;
      }
      
      const response = await adminApi.getPracticeRecords(params);
      setRecords(response);
    } catch (error) {
      console.error('获取练习记录失败:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    fetchPracticeRecords();
  }, [selectedDate, searchTerm]);

  const getAccuracyColor = (accuracy: number) => {
    if (accuracy >= 95) return 'green';
    if (accuracy >= 85) return 'blue';
    if (accuracy >= 75) return 'orange';
    return 'red';
  };

  const columns: ColumnsType<PracticeRecord> = [
    {
      title: '学生姓名',
      dataIndex: 'fullname',
      key: 'fullname',
      sorter: (a, b) => a.fullname.localeCompare(b.fullname),
    },
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
      defaultSortOrder: 'descend',
    },
    {
      title: '打字速度',
      dataIndex: ['stats', 'wordsPerMinute'],
      key: 'speed',
      render: (wpm) => `${Math.round(wpm)} WPM`,
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
    },
    {
      title: '练习时长',
      dataIndex: ['stats', 'duration'],
      key: 'duration',
      render: (duration) => `${Math.round(duration)}秒`,
    },
  ];

  return (
    <Card title="学生练习记录">
      <div style={{ marginBottom: 16 }}>
        <DatePicker
          onChange={(date) => setSelectedDate(date?.format('YYYY-MM-DD') || null)}
          style={{ marginRight: 16 }}
        />
        <Input
          placeholder="搜索学生姓名或用户名..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ width: 200 }}
          prefix={
            <SearchOutlined style={{ color: 'rgba(0,0,0,.25)' }} />
          }
        />
      </div>
      
      {loading ? (
        <div style={{ textAlign: 'center', padding: 24 }}>
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

export default AdminPracticeRecords; 