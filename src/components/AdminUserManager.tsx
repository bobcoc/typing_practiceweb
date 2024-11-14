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

const ImportReport: React.FC<{
  result: ImportResult;
  onClose: () => void;
}> = ({ result, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-lg font-medium text-gray-900">导入报告</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto">
          <div className="flex gap-4 mb-6">
            <div className="flex-1 bg-green-50 p-4 rounded-lg">
              <div className="text-green-800 font-medium">成功导入</div>
              <div className="text-2xl font-bold text-green-600">{result.success.count}</div>
            </div>
            <div className="flex-1 bg-red-50 p-4 rounded-lg">
              <div className="text-red-800 font-medium">导入失败</div>
              <div className="text-2xl font-bold text-red-600">{result.failed.count}</div>
            </div>
          </div>

          {result.failed.count > 0 && (
            <div className="mt-4">
              <h4 className="text-lg font-medium text-gray-900 mb-3">失败详情</h4>
              <div className="border rounded-lg divide-y">
                {result.failed.details.map((item, index) => (
                  <div key={index} className="p-3 hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <span className="text-gray-500 text-sm">第 {item.row} 行</span>
                        <span className="mx-2 text-gray-300">|</span>
                        <span className="font-medium">{item.username}</span>
                      </div>
                      <span className="text-red-600 text-sm">{item.reason}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {result.success.count > 0 && (
            <div className="mt-4">
              <h4 className="text-lg font-medium text-gray-900 mb-3">成功导入的用户</h4>
              <div className="flex flex-wrap gap-2">
                {result.success.users.map((username, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm bg-green-100 text-green-800"
                  >
                    {username}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
};

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
  
  // 导入相关状态
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [showImportReport, setShowImportReport] = useState(false);

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

            setImportProgress(Math.round(((i + 1) / totalRows) * 100));
          }

          setImportResult(importResult);
          setShowImportReport(true);
          await fetchUsers();
        } catch (err) {
          console.error('Excel处理错误:', err);
        }
      };

      reader.readAsArrayBuffer(file);
    } catch (err) {
      console.error('文件读取错误:', err);
    } finally {
      setImporting(false);
      event.target.value = '';
    }
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
      setIsDeleteModalOpen(false);
      setUserToDelete(null);
      await fetchUsers();
    } catch (err) {
      if (err instanceof AxiosError) {
        setBackendError(err.response?.data?.message || '删除失败');
      } else {
        setBackendError('删除失败');
      }
    }
  };

  const filteredUsers = users.filter(user =>
    user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.fullname.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
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
            <label
              htmlFor="excel-upload"
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 cursor-pointer"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              导入Excel
            </label>
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
              {filteredUsers.map((user) => (
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
        </div>
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

      {/* 导入进度模态框 */}
      {importing && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4">
            <div className="text-center">
              <div className="mb-4">正在导入用户数据</div>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div 
                  className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                  style={{ width: `${importProgress}%` }}
                ></div>
              </div>
              <div className="mt-2 text-sm text-gray-600">{importProgress}%</div>
            </div>
          </div>
        </div>
      )}

      {/* 导入报告模态框 */}
      {showImportReport && importResult && (
        <ImportReport
          result={importResult}
          onClose={() => setShowImportReport(false)}
        />
      )}

      {/* 错误提示 */}
      {backendError && (
        <div className="fixed bottom-4 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
          <strong className="font-bold">错误：</strong>
          <span className="block sm:inline">{backendError}</span>
        </div>
      )}
    </div>
  );
};

export default AdminUserManager;