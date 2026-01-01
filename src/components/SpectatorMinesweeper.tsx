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
      
      // 如果是相对路径 /api，需要从 CLIENT_URL 提取域名
      if (envApiUrl === '/api') {
        const clientUrl = process.env.REACT_APP_CLIENT_URL || 'https://d1kt.cn';
        const domain = clientUrl.replace(/^https?:\/\//, '');
        return `https://${domain}`;
      }
      
      // 如果是其他相对路径，也需要转换
      if (envApiUrl && envApiUrl.startsWith('/') && !envApiUrl.startsWith('//')) {
        const clientUrl = process.env.REACT_APP_CLIENT_URL || 'https://d1kt.cn';
        const domain = clientUrl.replace(/^https?:\/\//, '');
        return `https://${domain}${envApiUrl}`;
      }
      
      // 如果是完整 URL，直接使用
      if (envApiUrl && (envApiUrl.startsWith('http://') || envApiUrl.startsWith('https://'))) {
        return envApiUrl;
      }
      
      // 根据环境返回合适的默认值
      if (process.env.NODE_ENV === 'development') {
        return 'http://localhost:5001';
      } else {
        return 'https://d1kt.cn';
      }
    };
    
    const apiUrl = getWebSocketUrl();
    console.log('尝试连接到 WebSocket 服务器，房间ID:', roomId);
    console.log('WebSocket 连接地址:', apiUrl);
    
    const newSocket = io(apiUrl, {
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
    if (!socket || !board[row] || board[row][col].isRevealed || board[row][col].isFlagged) {
      return; // 只能点击未揭开且未标记的格子
    }

    socket.emit('spectator-click', { roomId, row, col });
  };

  // 获取格子样式
  const getCellStyle = (cell: Cell, row: number, col: number): React.CSSProperties => {
    const cellKey = `${row},${col}`;
    const isHighlighted = highlightedCells.has(cellKey);
    
    // 根据屏幕大小和难度动态调整格子大小
    const getCellSize = () => {
      if (difficulty === 'brutal') {
        // 残酷模式：24×30，需要更小的格子以适应屏幕
        const maxWidth = window.innerWidth - 100;
        const maxHeight = window.innerHeight - 200; // 减少顶部空间，因为不需要菜单
        const cellWidth = Math.min(Math.floor(maxWidth / 30), 28);
        const cellHeight = Math.min(Math.floor(maxHeight / 24), 28);
        return Math.min(cellWidth, cellHeight);
      } else if (difficulty === 'expert') {
        // 高级模式：16×30，需要更小的格子以适应屏幕
        const maxWidth = window.innerWidth - 100;
        const maxHeight = window.innerHeight - 200;
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

  const config = getDifficultyConfig();

  return (
    <Box sx={{ padding: 2, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <Typography variant="h6" gutterBottom>
        旁观房间: {roomId} | 难度: {config.label}
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
