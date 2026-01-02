// server/websocket/minesweeperSocket.ts
import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import dotenv from 'dotenv';

// 加载环境变量
dotenv.config();

interface Cell {
  isMine: boolean;
  isRevealed: boolean;
  isFlagged: boolean;
  neighborMines: number;
  isExploded?: boolean;
}

interface GameRoom {
  roomId: string;
  playerId: string;
  board: Cell[][];
  difficulty: string;
  spectators: Set<string>;
  highlightedCells: Set<string>; // 存储需要闪烁的格子坐标 "row,col"
}

// 存储所有游戏房间
const gameRooms = new Map<string, GameRoom>();

// 获取 WebSocket 路径前缀 - 与客户端保持一致
function getSocketIoPath() {
  const envApiUrl = process.env.REACT_APP_API_BASE_URL;
  
  console.log('[Socket.IO Path Config] REACT_APP_API_BASE_URL:', envApiUrl);
  console.log('[Socket.IO Path Config] NODE_ENV:', process.env.NODE_ENV);
  
  if (!envApiUrl || envApiUrl.trim() === '') {
    // 如果没有设置环境变量，根据 NODE_ENV 决定
    const path = process.env.NODE_ENV === 'production' ? '/api/socket.io' : '/socket.io';
    console.log('[Socket.IO Path Config] Using default path:', path);
    return path;
  }
  
  // 强制生产环境使用双 /api 路径以匹配前端
  if (process.env.NODE_ENV === 'production') {
    console.log('[Socket.IO Path Config] Production mode, forcing double /api path');
    return '/api/api/socket.io';
  }
  
  // 如果是完整 URL，检查是否包含路径
  if (envApiUrl.startsWith('http://') || envApiUrl.startsWith('https://')) {
    const urlObj = new URL(envApiUrl);
    // 如果原始 URL 包含路径，将其作为前缀
    if (urlObj.pathname && urlObj.pathname !== '/') {
      const path = `${urlObj.pathname}/socket.io`;
      console.log('[Socket.IO Path Config] From URL pathname:', path);
      return path;
    }
  }
  
  // 如果是相对路径（如 /api），将其作为前缀
  if (envApiUrl.startsWith('/')) {
    const path = `${envApiUrl}/socket.io`;
    console.log('[Socket.IO Path Config] From relative path:', path);
    return path;
  }
  
  const path = '/socket.io';
  console.log('[Socket.IO Path Config] Using fallback path:', path);
  return path;
}

