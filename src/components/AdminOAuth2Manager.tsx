import React, { useState, useEffect } from 'react';
import { message } from 'antd';
import axios from 'axios';
import { adminApi } from '../api/admin';

interface OAuth2Client {
  _id: string;
  name: string;
  clientId: string;
  redirectUris: string[];
  scope: string[];
  createdAt: string;
}

interface CreateClientData {
  name: string;
  redirectUris: string[];
  scope: string;
}

const AdminOAuth2Manager: React.FC = () => {
  const [clients, setClients] = useState<OAuth2Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<OAuth2Client | null>(null);
  const [formData, setFormData] = useState<CreateClientData>({
    name: '',
    redirectUris: [''],
    scope: '',
  });

  // 获取客户端列表
  const fetchClients = async () => {
    try {
      setLoading(true);
      const clients = await adminApi.getOAuth2Clients();
      setClients(clients);
    } catch (error) {
      console.error('获取客户端列表错误:', error);
      message.error(`获取客户端列表失败: ${error.response?.data?.message || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  // 创建新客户端
  const handleCreate = async () => {
    try {
      const response = await axios.post('/api/admin/oauth2/clients', {
        ...formData,
        redirectUris: formData.redirectUris.filter(uri => uri.trim() !== '')
      });
      message.success('创建成功');
      setClients([...clients, response.data]);
      setIsModalOpen(false);
      resetForm();
    } catch (error) {
      message.error('创建失败');
    }
  };

  // 更新客户端
  const handleUpdate = async () => {
    if (!selectedClient) return;
    
    try {
      await axios.put(`/api/admin/oauth2/clients/${selectedClient.clientId}`, {
        ...formData,
        redirectUris: formData.redirectUris.filter(uri => uri.trim() !== '')
      });
      message.success('更新成功');
      fetchClients();
      setIsModalOpen(false);
      resetForm();
    } catch (error) {
      message.error('更新失败');
    }
  };

  // 删除客户端
  const handleDelete = async (clientId: string) => {
    try {
      await axios.delete(`/api/admin/oauth2/clients/${clientId}`);
      message.success('删除成功');
      setClients(clients.filter(client => client.clientId !== clientId));
    } catch (error) {
      message.error('删除失败');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      redirectUris: [''],
      scope: '',
    });
    setSelectedClient(null);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-800">OAuth2 客户端管理</h2>
        <button
          onClick={() => {
            resetForm();
            setIsModalOpen(true);
          }}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          创建客户端
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  应用名称
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Client ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  重定向 URI
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  权限范围
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {clients.map((client) => (
                <tr key={client.clientId}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{client.name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">{client.clientId}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-500">
                      {client.redirectUris.join(', ')}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-500">
                      {client.scope.join(' ')}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => {
                        setSelectedClient(client);
                        setFormData({
                          name: client.name,
                          redirectUris: client.redirectUris,
                          scope: client.scope.join(' '),
                        });
                        setIsModalOpen(true);
                      }}
                      className="text-indigo-600 hover:text-indigo-900 mr-4"
                    >
                      编辑
                    </button>
                    <button
                      onClick={() => handleDelete(client.clientId)}
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

      {/* 创建/编辑模态框 */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              {selectedClient ? '编辑客户端' : '创建客户端'}
            </h3>
            <form onSubmit={(e) => {
              e.preventDefault();
              selectedClient ? handleUpdate() : handleCreate();
            }}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    应用名称
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    重定向 URI
                  </label>
                  {formData.redirectUris.map((uri, index) => (
                    <div key={index} className="flex mt-1">
                      <input
                        type="url"
                        value={uri}
                        onChange={(e) => {
                          const newUris = [...formData.redirectUris];
                          newUris[index] = e.target.value;
                          setFormData({ ...formData, redirectUris: newUris });
                        }}
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const newUris = formData.redirectUris.filter((_, i) => i !== index);
                          setFormData({ ...formData, redirectUris: newUris });
                        }}
                        className="ml-2 text-red-600 hover:text-red-900"
                      >
                        删除
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => setFormData({
                      ...formData,
                      redirectUris: [...formData.redirectUris, '']
                    })}
                    className="mt-2 text-sm text-blue-600 hover:text-blue-500"
                  >
                    添加重定向 URI
                  </button>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    权限范围
                  </label>
                  <input
                    type="text"
                    value={formData.scope}
                    onChange={(e) => setFormData({ ...formData, scope: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    placeholder="用空格分隔多个权限，如：read write profile"
                    required
                  />
                </div>
              </div>

              <div className="mt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    resetForm();
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700"
                >
                  {selectedClient ? '保存' : '创建'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminOAuth2Manager; 