import React, { useState, useEffect } from 'react';
import { adminApi, User, UserUpdateData } from '../api/admin';
import { AxiosError } from 'axios';
import * as XLSX from 'xlsx';

interface ImportResult {
  success: {
    count: number;
    users: string[];
  };
  failed: {
    count: number;
    details: Array<{
      row: number;
      username: string;
      reason: string;
    }>;
  };
}

const ExcelFormatTooltip: React.FC = () => (
  <div className="absolute bottom-full mb-2 w-64 bg-gray-800 text-white text-sm rounded p-2 shadow-lg">
    <p className="font-medium mb-1">Excel文件格式要求：</p>
    <ul className="list-disc list-inside text-xs space-y-1">
      <li>必填列：username, email, password, fullname</li>
      <li>可选列：isAdmin (true/false)</li>
      <li>username：3-20个字符</li>
      <li>email：有效的邮箱格式</li>
    </ul>
  </div>
);

const ImportReport: React.FC<{
  result: ImportResult;
  onClose: () => void;
}> = ({ result, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-lg font-medium text-gray-900">导入结果</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="text-green-800 font-medium">导入成功</div>
              <div className="text-3xl font-bold text-green-600">{result.success.count}</div>
            </div>
            <div className="bg-red-50 p-4 rounded-lg">
              <div className="text-red-800 font-medium">导入失败</div>
              <div className="text-3xl font-bold text-red-600">{result.failed.count}</div>
            </div>
          </div>

          {result.success.count > 0 && (
            <div className="mt-6">
              <h4 className="text-lg font-medium text-gray-900 mb-3">成功导入的用户</h4>
              <div className="bg-gray-50 rounded-lg p-4 max-h-[200px] overflow-y-auto">
                <div className="flex flex-wrap gap-2">
                  {result.success.users.map((username, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-2.5 py-0.5 rounded-md text-sm bg-green-100 text-green-800"
                    >
                      {username}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {result.failed.count > 0 && (
            <div className="mt-6">
              <h4 className="text-lg font-medium text-gray-900 mb-3">失败详情</h4>
              <div className="bg-white shadow rounded-lg overflow-hidden">
                <div className="max-h-[200px] overflow-y-auto">
                  {result.failed.details.map((item, index) => (
                    <div 
                      key={index} 
                      className="px-4 py-3 border-b last:border-b-0 hover:bg-gray-50"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <span className="text-gray-500 text-sm">行 {item.row}</span>
                          <span className="font-medium">{item.username}</span>
                        </div>
                        <span className="text-red-600 text-sm">{item.reason}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
};
const ImportProgress: React.FC<{ progress: number }> = ({ progress }) => (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
      <div className="text-center mb-4">
        <h3 className="text-xl font-medium text-gray-900 mb-2">正在导入用户</h3>
        <p className="text-sm text-gray-500">请勿关闭窗口</p>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
        <div 
          className="bg-blue-600 h-3 rounded-full transition-all duration-300 ease-in-out"
          style={{ width: `${progress}%` }}
        ></div>
      </div>
      <p className="text-right text-sm text-gray-600 font-medium">{progress}%</p>
    </div>
  </div>
);

const AdminUserManager: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [backendError, setBackendError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10); 
  // 导入相关状态
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [showImportReport, setShowImportReport] = useState(false);
  const [showFormatTooltip, setShowFormatTooltip] = useState(false);

  const validateEmail = (email: string): string | null => {
    if (!email) {
      return '邮箱是必填项';
    }
    if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      return '请输入有效的邮箱地址';
    }
    return null;
  };

  const validateUsername = (username: string): string | null => {
    if (!username) {
      return '用户名是必填项';
    }
    if (username.length < 3 || username.length > 20) {
      return '用户名长度应在3-20个字符之间';
    }
    return null;
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    if (backendError) {
      const timer = setTimeout(() => {
        setBackendError(null);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [backendError]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const data = await adminApi.getUsers();
      setUsers(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取用户数据失败');
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  };
  const handleExcelImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setImportProgress(0);
    setImportResult(null);

    const importResult: ImportResult = {
      success: { count: 0, users: [] },
      failed: { count: 0, details: [] }
    };

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const worksheet = workbook.Sheets[workbook.SheetNames[0]];
          const jsonData = XLSX.utils.sheet_to_json(worksheet);

          const totalRows = jsonData.length;

          for (let i = 0; i < jsonData.length; i++) {
            const row = jsonData[i] as any;
            // 更新进度
            const progress = Math.round(((i + 1) / totalRows) * 100);
            console.log('Import progress:', progress);
            setImportProgress(progress);
            await new Promise(resolve => setTimeout(resolve, 100));

            if (!row.username || !row.email || !row.password || !row.fullname) {
              importResult.failed.details.push({
                row: i + 2,
                username: row.username || '未提供',
                reason: '数据格式不完整，必须包含 username、email、password 和 fullname'
              });
              importResult.failed.count++;
              continue;
            }

            if (!row.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
              importResult.failed.details.push({
                row: i + 2,
                username: row.username,
                reason: '邮箱格式无效'
              });
              importResult.failed.count++;
              continue;
            }

            const userData = {
              username: row.username,
              email: row.email,
              password: row.password,
              fullname: row.fullname,
              isAdmin: Boolean(row.isAdmin),
            };

            try {
              await adminApi.createUser(userData);
              importResult.success.count++;
              importResult.success.users.push(userData.username);
            } catch (err) {
              let errorMessage = '未知错误';
              if (err instanceof AxiosError) {
                errorMessage = err.response?.data?.message || err.message;
              } else if (err instanceof Error) {
                errorMessage = err.message;
              }
              
              importResult.failed.details.push({
                row: i + 2,
                username: userData.username,
                reason: errorMessage
              });
              importResult.failed.count++;
            }
          }

          setImportResult(importResult);
          setShowImportReport(true);
          await fetchUsers();
        } catch (err) {
          console.error('Excel处理错误:', err);
        } finally {
          setImporting(false);
        }
      };

      reader.readAsArrayBuffer(file);
    } catch (err) {
      console.error('文件读取错误:', err);
      setImporting(false);
    }
    
    event.target.value = '';
  };

  const handleEdit = (user: User) => {
    setSelectedUser(user);
    setIsEditing(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    setBackendError(null);

    if (!selectedUser.username) {
      setError('用户名是必填项');
      return;
    }

    if (selectedUser.username.length < 3 || selectedUser.username.length > 20) {
      setError('用户名长度应在3-20个字符之间');
      return;
    }

    try {
      const updateData: UserUpdateData = {
        username: selectedUser.username,
        email: selectedUser.email,
        fullname: selectedUser.fullname,
        isAdmin: selectedUser.isAdmin,
      };

      if (newPassword) {
        updateData.password = newPassword;
      }

      await adminApi.updateUser(selectedUser._id, updateData);
      setIsEditing(false);
      setNewPassword('');
      await fetchUsers();
    } catch (err) {
      if (err instanceof AxiosError) {
        setBackendError(err.response?.data?.message || '更新失败');
      } else {
        setBackendError('更新失败');
      }
    }
  };

  const handleDelete = async () => {
    if (!userToDelete) return;

    try {
      await adminApi.deleteUser(userToDelete._id);
      setUsers(prevUsers => prevUsers.filter(user => user._id !== userToDelete._id));
      setIsDeleteModalOpen(false);
      setUserToDelete(null);
    } catch (err) {
      if (err instanceof AxiosError) {
        setBackendError(err.response?.data?.message || '删除失败');
      } else {
        setBackendError('删除失败');
      }
    }
  };

  // 计算分页数据
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const filteredUsers = users.filter(user =>
    user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.fullname.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const currentUsers = filteredUsers.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);

  // 分页处理函数
  const handlePageChange = (pageNumber: number) => {
    setCurrentPage(pageNumber);
  };

  // 分页控制组件
  const Pagination: React.FC = () => {
    // 计算要显示的页码范围
    const getPageRange = () => {
      const range = [];
      const showPages = 5; // 显示的页码数量
      const sidePages = Math.floor(showPages / 2);
      
      let start = currentPage - sidePages;
      let end = currentPage + sidePages;
      
      if (start < 1) {
        start = 1;
        end = Math.min(showPages, totalPages);
      }
      
      if (end > totalPages) {
        end = totalPages;
        start = Math.max(1, totalPages - showPages + 1);
      }
      
      for (let i = start; i <= end; i++) {
        range.push(i);
      }
      return range;
    };
  
    return (
      <div className="flex items-center justify-between px-4 py-3 bg-white border-t border-gray-200 sm:px-6">
        <div className="flex-1 flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-700">
              显示第 <span className="font-medium">{indexOfFirstItem + 1}</span> 到{' '}
              <span className="font-medium">
                {Math.min(indexOfLastItem, filteredUsers.length)}
              </span>{' '}
              条，共{' '}
              <span className="font-medium">{filteredUsers.length}</span> 条
            </p>
          </div>
          <div>
            <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
              {/* 首页按钮 */}
              <button
                onClick={() => handlePageChange(1)}
                disabled={currentPage === 1}
                className={`relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium ${
                  currentPage === 1
                    ? 'text-gray-300 cursor-not-allowed'
                    : 'text-gray-500 hover:bg-gray-50'
                }`}
              >
                <span className="sr-only">首页</span>
                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M15.707 15.707a1 1 0 01-1.414 0l-5-5a1 1 0 010-1.414l5-5a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
                  <path fillRule="evenodd" d="M9.707 15.707a1 1 0 01-1.414 0l-5-5a1 1 0 010-1.414l5-5a1 1 0 111.414 1.414L5.414 10l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
                </svg>
              </button>
              
              {/* 页码按钮 */}
              {getPageRange().map((pageNum) => (
                <button
                  key={pageNum}
                  onClick={() => handlePageChange(pageNum)}
                  className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium
                    ${currentPage === pageNum
                      ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                      : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                    }`}
                >
                  {pageNum}
                </button>
              ))}
  
              {/* 末页按钮 */}
              <button
                onClick={() => handlePageChange(totalPages)}
                disabled={currentPage === totalPages}
                className={`relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium ${
                  currentPage === totalPages
                    ? 'text-gray-300 cursor-not-allowed'
                    : 'text-gray-500 hover:bg-gray-50'
                }`}
              >
                <span className="sr-only">末页</span>
                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 15.707a1 1 0 001.414 0l5-5a1 1 0 000-1.414l-5-5a1 1 0 00-1.414 1.414L8.586 10l-4.293 4.293a1 1 0 000 1.414z" clipRule="evenodd" />
                  <path fillRule="evenodd" d="M10.293 15.707a1 1 0 001.414 0l5-5a1 1 0 000-1.414l-5-5a1 1 0 00-1.414 1.414L14.586 10l-4.293 4.293a1 1 0 000 1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </nav>
          </div>
        </div>
      </div>
    );
  };
  return (
    <>
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <h2 className="text-xl font-semibold text-gray-800">用户管理</h2>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative">
              <input
                type="file"
                id="excel-upload"
                className="hidden"
                accept=".xlsx,.xls"
                onChange={handleExcelImport}
              />
              <div className="flex items-center gap-2">
                <label
                  htmlFor="excel-upload"
                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 cursor-pointer"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  导入Excel
                </label>
                <button
                  type="button"
                  className="text-gray-400 hover:text-gray-600"
                  onMouseEnter={() => setShowFormatTooltip(true)}
                  onMouseLeave={() => setShowFormatTooltip(false)}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </button>
              </div>
              {showFormatTooltip && <ExcelFormatTooltip />}
            </div>
            <div className="relative w-full sm:w-64">
              <input
                type="text"
                placeholder="搜索用户..."
                className="w-full h-9 pl-8 pr-4 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 transition-colors"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <svg
                className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        ) : error ? (
          <div className="text-red-500 text-center">{error}</div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    用户名
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    邮箱
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    姓名
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    角色
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
              {currentUsers.map((user) => (
                  <tr key={user._id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{user.username}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">{user.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{user.fullname}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        user.isAdmin
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {user.isAdmin ? '管理员' : '普通用户'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleEdit(user)}
                        className="text-indigo-600 hover:text-indigo-900 mr-4"
                      >
                        编辑
                      </button>
                      <button
                        onClick={() => {
                          setUserToDelete(user);
                          setIsDeleteModalOpen(true);
                        }}
                        className="text-red-600 hover:text-red-900"
                      >
                        删除
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!loading && !error && filteredUsers.length > 0 && <Pagination />}
          </div>
        )}
      </div>

      {/* 在最外层渲染模态框 */}
      {importing && (
        <ImportProgress progress={importProgress} />
      )}

      {showImportReport && importResult && (
        <ImportReport
          result={importResult}
          onClose={() => setShowImportReport(false)}
        />
      )}

      {/* 编辑用户模态框 */}
      {isEditing && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">编辑用户</h3>
            <form onSubmit={handleUpdate}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    用户名
                  </label>
                  <input
                    type="text"
                    value={selectedUser.username}
                    onChange={(e) =>
                      setSelectedUser({ ...selectedUser, username: e.target.value })
                    }
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    邮箱
                  </label>
                  <input
                    type="email"
                    value={selectedUser.email}
                    onChange={(e) =>
                      setSelectedUser({ ...selectedUser, email: e.target.value })
                    }
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    姓名
                  </label>
                  <input
                    type="text"
                    value={selectedUser.fullname}
                    onChange={(e) =>
                      setSelectedUser({ ...selectedUser, fullname: e.target.value })
                    }
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    新密码
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      placeholder="留空表示不修改密码"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    >
                      <svg
                        className="h-5 w-5 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d={
                            showPassword
                              ? "M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                              : "M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                          }
                        />
                      </svg>
                    </button>
                  </div>
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={selectedUser.isAdmin}
                    onChange={(e) =>
                      setSelectedUser({ ...selectedUser, isAdmin: e.target.checked })
                    }
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label className="ml-2 block text-sm text-gray-900">
                    管理员权限
                  </label>
                </div>
              </div>

              <div className="mt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditing(false);
                    setNewPassword('');
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  保存
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 删除确认模态框 */}
      {isDeleteModalOpen && userToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">确认删除</h3>
            <p className="text-sm text-gray-500">
              确定要删除用户 "{userToDelete.username}" 吗？此操作无法撤销。
            </p>
            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                取消
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                删除
              </button>
            </div>
          </div>
        </div>
      )}

      {backendError && (
        <div className="fixed bottom-4 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
          <strong className="font-bold">错误：</strong>
          <span className="block sm:inline">{backendError}</span>
        </div>
      )}
    </>
  );
};

export default AdminUserManager;