// src/components/MinesweeperGame.tsx
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
  Tooltip,
  TextField,
  FormControlLabel,
  Checkbox
} from '@mui/material';
import RestartAltIcon from '@mui/icons-material/RestartAlt';

import ShareIcon from '@mui/icons-material/Share';
import QRCode from 'qrcode';
import { io, Socket } from 'socket.io-client';
import { API_BASE_URL } from '../config';

type Difficulty = 'beginner' | 'intermediate' | 'expert' | 'brutal' | 'fullscreen' | 'custom';

interface DifficultyConfig {
  rows: number;
  cols: number;
  mines: number;
  label: string;
}

interface CustomConfig {
  rows: number;
  cols: number;
  mines: number;
}

// 满屏模式棋盘计算函数（基于扫雷网页的算法）
const calculateFullscreenBoard = (): DifficultyConfig => {
  // 获取浏览器窗口尺寸（减去的边距与扫雷网页一致）
  const windowWidth = document.body.clientWidth;
  const windowHeight = document.body.clientHeight;
  
  // 计算格子数量（每个格子25px，减去固定边距）
  const cols = Math.floor((windowWidth - 18) / 25);  // 宽度格子数 = (窗口宽 - 18) / 25
  const rows = Math.floor((windowHeight - 54) / 25); // 高度格子数 = (窗口高 - 54) / 25
  
  // 限制最小和最大尺寸，确保游戏可玩性
  const finalCols = Math.max(10, Math.min(cols, 50));
  const finalRows = Math.max(8, Math.min(rows, 40));
  
  const totalCells = finalCols * finalRows;
  
  // 雷数计算算法（与扫雷网页完全一致）
  let mines: number;
  if (totalCells >= 480) {
    // 大棋盘：雷数 = 总格子数 × 0.20625（约20.625%）
    mines = Math.floor(totalCells * 0.20625);
  } else {
    // 小棋盘：雷数 = 总格子数²/5760 + 总格子数/8
    mines = Math.floor((totalCells * totalCells) / 5760 + totalCells / 8);
  }
  
  // 确保雷数合理（最少10个，最多不超过总格子的35%）
  const minMines = 10;
  const maxMines = Math.floor(totalCells * 0.35);
  const finalMines = Math.max(minMines, Math.min(mines, maxMines));
  
  return {
    rows: finalRows,
    cols: finalCols,
    mines: finalMines,
    label: `满屏 (${finalRows}×${finalCols}, ${finalMines}雷)`
  };
};

// 从localStorage获取自定义配置（仿照扫雷网页的实现）
const getCustomConfigFromStorage = (): CustomConfig => {
  const stored = localStorage.getItem('minesweeper_custom_config');
  if (stored) {
    try {
      const [rowsStr, colsStr, minesStr] = stored.split(';');
      const rows = parseInt(rowsStr) || 15;
      const cols = parseInt(colsStr) || 15;
      const mines = parseInt(minesStr) || 20;
      
      // 验证配置的有效性
      return {
        rows: Math.max(1, Math.min(rows, 50)),
        cols: Math.max(1, Math.min(cols, 50)),
        mines: Math.max(1, Math.min(mines, rows * cols))
      };
    } catch (error) {
      console.error('解析自定义配置失败:', error);
    }
  }
  // 默认配置
  return { rows: 15, cols: 15, mines: 20 };
};

// 保存自定义配置到localStorage
const saveCustomConfigToStorage = (config: CustomConfig) => {
  const configString = `${config.rows};${config.cols};${config.mines}`;
  localStorage.setItem('minesweeper_custom_config', configString);
};

const DIFFICULTIES: Record<Exclude<Difficulty, 'fullscreen'>, DifficultyConfig> = {
  beginner: { rows: 9, cols: 9, mines: 10, label: '初级 (9×9, 10雷)' },
  intermediate: { rows: 16, cols: 16, mines: 40, label: '中级 (16×16, 40雷)' },
  expert: { rows: 16, cols: 30, mines: 99, label: '高级 (16×30, 99雷)' },
  brutal: { rows: 24, cols: 30, mines: 200, label: '残酷 (24×30, 200雷)' },
  custom: { rows: 15, cols: 15, mines: 20, label: '自定义 (15×15, 20雷)' } // 默认值，实际使用时会动态计算
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

// 经典扫雷“图片皮肤”配置：素材放到 public/minesweeper-skin/ 下即可生效
// 当前这些文件名与 minesweeper.cn 的 `gfs1.js` 一致（gif）。
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
  },
  panel: {
    digits: [
      `${CLASSIC_SKIN_BASE}/digit_0.gif`,
      `${CLASSIC_SKIN_BASE}/digit_1.gif`,
      `${CLASSIC_SKIN_BASE}/digit_2.gif`,
      `${CLASSIC_SKIN_BASE}/digit_3.gif`,
      `${CLASSIC_SKIN_BASE}/digit_4.gif`,
      `${CLASSIC_SKIN_BASE}/digit_5.gif`,
      `${CLASSIC_SKIN_BASE}/digit_6.gif`,
      `${CLASSIC_SKIN_BASE}/digit_7.gif`,
      `${CLASSIC_SKIN_BASE}/digit_8.gif`,
      `${CLASSIC_SKIN_BASE}/digit_9.gif`
    ],
    face: {
      normal: `${CLASSIC_SKIN_BASE}/face_normal.gif`,
      win: `${CLASSIC_SKIN_BASE}/face_win.gif`,
      lost: `${CLASSIC_SKIN_BASE}/face_lost.gif`
    }
  }
} as const;



