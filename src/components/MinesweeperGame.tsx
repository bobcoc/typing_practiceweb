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
  Tab
} from '@mui/material';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import FlagIcon from '@mui/icons-material/Flag';
import { API_BASE_URL } from '../config';

type Difficulty = 'beginner' | 'intermediate' | 'expert';

interface DifficultyConfig {
  rows: number;
  cols: number;
  mines: number;
  label: string;
}

const DIFFICULTIES: Record<Difficulty, DifficultyConfig> = {
  beginner: { rows: 9, cols: 9, mines: 10, label: '初级 (9×9, 10雷)' },
  intermediate: { rows: 16, cols: 16, mines: 40, label: '中级 (16×16, 40雷)' },
  expert: { rows: 16, cols: 30, mines: 99, label: '高级 (16×30, 99雷)' }
};

interface Cell {
  isMine: boolean;
  isRevealed: boolean;
  isFlagged: boolean;
  neighborMines: number;
  isExploded?: boolean; // 标记是否是引爆的地雷
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
  }, [config]);

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

    setBoard(newBoard);
    checkWin(newBoard);
  }, [board, gameStatus, firstClick, config, placeMines]);

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

      setBoard(newBoard);
      checkWin(newBoard);
    }
  }, [board, gameStatus, firstClick, config]);

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
    
    // 根据屏幕大小和难度动态调整格子大小
    const getCellSize = () => {
      if (difficulty === 'expert') {
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
      fontSize: difficulty === 'expert' ? '12px' : '14px',
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
        </Tabs>
      </Box>

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
