import dotenv from 'dotenv';
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import session from 'express-session';
import MongoStore from 'connect-mongo';
import path from 'path';
import { createServer } from 'http';
import { setupMinesweeperSocket } from './websocket/minesweeperSocket';
import practiceTypesRouter from './routes/practiceTypes';
import codeExamplesRouter from './routes/codeExamples';
import authRouter from './routes/auth';
import keywordsRouter from './routes/keywords';
import practiceRecordsRouter from './routes/practiceRecords';
import leaderboardRouter from './routes/leaderboard';
import adminRoutes from './routes/admin';
import systemRoutes from './routes/system';
import oauth2Routes from './routes/oauth2.routes';
import visitorRoutes from './routes/visitor';
import vocabularyRoutes from './routes/vocabulary';
import userWordPassRouter from './routes/userWordPass';
import minesweeperRouter from './routes/minesweeper';
// 加载环境变量
dotenv.config();

const app = express();

// 中间件配置
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

// 静态文件服务 - 优先处理 public 目录下的静态文件
const publicPath = path.join(__dirname, '../public');
const buildPath = path.join(__dirname, '../build');
console.log('Static paths configured:');
console.log('  Public path:', publicPath);
console.log('  Build path:', buildPath);

app.use(express.static(publicPath));
app.use(express.static(buildPath));

// MongoDB 连接
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/typeskill';

// 添加 session 配置
app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
        mongoUrl: MONGODB_URI,
        ttl: 24 * 60 * 60
    }),
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

// 如果使用了代理（如 nginx），添加这行
app.set('trust proxy', 1);

mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('Connected to MongoDB');
  })
  .catch((error) => {
    console.error('MongoDB connection error:', error);
  });

// 路由配置
// 添加请求日志中间件 - 在所有路由之前
app.use((req, res, next) => {
  console.log('=== Incoming Request ===');
  console.log('Time:', new Date().toISOString());
  console.log('Method:', req.method);
  console.log('Path:', req.path);
  console.log('Original URL:', req.originalUrl);
  console.log('Headers:', JSON.stringify(req.headers, null, 2));
  console.log('========================');
  next();
});

// 特殊静态 HTML 文件路由 - 在 API 路由之前处理
app.get('/xf/xf.html', (req, res) => {
  const filePath = path.join(__dirname, '../public/xf/xf.html');
  console.log('>>> Serving xf.html');
  console.log('    File path:', filePath);
  console.log('    __dirname:', __dirname);
  
  // 检查文件是否存在
  const fs = require('fs');
  if (fs.existsSync(filePath)) {
    console.log('    File exists: YES');
    res.sendFile(filePath);
  } else {
    console.log('    File exists: NO');
    res.status(404).send('File not found: ' + filePath);
  }
});

// 通用静态 HTML 处理 - 处理 /xf/ 目录下的其他文件
app.get('/xf/*', (req, res, next) => {
  const filePath = path.join(__dirname, '../public', req.path);
  console.log('>>> Serving /xf/* file');
  console.log('    Requested path:', req.path);
  console.log('    Full file path:', filePath);
  
  const fs = require('fs');
  if (fs.existsSync(filePath)) {
    console.log('    File exists: YES');
    res.sendFile(filePath);
  } else {
    console.log('    File exists: NO, passing to next middleware');
    next();
  }
});

// OIDC Discovery 路由
app.get('/.well-known/openid-configuration', (req, res) => {
  const issuer = process.env.ISSUER || 'https://d1kt.cn'; // 你的主域名
  res.json({
    issuer,
    authorization_endpoint: issuer + '/api/api/oauth2/authorize',
    token_endpoint: issuer + '/api/api/oauth2/token',
    userinfo_endpoint: issuer + '/api/api/oauth2/userinfo',
    response_types_supported: ['code'],
    subject_types_supported: ['public'],
    id_token_signing_alg_values_supported: ['HS256'],
    scopes_supported: ['openid', 'profile', 'email', 'firstname', 'lastname', 'username'],
    token_endpoint_auth_methods_supported: ['client_secret_post'],
    claims_supported: ['sub', 'name', 'fullname', 'email', 'firstname', 'lastname', 'username'],
  });
});
app.use('/api/practice-types', practiceTypesRouter);
app.use('/api/code-examples', codeExamplesRouter);
app.use('/api/auth', authRouter);
app.use('/api/oauth2', oauth2Routes);
app.use('/api/keywords', keywordsRouter);
app.use('/api/practice-records', practiceRecordsRouter);
app.use('/api/leaderboard', leaderboardRouter);
app.use('/api/admin', adminRoutes);
app.use('/api/system', systemRoutes);
app.use('/api/visitor', visitorRoutes);
app.use('/api/vocabulary', vocabularyRoutes);
app.use('/api', userWordPassRouter);
app.use('/api/minesweeper', minesweeperRouter);

