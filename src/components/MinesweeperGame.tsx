// src/components/MinesweeperGame.tsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box,
  Button,
  Typography,
  Paper,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Tabs,
  Tab,
  IconButton,
  Tooltip
} from '@mui/material';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import FlagIcon from '@mui/icons-material/Flag';
import ShareIcon from '@mui/icons-material/Share';
import QrCodeIcon from '@mui/icons-material/QrCode';
import QRCode from 'qrcode';
import { io, Socket } from 'socket.io-client';
import { API_BASE_URL } from '../config';

type Difficulty = 'beginner' | 'intermediate' | 'expert' | 'brutal';

interface DifficultyConfig {
  rows: number;
  cols: number;
  mines: number;
  label: string;
}

const DIFFICULTIES: Record<Difficulty, DifficultyConfig> = {
  beginner: { rows: 9, cols: 9, mines: 10, label: '初级 (9×9, 10雷)' },
  intermediate: { rows: 16, cols: 16, mines: 40, label: '中级 (16×16, 40雷)' },
  expert: { rows: 16, cols: 30, mines: 99, label: '高级 (16×30, 99雷)' },
  brutal: { rows: 24, cols: 30, mines: 200, label: '残酷 (24×30, 200雷)' }
};

interface Cell {
  isMine: boolean;
  isRevealed: boolean;
  isFlagged: boolean;
  neighborMines: number;
  isExploded?: boolean; // 标记是否是引爆的地雷
}

interface HighlightedCell {
  row: number;
  col: number;
  timestamp: number;
}

