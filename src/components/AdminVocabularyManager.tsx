import React, { useState, useEffect, useRef } from 'react';
import { 
  Button, 
  Table, 
  Upload, 
  Input, 
  Form, 
  Modal, 
  message, 
  Tooltip, 
  Popconfirm,
  Space
} from 'antd';
import type { FormInstance } from 'antd';
import { UploadOutlined, DeleteOutlined, SearchOutlined, InfoCircleOutlined } from '@ant-design/icons';
import { adminApi } from '../api/admin';
import type { WordSet as ApiWordSet } from '../api/admin';
import type { UploadFile } from 'antd/lib/upload/interface';
import type { RcFile } from 'antd/lib/upload';
import type { ColumnsType } from 'antd/es/table';
import TextArea from 'antd/lib/input/TextArea';

// 使用本地接口解决类型不匹配问题
interface WordSetLocal {
  _id: string;
  name: string;
  description: string;
  totalWords: number;
  createdAt: string;
  owner: {
    _id: string;
    username: string;
    fullname: string;
  };
}

interface UploadFormValues {
  name: string;
  description?: string;
}

// 添加 Word 类型定义
interface Word {
  _id: string;
  word: string;
  translation: string;
  pronunciation?: string;
  example?: string;
  wordSet: string;
}

const AdminVocabularyManager: React.FC = () => {
  const [wordSets, setWordSets] = useState<WordSetLocal[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploadModalVisible, setUploadModalVisible] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [form] = Form.useForm();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingWordSet, setEditingWordSet] = useState<WordSetLocal | null>(null);
  const [words, setWords] = useState<Word[]>([]);
  const [filteredWords, setFilteredWords] = useState<Word[]>([]);
  const [pageSize, setPageSize] = useState<number>(50);

  // 获取单词集列表
  const fetchWordSets = async () => {
    try {
      setLoading(true);
      const data = await adminApi.getVocabularyWordSets();
      // 将API返回的数据转换为本地类型
      const localData: WordSetLocal[] = data.map(item => ({
        ...item,
        description: item.description || ''
      }));
      setWordSets(localData);
    } catch (error) {
      message.error('获取单词集列表失败');
      console.error('获取单词集列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWordSets();
  }, []);

  // 获取单词集中的单词
  const fetchWords = async (wordSetId: string) => {
    console.log('开始获取单词列表，wordSetId:', wordSetId);
    try {
      const data = await adminApi.getWordsByWordSetId(wordSetId);
      console.log('获取到的单词列表数据:', data); // 添加调试日志
      setWords(data);
      setFilteredWords([]); // 清空过滤的单词列表
    } catch (error) {
      message.error('获取单词失败');
      console.error('获取单词失败:', error);
    }
  };

  // 上传前检查文件
  const checkFile = (file: File): boolean => {
    const isCsv = file.type === 'text/csv' || file.name.endsWith('.csv');
    if (!isCsv) {
      message.error('只能上传CSV文件!');
      return false;
    }
    const isLt5M = file.size / 1024 / 1024 < 5;
    if (!isLt5M) {
      message.error('文件必须小于5MB!');
      return false;
    }
    return true;
  };

  // 处理文件选择
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (checkFile(file)) {
      setSelectedFile(file);
      setFileName(file.name);
    } else {
      // 清空选择的文件
      e.target.value = '';
      setSelectedFile(null);
      setFileName('');
    }
  };

  // 处理上传
  const handleUpload = async (values: UploadFormValues) => {
    const { name, description } = values;
    
    if (!selectedFile) {
      message.error('请选择文件');
      return;
    }

    try {
      setLoading(true);
      
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('name', name);
      if (description) {
        formData.append('description', description);
      }

      await adminApi.uploadVocabularyFile(formData);
      message.success('上传成功');
      setUploadModalVisible(false);
      form.resetFields();
      setSelectedFile(null);
      setFileName('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      fetchWordSets();
    } catch (error) {
      message.error('上传失败');
      console.error('上传失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 处理删除
  const handleDelete = async (id: string) => {
    try {
      setLoading(true);
      await adminApi.deleteVocabularyWordSet(id);
      message.success('删除成功');
      fetchWordSets();
    } catch (error) {
      message.error('删除失败');
      console.error('删除失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 打开编辑模态框
  const openEditModal = async (wordSet: WordSetLocal) => {
    console.log('打开编辑模态框，wordSet:', wordSet);
    setEditingWordSet(wordSet);
    setEditModalVisible(true);
    await fetchWords(wordSet._id);
  };

  // 提交编辑
  const handleEditSubmit = async (values: WordSetLocal) => {
    try {
      setLoading(true);
      await adminApi.updateVocabularyWordSet(editingWordSet._id, values);
      message.success('更新成功');
      setEditModalVisible(false);
      fetchWordSets();
    } catch (error) {
      message.error('更新失败');
      console.error('更新失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 提交单词编辑
  const handleWordEditSubmit = async (updatedWords: any[]) => {
    try {
      setLoading(true);
      await adminApi.updateWords(updatedWords);
      message.success('单词更新成功');
      setEditModalVisible(false);
      fetchWordSets();
    } catch (error) {
      message.error('单词更新失败');
      console.error('单词更新失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 过滤数据
  const filteredWordSets = wordSets.filter(
    wordSet => 
      wordSet.name.toLowerCase().includes(searchText.toLowerCase()) ||
      (wordSet.description && wordSet.description.toLowerCase().includes(searchText.toLowerCase())) ||
      (wordSet.owner.username && wordSet.owner.username.toLowerCase().includes(searchText.toLowerCase())) ||
      (wordSet.owner.fullname && wordSet.owner.fullname.toLowerCase().includes(searchText.toLowerCase()))
  );

  const columns: ColumnsType<WordSetLocal> = [
    {
      title: '单词集名称',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      render: (text) => text || '-',
    },
    {
      title: '单词数量',
      dataIndex: 'totalWords',
      key: 'totalWords',
      sorter: (a, b) => a.totalWords - b.totalWords,
    },
    {
      title: '所有者',
      dataIndex: ['owner', 'fullname'],
      key: 'owner',
      render: (text, record) => `${text || record.owner.username}`,
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (text) => new Date(text).toLocaleString(),
      sorter: (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Space size="middle">
          <Button onClick={() => openEditModal(record)}>编辑</Button>
          <Popconfirm
            title="确定要删除这个单词集吗?"
            onConfirm={() => handleDelete(record._id)}
            okText="是"
            cancelText="否"
          >
            <Button danger icon={<DeleteOutlined />}>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <Input 
          placeholder="搜索单词集..." 
          onChange={e => setSearchText(e.target.value)}
          style={{ width: 250 }}
          prefix={<SearchOutlined />}
        />
        <Button 
          type="primary" 
          icon={<UploadOutlined />} 
          onClick={() => setUploadModalVisible(true)}
        >
          上传单词集
        </Button>
      </div>
      
      <Table 
        columns={columns} 
        dataSource={filteredWordSets} 
        rowKey="_id"
        loading={loading}
      />
      
      <Modal
        title="上传单词集"
        open={uploadModalVisible}
        onCancel={() => {
          setUploadModalVisible(false);
          form.resetFields();
          setSelectedFile(null);
          setFileName('');
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }
        }}
        footer={null}
      >
        <Form form={form} onFinish={handleUpload} layout="vertical">
          <Form.Item 
            name="name" 
            label="单词集名称" 
            rules={[{ required: true, message: '请输入单词集名称' }]}
          >
            <Input placeholder="请输入单词集名称" />
          </Form.Item>
          
          <Form.Item 
            name="description" 
            label="描述" 
          >
            <Input.TextArea placeholder="请输入描述" />
          </Form.Item>
          
          <Form.Item 
            label="CSV文件" 
            required
            tooltip={{
              title: '文件格式要求：CSV文件，包含word(单词)、translation(翻译)、pronunciation(发音,可选)、example(例句,可选)列',
              icon: <InfoCircleOutlined />
            }}
          >
            <div className="upload-container">
              <input
                type="file"
                ref={fileInputRef}
                accept=".csv"
                onChange={handleFileSelect}
                style={{ display: 'none' }}
              />
              <Button 
                onClick={() => fileInputRef.current?.click()}
                icon={<UploadOutlined />}
              >
                选择文件
              </Button>
              <span style={{ marginLeft: 8 }}>
                {fileName || '未选择文件'}
              </span>
            </div>
          </Form.Item>
          
          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Button style={{ marginRight: 8 }} onClick={() => {
              setUploadModalVisible(false);
              form.resetFields();
              setSelectedFile(null);
              setFileName('');
              if (fileInputRef.current) {
                fileInputRef.current.value = '';
              }
            }}>
              取消
            </Button>
            <Button type="primary" htmlType="submit" loading={loading} disabled={!selectedFile}>
              上传
            </Button>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="编辑单词集"
        open={editModalVisible}
        onCancel={() => setEditModalVisible(false)}
        footer={null}
        width="90vw"
        style={{ 
          top: 20,
          maxHeight: '90vh',
          overflow: 'auto'
        }}
      >
        {/* 添加调试信息 */}
        <div>
          <p>单词总数: {words.length}</p>
          <p>过滤后单词数: {filteredWords.length}</p>
        </div>

        <Form
          initialValues={editingWordSet}
          onFinish={handleEditSubmit}
          layout="vertical"
        >
          <Form.Item
            name="name"
            label="单词集名称"
            rules={[{ required: true, message: '请输入单词集名称' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="description"
            label="描述"
          >
            <Input.TextArea />
          </Form.Item>
          
          <div style={{ marginBottom: 16 }}>
            <Input.Search
              placeholder="搜索单词..."
              onSearch={value => {
                const filtered = words.filter(w => 
                  w.word.toLowerCase().includes(value.toLowerCase()) ||
                  w.translation.toLowerCase().includes(value.toLowerCase()) ||
                  w.pronunciation?.toLowerCase().includes(value.toLowerCase())
                );
                setFilteredWords(filtered);
              }}
              style={{ width: 300 }}
            />
          </div>

          <Table
            dataSource={filteredWords.length > 0 ? filteredWords : words}
            columns={[
              {
                title: '单词',
                dataIndex: 'word',
                key: 'word',
                width: '12%',
                render: (text: string, record: Word) => (
                  <Input
                    value={text}
                    onChange={(e) => {
                      const newWords = words.map(w => 
                        w._id === record._id ? { ...w, word: e.target.value } : w
                      );
                      setWords(newWords);
                    }}
                  />
                ),
              },
              {
                title: '翻译',
                dataIndex: 'translation',
                key: 'translation',
                width: '30%',
                render: (text, record) => (
                  <Input.TextArea
                    value={text}
                    autoSize={{ minRows: 1, maxRows: 3 }}
                    onChange={(e) => {
                      const newWords = words.map(w => 
                        w._id === record._id ? { ...w, translation: e.target.value } : w
                      );
                      setWords(newWords);
                    }}
                  />
                ),
              },
              {
                title: '发音',
                dataIndex: 'pronunciation',
                key: 'pronunciation',
                width: '12%',
                render: (text, record) => (
                  <Input
                    value={text}
                    placeholder="请输入发音"
                    onChange={(e) => {
                      const newWords = words.map(w => 
                        w._id === record._id ? { ...w, pronunciation: e.target.value } : w
                      );
                      setWords(newWords);
                    }}
                  />
                ),
              },
              {
                title: '例句',
                dataIndex: 'example',
                key: 'example',
                width: '46%',
                render: (text, record) => (
                  <Input.TextArea
                    value={text}
                    placeholder="请输入例句"
                    autoSize={{ minRows: 1, maxRows: 3 }}
                    onChange={(e) => {
                      const newWords = words.map(w => 
                        w._id === record._id ? { ...w, example: e.target.value } : w
                      );
                      setWords(newWords);
                    }}
                  />
                ),
              },
            ]}
            rowKey="_id"
            pagination={{
              pageSize: pageSize,
              showSizeChanger: true,
              showQuickJumper: true,
              pageSizeOptions: ['10', '20', '50', '100'],
              onShowSizeChange: (current, size) => {
                setPageSize(size);
              }
            }}
            scroll={{ y: 'calc(80vh - 300px)' }}
          />
          <div style={{ 
            textAlign: 'right', 
            marginTop: 16,
            position: 'sticky',
            bottom: 0,
            padding: '16px 0',
            background: '#fff',
            borderTop: '1px solid #f0f0f0'
          }}>
            <Button onClick={() => setEditModalVisible(false)} style={{ marginRight: 8 }}>
              取消
            </Button>
            <Button type="primary" onClick={() => handleWordEditSubmit(words)} loading={loading}>
              保存
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default AdminVocabularyManager; 