// SPA 回退路由 - 必须放在所有路由之后
app.get('*', (req, res, next) => {
  console.log('>>> SPA Fallback triggered');
  console.log('    Path:', req.path);
  console.log('    Starts with /api/:', req.path.startsWith('/api/'));
  console.log('    Includes dot:', req.path.includes('.'));
  
  // 如果是 API 请求或静态资源，跳过
  if (req.path.startsWith('/api/') || req.path.includes('.')) {
    console.log('    Action: Passing to next middleware');
    return next();
  }
  // 否则返回 React 应用的 index.html
  console.log('    Action: Returning React index.html');
  res.sendFile(path.join(__dirname, '../build/index.html'));
});

// 响应结束日志
app.use((req, res, next) => {
  const originalSend = res.send;
  const originalSendFile = res.sendFile;
  
  res.send = function(data) {
    console.log('>>> Response sent (send method)');
    console.log('    Status:', res.statusCode);
    console.log('    Data length:', typeof data === 'string' ? data.length : 'N/A');
    return originalSend.apply(res, arguments);
  };
  
  res.sendFile = function(filePath) {
    console.log('>>> Response sent (sendFile method)');
    console.log('    Status:', res.statusCode);
    console.log('    File:', filePath);
    return originalSendFile.apply(res, arguments);
  };
  
  next();
});

// 错误处理中间件
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});
const PORT = process.env.PORT || 5001;
const httpServer = createServer({
  // 添加请求处理回调来捕获所有HTTP请求
  IncomingMessage: class extends require('http').IncomingMessage {
    constructor(socket) {
      super(socket);
      this._startTime = Date.now();
    }
  },
  ServerResponse: require('http').ServerResponse
});

// 在HTTP服务器层面添加请求日志
httpServer.on('request', (req, res) => {
  console.log('[HTTP Server] >>> RAW HTTP REQUEST <<<');
  console.log('[HTTP Server] Time:', new Date().toISOString());
  console.log('[HTTP Server] Method:', req.method);
  console.log('[HTTP Server] URL:', req.url);
  console.log('[HTTP Server] Headers:', JSON.stringify(req.headers, null, 2));
  console.log('[HTTP Server] Remote Address:', req.socket.remoteAddress);
  console.log('[HTTP Server] Remote Port:', req.socket.remotePort);
  console.log('[HTTP Server] ============================');
  
  // 特别监控Socket.IO相关的请求
  if (req.url && (req.url.includes('socket.io') || req.url.includes('transport=websocket'))) {
    console.log('[HTTP Server] 🔥 SOCKET.IO REQUEST DETECTED! 🔥');
    console.log('[HTTP Server] Full URL:', req.url);
    console.log('[HTTP Server] Query String:', req.url.split('?')[1] || 'N/A');
    console.log('[HTTP Server] Upgrade Header:', req.headers.upgrade);
    console.log('[HTTP Server] Connection Header:', req.headers.connection);
    console.log('[HTTP Server] Sec-WebSocket-Version:', req.headers['sec-websocket-version']);
    console.log('[HTTP Server] Sec-WebSocket-Key:', req.headers['sec-websocket-key']);
    console.log('[HTTP Server] ========================================');
  }
});

// 监听upgrade事件（WebSocket握手）
httpServer.on('upgrade', (req, socket, head) => {
  console.log('[HTTP Server] >>> WEBSOCKET UPGRADE REQUEST <<<');
  console.log('[HTTP Server] Time:', new Date().toISOString());
  console.log('[HTTP Server] Method:', req.method);
  console.log('[HTTP Server] URL:', req.url);
  console.log('[HTTP Server] Headers:', JSON.stringify(req.headers, null, 2));
  console.log('[HTTP Server] Socket remote address:', socket.remoteAddress);
  console.log('[HTTP Server] Head bytes:', head ? head.toString('hex').substring(0, 100) + '...' : 'None');
  console.log('[HTTP Server] =====================================');
  
  if (req.url && req.url.includes('socket.io')) {
    console.log('[HTTP Server] 🚨 WEBSOCKET UPGRADE FOR SOCKET.IO! 🚨');
    console.log('[HTTP Server] This should be handled by Socket.IO engine');
    console.log('[HTTP Server] ==========================================');
  }
});

// 设置 WebSocket
setupMinesweeperSocket(httpServer);

httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`HTTP Server address:`, httpServer.address());
  console.log(`WebSocket server is ready`);
  console.log(`Environment:`, process.env.NODE_ENV);
  console.log(`REACT_APP_API_BASE_URL:`, process.env.REACT_APP_API_BASE_URL);
});