export function setupMinesweeperSocket(httpServer: HTTPServer) {
  const socketIoPath = getSocketIoPath();
  console.log('[Socket.IO] Socket.IO 路径配置:', socketIoPath);
  console.log('[Socket.IO] HTTP Server listening on port:', httpServer.address());
  
  const io = new SocketIOServer(httpServer, {
    path: socketIoPath,
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    },
    allowEIO3: true,
    transports: ['polling', 'websocket']
  });

  // 添加底层HTTP请求日志中间件
  io.engine.on('initial_headers', (headers, req) => {
    console.log('[Socket.IO Engine] === INITIAL HEADERS ===');
    console.log('[Socket.IO Engine] Method:', req.method);
    console.log('[Socket.IO Engine] URL:', req.url);
    console.log('[Socket.IO Engine] Headers:', JSON.stringify(req.headers, null, 2));
    console.log('[Socket.IO Engine] Query:', req.url ? req.url.split('?')[1] : 'N/A');
    console.log('[Socket.IO Engine] ========================');
  });

  io.engine.on('headers', (headers, req) => {
    console.log('[Socket.IO Engine] === RESPONSE HEADERS ===');
    console.log('[Socket.IO Engine] Status:', headers.status || 200);
    console.log('[Socket.IO Engine] Headers:', JSON.stringify(headers, null, 2));
    console.log('[Socket.IO Engine] ========================');
  });

  io.on('connection', (socket) => {
    console.log('[Socket.IO] >>> CONNECTION ESTABLISHED <<<');
    console.log('[Socket.IO] 用户连接:', socket.id);
    console.log('[Socket.IO] 握手耗时:', Date.now() - (socket.handshake.time || Date.now()), 'ms');
    console.log('[Socket.IO] 握手 URL:', socket.handshake.url);
    console.log('[Socket.IO] 握手查询参数:', socket.handshake.query);
    console.log('[Socket.IO] 握手 Origin:', socket.handshake.headers.origin);
    console.log('[Socket.IO] 握手 Referer:', socket.handshake.headers.referer);
    console.log('[Socket.IO] 握手 User-Agent:', socket.handshake.headers['user-agent']);
    console.log('[Socket.IO] 握手 Host:', socket.handshake.headers.host);
    console.log('[Socket.IO] 配置的 Socket.IO 路径:', socketIoPath);
    
    // 详细路径分析
    const reqPath = socket.handshake.url ? socket.handshake.url.split('?')[0] : 'N/A';
    console.log('[Socket.IO] 请求路径:', reqPath);
    console.log('[Socket.IO] 路径匹配检查:');
    console.log('  - 请求路径 === 配置路径:', reqPath === socketIoPath);
    console.log('  - 请求路径.endsWith(配置路径):', reqPath.endsWith(socketIoPath));
    console.log('  - 配置路径.endsWith(请求路径):', socketIoPath.endsWith(reqPath));
    
    if (reqPath !== socketIoPath) {
      console.warn(`[Socket.IO] ⚠️  警告: 请求路径与配置路径不匹配!`);
      console.warn(`[Socket.IO]    请求: ${reqPath}`);
      console.warn(`[Socket.IO]    配置: ${socketIoPath}`);
      console.warn(`[Socket.IO]    差异: ${reqPath.replace(socketIoPath, '【配置路径】')}`);
    }

    // 创建游戏房间（玩家创建）
    socket.on('create-room', (data: { difficulty: string }) => {
      const roomId = generateRoomId();
      const room: GameRoom = {
        roomId,
        playerId: socket.id,
        board: [],
        difficulty: data.difficulty,
        spectators: new Set(),
        highlightedCells: new Set()
      };
      
      gameRooms.set(roomId, room);
      socket.join(roomId);
      
      console.log(`[Socket.IO] 房间创建: ${roomId}, 玩家: ${socket.id}`);
      socket.emit('room-created', { roomId });
    });

    // 旁观者加入房间
    socket.on('join-spectate', (data: { roomId: string }) => {
      const room = gameRooms.get(data.roomId);
      
      if (!room) {
        socket.emit('error', { message: '房间不存在' });
        return;
      }

      room.spectators.add(socket.id);
      socket.join(data.roomId);
      
      console.log(`旁观者加入: ${socket.id} -> 房间: ${data.roomId}`);
      
      // 发送当前游戏状态给旁观者
      socket.emit('game-state', {
        board: room.board,
        difficulty: room.difficulty
      });
    });

    // 玩家更新游戏状态
    socket.on('update-game', (data: { roomId: string; board: Cell[][] }) => {
      const room = gameRooms.get(data.roomId);
      
      if (!room || room.playerId !== socket.id) {
        return;
      }

      room.board = data.board;
      
      // 广播给该房间的所有旁观者
      socket.to(data.roomId).emit('game-state', {
        board: room.board,
        difficulty: room.difficulty,
        highlightedCells: Array.from(room.highlightedCells)
      });

      // 清除闪烁的格子
      if (room.highlightedCells.size > 0) {
        setTimeout(() => {
          room.highlightedCells.clear();
        }, 100);
      }
    });

    // 旁观者点击格子
    socket.on('spectator-click', (data: { roomId: string; row: number; col: number }) => {
      const room = gameRooms.get(data.roomId);
      
      if (!room || !room.spectators.has(socket.id)) {
        return;
      }

      const cellKey = `${data.row},${data.col}`;
      room.highlightedCells.add(cellKey);

      console.log(`旁观者点击: 房间 ${data.roomId}, 格子 (${data.row}, ${data.col})`);
      
      // 通知玩家该格子被旁观者点击
      io.to(room.playerId).emit('spectator-suggest', {
        row: data.row,
        col: data.col
      });

      // 3秒后移除闪烁
      setTimeout(() => {
        room.highlightedCells.delete(cellKey);
        io.to(data.roomId).emit('clear-highlight', { row: data.row, col: data.col });
      }, 3000);
    });

    // 断开连接
    socket.on('disconnect', () => {
      console.log('用户断开连接:', socket.id);
      
      // 清理房间数据
      gameRooms.forEach((room, roomId) => {
        if (room.playerId === socket.id) {
          // 玩家离开，关闭房间
          io.to(roomId).emit('room-closed');
          gameRooms.delete(roomId);
          console.log(`房间关闭: ${roomId}`);
        } else if (room.spectators.has(socket.id)) {
          // 旁观者离开
          room.spectators.delete(socket.id);
        }
      });
    });
  });

  return io;
}

// 生成唯一房间ID
function generateRoomId(): string {
  return Math.random().toString(36).substring(2, 10).toUpperCase();
}
