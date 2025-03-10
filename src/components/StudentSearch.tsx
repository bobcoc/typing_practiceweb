import React, { useState, useEffect } from 'react';
import { Table, Input, Button } from 'antd';

interface StudentData {
  name: string;
  url_path: string;
  is_absent: number;
  exam_number: string;
}

const StudentSearch: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredData, setFilteredData] = useState<StudentData[]>([]);
  const [allStudents, setAllStudents] = useState<StudentData[]>([]);

  useEffect(() => {
    // 读取 JSON 文件
    fetch('/output.json')
      .then(response => response.json())
      .then(data => setAllStudents(data))
      .catch(error => console.error('Error loading JSON:', error));
  }, []);

  const handleSearch = () => {
    const filtered = allStudents.filter(student => 
      student.exam_number.includes(searchTerm)
    );
    setFilteredData(filtered);
  };

  const columns = [
    {
      title: '姓名',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '是否缺考',
      dataIndex: 'is_absent',
      key: 'is_absent',
      render: (isAbsent: number) => isAbsent === 0 ? '未缺考' : '缺考',
    },
    {
      title: '学号',
      dataIndex: 'exam_number',
      key: 'exam_number',
    },
    {
      title: '试卷',
      dataIndex: 'url_path',
      key: 'url_path',
      render: (urlPath: string) => (
        <a href={`https://yjpic.21cnjy.com/${urlPath}`} target="_blank" rel="noopener noreferrer">
          查看试卷
        </a>
      ),
    },
  ];

  return (
    <div>
      <Input
        placeholder="输入学号进行搜索"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        style={{ width: 200, marginRight: 10 }}
      />
      <Button onClick={handleSearch}>搜索</Button>
      <Table dataSource={filteredData} columns={columns} rowKey="exam_number" />
    </div>
  );
};

export default StudentSearch; 