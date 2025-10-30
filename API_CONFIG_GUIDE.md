# API 地址配置说明

## 开发环境 vs 生产环境

### 开发环境配置

在开发环境中，前端和后端分别运行在不同的端口：

```bash
# 前端: http://localhost:3001
# 后端: http://localhost:5001
```

**`.env` 配置**:
```env
# 开发环境需要后端基础地址（不含/api后缀，因为代码中会自动添加）
REACT_APP_API_BASE_URL=http://localhost:5001
```

**API请求示例**:
- 登录: `http://localhost:5001/api/auth/login`
- 排行榜: `http://localhost:5001/api/minesweeper/leaderboard/beginner`

**请求组成**:
- API_BASE_URL: `http://localhost:5001`
- 代码中的路径: `/api/minesweeper/record`
- 最终URL: `http://localhost:5001` + `/api/minesweeper/record`

### 生产环境配置

在生产环境中，使用 Nginx 反向代理：

**Nginx 配置**:
```nginx
# 前端请求
location / {
    proxy_pass http://localhost:3001;
}

# API请求（重要！）
location /api/ {
    proxy_pass http://localhost:5001/api/;
}
```

**`.env` 配置**:
```env
# 生产环境使用相对路径（Nginx会代理）
REACT_APP_API_BASE_URL=/api
```

**API请求示例**:
- 登录: `https://d1kt.cn/api/auth/login`
- 排行榜: `https://d1kt.cn/api/minesweeper/leaderboard/beginner`

## 配置文件说明

### 1. `.env` 文件

开发环境的 `.env` 应该包含：

```env
# Server Configuration
SERVER_PORT=5001

# 开发环境：后端基础地址（不含/api，因为代码中会自动添加）
# 生产环境：留空或设为空字符串（Nginx会处理/api代理）
REACT_APP_API_BASE_URL=http://localhost:5001

# Client Configuration
CLIENT_PORT=3001
CLIENT_URL=http://localhost:3001

# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/typeskill
MONGODB_DB_NAME=typeskill

# JWT Configuration
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRES_IN=24h
SKIP_PREFLIGHT_CHECK=true
```

### 2. `src/config.ts`

前端配置会自动处理不同环境：

```typescript
// 开发环境使用后端URL（不含/api后缀），生产环境使用空字符串
export const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 
  (process.env.NODE_ENV === 'development' ? 'http://localhost:5001' : '');
```

## API路径结构

### 后端路由

后端所有API都在 `/api` 前缀下：

```
/api/auth/login              - 登录
/api/auth/register           - 注册
/api/minesweeper/record      - 提交扫雷记录
/api/minesweeper/leaderboard/:difficulty - 获取排行榜
```

### 前端请求

前端使用 `API_BASE_URL` + API路径：

```typescript
// 开发环境
http://localhost:5001 + /api/auth/login = http://localhost:5001/api/auth/login

// 生产环境
'' + /api/auth/login = /api/auth/login (由Nginx代理到后端)
```

## 常见问题

### Q1: 登录时提示404或路径错误

**原因**: API基础URL配置错误

**解决方案**:
1. 检查 `.env` 文件中的 `REACT_APP_API_BASE_URL`
2. 确保开发环境设置为: `http://localhost:5001` (不含/api)
3. 重启前端服务（环境变量更改需要重启）

**常见错误**:
- ✖️ 错误: `REACT_APP_API_BASE_URL=http://localhost:5001/api` (会导致双重/api)
- ✅ 正确: `REACT_APP_API_BASE_URL=http://localhost:5001`

### Q2: 生产环境API请求失败

**原因**: Nginx配置错误或环境变量错误

**解决方案**:
1. 检查 Nginx 的 `/api/` 代理配置
2. 确保生产环境 `.env` 中 `REACT_APP_API_BASE_URL=` (留空)
3. 检查后端是否正常运行在5001端口

### Q3: CORS 错误

**开发环境**: 
- 后端已配置 CORS，允许所有来源
- 如果还有问题，检查后端 `server.ts` 中的 `cors()` 配置

**生产环境**:
- 使用 Nginx 代理，不会有 CORS 问题

## 部署检查清单

### 开发环境部署

- [ ] `.env` 文件存在
- [ ] `REACT_APP_API_BASE_URL=http://localhost:5001` (不含/api)
- [ ] MongoDB 正在运行
- [ ] 后端运行在端口 5001
- [ ] 前端运行在端口 3001

### 生产环境部署

- [ ] `.env` 文件配置正确
- [ ] `REACT_APP_API_BASE_URL=` (留空或不设置)
- [ ] Nginx 配置 `/api/` 代理
- [ ] MongoDB 连接配置正确
- [ ] JWT_SECRET 使用强密钥
- [ ] 后端运行在正确端口

## 测试方法

### 测试后端API

```bash
# 测试后端是否正常
curl http://localhost:5001/api/system/server-time

# 测试排行榜
curl http://localhost:5001/api/minesweeper/leaderboard/beginner
```

### 测试前端配置

打开浏览器控制台，查看：
```
Environment: development
API Base URL: http://localhost:5001
Full example URL: http://localhost:5001/api/auth/login
```

## 更新环境变量后的操作

1. 修改 `.env` 文件
2. 停止当前运行的服务（Ctrl+C）
3. 重新启动: `npm run start`
4. 检查控制台输出确认配置正确

---

**重要提示**: 修改 `.env` 文件后必须重启服务才能生效！
