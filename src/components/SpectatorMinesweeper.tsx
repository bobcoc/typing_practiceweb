// src/components/SpectatorMinesweeper.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Box, Typography, Paper, Button, Chip } from '@mui/material';
import { io, Socket } from 'socket.io-client';

interface Cell {
  isMine: boolean;
  isRevealed: boolean;
  isFlagged: boolean;
  neighborMines: number;
  isExploded?: boolean;
}

// 内部实际的组件实现
const SpectatorMinesweeperInner: React.FC<{ roomId: string }> = ({ roomId }) => {
  const [board, setBoard] = useState<Cell[][]>([]);
  const [difficulty, setDifficulty] = useState<string>('beginner');
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<string>('连接中...');
  const [highlightedCells, setHighlightedCells] = useState<Set<string>>(new Set());
  const [roomInfo, setRoomInfo] = useState<{playerCount: number, spectatorCount: number, gameState: string} | null>(null);

  // 初始化 WebSocket 连接
  useEffect(() => {
    // 构建 WebSocket URL，处理各种环境配置
    // 注意：REACT_APP_API_BASE_URL=/api 是相对路径，需要转换为绝对URL
    const getWebSocketUrl = () => {
      const envApiUrl = process.env.REACT_APP_API_BASE_URL;
      
      // 如果环境变量是完整的 URL（包含协议），提取协议和域名部分作为基础 URL
      if (envApiUrl && (envApiUrl.startsWith('http://') || envApiUrl.startsWith('https://'))) {
        // 解析 URL，提取协议、主机和端口
        const urlObj = new URL(envApiUrl);
        return `${urlObj.protocol}//${urlObj.host}`;
      }
      
      // 如果环境变量是相对路径（如 /api），需要从 CLIENT_URL 获取域名
      if (envApiUrl && envApiUrl.trim() !== '') {
        // 从 CLIENT_URL 获取域名，或者根据环境推断
        const clientUrl = process.env.REACT_APP_CLIENT_URL || 
                        (process.env.NODE_ENV === 'development' ? 'http://localhost:3001' : 'https://d1kt.cn');
        
        // 提取域名部分（去掉 http:// 或 https://）
        const domain = clientUrl.replace(/^https?:\/\//, '');
        
        // 返回基础域名，不包含 API 路径
        return `https://${domain}`;
      }
      
      // 根据环境返回合适的默认值
      if (process.env.NODE_ENV === 'development') {
        return 'http://localhost:5001';
      } else {
        // 生产环境：使用配置的域名
        return 'https://d1kt.cn';
      }
    };
    
    const getWebSocketPath = () => {
      const envApiUrl = process.env.REACT_APP_API_BASE_URL;
      if (process.env.NODE_ENV === 'development') {
        return '/socket.io';
      }
      if (!envApiUrl || envApiUrl.trim() === '') {
        return '/api/socket.io';
      }
      
      // 如果是完整 URL，检查是否包含路径
      if (envApiUrl.startsWith('http://') || envApiUrl.startsWith('https://')) {
        const urlObj = new URL(envApiUrl);
        // 如果原始 URL 包含路径，将其作为前缀
        if (urlObj.pathname && urlObj.pathname !== '/') {
          return `${urlObj.pathname}/api/socket.io`;
        }
      }
      
      // 如果是相对路径（如 /api），将其作为前缀 - 改为双 api
      if (envApiUrl.startsWith('/')) {
        return `${envApiUrl}/api/socket.io`;
      }
      
      return '/api/socket.io';
    };
    
    const apiUrl = getWebSocketUrl();
    const wsPath = getWebSocketPath();
    console.log('尝试连接到 WebSocket 服务器，房间ID:', roomId);
    console.log('WebSocket 连接地址:', apiUrl);
    console.log('WebSocket 路径:', wsPath);
    
    const newSocket = io(apiUrl, {
      path: wsPath,
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });

    newSocket.on('connect', () => {
      console.log('WebSocket 连接成功');
      setConnectionStatus('已连接');
      // 加入旁观房间
      console.log('加入旁观房间:', roomId);
      newSocket.emit('join-spectate', { roomId });
    });

    newSocket.on('connect_error', (error) => {
      console.error('WebSocket 连接错误:', error);
      setConnectionStatus(`连接失败: ${error.message}`);
    });

    newSocket.on('disconnect', (reason) => {
      console.log('WebSocket 断开连接:', reason);
      setConnectionStatus(`已断开连接: ${reason}`);
    });

    newSocket.on('error', (error) => {
      console.error('WebSocket 服务器错误:', error);
      setConnectionStatus('连接错误');
    });

    // 接收游戏状态更新
    newSocket.on('game-state', (data) => {
      setBoard(data.board);
      setDifficulty(data.difficulty);
      if (data.highlightedCells) {
        setHighlightedCells(new Set(data.highlightedCells));
      }
    });

    // 接收难度更新
    newSocket.on('difficulty-updated', (data) => {
      console.log('收到难度更新:', data.difficulty, data.config);
      setDifficulty(data.difficulty);
      // 如果包含配置信息，可以在这里更新显示
    });

    newSocket.on('room-closed', () => {
      setConnectionStatus('房间已关闭');
    });

    setSocket(newSocket);

    // 组件卸载时清理
    return () => {
      newSocket.disconnect();
    };
  }, [roomId]);

  // 获取难度配置
  const getDifficultyConfig = useCallback(() => {
    switch (difficulty) {
      case 'beginner':
        return { rows: 9, cols: 9, mines: 10, label: '初级 (9×9, 10雷)' };
      case 'intermediate':
        return { rows: 16, cols: 16, mines: 40, label: '中级 (16×16, 40雷)' };
      case 'expert':
        return { rows: 16, cols: 30, mines: 99, label: '高级 (16×30, 99雷)' };
      case 'brutal':
        return { rows: 24, cols: 30, mines: 200, label: '残酷 (24×30, 200雷)' };
      case 'fullscreen':
        return { rows: 16, cols: 30, mines: 99, label: '满屏 (自适应)' };
      case 'custom':
        return { rows: 15, cols: 15, mines: 20, label: '自定义' };
      default:
        return { rows: 9, cols: 9, mines: 10, label: '初级 (9×9, 10雷)' };
    }
  }, [difficulty]);

  // 获取状态文本
  const getStatusText = (state: string) => {
    switch(state) {
      case 'playing': return '游戏中';
      case 'waiting': return '等待中';
      case 'won': return '胜利';
      case 'lost': return '失败';
      default: return state;
    }
  };

  // 处理点击格子
  const handleCellClick = (row: number, col: number) => {
    // 如果没有 socket，不执行操作（roomId 已经在父组件中验证过）
    if (!socket || !board[row]) {
      return;
    }

    // 发送清除所有高亮的请求
    socket.emit('clear-all-highlights', { roomId });
    
    // 发送点击事件
    socket.emit('spectator-click', { roomId, row, col });
  };

  // 获取格子样式
  const getCellStyle = (cell: Cell, row: number, col: number): React.CSSProperties => {
    const cellKey = `${row},${col}`;
    const isHighlighted = highlightedCells.has(cellKey);
    
    // 根据屏幕大小和难度动态调整格子大小
    const getCellSize = () => {
      const config = getDifficultyConfig();
      const maxWidth = window.innerWidth - 100;
      const maxHeight = window.innerHeight - 200; // 减少顶部空间，因为不需要菜单
      
      if (difficulty === 'fullscreen') {
        // 满屏模式：固定25px格子大小（与扫雷网页一致）
        return 25;
      } else if (difficulty === 'custom') {
        // 自定义模式：根据棋盘大小自动调整格子大小
        const cellWidth = Math.min(Math.floor(maxWidth / config.cols), 40);
        const cellHeight = Math.min(Math.floor(maxHeight / config.rows), 40);
        return Math.min(cellWidth, cellHeight);
      } else if (difficulty === 'brutal') {
        // 残酷模式：24×30，需要更小的格子以适应屏幕
        const cellWidth = Math.min(Math.floor(maxWidth / 30), 28);
        const cellHeight = Math.min(Math.floor(maxHeight / 24), 28);
        return Math.min(cellWidth, cellHeight);
      } else if (difficulty === 'expert') {
        // 高级模式：16×30，需要更小的格子以适应屏幕
        const cellWidth = Math.min(Math.floor(maxWidth / 30), 32);
        const cellHeight = Math.min(Math.floor(maxHeight / 16), 32);
        return Math.min(cellWidth, cellHeight);
      } else if (difficulty === 'intermediate') {
        return 36;
      } else {
        return 40;
      }
    };

    const cellSize = getCellSize();
    
    const baseStyle: React.CSSProperties = {
      width: `${cellSize}px`,
      height: `${cellSize}px`,
      borderWidth: '1px',
      borderColor: '#999',
      borderStyle: 'solid',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: cell.isRevealed || cell.isFlagged ? 'default' : 'pointer',
      fontSize: difficulty === 'brutal' ? '10px' : difficulty === 'expert' ? '12px' : '14px',
      fontWeight: 'bold',
      userSelect: 'none',
      transition: 'all 0.05s ease',
      margin: '0'
    };

    if (cell.isRevealed) {
      if (cell.isMine) {
        if (cell.isFlagged) {
          // 已标记的地雷：灰色背景
          return { ...baseStyle, backgroundColor: '#999', color: '#000' };
        } else {
          // 未标记的地雷：红色背景
          return { ...baseStyle, backgroundColor: '#ff0000', color: '#000' };
        }
      }
      return { ...baseStyle, backgroundColor: '#ddd', color: getNumberColor(cell.neighborMines) };
    }

    if (cell.isFlagged) {
      return { ...baseStyle, backgroundColor: '#fff', color: '#ff0000' };
    }

    // 高亮效果
    if (isHighlighted) {
      return { 
        ...baseStyle, 
        backgroundColor: '#ff6b6b', // 红色高亮
        transform: 'scale(1.1)',
        zIndex: 10
      };
    }

    return { ...baseStyle, backgroundColor: '#bbb' };
  };

  // 获取数字颜色
  const getNumberColor = (num: number): string => {
    const colors = ['', '#0000ff', '#008000', '#ff0000', '#000080', '#800000', '#008080', '#000', '#808080'];
    return colors[num] || '#000';
  };

  // 获取房间信息
  useEffect(() => {
    // 只有在有 socket 和 roomId 时才执行
    if (socket && roomId) {
      socket.emit('get-room-info', { roomId });
      
      socket.on('room-info', (info) => {
        setRoomInfo(info);
      });
      
      socket.on('player-count-update', (data) => {
        setRoomInfo(prev => prev ? {...prev, playerCount: data.playerCount, spectatorCount: data.spectatorCount} : null);
      });
    }
  }, [socket, roomId]);

  return (
    <Box sx={{ padding: 2, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <Typography variant="h6" gutterBottom>
        旁观房间: {roomId} | 难度: {getDifficultyConfig().label}
      </Typography>
      
      {/* 房间信息显示 */}
      {roomInfo && (
        <Box sx={{ mb: 2, display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Chip 
            label={`玩家: ${roomInfo.playerCount}`} 
            color="primary" 
            size="small"
            icon={<span>👤</span>}
          />
          <Chip 
            label={`旁观者: ${roomInfo.spectatorCount}`} 
            color="secondary" 
            size="small"
            icon={<span>👥</span>}
          />
          <Chip 
            label={`状态: ${getStatusText(roomInfo.gameState)}`} 
            color={roomInfo.gameState === 'playing' ? 'success' : roomInfo.gameState === 'won' ? 'warning' : 'default'} 
            size="small"
          />
        </Box>
      )}
      
      <Typography variant="body2" color="textSecondary" gutterBottom>
        状态: {connectionStatus}
      </Typography>
      
      {board.length > 0 ? (
        <Paper sx={{ padding: 1, display: 'inline-block' }}>
          <Box>
            {board.map((row, rowIndex) => (
              <Box key={rowIndex} display="flex">
                {row.map((cell, colIndex) => (
                  <Box
                    key={`${rowIndex}-${colIndex}`}
                    onClick={() => handleCellClick(rowIndex, colIndex)}
                    style={getCellStyle(cell, rowIndex, colIndex)}
                  >
                    {/* 显示已揭开的地雷 */}
                    {cell.isRevealed && cell.isMine && '💣'}
                    
                    {/* 显示已揭开格子的数字 */}
                    {cell.isRevealed && !cell.isMine && cell.neighborMines > 0 && cell.neighborMines}
                    
                    {/* 显示旗帜 */}
                    {cell.isFlagged && '🚩'}
                  </Box>
                ))}
              </Box>
            ))}
          </Box>
        </Paper>
      ) : (
        <Typography variant="body1" sx={{ mt: 2 }}>
          等待游戏开始...
        </Typography>
      )}
      
      <Box sx={{ mt: 2 }}>
        <Typography variant="body2" color="textSecondary">
          提示: 点击未揭开的格子可以建议玩家点击该位置
        </Typography>
      </Box>
    </Box>
  );
};

// 主组件 - 处理 roomId 验证
const SpectatorMinesweeper: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  
  // 如果没有 roomId，显示错误信息
  if (!roomId) {
    return (
      <Box sx={{ padding: 2, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Typography variant="h6" color="error" gutterBottom>
          错误：无效的房间ID
        </Typography>
        <Typography variant="body2">
          请确保通过正确的分享链接访问此页面。
        </Typography>
      </Box>
    );
  }

  // 只有当 roomId 存在时才渲染内部组件，这样 ESLint 就不会认为 Hook 被条件调用
  return <SpectatorMinesweeperInner roomId={roomId} />;
};

export default SpectatorMinesweeper;
