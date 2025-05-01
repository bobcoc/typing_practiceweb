import React, { useState } from 'react';
import { Table, Input, Button } from 'antd';
import { api } from '../api/apiClient';

interface UserPassData {
  username: string;
  fullname: string;
  passCount: number;
}

const UserWordPassExport: React.FC = () => {
  const [prefix, setPrefix] = useState('');
  const [data, setData] = useState<UserPassData[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    setLoading(true);
    try {
      const result = await api.get<UserPassData[]>(`/user-word-pass?prefix=${encodeURIComponent(prefix)}`);
      setData(result);
    } catch (e) {
      setData([]);
    }
    setLoading(false);
  };

  const columns = [
    { title: '姓名', dataIndex: 'fullname', key: 'fullname' },
    { title: '通过单词数', dataIndex: 'passCount', key: 'passCount' },
  ];

  return (
    <div>
      <Input
        placeholder="输入用户名/学号前缀"
        value={prefix}
        onChange={e => setPrefix(e.target.value)}
        style={{ width: 200, marginRight: 10 }}
      />
      <Button onClick={handleSearch} loading={loading}>搜索</Button>
      <Table
        dataSource={data}
        columns={columns}
        rowKey="username"
        style={{ marginTop: 20 }}
        pagination={{ pageSize: 30 }}
      />
    </div>
  );
};

export default UserWordPassExport;
