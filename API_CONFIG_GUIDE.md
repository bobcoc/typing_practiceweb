# API 路径配置说明

## 📋 概述

本项目使用统一的 API 路径配置机制，通过环境变量和辅助函数确保开发环境和生产环境的 API 调用一致性。

---

## 🔧 配置方式

### 1. **环境变量配置**

#### **开发环境** (`.env`)
```env
REACT_APP_API_BASE_URL=http://localhost:5001
```

#### **生产环境** (`.env.production`)
```env
REACT_APP_API_BASE_URL=https://d1kt.cn/api
```

### 2. **代码中的使用**

所有 API 调用统一使用 `api` 对象（来自 `src/api/apiClient.ts`）：

```typescript
import { api } from './api/apiClient';

// ✅ 正确用法
const users = await api.get<User[]>('/admin/users');

// ❌ 不要直接使用 apiClient
// const response = await apiClient.get('/admin/users');
```

---

## 🌐 URL 构造流程

### **开发环境**

```
1. 代码调用：api.get('/admin/users')
   ↓
2. getFullApiPath('/admin/users') 
   → '/api/admin/users'
   ↓
3. axios.get(API_BASE_URL + '/api/admin/users')
   → axios.get('http://localhost:5001/api/admin/users')
   ↓
4. 最终请求：http://localhost:5001/api/admin/users
   ↓
5. 后端接收：/api/admin/users ✅
```

### **生产环境**

```
1. 代码调用：api.get('/admin/users')
   ↓
2. getFullApiPath('/admin/users')
   → '/api/admin/users'
   ↓
3. axios.get(API_BASE_URL + '/api/admin/users')
   → axios.get('https://d1kt.cn/api/api/admin/users')
   ↓
4. 浏览器请求：https://d1kt.cn/api/api/admin/users
   ↓
5. Nginx 处理：
   location /api/ {
       proxy_pass http://localhost:5001/;
   }
   → 去掉第一个 /api，转发到后端
   ↓
6. 后端接收：http://localhost:5001/api/admin/users ✅
```

---

## 📊 关键点说明

### ✅ **为什么生产环境需要两个 `/api`？**

1. **第一个 `/api`**：Nginx 反向代理的路径匹配
   ```nginx
   location /api/ {
       proxy_pass http://localhost:5001/;
   }
   ```
   - 浏览器请求 `https://d1kt.cn/api/xxx`
   - Nginx 匹配到 `/api/` 后，去掉这部分，转发到后端
   - 后端收到 `http://localhost:5001/xxx`

2. **第二个 `/api`**：后端路由的前缀
   - 后端所有路由都以 `/api` 开头
   - 例如：`app.use('/api/admin', adminRoutes)`
   - 所以需要请求 `/api/admin/users`

3. **组合结果**：
   ```
   浏览器 → https://d1kt.cn/api/api/admin/users
   Nginx  → 转发 http://localhost:5001/api/admin/users
   后端   → 路由匹配 /api/admin/users ✅
   ```

---

## 🔍 统一的调用方式

### **所有页面都使用相同的逻辑**

| 功能模块 | API 调用示例 | 最终 URL（开发） | 最终 URL（生产） |
|---------|------------|---------------|---------------|
| 打字练习 | `api.get('/practice-records/statistics')` | `http://localhost:5001/api/practice-records/statistics` | `https://d1kt.cn/api/api/practice-records/statistics` |
| 用户管理 | `api.get('/admin/users')` | `http://localhost:5001/api/admin/users` | `https://d1kt.cn/api/api/admin/users` |
| 词汇学习 | `api.get('/vocabulary/word-sets')` | `http://localhost:5001/api/vocabulary/word-sets` | `https://d1kt.cn/api/api/vocabulary/word-sets` |
| 扫雷游戏 | `api.get('/minesweeper/leaderboard/beginner')` | `http://localhost:5001/api/minesweeper/leaderboard/beginner` | `https://d1kt.cn/api/api/minesweeper/leaderboard/beginner` |

---

## 🚀 部署步骤

### **生产环境部署**

1. **在服务器上创建 `.env.production` 文件**
   ```bash
   cd /path/to/typing_practiceweb
   cp .env.production.example .env.production
   nano .env.production
   ```

2. **配置生产环境变量**
   ```env
   REACT_APP_API_BASE_URL=https://d1kt.cn/api
   ```

3. **构建前端**
   ```bash
   npm run build
   ```
   这会自动读取 `.env.production` 文件

4. **确认 Nginx 配置**
   ```nginx
   location /api/ {
       proxy_pass http://localhost:5001/;
   }
   ```

5. **重启服务**
   ```bash
   sudo nginx -s reload
   pm2 restart typing-backend
   ```

---

## ⚠️ 常见错误

### ❌ **错误配置示例**

```env
# ❌ 生产环境配置为空字符串
REACT_APP_API_BASE_URL=

# 结果：请求变成 /api/admin/users（相对路径）
# 问题：Nginx 无法正确代理
```

```env
# ❌ 开发环境包含 /api
REACT_APP_API_BASE_URL=http://localhost:5001/api

# 结果：http://localhost:5001/api/api/admin/users
# 问题：多了一层 /api，后端无法匹配路由
```

### ✅ **正确配置**

```env
# ✅ 开发环境
REACT_APP_API_BASE_URL=http://localhost:5001

# ✅ 生产环境
REACT_APP_API_BASE_URL=https://d1kt.cn/api
```

---

## 🧪 验证方法

### **开发环境验证**
```bash
# 1. 启动服务
npm run start

# 2. 浏览器访问
http://localhost:3001/admin

# 3. 打开 Network 面板，查看请求
# 应该看到：http://localhost:5001/api/admin/users ✅
```

### **生产环境验证**
```bash
# 1. 构建并部署
npm run build
pm2 restart typing-backend

# 2. 浏览器访问
https://d1kt.cn/admin

# 3. 打开 Network 面板，查看请求
# 应该看到：https://d1kt.cn/api/api/admin/users ✅
```

---

## 📝 总结

- ✅ **统一使用 `api` 对象**进行所有 API 调用
- ✅ **通过环境变量**控制不同环境的基础 URL
- ✅ **`getFullApiPath` 函数**自动添加 `/api` 前缀
- ✅ **生产环境需要两个 `/api`**：第一个给 Nginx，第二个给后端路由
- ✅ **开发环境和生产环境使用完全相同的代码逻辑**

---

*最后更新：2025-10-30*