const MinesweeperGame: React.FC = () => {
  const [difficulty, setDifficulty] = useState<Difficulty>('beginner');
  const [board, setBoard] = useState<Cell[][]>([]);
  const [gameStatus, setGameStatus] = useState<'waiting' | 'playing' | 'won' | 'lost'>('playing');
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
  const roomIdRef = useRef<string | null>(null); // 使用ref来避免闭包问题
  const boardRef = useRef<Cell[][]>([]);
  const gameStatusRef = useRef<'waiting' | 'playing' | 'won' | 'lost'>('playing');
  const firstClickRef = useRef(true);
  // 让 WebSocket 事件处理函数始终调用“最新一帧”的操作函数，避免闭包拿到旧棋盘/旧状态
  const chordRevealRef = useRef<((row: number, col: number) => void) | null>(null);
  const revealCellRef = useRef<((row: number, col: number) => void) | null>(null);
  const toggleFlagRef = useRef<((row: number, col: number) => void) | null>(null);
  const [showQRDialog, setShowQRDialog] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [highlightedCells, setHighlightedCells] = useState<HighlightedCell[]>([]); // 需要闪烁的格子
  const [invitePlayMode, setInvitePlayMode] = useState(false); // 邀请同玩模式
  
  // 自定义模式相关状态
  const [showCustomDialog, setShowCustomDialog] = useState(false);
  const [customConfig, setCustomConfig] = useState<CustomConfig>(getCustomConfigFromStorage());
  const [customInputError, setCustomInputError] = useState<string>('');

  // 经典扫雷皮肤图片预加载（有素材时自动启用图片版渲染）
  const skinUrls = useMemo(() => {
    const urls: string[] = [];
    urls.push(CLASSIC_SKIN.cell.covered, CLASSIC_SKIN.cell.coveredPressed, CLASSIC_SKIN.cell.revealed);
    urls.push(CLASSIC_SKIN.overlay.flag, CLASSIC_SKIN.overlay.wrongFlag, CLASSIC_SKIN.overlay.mine, CLASSIC_SKIN.overlay.mineExploded);
    urls.push(...CLASSIC_SKIN.overlay.numbers.slice(1));
    urls.push(...CLASSIC_SKIN.panel.digits);
    urls.push(CLASSIC_SKIN.panel.face.normal, CLASSIC_SKIN.panel.face.win, CLASSIC_SKIN.panel.face.lost);
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

// 动态获取配置，满屏模式和自定义模式需要特殊处理
const getCurrentConfig = (): DifficultyConfig => {
  if (difficulty === 'fullscreen') {
    return calculateFullscreenBoard();
  } else if (difficulty === 'custom') {
    return {
      rows: customConfig.rows,
      cols: customConfig.cols,
      mines: customConfig.mines,
      label: `自定义 (${customConfig.rows}×${customConfig.cols}, ${customConfig.mines}雷)`
    };
  } else {
    return DIFFICULTIES[difficulty];
  }
};

const config = getCurrentConfig();

// 组件加载时初始化游戏
useEffect(() => {
  const currentConfig = getCurrentConfig();
  const newBoard: Cell[][] = Array(currentConfig.rows)
    .fill(null)
    .map(() =>
      Array(currentConfig.cols)
        .fill(null)
        .map(() => ({
          isMine: false,
          isRevealed: false,
          isFlagged: false,
          neighborMines: 0
        }))
    );

  setBoard(newBoard);
  setFlagsLeft(currentConfig.mines);
  setTimer(0);
  setIsTimerRunning(false);
  setFirstClick(true);
  setShowResultDialog(false);
  setGameStatus('playing');
}, []); // 只在组件挂载时执行一次

// 同步状态到ref，避免闭包问题
useEffect(() => {
  boardRef.current = board;
  gameStatusRef.current = gameStatus;
  firstClickRef.current = firstClick;
}, [board, gameStatus, firstClick]);

// 构建 WebSocket URL，处理各种环境配置
const getWebSocketUrl = () => {
  if (process.env.NODE_ENV === 'development') {
    return 'http://localhost:5001';
  } else {
    return 'https://d1kt.cn';
  }
};

const getWebSocketPath = () => {
  if (process.env.NODE_ENV === 'development') {
    return '/socket.io';
  } else {
    return '/api/api/socket.io'; // 生产环境强制双 /api
  }
};

  // 建立 WebSocket 连接（按需连接）
  const connectWebSocket = useCallback(() => {
    return new Promise<Socket>((resolve, reject) => {
      // 清理现有连接
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }

      const apiUrl = getWebSocketUrl();
      const wsPath = getWebSocketPath();
      console.log('[Socket.IO] MinesweeperGame WebSocket 连接地址:', apiUrl);
      console.log('[Socket.IO] WebSocket 路径:', wsPath);
      const fullUrl = apiUrl + wsPath;
      console.log('[Socket.IO] 完整连接 URL:', fullUrl);
      
      const newSocket = io(apiUrl, {
        path: wsPath,
        transports: ['websocket'],
        reconnection: true,
        upgrade: false,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000
      });

      newSocket.on('error', (error) => {
        console.error('[Socket.IO] error 事件:', error);
      });

      newSocket.on('connect_error', (error) => {
        console.error('[Socket.IO] connect_error 事件:', error);
        console.error('[Socket.IO] 连接地址:', fullUrl);
        if (error && (error as any).description) {
          console.error('[Socket.IO] 错误描述:', (error as any).description);
        }
        if (error.message) {
          console.error('[Socket.IO] 错误消息:', error.message);
        }
        if (error && (error as any).type) {
          console.error('[Socket.IO] 错误类型:', (error as any).type);
        }
        reject(error);
      });

      newSocket.on('connect_timeout', (timeout) => {
        console.error('[Socket.IO] 连接超时:', timeout);
      });

      newSocket.on('connect', () => {
        console.log('[Socket.IO] 连接成功');
        console.log('[Socket.IO] 连接地址:', fullUrl);
        setSocket(newSocket);
        resolve(newSocket);
      });

      newSocket.on('disconnect', (reason) => {
        console.log('[Socket.IO] 断开连接:', reason);
      });

      newSocket.on('clear-all-highlights', () => {
        // 清除所有高亮格子
        setHighlightedCells([]);
      });

      newSocket.on('game-state', (data) => {
        // 从服务器接收高亮格子信息并同步显示
        if (data.highlightedCells && Array.isArray(data.highlightedCells)) {
          const newHighlightedCells = data.highlightedCells.map(cellKey => {
            const [row, col] = cellKey.split(',').map(Number);
            return { row, col, timestamp: Date.now() };
          });
          setHighlightedCells(newHighlightedCells);
        }
      });

      newSocket.on('spectator-suggest', (data) => {
        // 添加闪烁效果 - 使用函数式更新避免闭包问题
        setHighlightedCells(prev => {
          const newHighlighted = [...prev, {
            row: data.row,
            col: data.col,
            timestamp: Date.now()
          }];
          
          // 限制闪烁格子数量，避免过多
          if (newHighlighted.length > 20) {
            newHighlighted.shift();
          }
          
          return newHighlighted;
        });
      });

      // 房间创建成功事件
      newSocket.on('room-created', (data) => {
        const roomId = data.roomId;
        console.log('[玩家端日志] ✅ 房间创建成功:', roomId);
        setRoomId(roomId);
        roomIdRef.current = roomId; // 同时更新ref
        
        // 保存房间ID到本地存储
        localStorage.setItem('currentRoomId', roomId);
        localStorage.setItem('currentRoomDate', new Date().toISOString().slice(0, 10));
        
        // 生成二维码
        const roomUrl = `${window.location.origin}/spectate/${roomId}`;
        QRCode.toDataURL(roomUrl, { width: 256 })
          .then(setQrCodeUrl)
          .catch(err => console.error('生成二维码失败:', err));
        
        setShowQRDialog(true);
        
        // 确保游戏状态为playing
        if (gameStatus === 'waiting') {
          setGameStatus('playing');
          console.log('[玩家端日志] ✅ 游戏开始，房间已准备就绪');
        }
      });

      // 房间已存在事件
      newSocket.on('room-already-exists', (data) => {
        console.log('[玩家端日志] 房间已存在，加入现有房间:', data.roomId);
        setRoomId(data.roomId);
        roomIdRef.current = data.roomId; // 同时更新ref
        
        // 生成二维码
        const roomUrl = `${window.location.origin}/spectate/${data.roomId}`;
        QRCode.toDataURL(roomUrl, { width: 256 })
          .then(setQrCodeUrl)
          .catch(err => console.error('生成二维码失败:', err));
        
        setShowQRDialog(true);
      });

      // 处理旁观者操作（同玩模式）
      newSocket.on('spectator-action', (data) => {
        console.log('[玩家端日志] === 旁观者操作开始 ===');
        console.log('[玩家端日志] 收到 spectator-action 事件:');
        console.log('[玩家端日志]   - 动作类型:', data.action);
        console.log('[玩家端日志]   - 格子坐标:', `(${data.row}, ${data.col})`);
        console.log('[玩家端日志]   - 游戏状态:', gameStatusRef.current);
        console.log('[玩家端日志]   - 当前房间ID:', roomIdRef.current);
        console.log('[玩家端日志]   - ref房间ID:', roomIdRef.current);
        console.log('[玩家端日志]   - firstClick:', firstClickRef.current);
        console.log('[玩家端日志]   - board 尺寸:', boardRef.current.length, 'x', boardRef.current[0]?.length);
        console.log('[玩家端日志]   - 当前socket状态:', newSocket.connected ? '已连接' : '未连接');
        
        if (gameStatusRef.current !== 'playing') {
          console.log('[玩家端日志] ❌ 游戏状态不是playing，操作失败');
          console.log('[玩家端日志]   - 允许的操作状态: playing');
          console.log('[玩家端日志]   - 当前状态:', gameStatusRef.current);
          console.log('[玩家端日志] === 旁观者操作结束 ===');
          return;
        }
        
        // 检查房间ID是否有效（使用ref避免闭包问题）
        const currentRoomId = roomIdRef.current;
        if (!currentRoomId) {
          console.log('[玩家端日志] ❌ 房间ID为null，操作失败');
          console.log('[玩家端日志]   - 可能的原因: 房间未创建或创建失败');
          console.log('[玩家端日志] === 旁观者操作结束 ===');
          return;
        }
        
        // 检查格子是否在有效范围内（用 boardRef 的真实尺寸，避免难度/配置闭包导致的尺寸不一致）
        const currentBoard = boardRef.current;
        const rows = currentBoard.length;
        const cols = currentBoard[0]?.length ?? 0;
        if (rows === 0 || cols === 0) {
          console.log('[玩家端日志] ❌ 当前棋盘为空，操作失败');
          console.log('[玩家端日志] === 旁观者操作结束 ===');
          return;
        }
        if (data.row < 0 || data.row >= rows || data.col < 0 || data.col >= cols) {
          console.log('[玩家端日志] ❌ 格子坐标超出范围');
          console.log('[玩家端日志]   - 棋盘范围:', `(0-${rows - 1}, 0-${cols - 1})`);
          console.log('[玩家端日志]   - 请求坐标:', `(${data.row}, ${data.col})`);
          console.log('[玩家端日志] === 旁观者操作结束 ===');
          return;
        }
        
        if (data.action === 'reveal') {
          // 旁观者点击揭开格子
          console.log('[玩家端日志] ✅ 执行reveal操作');
          revealCellRef.current?.(data.row, data.col);
        } else if (data.action === 'flag') {
          // 旁观者点击标记格子
          console.log('[玩家端日志] ✅ 执行flag操作');
          toggleFlagRef.current?.(data.row, data.col);
        } else if (data.action === 'chord') {
          // 旁观者执行弦操作
          console.log('[玩家端日志] ✅ 执行chord操作');
          chordRevealRef.current?.(data.row, data.col);
        } else {
          console.log('[玩家端日志] ❌ 未知的操作类型:', data.action);
        }
        console.log('[玩家端日志] === 旁观者操作结束 ===');
      });
    });
  }, [socket]);

// 验证自定义配置
const validateCustomConfig = (config: CustomConfig): string => {
  if (config.rows < 1 || config.rows > 50) {
    return '行数必须在1-50之间';
  }
  if (config.cols < 1 || config.cols > 50) {
    return '列数必须在1-50之间';
  }
  if (config.mines < 1) {
    return '地雷数必须至少为1';
  }
  if (config.mines >= config.rows * config.cols) {
    return '地雷数不能超过总格子数';
  }
  return '';
};

// 初始化游戏
  const initializeGame = useCallback(() => {
    // 根据难度模式获取当前配置
    const currentConfig = getCurrentConfig();
    
    const newBoard: Cell[][] = Array(currentConfig.rows)
      .fill(null)
      .map(() =>
        Array(currentConfig.cols)
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
    setFlagsLeft(currentConfig.mines);
    setTimer(0);
    setIsTimerRunning(false);
    setFirstClick(true);
    setShowResultDialog(false);
    
    // 清除高亮格子
    setHighlightedCells([]);
  }, [difficulty, customConfig]);

 
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

  // 创建或加入游戏房间（固定房间ID） - 按需连接WebSocket
  const createRoom = useCallback(async () => {
    try {
      // 先建立WebSocket连接（如果尚未连接或需要重新连接）
      const currentSocket = socket || await connectWebSocket();
      
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
      console.log('[玩家端日志] 发送 create-room 事件:');
      console.log('[玩家端日志]   - 房间ID:', fixedRoomId);
      console.log('[玩家端日志]   - 难度:', difficulty);
      console.log('[玩家端日志]   - 同玩模式:', invitePlayMode);
      console.log('[玩家端日志]   - 当前房间ID状态:', roomId);
      
      currentSocket.emit('create-room', { 
        roomId: fixedRoomId, // 指定固定房间ID
        difficulty,
        invitePlayMode // 是否邀请同玩模式
      });
      
    } catch (error) {
      console.error('创建房间失败:', error);
      alert('WebSocket连接失败，请检查网络后重试');
    }
  }, [socket, difficulty, roomId, generateFixedRoomId, connectWebSocket]);

  // 组件加载时检查是否有保存的房间 - 已移除自动弹窗，改为按需连接

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
    
    // 添加边界检查，防止棋盘大小变化导致的访问错误
    if (!board[row] || !board[row][col]) {
      return;
    }

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
      
      // 立即广播游戏状态
      if (socket && roomId) {
        socket.emit('update-game', { roomId, board: newBoard });
      }
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
    
    // 立即广播游戏状态
    if (socket && roomId) {
      socket.emit('update-game', { roomId, board: boardWithAutoFlags });
    }
    
    checkWin(boardWithAutoFlags);
  }, [board, gameStatus, firstClick, config, placeMines, autoFlag, socket, roomId]);

  // 切换旗帜
  const toggleFlag = useCallback((row: number, col: number, e: React.MouseEvent) => {
    e.preventDefault();
    if (gameStatus !== 'playing' || firstClick) return;
    
    // 添加边界检查，防止棋盘大小变化导致的访问错误
    if (!board[row] || !board[row][col]) {
      return;
    }

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
    
    // 立即广播游戏状态
    if (socket && roomId) {
      socket.emit('update-game', { roomId, board: newBoard });
    }
  }, [board, gameStatus, firstClick, flagsLeft, socket, roomId]);

  // 自动揭开功能（弦操作）
  const chordReveal = useCallback((row: number, col: number) => {
    console.log('[玩家端日志] chordReveal 被调用，参数:', { row, col, gameStatus, firstClick });
    
    // 添加边界检查，防止棋盘大小变化导致的访问错误
    if (!board[row] || !board[row][col]) {
      console.log('[玩家端日志] chordReveal 提前返回，棋盘边界检查失败');
      return;
    }

    const newBoard = [...board.map(row => [...row])];
    const cell = newBoard[row][col];

    // 只有已揭开且有数字的格子才能进行弦操作
    if (!cell.isRevealed || cell.neighborMines === 0) {
      console.log('[玩家端日志] chordReveal 提前返回，格子未揭开或无数字:', { isRevealed: cell.isRevealed, neighborMines: cell.neighborMines });
      return;
    }

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

  // 同步最新操作函数到 ref，供 WebSocket/旁观事件调用（避免闭包导致的棋盘不一致）
  useEffect(() => {
    revealCellRef.current = (row, col) => revealCell(row, col);
    chordRevealRef.current = (row, col) => chordReveal(row, col);
    toggleFlagRef.current = (row, col) => {
      const mockEvent = { preventDefault: () => {} } as React.MouseEvent;
      toggleFlag(row, col, mockEvent);
    };
  }, [revealCell, chordReveal, toggleFlag]);

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
    // 添加边界检查，防止棋盘大小变化导致的访问错误
    if (!board[row] || !board[row][col]) {
      return;
    }
    
    if (e.button === 0) {
      // 左键
      isMouseDownRef.current.left = true;
      setIsMouseDown(prev => {
        const newState = { ...prev, left: true };
        return newState;
      });
      // 左键单击直接执行弦操作
      if (gameStatus === 'playing' && !firstClick) {
        const cell = board[row][col];
        // 只有已揭开且有数字的格子才能进行弦操作
        if (cell.isRevealed && cell.neighborMines > 0) {
          chordReveal(row, col);
        }
      }
    } else if (e.button === 2) {
      // 右键 - 只更新鼠标状态，标雷操作由 onContextMenu 处理
      isMouseDownRef.current.right = true;
      setIsMouseDown(prev => {
        const newState = { ...prev, right: true };
        return newState;
      });
    }
  }, [updatePressedCells, gameStatus, firstClick, board, chordReveal]);

  // 处理鼠标释放
  const handleMouseUp = useCallback((row: number, col: number, e: React.MouseEvent) => {
    // 添加边界检查，防止棋盘大小变化导致的访问错误
    if (!board[row] || !board[row][col]) {
      setPressedCells(new Set()); // 清除按下效果
      return;
    }
    
    if (e.button === 0) {
      // 左键释放
      setIsMouseDown(prev => ({ ...prev, left: false }));
      
      // 普通左键点击（如果之前没有执行弦操作）
      if (gameStatus === 'playing') {
        const cell = board[row][col];
        // 如果格子不是已揭开的数字格子，执行普通左键操作
        if (!cell.isRevealed || cell.neighborMines === 0) {
          revealCell(row, col);
        }
      }
    } else if (e.button === 2) {
      // 右键释放 - 只更新鼠标状态，不执行标雷操作（已在按下时执行）
      setIsMouseDown(prev => ({ ...prev, right: false }));
    }
    
    // 清除按下效果
    setPressedCells(new Set());
  }, [gameStatus, board, revealCell, firstClick]);

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

  // 键盘事件监听（D键触发弦操作，B键标记，C键打开）
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!hoverCell) return;

      // D键触发弦操作
      if ((e.key === 'd' || e.key === 'D') && gameStatus === 'playing' && !firstClick && !isSpacePressed) {
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
      if ((e.key === 'd' || e.key === 'D') && isSpacePressed && hoverCell) {
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
    // 满屏和自定义模式不记录成绩
    if (difficulty === 'fullscreen' || difficulty === 'custom') {
      console.log('满屏或自定义模式，不保存记录');
      return;
    }
    
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

  // 满屏模式：监听窗口大小变化
  useEffect(() => {
    if (difficulty === 'fullscreen') {
      const handleResize = () => {
        // 只在游戏未开始（首次点击前）或游戏结束后才重新初始化
        if (firstClick || gameStatus !== 'playing') {
          // 游戏未开始或已结束，重新初始化适应新窗口大小
          initializeGame();
        }
        // 游戏进行中时，不重新初始化，保持当前游戏状态
      };

      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
  }, [difficulty, gameStatus, firstClick, initializeGame]);

  // 处理自定义模式标签点击
  const handleCustomTabClick = () => {
    setShowCustomDialog(true);
  };

  // 应用自定义配置
  const applyCustomConfig = () => {
    const error = validateCustomConfig(customConfig);
    if (error) {
      setCustomInputError(error);
      return;
    }
    
    setCustomInputError('');
    saveCustomConfigToStorage(customConfig);
    setDifficulty('custom');
    setShowCustomDialog(false);
  };

  // 处理自定义配置输入变化
  const handleCustomInputChange = (field: keyof CustomConfig, value: string) => {
    const numValue = parseInt(value) || 0;
    setCustomConfig(prev => ({
      ...prev,
      [field]: numValue
    }));
  };

  // 初始化和难度改变时重置游戏
  useEffect(() => {
    if (difficulty !== 'custom' || !customInputError) {
      initializeGame();
      fetchPersonalBest();
    }
  }, [difficulty, initializeGame, fetchPersonalBest, customConfig, customInputError]);

  // 难度变更时通知旁观者（使用 useLayoutEffect 确保在棋盘更新前发送）
  useEffect(() => {
    // 如果有房间ID和Socket连接，直接发送最新的难度给旁观者
    if (roomId && socket) {
      console.log(`难度变更为 ${difficulty}，通知旁观者`);
      
      // 获取当前配置信息，用于旁观者显示
      const currentConfig = getCurrentConfig();
      
      // 发送难度更新事件给服务器，包含完整的配置信息
      socket.emit('update-difficulty', { 
        roomId, 
        difficulty,
        config: {
          rows: currentConfig.rows,
          cols: currentConfig.cols,
          mines: currentConfig.mines,
          label: currentConfig.label
        }
      });
    }
  }, [difficulty, roomId, socket]);

  // 获取格子样式（优先使用 public/minesweeper-skin/ 下的贴图；缺图时回退到原色块渲染）
  const getCellStyle = (cell: Cell, row: number, col: number): React.CSSProperties => {
    const cellKey = `${row},${col}`;
    const isPressed = pressedCells.has(cellKey);

    // 旁观建议高亮
    const isHighlighted = highlightedCells.some((hc) => hc.row === row && hc.col === col);

    // 根据屏幕大小和难度动态调整格子大小
    const getCellSize = () => {
      if (difficulty === 'fullscreen') return 25;
      if (difficulty === 'custom') {
        const currentConfig = getCurrentConfig();
        const maxWidth = window.innerWidth - 100;
        const maxHeight = window.innerHeight - 400;
        const cellWidth = Math.min(Math.floor(maxWidth / currentConfig.cols), 40);
        const cellHeight = Math.min(Math.floor(maxHeight / currentConfig.rows), 40);
        return Math.min(cellWidth, cellHeight);
      }
      if (difficulty === 'brutal') {
        const maxWidth = window.innerWidth - 100;
        const maxHeight = window.innerHeight - 400;
        const cellWidth = Math.min(Math.floor(maxWidth / 30), 28);
        const cellHeight = Math.min(Math.floor(maxHeight / 24), 28);
        return Math.min(cellWidth, cellHeight);
      }
      if (difficulty === 'expert') {
        const maxWidth = window.innerWidth - 100;
        const maxHeight = window.innerHeight - 400;
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
      cursor: gameStatus === 'playing' ? 'pointer' : 'default',
      userSelect: 'none',
      transition: 'all 0.05s ease',
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
      // 没有贴图时，尽量保持现有配色逻辑
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
          borderStyle: 'inset',
          transform: 'scale(0.95)'
        };
      }

      return { backgroundColor: '#bbb' };
    })();

    const skinStyle: React.CSSProperties = backgroundUrl
      ? {
          backgroundImage: `url(${backgroundUrl})`,
          backgroundSize: 'contain',

          backgroundRepeat: 'no-repeat',
          border: 'none'
        }
      : {
          borderWidth: '1px',
          borderColor: '#999',
          borderStyle: 'solid'
        };

    const highlightStyle: React.CSSProperties = isHighlighted
      ? {
          animation: 'pulse 1s infinite',
          zIndex: 10
        }
      : {};

    return {
      ...baseStyle,
      ...skinStyle,
      ...fallbackStyle,
      ...highlightStyle
    };
  };

  const getCellOverlayUrl = (cell: Cell): string => {
    // 失败时：错误旗标
    if (cell.isFlagged && gameStatus === 'lost' && !cell.isMine) return CLASSIC_SKIN.overlay.wrongFlag;

    // 插旗（游戏中/胜利/失败的正确旗）
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
      width: '100%',
      height: '100%',
      backgroundImage: `url(${overlayUrl})`,
      backgroundRepeat: 'no-repeat',
      backgroundPosition: 'center',
      backgroundSize: 'contain',

      pointerEvents: 'none',
      imageRendering: 'pixelated'
    };
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

  // 经典扫雷计数器/表情按钮（有贴图时自动使用贴图；缺图则回退为文字按钮）
  const canUseDigitImages = useMemo(() => CLASSIC_SKIN.panel.digits.every((u) => availableImages.has(u)), [availableImages]);
  const canUseFaceImages = useMemo(
    () =>
      [CLASSIC_SKIN.panel.face.normal, CLASSIC_SKIN.panel.face.win, CLASSIC_SKIN.panel.face.lost].every((u) => availableImages.has(u)),
    [availableImages]
  );

  const renderDigitalCounter = (value: number) => {
    const clamped = Math.max(0, Math.min(value, 999));
    const text = clamped.toString().padStart(3, '0');

    if (!canUseDigitImages) {
      return (
        <Box
          sx={{
            minWidth: 90,
            px: 1,
            py: 0.5,
            backgroundColor: '#000',
            color: '#ff0000',
            fontFamily: 'monospace',
            fontSize: 24,
            textAlign: 'center',
            border: '2px inset #808080'
          }}
        >
          {text}
        </Box>
      );
    }

    const scale = 2;
    const w = 13 * scale;
    const h = 23 * scale;

    return (
      <Box sx={{ display: 'flex', gap: 0.25, backgroundColor: '#000', px: 0.5, py: 0.25, border: '2px inset #808080' }}>
        {text.split('').map((ch, idx) => {
          const digit = Number(ch);
          const url = CLASSIC_SKIN.panel.digits[digit];
          return (
            <Box
              key={`${idx}-${ch}`}
              sx={{
                width: `${w}px`,
                height: `${h}px`,
                backgroundImage: `url(${url})`,
                backgroundSize: 'contain',

                backgroundRepeat: 'no-repeat',
                imageRendering: 'pixelated'
              }}
            />
          );
        })}
      </Box>
    );
  };

  const renderFaceButton = () => {
    const faceUrl = gameStatus === 'won' ? CLASSIC_SKIN.panel.face.win : gameStatus === 'lost' ? CLASSIC_SKIN.panel.face.lost : CLASSIC_SKIN.panel.face.normal;

    if (!canUseFaceImages || !hasSkinImage(faceUrl)) {
      return (
        <Button variant="contained" startIcon={<RestartAltIcon />} onClick={initializeGame} size="small">
          重新开始
        </Button>
      );
    }

    const scale = 2;
    const size = 26 * scale;

    return (
      <Box
        role="button"
        tabIndex={0}
        onClick={initializeGame}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') initializeGame();
        }}
        sx={{
          width: `${size}px`,
          height: `${size}px`,
          backgroundImage: `url(${faceUrl})`,
          backgroundSize: 'contain',

          backgroundRepeat: 'no-repeat',
          imageRendering: 'pixelated',
          cursor: 'pointer',
          borderTop: '2px solid #fff',
          borderLeft: '2px solid #fff',
          borderRight: '2px solid #808080',
          borderBottom: '2px solid #808080',
          backgroundColor: '#c0c0c0'
        }}
      />
    );
  };

  return (

    <Box sx={{ padding: 2 }}>
      {/* 难度选择标签 */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
        <Tabs
          value={difficulty}
          onChange={(_, newValue) => {
            if (newValue === 'custom') {
              handleCustomTabClick();
            } else {
              setDifficulty(newValue as Difficulty);
            }
          }}
          centered
          textColor="primary"
          indicatorColor="primary"
        >
          <Tab value="beginner" label={DIFFICULTIES.beginner.label} />
          <Tab value="intermediate" label={DIFFICULTIES.intermediate.label} />
          <Tab value="expert" label={DIFFICULTIES.expert.label} />
          <Tab value="brutal" label={DIFFICULTIES.brutal.label} />
          <Tab value="fullscreen" label="满屏 (自适应)" />
          <Tab value="custom" label={difficulty === 'custom' ? getCurrentConfig().label : "自定义"} />
        </Tabs>
      </Box>
          
      {/* 旁观二维码对话框 */}
      <Dialog open={showQRDialog} onClose={() => setShowQRDialog(false)}>
        <DialogTitle>
          {invitePlayMode ? '邀请同玩链接' : '分享旁观链接'}
        </DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" alignItems="center" p={2}>
            <Typography variant="body1" gutterBottom>
              房间ID: {roomId}
            </Typography>
            <Typography variant="body1" gutterBottom>
               链接: {`${window.location.origin}/spectate/${roomId}`}
            </Typography>
            <img 
              src={qrCodeUrl} 
              alt="扫雷二维码" 
              style={{ width: '256px', height: '256px', margin: '16px 0' }}
            />
            {invitePlayMode ? (
              <Typography variant="body2" color="success.main" fontWeight="bold">
                🎮 同玩模式：旁观者可以同时操作排雷
              </Typography>
            ) : (
              <Typography variant="body2" color="textSecondary">
                扫描二维码开始旁观
              </Typography>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowQRDialog(false)}>关闭</Button>
        </DialogActions>
      </Dialog>

      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        {/* 控制面板（尽量还原 minesweeper.cn 的“计数器 + 表情按钮”风格） */}
        <Paper
          sx={{
            p: 1,
            mb: 1,
            minWidth: 320,
            backgroundColor: '#c0c0c0',
            borderTop: '2px solid #fff',
            borderLeft: '2px solid #fff',
            borderRight: '2px solid #808080',
            borderBottom: '2px solid #808080'
          }}
        >
          <Box display="flex" alignItems="center" justifyContent="space-between" px={1}>
            {renderDigitalCounter(flagsLeft)}
            {renderFaceButton()}
            {renderDigitalCounter(timer)}
          </Box>
        </Paper>

        {/* 操作区 */}
        <Paper sx={{ padding: 2, marginBottom: 2, minWidth: 320 }}>
          <Grid container spacing={2} alignItems="center" justifyContent="center">
            <Grid item xs={12} sm={6}>
              <Tooltip title="分享旁观链接">
                <Button variant="outlined" startIcon={<ShareIcon />} onClick={createRoom} fullWidth size="small">
                  分享旁观
                </Button>
              </Tooltip>
            </Grid>

            <Grid item xs={12} sm={6}>
              <Button variant="contained" startIcon={<RestartAltIcon />} onClick={initializeGame} fullWidth size="small">
                重新开始
              </Button>
            </Grid>

            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={invitePlayMode}
                    onChange={(e) => {
                      const newMode = e.target.checked;
                      setInvitePlayMode(newMode);

                      // 如果房间已存在且socket已连接，发送同玩模式切换事件
                      if (socket && roomId) {
                        console.log('[玩家端日志] 发送同玩模式切换事件:', newMode ? '开启' : '关闭');
                        socket.emit('toggle-invite-play-mode', {
                          roomId,
                          invitePlayMode: newMode
                        });
                      }
                    }}
                    size="small"
                  />
                }
                label="邀请同玩（旁观者可以同时操作排雷）"
              />
            </Grid>

            {personalBest && (
              <Grid item xs={12}>
                <Box display="flex" justifyContent="center">
                  <Chip label={`个人最佳: ${formatTime(personalBest)}`} color="success" size="small" />
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
                    {(() => {
                      const overlayUrl = getCellOverlayUrl(cell);
                      const canUseOverlay = overlayUrl && hasSkinImage(overlayUrl);

                      if (canUseOverlay) {
                        return <Box style={getCellOverlayStyle(overlayUrl)} />;
                      }

                      // 无贴图：回退到文字/emoji
                      if (cell.isFlagged && !cell.isRevealed && gameStatus === 'playing') return '🚩';
                      if (cell.isFlagged && gameStatus === 'won') return '🚩';
                      if (cell.isFlagged && !cell.isMine && gameStatus === 'lost') return '❌';
                      if (cell.isFlagged && cell.isMine && gameStatus === 'lost') return '🚩';
                      if (cell.isRevealed && cell.isMine) return '💣';
                      if (cell.isRevealed && !cell.isMine && cell.neighborMines > 0) return cell.neighborMines;
                      return null;
                    })()}
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
              难度: {getCurrentConfig().label}
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

        {/* 自定义配置对话框 */}
        <Dialog open={showCustomDialog} onClose={() => setShowCustomDialog(false)} maxWidth="sm" fullWidth>
          <DialogTitle>自定义扫雷配置</DialogTitle>
          <DialogContent>
            <Box display="flex" flexDirection="column" gap={2} p={1}>
              <Box display="flex" alignItems="center" gap={2}>
                <Typography width={80}>行数:</Typography>
                <TextField
                  type="number"
                  size="small"
                  value={customConfig.rows}
                  onChange={(e) => handleCustomInputChange('rows', e.target.value)}
                  inputProps={{ min: 1, max: 50 }}
                  fullWidth
                />
              </Box>
              
              <Box display="flex" alignItems="center" gap={2}>
                <Typography width={80}>列数:</Typography>
                <TextField
                  type="number"
                  size="small"
                  value={customConfig.cols}
                  onChange={(e) => handleCustomInputChange('cols', e.target.value)}
                  inputProps={{ min: 1, max: 50 }}
                  fullWidth
                />
              </Box>
              
              <Box display="flex" alignItems="center" gap={2}>
                <Typography width={80}>地雷数:</Typography>
                <TextField
                  type="number"
                  size="small"
                  value={customConfig.mines}
                  onChange={(e) => handleCustomInputChange('mines', e.target.value)}
                  inputProps={{ min: 1 }}
                  fullWidth
                />
              </Box>
              
              {customInputError && (
                <Typography color="error" variant="body2">
                  {customInputError}
                </Typography>
              )}
              
              <Typography variant="body2" color="textSecondary">
                总格子数: {customConfig.rows * customConfig.cols}，当前地雷占比: {((customConfig.mines / (customConfig.rows * customConfig.cols)) * 100).toFixed(1)}%
              </Typography>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowCustomDialog(false)}>取消</Button>
            <Button onClick={applyCustomConfig} variant="contained">开始游戏</Button>
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
                • 键盘快捷键：B键标记/取消标记，C键打开方块，D键弦操作
              </Typography>
            </Grid>
            <Grid item xs={12} md={4}>
              <Typography variant="body2" paragraph>
                • 在已揭开的数字格上左键单击，如果旗帜数量等于数字，自动揭开周围格子（弦操作）
              </Typography>
              <Typography variant="body2" paragraph>
                • 按下D键相当于在鼠标位置执行弦操作，方便单手操作
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
