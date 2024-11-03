import React, { useState, useEffect } from 'react';
import { adminApi, User } from '../api/admin';

const AdminUserManager: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

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

  const handleEdit = (user: User) => {
    setSelectedUser(user);
    setIsEditing(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    try {
      await adminApi.updateUser(selectedUser._id, selectedUser);
      setIsEditing(false);
      setSelectedUser(null);
      await fetchUsers(); // 重新加载用户列表
    } catch (err) {
      setError(err instanceof Error ? err.message : '更新用户失败');
      console.error('Error updating user:', err);
    }
  };

  if (loading) return <div>加载中...</div>;
  if (error) return <div>错误: {error}</div>;

  return (
    <div className="container mx-auto p-4">
      <h2 className="text-2xl font-bold mb-4">用户管理</h2>
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border border-gray-300">
          <thead>
            <tr>
              <th className="px-4 py-2 border">用户名</th>
              <th className="px-4 py-2 border">邮箱</th>
              <th className="px-4 py-2 border">角色</th>
              <th className="px-4 py-2 border">注册时间</th>
              <th className="px-4 py-2 border">操作</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user._id}>
                <td className="px-4 py-2 border">{user.username}</td>
                <td className="px-4 py-2 border">{user.email}</td>
                <td className="px-4 py-2 border">
                  {user.isAdmin ? '管理员' : '普通用户'}
                </td>
                <td className="px-4 py-2 border">
                  {new Date(user.createdAt).toLocaleString()}
                </td>
                <td className="px-4 py-2 border">
                  <button 
                    className="bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600"
                    onClick={() => handleEdit(user)}
                  >
                    编辑
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {users.length === 0 && <div className="text-center py-4">暂无用户数据</div>}

      {/* 编辑模态框 */}
      {isEditing && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg w-96">
            <h3 className="text-xl font-bold mb-4">编辑用户</h3>
            <form onSubmit={handleUpdate}>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">用户名</label>
                <input
                  type="text"
                  className="w-full p-2 border rounded"
                  value={selectedUser.username}
                  onChange={(e) => setSelectedUser({
                    ...selectedUser,
                    username: e.target.value
                  })}
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">邮箱</label>
                <input
                  type="email"
                  className="w-full p-2 border rounded"
                  value={selectedUser.email}
                  onChange={(e) => setSelectedUser({
                    ...selectedUser,
                    email: e.target.value
                  })}
                />
              </div>
              <div className="mb-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    className="mr-2"
                    checked={selectedUser.isAdmin}
                    onChange={(e) => setSelectedUser({
                      ...selectedUser,
                      isAdmin: e.target.checked
                    })}
                  />
                  <span className="text-sm font-medium">管理员权限</span>
                </label>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded"
                  onClick={() => setIsEditing(false)}
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  保存
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUserManager;