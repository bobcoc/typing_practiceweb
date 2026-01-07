// src/components/SpectatorMinesweeper.tsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { Box, Typography, Paper, Chip } from '@mui/material';
import { io, Socket } from 'socket.io-client';

interface Cell {
  isMine: boolean;
  isRevealed: boolean;
  isFlagged: boolean;
  neighborMines: number;
  isExploded?: boolean;
}

interface MouseDownState {
  left: boolean;
  right: boolean;
}

interface HoverCell {
  row: number;
  col: number;
}

// 经典扫雷“图片皮肤”配置（与 MinesweeperGame 保持一致）
const CLASSIC_SKIN_BASE = '/minesweeper-skin';
const CLASSIC_SKIN = {
  cell: {
    covered: `${CLASSIC_SKIN_BASE}/cell_closed.gif`,
    coveredPressed: `${CLASSIC_SKIN_BASE}/cell_pressed.gif`,
    revealed: `${CLASSIC_SKIN_BASE}/cell_open.gif`
  },
  overlay: {
    flag: `${CLASSIC_SKIN_BASE}/flag.gif`,
    wrongFlag: `${CLASSIC_SKIN_BASE}/wrong_flag.gif`,
    mine: `${CLASSIC_SKIN_BASE}/mine.gif`,
    mineExploded: `${CLASSIC_SKIN_BASE}/mine_exploded.gif`,
    numbers: [
      '',
      `${CLASSIC_SKIN_BASE}/num_1.gif`,
      `${CLASSIC_SKIN_BASE}/num_2.gif`,
      `${CLASSIC_SKIN_BASE}/num_3.gif`,
      `${CLASSIC_SKIN_BASE}/num_4.gif`,
      `${CLASSIC_SKIN_BASE}/num_5.gif`,
      `${CLASSIC_SKIN_BASE}/num_6.gif`,
      `${CLASSIC_SKIN_BASE}/num_7.gif`,
      `${CLASSIC_SKIN_BASE}/num_8.gif`
    ]
  }
} as const;

