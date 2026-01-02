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
  
  if (!envApiUrl || envApiUrl.trim() === '') {
    // 如果没有设置环境变量，根据 NODE_ENV 决定
    return process.env.NODE_ENV === 'production' ? '/api/socket.io' : '/socket.io';
  }
  
  // 如果是完整 URL，检查是否包含路径
  if (envApiUrl.startsWith('http://') || envApiUrl.startsWith('https://')) {
    const urlObj = new URL(envApiUrl);
    // 如果原始 URL 包含路径，将其作为前缀
    if (urlObj.pathname && urlObj.pathname !== '/') {
      return `${urlObj.pathname}/socket.io`;
    }
  }
  
  // 如果是相对路径（如 /api），将其作为前缀
  if (envApiUrl.startsWith('/')) {
    return `${envApiUrl}/socket.io`;
  }
  
  return '/socket.io';
}

export function setupMinesweeperSocket(httpServer: HTTPServer) {
  const socketIoPath = getSocketIoPath();
  console.log('Socket.IO 路径配置:', socketIoPath);
  
  const io = new SocketIOServer(httpServer, {
    path: socketIoPath,
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  io.on('connection', (socket) => {
    console.log('用户连接:', socket.id);

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
      
      console.log(`房间创建: ${roomId}, 玩家: ${socket.id}`);
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
