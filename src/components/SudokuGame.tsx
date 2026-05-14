import React, { useState, useMemo, useEffect } from 'react';
import { API_BASE_URL } from '../config';
import {
  GameBoard,
  Difficulty,
  GameMode,
  STANDARD_REGION_MAP,
  generatePuzzle,
  getRegionId,
  getRegionNeighbors,
  getRegionMapByMode,
} from './sudokuEngine';

type HighlightType = 'none' | 'row' | 'col' | 'box' | 'sameNumber';

const SudokuGame: React.FC = () => {
  // 游戏难度
  const [difficulty, setDifficulty] = useState<Difficulty>('hard');
  
  // 游戏模式：标准或不规则
  const [gameMode, setGameMode] = useState<GameMode>('standard');
  
  // 使用 useMemo 确保 regionMap 随 gameMode 变化
  const regionMap = useMemo(() => getRegionMapByMode(gameMode), [gameMode]);
  
  const [board, setBoard] = useState<GameBoard>(() => generatePuzzle('hard', STANDARD_REGION_MAP));

  const [fixedCells, setFixedCells] = useState<boolean[][]>(() =>
    board.map(row => row.map(cell => cell !== 0))
  );

  // 选中的格子 [row, col]
  const [selectedCell, setSelectedCell] = useState<[number, number] | null>(null);

  // 游戏完成状态
  const [isGameComplete, setIsGameComplete] = useState(false);

  // 完成对话框显示状态
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);

  const [timeElapsed, setTimeElapsed] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(true);

  // 配置选项
  const [config, setConfig] = useState({
    highlightRegion: true,           // 突出显示区域（行、列、宫）
    highlightSameNumbers: true,      // 突出显示相同数字
    showRemainingCount: true,        // 显示剩余数字数量
  });

  // 检查在位置 (row, col) 放置数字 num 是否有效
  const isValid = (row: number, col: number, num: number): boolean => {
    for (let c = 0; c < 9; c++) {
      const cell = board[row][c];
      if (c !== col && typeof cell === 'number' && cell === num) return false;
    }

    for (let r = 0; r < 9; r++) {
      const cell = board[r][col];
      if (r !== row && typeof cell === 'number' && cell === num) return false;
    }

    const targetRegion = getRegionId(regionMap, row, col);
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        const cell = board[r][c];
        if ((r !== row || c !== col) && getRegionId(regionMap, r, c) === targetRegion && typeof cell === 'number' && cell === num) return false;
      }
    }

    return true;
  };

  // 检查数独是否完成
  const isComplete = (): boolean => {
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        const cell = board[r][c];
        if (typeof cell !== 'number') return false;
        if (!isValid(r, c, cell)) return false;
      }
    }
    return true;
  };

  const getCellValue = (cell: number): number | null => {
    return cell === 0 ? null : cell;
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const saveGameRecord = async (won: boolean, timeSeconds: number) => {
    try {
      const token = window.localStorage.getItem('token');
      if (!token) {
        console.log('未登录，不保存数独记录');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/sudoku/record`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          difficulty,
          timeSeconds,
          won
        })
      });

      if (response.ok) {
        console.log('数独游戏记录保存成功');
      } else {
        console.warn('保存数独记录失败', response.statusText);
      }
    } catch (error) {
      console.error('保存数独记录失败:', error);
    }
  };

  const handleNumberInput = (num: number) => {
    if (!selectedCell || isGameComplete) return;
    const [row, col] = selectedCell;
    if (fixedCells[row][col]) return;

    const newBoard = board.map(row => [...row]);
    newBoard[row][col] = num;
    setBoard(newBoard);

    // 检查是否完成
    setTimeout(() => {
      if (checkIsComplete(newBoard)) {
        setIsGameComplete(true);
        setIsTimerRunning(false);
        setShowCompleteDialog(true);
        saveGameRecord(true, timeElapsed);
      }
    }, 0);
  };

  const checkIsComplete = (boardToCheck: GameBoard): boolean => {
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        const cell = boardToCheck[r][c];
        if (cell === 0) return false;
        if (!isValidInBoard(r, c, cell, boardToCheck)) return false;
      }
    }
    return true;
  };

  const isValidInBoard = (row: number, col: number, num: number, boardToCheck: GameBoard): boolean => {
    for (let c = 0; c < 9; c++) {
      if (c !== col && boardToCheck[row][c] === num) return false;
    }
    for (let r = 0; r < 9; r++) {
      if (r !== row && boardToCheck[r][col] === num) return false;
    }
    // 使用 regionMap 检查不规则区域
    const targetRegion = getRegionId(regionMap, row, col);
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if ((r !== row || c !== col) && getRegionId(regionMap, r, c) === targetRegion && boardToCheck[r][c] === num) return false;
      }
    }
    return true;
  };

  const handleClear = () => {
    if (!selectedCell || isGameComplete) return;
    const [row, col] = selectedCell;
    const newBoard = board.map(row => [...row]);
    newBoard[row][col] = 0;
    setBoard(newBoard);
  };

  const createNewGame = (level: Difficulty, mode: GameMode = gameMode) => {
    const nextRegionMap = getRegionMapByMode(mode);
    const newPuzzle = generatePuzzle(level, nextRegionMap);
    setBoard(newPuzzle);
    setFixedCells(newPuzzle.map(row => row.map(cell => cell !== 0)));
    setSelectedCell(null);
    setIsGameComplete(false);
    setShowCompleteDialog(false);
    setTimeElapsed(0);
    setIsTimerRunning(true);
  };

  const handleNewGame = () => {
    createNewGame(difficulty);
  };

  const handleDifficultyChange = (level: Difficulty) => {
    setDifficulty(level);
    createNewGame(level);
  };

  const handleModeChange = (mode: GameMode) => {
    setGameMode(mode);
    createNewGame(difficulty, mode);
  };

  const handleCellClick = (row: number, col: number) => {
    setSelectedCell([row, col]);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!selectedCell) return;

      const [row, col] = selectedCell;

      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault();
          setSelectedCell([Math.max(0, row - 1), col]);
          break;
        case 'ArrowDown':
          e.preventDefault();
          setSelectedCell([Math.min(8, row + 1), col]);
          break;
        case 'ArrowLeft':
          e.preventDefault();
          setSelectedCell([row, Math.max(0, col - 1)]);
          break;
        case 'ArrowRight':
          e.preventDefault();
          setSelectedCell([row, Math.min(8, col + 1)]);
          break;
        case 'Backspace':
        case 'Delete':
        case ' ':
          e.preventDefault();
          handleClear();
          break;
        case '1':
        case '2':
        case '3':
        case '4':
        case '5':
        case '6':
        case '7':
        case '8':
        case '9':
          e.preventDefault();
          handleNumberInput(Number(e.key));
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedCell, board]);

  useEffect(() => {
    if (!isTimerRunning) return;

    const intervalId = window.setInterval(() => {
      setTimeElapsed((prev) => prev + 1);
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [isTimerRunning]);

  const getCellHighlightType = (row: number, col: number): HighlightType => {
    if (!selectedCell) return 'none';

    const [selRow, selCol] = selectedCell;
    const cell = board[row][col];
    const selectedValue = board[selRow][selCol];

    if (config.highlightRegion) {
      const inSameRow = row === selRow;
      const inSameCol = col === selCol;
      const inSameBox = getRegionId(regionMap, row, col) === getRegionId(regionMap, selRow, selCol);

      if (inSameBox) return 'box';
      if (inSameRow) return 'row';
      if (inSameCol) return 'col';
    }

    if (config.highlightSameNumbers && selectedValue !== 0) {
      if (cell === selectedValue) {
        return 'sameNumber';
      }
    }

    return 'none';
  };

  const highlightedCells = useMemo(() => {
    const highlighted = new Set<string>();
    if (!selectedCell) return highlighted;

    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (getCellHighlightType(r, c) !== 'none') {
          highlighted.add(`${r}-${c}`);
        }
      }
    }
    return highlighted;
  }, [board, selectedCell, config]);

  // 计算剩余未填写的数字数量
  const remainingCount = useMemo(() => {
    let count = 0;
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (board[r][c] === 0) count++;
      }
    }
    return count;
  }, [board]);

  // 获取单元格样式 - 支持不规则区域的边框显示
  const getCellStyle = (row: number, col: number): React.CSSProperties => {
    const cell = board[row][col];
    const isFixed = fixedCells[row][col];
    const highlightType = getCellHighlightType(row, col);
    const isSelected = selectedCell && selectedCell[0] === row && selectedCell[1] === col;
    const displayValue = getCellValue(cell);

    // 基础背景色 - 根据高亮类型设置不同颜色
    let backgroundColor = 'white';
    if (isSelected) {
      backgroundColor = '#69b1ff'; // 选中时的深蓝色
    } else if (highlightType === 'box') {
      backgroundColor = '#d9f7be'; // 宫 - 浅绿色
    } else if (highlightType === 'row') {
      backgroundColor = '#bae7ff'; // 行 - 浅蓝色
    } else if (highlightType === 'col') {
      backgroundColor = '#ffe58f'; // 列 - 浅黄色
    } else if (highlightType === 'sameNumber') {
      backgroundColor = '#ff4444'; // 相同数字 - 更醒目的红色
    } else if (isFixed) {
      backgroundColor = '#f0f0f0'; // 初始固定格子
    }

    const thickBorder = '2px solid #666';
    const thinBorder = '1px solid #bbb';

    // 使用 getRegionNeighbors 判断边框粗细，支持不规则区域
    const neighbors = getRegionNeighbors(regionMap, row, col);
    
    const borderRight = col < 8 ? (neighbors.right ? thickBorder : thinBorder) : thickBorder;
    const borderBottom = row < 8 ? (neighbors.bottom ? thickBorder : thinBorder) : thickBorder;
    const borderLeft = col > 0 ? (neighbors.left ? thickBorder : thinBorder) : thickBorder;
    const borderTop = row > 0 ? (neighbors.top ? thickBorder : thinBorder) : thickBorder;

    return {
      width: '40px',
      height: '40px',
      backgroundColor,
      borderRight,
      borderBottom,
      borderLeft,
      borderTop,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '18px',
      cursor: 'pointer',
      color: isFixed ? '#333' : '#1890ff',
      position: 'relative' as const,
    };
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', padding: '20px' }}>
      {/* 顶部控制和配置区 */}
      <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', justifyContent: 'center' }}>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={handleNewGame}
            style={{
              padding: '10px 20px',
              fontSize: '16px',
              cursor: 'pointer',
              backgroundColor: '#1890ff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
            }}
          >
            新游戏
          </button>
          <button
            onClick={handleClear}
            style={{
              padding: '10px 20px',
              fontSize: '16px',
              cursor: 'pointer',
              backgroundColor: '#ff4d4f',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
            }}
          >
            清除
          </button>
        </div>

        <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
          <span>难度:</span>
          {(['easy', 'medium', 'hard'] as const).map((d) => (
            <button
              key={d}
              onClick={() => handleDifficultyChange(d)}
              style={{
                padding: '5px 10px',
                fontSize: '14px',
                cursor: 'pointer',
                backgroundColor: difficulty === d ? '#1890ff' : '#f0f0f0',
                color: difficulty === d ? 'white' : '#333',
                border: 'none',
                borderRadius: '4px',
              }}
            >
              {d === 'easy' ? '简单' : d === 'medium' ? '中等' : '困难'}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
          <span>模式:</span>
          {(['standard', 'irregular'] as const).map((m) => (
            <button
              key={m}
              onClick={() => handleModeChange(m)}
              style={{
                padding: '5px 10px',
                fontSize: '14px',
                cursor: 'pointer',
                backgroundColor: gameMode === m ? '#52c41a' : '#f0f0f0',
                color: gameMode === m ? 'white' : '#333',
                border: 'none',
                borderRadius: '4px',
              }}
            >
              {m === 'standard' ? '标准' : '不规则'}
            </button>
          ))}
        </div>
      </div>

      {/* 配置选项区 */}
      <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', justifyContent: 'center', padding: '10px', backgroundColor: '#fafafa', borderRadius: '8px' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <input
            type="checkbox"
            checked={config.highlightRegion}
            onChange={(e) => setConfig({ ...config, highlightRegion: e.target.checked })}
          />
          突出显示区域
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <input
            type="checkbox"
            checked={config.highlightSameNumbers}
            onChange={(e) => setConfig({ ...config, highlightSameNumbers: e.target.checked })}
          />
          突出显示相同数字
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <input
            type="checkbox"
            checked={config.showRemainingCount}
            onChange={(e) => setConfig({ ...config, showRemainingCount: e.target.checked })}
          />
          显示剩余数量
        </label>
      </div>

      {/* 数独棋盘 */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(9, 40px)',
          gridTemplateRows: 'repeat(9, 40px)',
          border: '2px solid #333',
          backgroundColor: '#fff',
        }}
      >
        {board.map((row, rowIndex) =>
          row.map((cell, colIndex) => {
            const displayValue = getCellValue(cell);
            const cellStyle = getCellStyle(rowIndex, colIndex);

            return (
              <div
                key={`${rowIndex}-${colIndex}`}
                onClick={() => handleCellClick(rowIndex, colIndex)}
                style={cellStyle}
              >
                {displayValue !== null ? displayValue : ''}
              </div>
            );
          })
        )}
      </div>

<div style={{ display: 'flex', gap: '30px', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
        <div style={{ padding: '15px 25px', backgroundColor: '#f5f5f5', borderRadius: '8px', textAlign: 'center' }}>
          <span style={{ fontSize: '14px', color: '#666', display: 'block', marginBottom: '8px' }}>
            {selectedCell ? '按键盘 1-9 输入数字' : '选择一个格子后输入数字'}
          </span>
          <span style={{ fontSize: '16px', color: '#666', display: 'block', marginBottom: '8px' }}>
            用时：<strong style={{ color: '#1890ff', fontSize: '20px' }}>{formatTime(timeElapsed)}</strong>
          </span>
          {config.showRemainingCount && (
            <span style={{ fontSize: '16px', color: '#666' }}>
              剩余：<strong style={{ color: '#1890ff', fontSize: '20px' }}>{remainingCount}</strong> 格
            </span>
          )}
        </div>
      </div>

      {/* 快捷键提示 */}
      <div style={{ marginTop: '20px', padding: '10px', backgroundColor: '#f9f9f9', borderRadius: '4px', fontSize: '12px', color: '#666' }}>
        <strong>快捷键:</strong> 1-9 输入数字 | 空格/Backspace 清除 | ↑↓←→ 移动选择
      </div>

      {/* 完成成功对话框 */}
      {showCompleteDialog && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            padding: '40px',
            textAlign: 'center',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            maxWidth: '400px',
          }}>
            <div style={{
              fontSize: '48px',
              marginBottom: '20px',
            }}>
              🎉
            </div>
            <h2 style={{ 
              margin: '0 0 20px 0',
              color: '#1890ff',
              fontSize: '24px',
            }}>
              恭喜！完成成功
            </h2>
            <p style={{
              margin: '0 0 30px 0',
              color: '#666',
              fontSize: '16px',
              lineHeight: '1.6',
            }}>
              你已经正确完成了这个数独谜题！
              所有格子已锁定，无法再修改。
            </p>
            <button
              onClick={() => setShowCompleteDialog(false)}
              style={{
                padding: '12px 32px',
                fontSize: '16px',
                cursor: 'pointer',
                backgroundColor: '#1890ff',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                marginRight: '10px',
              }}
            >
              关闭
            </button>
            <button
              onClick={handleNewGame}
              style={{
                padding: '12px 32px',
                fontSize: '16px',
                cursor: 'pointer',
                backgroundColor: '#52c41a',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
              }}
            >
              新游戏
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SudokuGame;