// 内部实际的组件实现
const SpectatorMinesweeperInner: React.FC<{ roomId: string }> = ({ roomId }) => {

  const [board, setBoard] = useState<Cell[][]>([]);
  const [difficulty, setDifficulty] = useState<string>('beginner');
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<string>('连接中...');
  const [highlightedCells, setHighlightedCells] = useState<Set<string>>(new Set());
  const [roomInfo, setRoomInfo] = useState<{playerCount: number, spectatorCount: number, gameState: string, invitePlayMode: boolean} | null>(null);
  
  // 鼠标状态管理
  const [, setIsMouseDown] = useState<MouseDownState>({ left: false, right: false });
  const [pressedCells, setPressedCells] = useState<Set<string>>(new Set());
  const [hoverCell, setHoverCell] = useState<HoverCell | null>(null);
  const [isSpacePressed, setIsSpacePressed] = useState(false);

  // 皮肤图片预加载（有素材时自动启用图片版渲染）
  const skinUrls = useMemo(() => {
    const urls: string[] = [];
    urls.push(CLASSIC_SKIN.cell.covered, CLASSIC_SKIN.cell.coveredPressed, CLASSIC_SKIN.cell.revealed);
    urls.push(CLASSIC_SKIN.overlay.flag, CLASSIC_SKIN.overlay.wrongFlag, CLASSIC_SKIN.overlay.mine, CLASSIC_SKIN.overlay.mineExploded);
    urls.push(...CLASSIC_SKIN.overlay.numbers.slice(1));
    return urls;
  }, []);

  const [availableImages, setAvailableImages] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;

    const loadOne = (url: string) =>
      new Promise<{ url: string; ok: boolean }>((resolve) => {
        const img = new Image();
        img.onload = () => resolve({ url, ok: true });
        img.onerror = () => resolve({ url, ok: false });
        img.src = url;
      });

    Promise.all(skinUrls.map(loadOne)).then((results) => {
      if (cancelled) return;
      const okUrls = results.filter((r) => r.ok).map((r) => r.url);
      setAvailableImages(new Set(okUrls));
    });

    return () => {
      cancelled = true;
    };
  }, [skinUrls]);

  const hasSkinImage = useCallback((url: string) => availableImages.has(url), [availableImages]);


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
      
      // 立即获取房间信息
      setTimeout(() => {
        console.log('[旁观端日志] 连接成功后立即获取房间信息');
        newSocket.emit('get-room-info', { roomId });
      }, 100);
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

  // 更新按下效果
  const updatePressedCells = useCallback((row: number, col: number) => {
    const config = getDifficultyConfig();
    const newPressed = new Set<string>();
    
    // 添加当前格子
    newPressed.add(`${row},${col}`);
    
    // 添加周围8个格子（用于弦操作效果）
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const newRow = row + dr;
        const newCol = col + dc;
        if (newRow >= 0 && newRow < config.rows && newCol >= 0 && newCol < config.cols) {
          newPressed.add(`${newRow},${newCol}`);
        }
      }
    }
    
    setPressedCells(newPressed);
  }, [getDifficultyConfig]);

  // 处理鼠标按下
  const handleMouseDown = useCallback((row: number, col: number, e: React.MouseEvent) => {
    console.log('[旁观端日志] === 鼠标按下开始 ===');
    console.log('[旁观端日志] 鼠标按下事件:');
    console.log('[旁观端日志]   - 坐标:', `(${row}, ${col})`);
    console.log('[旁观端日志]   - 按钮:', e.button === 0 ? '左键' : e.button === 2 ? '右键' : e.button);
    console.log('[旁观端日志]   - socket状态:', socket ? '已连接' : '未连接');
    console.log('[旁观端日志]   - board状态:', board[row] ? '存在' : '不存在');
    console.log('[旁观端日志]   - roomInfo:', roomInfo);
    
    if (!socket || !board[row]) {
      console.log('[旁观端日志] ❌ 条件检查失败: socket或board不存在');
      console.log('[旁观端日志] === 鼠标按下结束 ===');
      return;
    }

    // 发送清除所有高亮的请求
    console.log('[旁观端日志] 发送 clear-all-highlights 事件');
    socket.emit('clear-all-highlights', { roomId });

    if (roomInfo?.invitePlayMode) {
      console.log('[旁观端日志] ✅ 同玩模式: 执行实际游戏操作');
      
      if (e.button === 0) {
        // 左键按下
        console.log('[旁观端日志] 左键按下: 设置鼠标状态');
        setIsMouseDown(prev => ({ ...prev, left: true }));
        
        // 如果是已揭开且有数字的格子，显示弦操作效果
        const cell = board[row][col];
        console.log('[旁观端日志] 格子状态:', {
          isRevealed: cell.isRevealed, 
          neighborMines: cell.neighborMines
        });
        
        if (cell.isRevealed && cell.neighborMines > 0) {
          console.log('[旁观端日志] 显示弦操作效果');
          updatePressedCells(row, col);
        }
      } else if (e.button === 2) {
        // 右键按下：立即执行标记操作
        console.log('[旁观端日志] 右键按下: 立即执行标记操作');
        setIsMouseDown(prev => ({ ...prev, right: true }));
        console.log('[旁观端日志] 发送 spectator-action (flag) 事件');
        socket.emit('spectator-action', { roomId, action: 'flag', row, col });
      }
    } else {
      console.log('[旁观端日志] ✅ 纯旁观模式: 发送点击事件');
      
      // 纯旁观模式：发送点击事件（红色高亮提示）
      if (e.button === 0) {
        console.log('[旁观端日志] 发送 spectator-click 事件');
        socket.emit('spectator-click', { roomId, row, col });
      }
    }
    console.log('[旁观端日志] === 鼠标按下结束 ===');
  }, [socket, board, roomInfo, roomId, updatePressedCells]);

  // 处理鼠标释放
  const handleMouseUp = useCallback((row: number, col: number, e: React.MouseEvent) => {
    console.log('[旁观端日志] === 鼠标释放开始 ===');
    console.log('[旁观端日志] 鼠标释放事件:');
    console.log('[旁观端日志]   - 坐标:', `(${row}, ${col})`);
    console.log('[旁观端日志]   - 按钮:', e.button === 0 ? '左键' : e.button === 2 ? '右键' : e.button);
    console.log('[旁观端日志]   - roomInfo:', roomInfo);
    
    if (!socket || !board[row]) {
      console.log('[旁观端日志] ❌ 条件检查失败: socket或board不存在');
      console.log('[旁观端日志] === 鼠标释放结束 ===');
      return;
    }

    if (roomInfo?.invitePlayMode) {
      console.log('[旁观端日志] ✅ 同玩模式: 执行实际游戏操作');
      
      if (e.button === 0) {
        // 左键释放
        console.log('[旁观端日志] 左键释放: 更新鼠标状态');
        setIsMouseDown(prev => ({ ...prev, left: false }));
        
        // 检查是否应该执行弦操作
        const cell = board[row][col];
        console.log('[旁观端日志] 格子状态:', {
          isRevealed: cell.isRevealed, 
          neighborMines: cell.neighborMines
        });
        
        if (cell.isRevealed && cell.neighborMines > 0) {
          // 发送弦操作请求
          console.log('[旁观端日志] 发送 spectator-action (chord) 事件');
          socket.emit('spectator-action', { roomId, action: 'chord', row, col });
        } else {
          // 普通左键点击：发送揭开操作
          console.log('[旁观端日志] 发送 spectator-action (reveal) 事件');
          socket.emit('spectator-action', { roomId, action: 'reveal', row, col });
        }
      } else if (e.button === 2) {
        // 右键释放 - 只更新鼠标状态，不执行操作（已在按下时执行）
        console.log('[旁观端日志] 右键释放: 只更新鼠标状态');
        setIsMouseDown(prev => ({ ...prev, right: false }));
      }
      
      // 清除按下效果
      console.log('[旁观端日志] 清除按下效果');
      setPressedCells(new Set());
    } else {
      console.log('[旁观端日志] ❌ 非同玩模式: 不执行操作');
    }
    console.log('[旁观端日志] === 鼠标释放结束 ===');
  }, [socket, board, roomInfo, roomId]);

  // 处理鼠标进入格子
  const handleMouseEnter = useCallback((row: number, col: number) => {
    setHoverCell({ row, col });
  }, []);

  // 处理鼠标离开格子
  const handleMouseLeave = useCallback(() => {
    setHoverCell(null);
  }, []);

  // 全局鼠标释放监听（防止鼠标离开格子后释放）
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      setIsMouseDown({ left: false, right: false });
      setPressedCells(new Set());
    };

    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => {
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, []);

  // 获取格子样式（优先使用 public/minesweeper-skin/ 下的贴图；缺图时回退到原色块渲染）
  const getCellStyle = (cell: Cell, row: number, col: number): React.CSSProperties => {
    const cellKey = `${row},${col}`;
    const isHighlighted = highlightedCells.has(cellKey);
    const isPressed = pressedCells.has(cellKey);
    const isHovered = hoverCell?.row === row && hoverCell?.col === col;

    // 根据屏幕大小和难度动态调整格子大小
    const getCellSize = () => {
      const config = getDifficultyConfig();
      const maxWidth = window.innerWidth - 100;
      const maxHeight = window.innerHeight - 200;

      if (difficulty === 'fullscreen') return 25;
      if (difficulty === 'custom') {
        const cellWidth = Math.min(Math.floor(maxWidth / config.cols), 40);
        const cellHeight = Math.min(Math.floor(maxHeight / config.rows), 40);
        return Math.min(cellWidth, cellHeight);
      }
      if (difficulty === 'brutal') {
        const cellWidth = Math.min(Math.floor(maxWidth / 30), 28);
        const cellHeight = Math.min(Math.floor(maxHeight / 24), 28);
        return Math.min(cellWidth, cellHeight);
      }
      if (difficulty === 'expert') {
        const cellWidth = Math.min(Math.floor(maxWidth / 30), 32);
        const cellHeight = Math.min(Math.floor(maxHeight / 16), 32);
        return Math.min(cellWidth, cellHeight);
      }
      if (difficulty === 'intermediate') return 36;
      return 40;
    };

    const cellSize = getCellSize();

    const baseStyle: React.CSSProperties = {
      width: `${cellSize}px`,
      height: `${cellSize}px`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: 'pointer',
      userSelect: 'none',
      transition: 'all 0.05s ease',
      margin: '0',
      position: 'relative',
      imageRendering: 'pixelated'
    };

    // 选择底图（未开/按下/已开）
    const coveredUrl = CLASSIC_SKIN.cell.covered;
    const pressedUrl = CLASSIC_SKIN.cell.coveredPressed;
    const openedUrl = CLASSIC_SKIN.cell.revealed;

    const canUseCovered = hasSkinImage(coveredUrl);
    const canUsePressed = hasSkinImage(pressedUrl);
    const canUseOpened = hasSkinImage(openedUrl);

    const backgroundUrl = cell.isRevealed
      ? (canUseOpened ? openedUrl : '')
      : isPressed
        ? (canUsePressed ? pressedUrl : (canUseCovered ? coveredUrl : ''))
        : (canUseCovered ? coveredUrl : '');

    const fallbackStyle: React.CSSProperties = (() => {
      if (cell.isRevealed) {
        if (cell.isMine) {
          if (cell.isFlagged) return { backgroundColor: '#999', color: '#000' };
          return { backgroundColor: '#ff0000', color: '#000' };
        }
        return { backgroundColor: '#ddd', color: getNumberColor(cell.neighborMines) };
      }

      if (cell.isFlagged) return { backgroundColor: '#fff', color: '#ff0000' };

      if (isPressed) {
        return {
          backgroundColor: '#ddd',
          transform: 'scale(0.95)'
        };
      }

      return { backgroundColor: '#bbb' };
    })();

    const skinStyle: React.CSSProperties = backgroundUrl
      ? {
          backgroundImage: `url(${backgroundUrl})`,
          backgroundSize: '100% 100%',
          backgroundRepeat: 'no-repeat',
          border: 'none'
        }
      : {
          borderWidth: '1px',
          borderColor: '#999',
          borderStyle: 'solid'
        };

    // 高亮/悬停：尽量不遮挡贴图，用描边/阴影表现
    const highlightStyle: React.CSSProperties = isHighlighted
      ? {
          boxShadow: '0 0 0 2px #ff6b6b inset, 0 0 6px rgba(255,107,107,0.9)',
          zIndex: 10
        }
      : {};

    const hoverStyle: React.CSSProperties = isHovered && roomInfo?.invitePlayMode
      ? { boxShadow: '0 0 0 2px rgba(0, 123, 255, 0.8) inset' }
      : {};

    return {
      ...baseStyle,
      ...skinStyle,
      ...fallbackStyle,
      ...highlightStyle,
      ...hoverStyle
    };
  };

  const getCellOverlayUrl = (cell: Cell): string => {
    const gameState = roomInfo?.gameState;

    // 失败时：错误旗标
    if (cell.isFlagged && gameState === 'lost' && !cell.isMine) return CLASSIC_SKIN.overlay.wrongFlag;

    // 插旗
    if (cell.isFlagged) return CLASSIC_SKIN.overlay.flag;

    // 地雷
    if (cell.isRevealed && cell.isMine) {
      if (cell.isExploded) return CLASSIC_SKIN.overlay.mineExploded;
      return CLASSIC_SKIN.overlay.mine;
    }

    // 数字
    if (cell.isRevealed && !cell.isMine && cell.neighborMines > 0) {
      return CLASSIC_SKIN.overlay.numbers[cell.neighborMines] || '';
    }

    return '';
  };

  const getCellOverlayStyle = (overlayUrl: string): React.CSSProperties => {
    return {
      position: 'absolute',
      inset: 0,
      backgroundImage: `url(${overlayUrl})`,
      backgroundRepeat: 'no-repeat',
      backgroundPosition: 'center',
      backgroundSize: '100% 100%',
      pointerEvents: 'none',
      imageRendering: 'pixelated'
    };
  };

  // 获取数字颜色
  const getNumberColor = (num: number): string => {
    const colors = ['', '#0000ff', '#008000', '#ff0000', '#000080', '#800000', '#008080', '#000', '#808080'];
    return colors[num] || '#000';
  };


  // 键盘事件监听（D键触发弦操作，B键标记，C键打开）
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      console.log('[旁观端日志] === 键盘按下开始 ===');
      console.log('[旁观端日志] 键盘按下事件:');
      console.log('[旁观端日志]   - 按键:', e.key);
      console.log('[旁观端日志]   - hoverCell:', hoverCell);
      console.log('[旁观端日志]   - socket状态:', socket ? '已连接' : '未连接');
      console.log('[旁观端日志]   - roomInfo:', roomInfo);
      console.log('[旁观端日志]   - isSpacePressed:', isSpacePressed);
      
      if (!hoverCell || !socket) {
        console.log('[旁观端日志] ❌ 条件检查失败: hoverCell或socket不存在');
        console.log('[旁观端日志] === 键盘按下结束 ===');
        return;
      }

      if (roomInfo?.invitePlayMode) {
        console.log('[旁观端日志] ✅ 同玩模式: 处理键盘操作');
        
        // D键触发弦操作
        if ((e.key === 'd' || e.key === 'D') && !isSpacePressed) {
          console.log('[旁观端日志] D键按下: 设置空格键状态');
          e.preventDefault();
          setIsSpacePressed(true);
          // 显示按下效果
          console.log('[旁观端日志] 显示弦操作按下效果');
          updatePressedCells(hoverCell.row, hoverCell.col);
        }
        
        // B键标记/取消标记（相当于右键）
        if ((e.key === 'b' || e.key === 'B')) {
          console.log('[旁观端日志] B键按下: 标记操作');
          e.preventDefault();
          console.log('[旁观端日志] 发送 spectator-action (flag) 事件');
          socket.emit('spectator-action', { roomId, action: 'flag', row: hoverCell.row, col: hoverCell.col });
        }
        
        // C键打开方块（相当于左键）
        if ((e.key === 'c' || e.key === 'C')) {
          console.log('[旁观端日志] C键按下: 揭开操作');
          e.preventDefault();
          console.log('[旁观端日志] 发送 spectator-action (reveal) 事件');
          socket.emit('spectator-action', { roomId, action: 'reveal', row: hoverCell.row, col: hoverCell.col });
        }
      } else {
        console.log('[旁观端日志] ❌ 非同玩模式: 忽略键盘操作');
      }
      console.log('[旁观端日志] === 键盘按下结束 ===');
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      console.log('[旁观端日志] === 键盘释放开始 ===');
      console.log('[旁观端日志] 键盘释放事件:');
      console.log('[旁观端日志]   - 按键:', e.key);
      console.log('[旁观端日志]   - roomInfo:', roomInfo);
      console.log('[旁观端日志]   - isSpacePressed:', isSpacePressed);
      console.log('[旁观端日志]   - hoverCell:', hoverCell);
      
        if (roomInfo?.invitePlayMode && (e.key === 'd' || e.key === 'D') && isSpacePressed && hoverCell) {
        console.log('[旁观端日志] ✅ D键释放: 执行弦操作');
        e.preventDefault();
        setIsSpacePressed(false);
        // 执行弦操作
        console.log('[旁观端日志] 发送 spectator-action (chord) 事件');
        socket?.emit('spectator-action', { roomId, action: 'chord', row: hoverCell.row, col: hoverCell.col });
        // 清除按下效果
        console.log('[旁观端日志] 清除按下效果');
        setPressedCells(new Set());
      } else {
        console.log('[旁观端日志] ❌ 条件不满足: 不执行弦操作');
      }
      console.log('[旁观端日志] === 键盘释放结束 ===');
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [socket, roomId, roomInfo, hoverCell, isSpacePressed, updatePressedCells]);

  // 获取房间信息
  useEffect(() => {
    console.log('[旁观端日志] === 获取房间信息开始 ===');
    console.log('[旁观端日志] 检查条件: socket=', socket ? '存在' : '不存在', 'roomId=', roomId);
    
    // 只有在有 socket 和 roomId 时才执行
    if (socket && roomId) {
      console.log('[旁观端日志] ✅ 发送 get-room-info 事件:', roomId);
      socket.emit('get-room-info', { roomId });
      
      socket.on('room-info', (info) => {
        console.log('[旁观端日志] === 收到 room-info 事件 ===');
        console.log('[旁观端日志] 房间信息:', info);
        console.log('[旁观端日志] 同玩模式状态:', info.invitePlayMode ? '开启' : '关闭');
        setRoomInfo(info);
        console.log('[旁观端日志] === room-info 处理完成 ===');
      });
      
      socket.on('player-count-update', (data) => {
        console.log('[旁观端日志] 收到 player-count-update:', data);
        setRoomInfo(prev => prev ? {...prev, playerCount: data.playerCount, spectatorCount: data.spectatorCount} : null);
      });
      
      // 接收同玩模式更新事件
      socket.on('invite-play-mode-updated', (data) => {
        console.log('[旁观端日志] === 收到同玩模式更新 ===');
        console.log('[旁观端日志] 同玩模式状态:', data.invitePlayMode ? '开启' : '关闭');
        
        setRoomInfo(prev => prev ? {...prev, invitePlayMode: data.invitePlayMode} : null);
        
        console.log('[旁观端日志] 房间信息已更新');
        console.log('[旁观端日志] === 同玩模式更新处理完成 ===');
      });
    } else {
      console.log('[旁观端日志] ❌ 条件不满足，无法获取房间信息');
    }
    console.log('[旁观端日志] === 获取房间信息结束 ===');
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
        <Paper
          sx={{
            padding: 1,
            display: 'inline-block',
            backgroundColor: '#c0c0c0',
            borderTop: '2px solid #808080',
            borderLeft: '2px solid #808080',
            borderRight: '2px solid #fff',
            borderBottom: '2px solid #fff'
          }}
        >

          <Box>
            {board.map((row, rowIndex) => (
              <Box key={rowIndex} display="flex">
                {row.map((cell, colIndex) => (
                  <Box
                    key={`${rowIndex}-${colIndex}`}
                    onMouseDown={(e) => handleMouseDown(rowIndex, colIndex, e)}
                    onMouseUp={(e) => handleMouseUp(rowIndex, colIndex, e)}
                    onMouseEnter={() => handleMouseEnter(rowIndex, colIndex)}
                    onMouseLeave={handleMouseLeave}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      // 右键菜单阻止默认行为，但不需要额外处理
                    }}
                    style={getCellStyle(cell, rowIndex, colIndex)}
                  >
                    {(() => {
                      const overlayUrl = getCellOverlayUrl(cell);
                      const canUseOverlay = overlayUrl && hasSkinImage(overlayUrl);

                      if (canUseOverlay) {
                        return <Box style={getCellOverlayStyle(overlayUrl)} />;
                      }

                      // 无贴图：回退到文字/emoji
                      if (cell.isRevealed && cell.isMine) return '💣';
                      if (cell.isRevealed && !cell.isMine && cell.neighborMines > 0) return cell.neighborMines;
                      if (cell.isFlagged) return '🚩';
                      return null;
                    })()}
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
      
      {roomInfo?.invitePlayMode && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="body2" color="textSecondary">
            同玩模式快捷键: 
            <strong>左键</strong>揭开格子 | 
            <strong>右键</strong>标记旗帜 | 
            <strong>双键/空格/D键</strong>弦操作 | 
            <strong>C键</strong>打开 | 
            <strong>B键</strong>标记
          </Typography>
        </Box>
      )}
      {!roomInfo?.invitePlayMode && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="body2" color="textSecondary">
            提示: 点击未揭开的格子可以建议玩家点击该位置
          </Typography>
        </Box>
      )}
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