const MinesweeperGame: React.FC = () => {
  const [difficulty, setDifficulty] = useState<Difficulty>('beginner');
  const [board, setBoard] = useState<Cell[][]>([]);
  const [gameStatus, setGameStatus] = useState<'playing' | 'won' | 'lost'>('playing');
  const [flagsLeft, setFlagsLeft] = useState(0);
  const [timer, setTimer] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [firstClick, setFirstClick] = useState(true);
  const [showResultDialog, setShowResultDialog] = useState(false);
  const [personalBest, setPersonalBest] = useState<number | null>(null);
  const [isMouseDown, setIsMouseDown] = useState({ left: false, right: false });
  const isMouseDownRef = useRef({ left: false, right: false }); // 用ref实时追踪鼠标状态
  const [pressedCells, setPressedCells] = useState<Set<string>>(new Set()); // 记录按下效果的格子
  const [hoverCell, setHoverCell] = useState<{ row: number; col: number } | null>(null); // 鼠标悬停位置
  const [isSpacePressed, setIsSpacePressed] = useState(false); // 空格键是否按下
  
  // WebSocket 相关状态
  const [socket, setSocket] = useState<Socket | null>(null);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [showQRDialog, setShowQRDialog] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [highlightedCells, setHighlightedCells] = useState<HighlightedCell[]>([]); // 需要闪烁的格子

  const config = DIFFICULTIES[difficulty];

  // 初始化游戏
  const initializeGame = useCallback(() => {
    const newBoard: Cell[][] = Array(config.rows)
      .fill(null)
      .map(() =>
        Array(config.cols)
          .fill(null)
          .map(() => ({
            isMine: false,
            isRevealed: false,
            isFlagged: false,
            neighborMines: 0
          }))
      );

    setBoard(newBoard);
    setGameStatus('playing');
    setFlagsLeft(config.mines);
    setTimer(0);
    setIsTimerRunning(false);
    setFirstClick(true);
    setShowResultDialog(false);
    
    // 清除高亮格子
    setHighlightedCells([]);
  }, [config]);

  // 初始化 WebSocket 连接 - 只在组件挂载时连接一次
  useEffect(() => {
    // 构建 WebSocket URL，处理各种环境配置
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
      
      if (!envApiUrl || envApiUrl.trim() === '') {
        return '/socket.io';
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
    };
    
    const apiUrl = getWebSocketUrl();
    const wsPath = getWebSocketPath();
    console.log('MinesweeperGame WebSocket 连接地址:', apiUrl);
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
    });

    newSocket.on('connect_error', (error) => {
      console.error('WebSocket 连接错误:', error);
    });

    newSocket.on('disconnect', (reason) => {
      console.log('WebSocket 断开连接:', reason);
    });

    newSocket.on('spectator-suggest', (data) => {
      // 添加闪烁效果
      const newHighlighted = [...highlightedCells, {
        row: data.row,
        col: data.col,
        timestamp: Date.now()
      }];
      
      // 限制闪烁格子数量，避免过多
      if (newHighlighted.length > 20) {
        newHighlighted.shift();
      }
      
      setHighlightedCells(newHighlighted);
    });

    setSocket(newSocket);

    // 组件卸载时清理
    return () => {
      newSocket.disconnect();
    };
  }, []); // 空依赖数组，只在挂载时执行

  // 生成固定的房间ID（基于难度和用户）
  const generateFixedRoomId = useCallback(() => {
    const userId = localStorage.getItem('userId') || 'anonymous';
    const today = new Date().toISOString().slice(0, 10); // 每天同一个房间
    const roomString = `${difficulty}-${userId}-${today}`;
    
    // 简单哈希函数
    let hash = 0;
    for (let i = 0; i < roomString.length; i++) {
      const char = roomString.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 转换为32位整数
    }
    
    return Math.abs(hash).toString(36).substr(0, 8).toUpperCase();
  }, [difficulty]);

  // 创建或加入游戏房间（固定房间ID）
  const createRoom = useCallback(() => {
    if (!socket) return;
    
    // 生成固定房间ID
    const fixedRoomId = generateFixedRoomId();
    
    // 检查是否已经在房间中
    if (roomId === fixedRoomId) {
      // 已经在房间中，直接显示二维码
      const roomUrl = `${window.location.origin}/spectate/${fixedRoomId}`;
      QRCode.toDataURL(roomUrl, { width: 256 })
        .then(setQrCodeUrl)
        .catch(err => console.error('生成二维码失败:', err));
      setShowQRDialog(true);
      return;
    }
    
    // 创建固定房间
    socket.emit('create-room', { 
      roomId: fixedRoomId, // 指定固定房间ID
      difficulty 
    });
    
    socket.on('room-created', (data) => {
      const roomId = data.roomId;
      setRoomId(roomId);
      
      // 保存房间ID到本地存储
      localStorage.setItem('currentRoomId', roomId);
      localStorage.setItem('currentRoomDate', new Date().toISOString().slice(0, 10));
      
      // 生成二维码
      const roomUrl = `${window.location.origin}/spectate/${roomId}`;
      QRCode.toDataURL(roomUrl, { width: 256 })
        .then(setQrCodeUrl)
        .catch(err => console.error('生成二维码失败:', err));
      
      setShowQRDialog(true);
    });
    
    // 监听房间已存在的情况
    socket.on('room-already-exists', (data) => {
      console.log('房间已存在，加入现有房间:', data.roomId);
      setRoomId(data.roomId);
      
      // 生成二维码
      const roomUrl = `${window.location.origin}/spectate/${data.roomId}`;
      QRCode.toDataURL(roomUrl, { width: 256 })
        .then(setQrCodeUrl)
        .catch(err => console.error('生成二维码失败:', err));
      
      setShowQRDialog(true);
    });
    
  }, [socket, difficulty, roomId, generateFixedRoomId]);

  // 组件加载时检查是否有保存的房间
  useEffect(() => {
    const savedRoomId = localStorage.getItem('currentRoomId');
    const savedDate = localStorage.getItem('currentRoomDate');
    const today = new Date().toISOString().slice(0, 10);
    
    if (savedRoomId && savedDate === today && socket) {
      // 如果是今天的房间，询问是否重新加入
      const shouldRejoin = window.confirm(`检测到您今天已有游戏房间 (${savedRoomId})，是否重新加入？`);
      if (shouldRejoin) {
        setRoomId(savedRoomId);
        const roomUrl = `${window.location.origin}/spectate/${savedRoomId}`;
        QRCode.toDataURL(roomUrl, { width: 256 })
          .then(setQrCodeUrl)
          .catch(err => console.error('生成二维码失败:', err));
        setShowQRDialog(true);
      }
    }
  }, [socket]);

  // 更新游戏状态到 WebSocket
  useEffect(() => {
    if (!socket || !roomId || board.length === 0) return;
    
    socket.emit('update-game', {
      roomId,
      board
    });
  }, [board, socket, roomId]);

  // 放置地雷（首次点击后）
  const placeMines = useCallback((firstRow: number, firstCol: number) => {
    const newBoard = [...board.map(row => [...row])];
    let minesPlaced = 0;

    while (minesPlaced < config.mines) {
      const row = Math.floor(Math.random() * config.rows);
      const col = Math.floor(Math.random() * config.cols);

      // 不在首次点击位置及其周围放置地雷
      const isFirstClickArea = 
        Math.abs(row - firstRow) <= 1 && Math.abs(col - firstCol) <= 1;

      if (!newBoard[row][col].isMine && !isFirstClickArea) {
        newBoard[row][col].isMine = true;
        minesPlaced++;
      }
    }

    // 计算每个格子周围的地雷数
    for (let row = 0; row < config.rows; row++) {
      for (let col = 0; col < config.cols; col++) {
        if (!newBoard[row][col].isMine) {
          let count = 0;
          for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
              const newRow = row + dr;
              const newCol = col + dc;
              if (
                newRow >= 0 &&
                newRow < config.rows &&
                newCol >= 0 &&
                newCol < config.cols &&
                newBoard[newRow][newCol].isMine
              ) {
                count++;
              }
            }
          }
          newBoard[row][col].neighborMines = count;
        }
      }
    }

    setBoard(newBoard);
    setIsTimerRunning(true);
  }, [board, config]);

  // 自动标雷功能：当某个已打开数字周围的未开块数等于剩余雷数时，自动将未标记的块标为雷
  const autoFlag = useCallback((currentBoard: Cell[][]): Cell[][] => {
    const newBoard = [...currentBoard.map(row => [...row])];
    let changed = true;
    let totalFlagsAdded = 0;

    // 循环直到没有新的标记
    while (changed) {
      changed = false;
      for (let row = 0; row < config.rows; row++) {
        for (let col = 0; col < config.cols; col++) {
          const cell = newBoard[row][col];
          // 只检查已揭开且有数字的格子
          if (!cell.isRevealed || cell.neighborMines === 0) continue;

          // 统计周围未开的块数和已标旗的块数
          let unrevealedCount = 0;
          let flaggedCount = 0;
          const unrevealedCells: [number, number][] = [];

          for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
              if (dr === 0 && dc === 0) continue;
              const newRow = row + dr;
              const newCol = col + dc;
              if (
                newRow >= 0 &&
                newRow < config.rows &&
                newCol >= 0 &&
                newCol < config.cols
              ) {
                const neighborCell = newBoard[newRow][newCol];
                if (!neighborCell.isRevealed) {
                  if (neighborCell.isFlagged) {
                    flaggedCount++;
                  } else {
                    unrevealedCount++;
                    unrevealedCells.push([newRow, newCol]);
                  }
                }
              }
            }
          }

          // 如果未开块数 + 已标旗数 = 该格子的数字，则所有未标记的块都是雷
          if (unrevealedCount > 0 && unrevealedCount + flaggedCount === cell.neighborMines) {
            for (const [r, c] of unrevealedCells) {
              if (!newBoard[r][c].isFlagged) {
                newBoard[r][c].isFlagged = true;
                totalFlagsAdded++;
                changed = true;
              }
            }
          }
        }
      }
    }

    // 更新剩余旗帜数
    if (totalFlagsAdded > 0) {
      setFlagsLeft(prev => prev - totalFlagsAdded);
    }

    return newBoard;
  }, [config]);

  // 揭开格子
  const revealCell = useCallback((row: number, col: number) => {
    if (gameStatus !== 'playing') return;

    const newBoard = [...board.map(row => [...row])];
    const cell = newBoard[row][col];

    if (cell.isRevealed || cell.isFlagged) return;

    // 首次点击
    if (firstClick) {
      setFirstClick(false);
      placeMines(row, col);
      return;
    }

    // 点到地雷
    if (cell.isMine) {
      newBoard[row][col].isRevealed = true;
      newBoard[row][col].isExploded = true; // 标记为引爆的地雷
      setBoard(newBoard);
      setGameStatus('lost');
      setIsTimerRunning(false);
      setShowResultDialog(true);
      saveGameRecord(false);  // 保存失败记录
      revealAllMines(newBoard);
      return;
    }

    // 揭开当前格子
    const toReveal: [number, number][] = [[row, col]];
    const visited = new Set<string>();

    while (toReveal.length > 0) {
      const [r, c] = toReveal.pop()!;
      const key = `${r},${c}`;

      if (visited.has(key)) continue;
      visited.add(key);

      const current = newBoard[r][c];
      if (current.isRevealed || current.isFlagged || current.isMine) continue;

      current.isRevealed = true;

      // 如果周围没有地雷，继续揭开周围的格子
      if (current.neighborMines === 0) {
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            const newRow = r + dr;
            const newCol = c + dc;
            if (
              newRow >= 0 &&
              newRow < config.rows &&
              newCol >= 0 &&
              newCol < config.cols
            ) {
              toReveal.push([newRow, newCol]);
            }
          }
        }
      }
    }

    // 应用自动标雷
    const boardWithAutoFlags = autoFlag(newBoard);
    setBoard(boardWithAutoFlags);
    checkWin(boardWithAutoFlags);
  }, [board, gameStatus, firstClick, config, placeMines, autoFlag]);

  // 切换旗帜
  const toggleFlag = useCallback((row: number, col: number, e: React.MouseEvent) => {
    e.preventDefault();
    if (gameStatus !== 'playing' || firstClick) return;

    const newBoard = [...board.map(row => [...row])];
    const cell = newBoard[row][col];

    if (cell.isRevealed) return;

    if (cell.isFlagged) {
      cell.isFlagged = false;
      setFlagsLeft(flagsLeft + 1);
    } else if (flagsLeft > 0) {
      cell.isFlagged = true;
      setFlagsLeft(flagsLeft - 1);
    }

    setBoard(newBoard);
  }, [board, gameStatus, firstClick, flagsLeft]);

  // 双键同时按下自动揭开功能（弦操作）
  const chordReveal = useCallback((row: number, col: number) => {
    if (gameStatus !== 'playing' || firstClick) return;

    const newBoard = [...board.map(row => [...row])];
    const cell = newBoard[row][col];

    // 只有已揭开且有数字的格子才能进行弦操作
    if (!cell.isRevealed || cell.neighborMines === 0) return;

    // 统计周围插旗数量
    let flagCount = 0;
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const newRow = row + dr;
        const newCol = col + dc;
        if (
          newRow >= 0 &&
          newRow < config.rows &&
          newCol >= 0 &&
          newCol < config.cols &&
          newBoard[newRow][newCol].isFlagged
        ) {
          flagCount++;
        }
      }
    }

    // 如果插旗数量等于地雷数量，自动揭开周围未插旗的格子
    if (flagCount === cell.neighborMines) {
      let hasClickedMine = false;
      const cellsToReveal: [number, number][] = [];

      // 首先检查是否会点到地雷
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr === 0 && dc === 0) continue;
          const newRow = row + dr;
          const newCol = col + dc;
          if (
            newRow >= 0 &&
            newRow < config.rows &&
            newCol >= 0 &&
            newCol < config.cols
          ) {
            const targetCell = newBoard[newRow][newCol];
            if (!targetCell.isRevealed && !targetCell.isFlagged) {
              if (targetCell.isMine) {
                hasClickedMine = true;
                targetCell.isRevealed = true;
                targetCell.isExploded = true; // 标记为引爆的地雷
              } else {
                cellsToReveal.push([newRow, newCol]);
              }
            }
          }
        }
      }

      // 如果点到地雷，游戏结束
      if (hasClickedMine) {
        setBoard(newBoard);
        setGameStatus('lost');
        setIsTimerRunning(false);
        setShowResultDialog(true);
        saveGameRecord(false);  // 保存失败记录
        revealAllMines(newBoard);
        return;
      }

      // 批量揭开格子
      const toReveal: [number, number][] = [...cellsToReveal];
      const visited = new Set<string>();

      while (toReveal.length > 0) {
        const [r, c] = toReveal.pop()!;
        const key = `${r},${c}`;

        if (visited.has(key)) continue;
        visited.add(key);

        const current = newBoard[r][c];
        if (current.isRevealed || current.isFlagged || current.isMine) continue;

        current.isRevealed = true;

        // 如果周围没有地雷，继续揭开周围的格子
        if (current.neighborMines === 0) {
          for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
              const newRow = r + dr;
              const newCol = c + dc;
              if (
                newRow >= 0 &&
                newRow < config.rows &&
                newCol >= 0 &&
                newCol < config.cols
              ) {
                toReveal.push([newRow, newCol]);
              }
            }
          }
        }
      }

      // 应用自动标雷
      const boardWithAutoFlags = autoFlag(newBoard);
      setBoard(boardWithAutoFlags);
      checkWin(boardWithAutoFlags);
    }
  }, [board, gameStatus, firstClick, config, autoFlag]);

  // 更新按下效果
  const updatePressedCells = useCallback((row: number, col: number) => {
    const newBoard = board;
    if (!newBoard[row] || !newBoard[row][col]) return;
    
    const cell = newBoard[row][col];
    
    // 只有已揭开且有数字的格子才显示按下效果
    if (!cell.isRevealed || cell.neighborMines === 0) {
      setPressedCells(new Set());
      return;
    }

    const pressed = new Set<string>();
    // 添加周围未揭开且未插旗的格子
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        const newRow = row + dr;
        const newCol = col + dc;
        if (
          newRow >= 0 &&
          newRow < config.rows &&
          newCol >= 0 &&
          newCol < config.cols
        ) {
          const targetCell = newBoard[newRow][newCol];
          if (!targetCell.isRevealed && !targetCell.isFlagged) {
            pressed.add(`${newRow},${newCol}`);
          }
        }
      }
    }
    setPressedCells(pressed);
  }, [board, config]);

  // 处理鼠标按下
  const handleMouseDown = useCallback((row: number, col: number, e: React.MouseEvent) => {
    if (e.button === 0) {
      // 左键
      isMouseDownRef.current.left = true;
      setIsMouseDown(prev => {
        const newState = { ...prev, left: true };
        return newState;
      });
      // 如果右键也已经按下，显示按下效果
      if (isMouseDownRef.current.right) {
        updatePressedCells(row, col);
      }
    } else if (e.button === 2) {
      // 右键
      isMouseDownRef.current.right = true;
      setIsMouseDown(prev => {
        const newState = { ...prev, right: true };
        return newState;
      });
      // 如果左键也已经按下，显示按下效果
      if (isMouseDownRef.current.left) {
        updatePressedCells(row, col);
      }
    }
  }, [updatePressedCells]);

  // 处理鼠标释放
  const handleMouseUp = useCallback((row: number, col: number, e: React.MouseEvent) => {
    const wasLeftDown = isMouseDown.left;
    const wasRightDown = isMouseDown.right;

    if (e.button === 0) {
      // 左键释放
      setIsMouseDown(prev => ({ ...prev, left: false }));
      
      // 如果右键也按下，执行弦操作
      if (wasRightDown) {
        chordReveal(row, col);
      } else {
        // 普通左键点击
        revealCell(row, col);
      }
    } else if (e.button === 2) {
      // 右键释放
      setIsMouseDown(prev => ({ ...prev, right: false }));
      
      // 如果左键也按下，执行弦操作
      if (wasLeftDown) {
        chordReveal(row, col);
      }
    }
    
    // 清除按下效果
    setPressedCells(new Set());
  }, [isMouseDown, chordReveal, revealCell]);

  // 全局鼠标释放监听（防止鼠标离开格子后释放）
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      isMouseDownRef.current = { left: false, right: false };
      setIsMouseDown({ left: false, right: false });
      setPressedCells(new Set()); // 清除按下效果
    };

    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => {
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, []);

  // 键盘事件监听（空格键触发弦操作，B键标记，C键打开）
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!hoverCell) return;

      // 空格键触发弦操作
      if (e.code === 'Space' && gameStatus === 'playing' && !firstClick && !isSpacePressed) {
        e.preventDefault(); // 防止页面滚动
        setIsSpacePressed(true);
        // 显示按下效果
        updatePressedCells(hoverCell.row, hoverCell.col);
      }
      
      // B键标记/取消标记（相当于右键）
      if ((e.key === 'b' || e.key === 'B') && gameStatus === 'playing' && !firstClick) {
        e.preventDefault();
        const mockEvent = { preventDefault: () => {} } as React.MouseEvent;
        toggleFlag(hoverCell.row, hoverCell.col, mockEvent);
      }
      
      // C键打开方块（相当于左键）
      if ((e.key === 'c' || e.key === 'C') && gameStatus === 'playing') {
        e.preventDefault();
        revealCell(hoverCell.row, hoverCell.col);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space' && isSpacePressed && hoverCell) {
        e.preventDefault();
        setIsSpacePressed(false);
        // 执行弦操作
        chordReveal(hoverCell.row, hoverCell.col);
        // 清除按下效果
        setPressedCells(new Set());
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [gameStatus, hoverCell, firstClick, chordReveal, isSpacePressed, updatePressedCells, toggleFlag, revealCell]);

  // 揭开所有地雷（游戏结束时）
  const revealAllMines = (currentBoard: Cell[][]) => {
    const newBoard = [...currentBoard.map(row => [...row])];
    for (let row = 0; row < config.rows; row++) {
      for (let col = 0; col < config.cols; col++) {
        if (newBoard[row][col].isMine) {
          newBoard[row][col].isRevealed = true;
        }
      }
    }
    setBoard(newBoard);
  };

  // 检查胜利
  const checkWin = (currentBoard: Cell[][]) => {
    let revealedCount = 0;
    for (let row = 0; row < config.rows; row++) {
      for (let col = 0; col < config.cols; col++) {
        if (currentBoard[row][col].isRevealed) {
          revealedCount++;
        }
      }
    }

    const totalCells = config.rows * config.cols;
    if (revealedCount === totalCells - config.mines) {
      // 自动标记所有未标记的地雷
      const newBoard = [...currentBoard.map(row => [...row])];
      for (let row = 0; row < config.rows; row++) {
        for (let col = 0; col < config.cols; col++) {
          if (newBoard[row][col].isMine && !newBoard[row][col].isFlagged) {
            newBoard[row][col].isFlagged = true;
          }
        }
      }
      setBoard(newBoard);
      setFlagsLeft(0);
      setGameStatus('won');
      setIsTimerRunning(false);
      setShowResultDialog(true);
      saveGameRecord(true);
    }
  };

  // 保存游戏记录
  const saveGameRecord = async (won: boolean) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.log('未登录，不保存记录');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/minesweeper/record`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          difficulty,
          timeSeconds: timer,
          won
        })
      });

      if (response.ok) {
        console.log('游戏记录保存成功');
        if (won) {
          fetchPersonalBest();
        }
      }
    } catch (error) {
      console.error('保存游戏记录失败:', error);
    }
  };

  // 获取个人最佳成绩
  const fetchPersonalBest = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setPersonalBest(null);
        return;
      }

      const response = await fetch(
        `${API_BASE_URL}/api/minesweeper/personal-best/${difficulty}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.hasBest) {
          setPersonalBest(data.bestTime);
        } else {
          setPersonalBest(null);
        }
      } else {
        setPersonalBest(null);
      }
    } catch (error) {
      console.error('获取个人最佳成绩失败:', error);
      setPersonalBest(null);
    }
  }, [difficulty]);

  // 计时器
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isTimerRunning) {
      interval = setInterval(() => {
        setTimer(t => t + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning]);

  // 初始化和难度改变时重置游戏
  useEffect(() => {
    initializeGame();
    fetchPersonalBest();
  }, [difficulty, initializeGame, fetchPersonalBest]);

  // 获取格子样式
  const getCellStyle = (cell: Cell, row: number, col: number): React.CSSProperties => {
    const cellKey = `${row},${col}`;
    const isPressed = pressedCells.has(cellKey); // 是否处于按下状态
    
    // 检查是否需要闪烁
    const isHighlighted = highlightedCells.some(hc => hc.row === row && hc.col === col);
    
    // 根据屏幕大小和难度动态调整格子大小
    const getCellSize = () => {
      if (difficulty === 'brutal') {
        // 残酷模式：24×30，需要更小的格子以适应屏幕
        const maxWidth = window.innerWidth - 100;
        const maxHeight = window.innerHeight - 400;
        const cellWidth = Math.min(Math.floor(maxWidth / 30), 28);
        const cellHeight = Math.min(Math.floor(maxHeight / 24), 28);
        return Math.min(cellWidth, cellHeight);
      } else if (difficulty === 'expert') {
        // 高级模式：16×30，需要更小的格子以适应屏幕
        const maxWidth = window.innerWidth - 100;
        const maxHeight = window.innerHeight - 400;
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
      borderStyle: 'solid', // 默认实线边框
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: gameStatus === 'playing' ? 'pointer' : 'default',
      fontSize: difficulty === 'brutal' ? '10px' : difficulty === 'expert' ? '12px' : '14px',
      fontWeight: 'bold',
      userSelect: 'none',
      transition: 'all 0.05s ease' // 添加平滑过渡
    };

    if (cell.isRevealed) {
      if (cell.isMine) {
        // 未标记的地雷：红色背景，已标记的地雷：灰色背景
        if (cell.isFlagged) {
          // 已标记的地雷：灰色背景
          return { ...baseStyle, backgroundColor: '#999', color: '#000' };
        } else {
          // 未标记的地雷（包括引爆的）：红色背景
          return { ...baseStyle, backgroundColor: '#ff0000', color: '#000' };
        }
      }
      return { ...baseStyle, backgroundColor: '#ddd', color: getNumberColor(cell.neighborMines) };
    }

    if (cell.isFlagged) {
      return { ...baseStyle, backgroundColor: '#fff', color: '#ff0000' };
    }

    // 闪烁效果
    if (isHighlighted) {
      return { 
        ...baseStyle, 
        backgroundColor: '#ff6b6b', // 红色高亮
        animation: 'pulse 1s infinite',
        zIndex: 10
      };
    }

    // 按下效果：显示为浅灰色，模拟经典扫雷的按下效果
    if (isPressed) {
      return { 
        ...baseStyle, 
        backgroundColor: '#ddd',
        borderStyle: 'inset', // 凹陷效果
        transform: 'scale(0.95)' // 轻微缩小
      };
    }

    return { ...baseStyle, backgroundColor: '#bbb' };
  };

  // 获取数字颜色
  const getNumberColor = (num: number): string => {
    const colors = ['', '#0000ff', '#008000', '#ff0000', '#000080', '#800000', '#008080', '#000', '#808080'];
    return colors[num] || '#000';
  };

  // 格式化时间
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Box sx={{ padding: 2 }}>
      {/* 难度选择标签 */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
        <Tabs
          value={difficulty}
          onChange={(_, newValue) => setDifficulty(newValue as Difficulty)}
          centered
          textColor="primary"
          indicatorColor="primary"
        >
          <Tab value="beginner" label={DIFFICULTIES.beginner.label} />
          <Tab value="intermediate" label={DIFFICULTIES.intermediate.label} />
          <Tab value="expert" label={DIFFICULTIES.expert.label} />
          <Tab value="brutal" label={DIFFICULTIES.brutal.label} />
        </Tabs>
      </Box>
          
      {/* 旁观二维码对话框 */}
      <Dialog open={showQRDialog} onClose={() => setShowQRDialog(false)}>
        <DialogTitle>分享旁观链接</DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" alignItems="center" p={2}>
            <Typography variant="body1" gutterBottom>
              房间ID: {roomId}
            </Typography>
            <img 
              src={qrCodeUrl} 
              alt="扫雷旁观二维码" 
              style={{ width: '256px', height: '256px', margin: '16px 0' }}
            />
            <Typography variant="body2" color="textSecondary">
              扫描二维码开始旁观
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowQRDialog(false)}>关闭</Button>
        </DialogActions>
      </Dialog>

      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        {/* 控制面板 */}
        <Paper sx={{ padding: 2, marginBottom: 2, minWidth: 400 }}>
          <Grid container spacing={2} alignItems="center" justifyContent="center">
            <Grid item xs={4}>
              <Box display="flex" alignItems="center" gap={0.5} justifyContent="center">
                <FlagIcon fontSize="small" />
                <Typography>{flagsLeft}</Typography>
              </Box>
            </Grid>

            <Grid item xs={4}>
              <Typography variant="h6" textAlign="center">{formatTime(timer)}</Typography>
            </Grid>

            <Grid item xs={4}>
              <Button
                variant="contained"
                startIcon={<RestartAltIcon />}
                onClick={initializeGame}
                fullWidth
                size="small"
              >
                重新开始
              </Button>
            </Grid>
            
            <Grid item xs={4}>
              <Tooltip title="分享旁观链接">
                <Button
                  variant="outlined"
                  startIcon={<ShareIcon />}
                  onClick={createRoom}
                  fullWidth
                  size="small"
                >
                  分享
                </Button>
              </Tooltip>
            </Grid>

            {personalBest && (
              <Grid item xs={12}>
                <Box display="flex" justifyContent="center">
                  <Chip
                    label={`个人最佳: ${formatTime(personalBest)}`}
                    color="success"
                    size="small"
                  />
                </Box>
              </Grid>
            )}
          </Grid>
        </Paper>

        {/* 游戏状态提示 */}
        {gameStatus !== 'playing' && (
          <Paper sx={{ padding: 2, marginBottom: 2, backgroundColor: gameStatus === 'won' ? '#4caf50' : '#f44336' }}>
            <Typography variant="h6" color="white">
              {gameStatus === 'won' ? `🎉 胜利！用时 ${formatTime(timer)}` : '💥 游戏结束！'}
            </Typography>
          </Paper>
        )}

        {/* 游戏棋盘 */}
        <Paper sx={{ padding: 1, display: 'inline-block' }}>
          <Box>
            {board.map((row, rowIndex) => (
              <Box key={rowIndex} display="flex">
                {row.map((cell, colIndex) => (
                  <Box
                    key={`${rowIndex}-${colIndex}`}
                    onMouseDown={(e) => {
                      handleMouseDown(rowIndex, colIndex, e);
                    }}
                    onMouseUp={(e) => handleMouseUp(rowIndex, colIndex, e)}
                    onMouseEnter={() => {
                      setHoverCell({ row: rowIndex, col: colIndex });
                      if (isMouseDownRef.current.left && isMouseDownRef.current.right) {
                        updatePressedCells(rowIndex, colIndex);
                      }
                    }}
                    onMouseLeave={() => {
                      if (hoverCell?.row === rowIndex && hoverCell?.col === colIndex) {
                        setPressedCells(new Set());
                      }
                    }}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      toggleFlag(rowIndex, colIndex, e);
                    }}
                    style={getCellStyle(cell, rowIndex, colIndex)}
                  >
                    {/* 游戏进行中：显示旗帜 */}
                    {cell.isFlagged && !cell.isRevealed && gameStatus === 'playing' && '🚩'}
                    
                    {/* 游戏胜利时：显示旗帜 */}
                    {cell.isFlagged && gameStatus === 'won' && '🚩'}
                    
                    {/* 游戏失败时：显示错误标记（不是雷却标了旗）*/}
                    {cell.isFlagged && !cell.isMine && gameStatus === 'lost' && '❌'}
                    
                    {/* 游戏失败时：显示正确标记（是雷且标了旗）*/}
                    {cell.isFlagged && cell.isMine && gameStatus === 'lost' && '🚩'}
                    
                    {/* 显示已揭开的地雷 */}
                    {cell.isRevealed && cell.isMine && '💣'}
                    
                    {/* 显示已揭开格子的数字 */}
                    {cell.isRevealed && !cell.isMine && cell.neighborMines > 0 && cell.neighborMines}
                  </Box>
                ))}
              </Box>
            ))}
          </Box>
        </Paper>

        {/* 结果对话框 */}
        <Dialog open={showResultDialog} onClose={() => setShowResultDialog(false)}>
          <DialogTitle>
            {gameStatus === 'won' ? '🎉 恭喜获胜！' : '💥 游戏结束'}
          </DialogTitle>
          <DialogContent>
            <Typography>
              难度: {DIFFICULTIES[difficulty].label}
            </Typography>
            <Typography>
              用时: {formatTime(timer)}
            </Typography>
            {gameStatus === 'won' && personalBest && timer < personalBest && (
              <Typography color="success.main" fontWeight="bold" mt={1}>
                🏆 新纪录！
              </Typography>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowResultDialog(false)}>关闭</Button>
            <Button onClick={initializeGame} variant="contained">再来一局</Button>
          </DialogActions>
        </Dialog>

        {/* 游戏说明 - 3列布局节省高度 */}
        <Paper sx={{ padding: 2, marginTop: 2, maxWidth: '95%' }}>
          <Typography variant="h6" gutterBottom textAlign="center">游戏说明</Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <Typography variant="body2" paragraph>
                • 左键点击揭开格子，右键点击插旗
              </Typography>
              <Typography variant="body2" paragraph>
                • 数字表示周围8个格子中地雷的数量
              </Typography>
              <Typography variant="body2" paragraph>
                • 键盘快捷键：B键标记/取消标记，C键打开方块
              </Typography>
            </Grid>
            <Grid item xs={12} md={4}>
              <Typography variant="body2" paragraph>
                • 在已揭开的数字格上同时按下左右键，如果旗帜数量等于数字，自动揭开周围格子
              </Typography>
              <Typography variant="body2" paragraph>
                • 按下空格键相当于在鼠标位置同时按下双键，方便左右手配合操作
              </Typography>
            </Grid>
            <Grid item xs={12} md={4}>
              <Typography variant="body2" paragraph>
                • 揭开所有非地雷格子即可获胜，胜利时会自动标记所有地雷
              </Typography>
              <Typography variant="body2" paragraph>
                • 自动标雷：当某数字周围未开块数=剩余雷数时，自动将未标记的块标为雷
              </Typography>
              <Typography variant="body2">
                • 登录后可保存游戏记录并查看排行榜
              </Typography>
            </Grid>
          </Grid>
        </Paper>
      </Box>
    </Box>
  );
};

export default MinesweeperGame;
