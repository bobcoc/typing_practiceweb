import React, { useState, useMemo, useEffect } from 'react';

type GameBoard = number[][];

const SudokuGame: React.FC = () => {
  // 初始数独板，0 表示空格
  const initialBoardData: number[][] = [
    [5, 3, 0, 0, 7, 0, 0, 0, 0],
    [6, 0, 0, 1, 9, 5, 0, 0, 0],
    [0, 9, 8, 0, 0, 0, 0, 6, 0],
    [8, 0, 0, 0, 6, 0, 0, 0, 3],
    [4, 0, 0, 8, 0, 3, 0, 0, 1],
    [7, 0, 0, 0, 2, 0, 0, 0, 6],
    [0, 6, 0, 0, 0, 0, 2, 8, 0],
    [0, 0, 0, 4, 1, 9, 0, 0, 5],
    [0, 0, 0, 0, 8, 0, 0, 7, 9],
  ];

  // 游戏难度
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');

  // 游戏板状态
  const [board, setBoard] = useState<GameBoard>(() => initialBoardData.map(row => [...row]));

  // 已固定的初始格子（不可修改）
  const [fixedCells, setFixedCells] = useState<boolean[][]>(() =>
    initialBoardData.map(row => row.map(cell => cell !== 0))
  );

  // 选中的格子 [row, col]
  const [selectedCell, setSelectedCell] = useState<[number, number] | null>(null);

  // 配置选项
  const [config, setConfig] = useState({
    highlightRegion: true,           // 突出显示区域（行、列、宫）
    highlightSameNumbers: true,      // 突出显示相同数字
    showConflictInCandidates: true,  // 候选数面板提示冲突
    showRemainingCount: true,        // 显示剩余数字数量
  });

  // 检查在位置 (row, col) 放置数字 num 是否有效
  const isValid = (row: number, col: number, num: number): boolean => {
    // 检查行
    for (let c = 0; c < 9; c++) {
      const cell = board[row][c];
      if (typeof cell === 'number' && cell === num) return false;
    }

    // 检查列
    for (let r = 0; r < 9; r++) {
      const cell = board[r][col];
      if (typeof cell === 'number' && cell === num) return false;
    }

    // 检查 3x3 宫格
    const startRow = Math.floor(row / 3) * 3;
    const startCol = Math.floor(col / 3) * 3;
    for (let r = startRow; r < startRow + 3; r++) {
      for (let c = startCol; c < startCol + 3; c++) {
        const cell = board[r][c];
        if (typeof cell === 'number' && cell === num) return false;
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

  const selectedCellValue = useMemo(() => {
    if (!selectedCell) return null;
    const [row, col] = selectedCell;
    return board[row][col] || null;
  }, [board, selectedCell]);

  const getCellValue = (cell: number): number | null => {
    return cell === 0 ? null : cell;
  };

  const handleNumberInput = (num: number) => {
    if (!selectedCell) return;
    const [row, col] = selectedCell;
    if (fixedCells[row][col]) return;

    const newBoard = board.map(row => [...row]);
    newBoard[row][col] = num;
    setBoard(newBoard);
  };

  const handleClear = () => {
    if (!selectedCell) return;
    const [row, col] = selectedCell;
    const newBoard = board.map(row => [...row]);
    newBoard[row][col] = 0;
    setBoard(newBoard);
  };

  const handleNewGame = () => {
    setBoard(initialBoardData.map(row => [...row]));
    setFixedCells(initialBoardData.map(row => row.map(cell => cell !== 0)));
    setSelectedCell(null);
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
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedCell, board]);

  type HighlightType = 'none' | 'row' | 'col' | 'box' | 'sameNumber';

  const getCellHighlightType = (row: number, col: number): HighlightType => {
    if (!selectedCell) return 'none';

    const [selRow, selCol] = selectedCell;
    const cell = board[row][col];
    const selectedValue = board[selRow][selCol];

    if (config.highlightRegion) {
      const inSameRow = row === selRow;
      const inSameCol = col === selCol;
      const inSameBox = Math.floor(row / 3) === Math.floor(selRow / 3) &&
                        Math.floor(col / 3) === Math.floor(selCol / 3);

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

  // 检查某个数字在候选数面板中是否冲突
  const isCandidateConflict = (num: number): boolean => {
    if (!selectedCell) return false;
    const [row, col] = selectedCell;

    // 检查行、列、宫中是否已有该数字
    // 行
    for (let c = 0; c < 9; c++) {
      if (c !== col && typeof board[row][c] === 'number' && board[row][c] === num) {
        return true;
      }
    }
    // 列
    for (let r = 0; r < 9; r++) {
      if (r !== row && typeof board[r][col] === 'number' && board[r][col] === num) {
        return true;
      }
    }
    // 宫
    const startRow = Math.floor(row / 3) * 3;
    const startCol = Math.floor(col / 3) * 3;
    for (let r = startRow; r < startRow + 3; r++) {
      for (let c = startCol; c < startCol + 3; c++) {
        if ((r !== row || c !== col) && typeof board[r][c] === 'number' && board[r][c] === num) {
          return true;
        }
      }
    }
    return false;
  };

  // 计算剩余未填写的数字数量
  const remainingCount = useMemo(() => {
    let count = 0;
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        const cell = board[r][c];
        if (typeof cell !== 'number') count++;
      }
    }
    return count;
  }, [board]);

  // 获取单元格样式 - 优化高亮区域的边框显示
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
      backgroundColor = '#e6f7ff'; // 相同数字 - 更浅的蓝色
    } else if (isFixed) {
      backgroundColor = '#f0f0f0'; // 初始固定格子
    }

    const thickBorder = '2px solid #666';
    const thinBorder = '1px solid #bbb';

    const borderRight = col < 8 ? (col % 3 === 2 ? thickBorder : thinBorder) : thickBorder;
    const borderBottom = row < 8 ? (row % 3 === 2 ? thickBorder : thinBorder) : thickBorder;
    const borderLeft = col > 0 ? (col % 3 === 0 ? thickBorder : thinBorder) : thickBorder;
    const borderTop = row > 0 ? (row % 3 === 0 ? thickBorder : thinBorder) : thickBorder;

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

  // 候选数面板按钮样式
  const getCandidateButtonStyle = (num: number): React.CSSProperties => {
    const isConflict = config.showConflictInCandidates && isCandidateConflict(num);
    const isSelected = selectedCellValue === num;

    return {
      width: '35px',
      height: '35px',
      fontSize: '14px',
      cursor: 'pointer',
      backgroundColor: isConflict ? '#f5f5f5' : '#f0f0f0',
      border: isSelected ? '2px solid #1890ff' : '1px solid #ddd',
      borderRadius: '4px',
      color: isConflict ? '#999' : '#333',
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
              onClick={() => setDifficulty(d)}
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
            checked={config.showConflictInCandidates}
            onChange={(e) => setConfig({ ...config, showConflictInCandidates: e.target.checked })}
          />
          候选数提示冲突
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

      {/* 底部控制区：候选数 + 剩余数量 + 操作按钮 */}
      <div style={{ display: 'flex', gap: '30px', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
        {/* 候选数面板 */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '14px', color: '#666' }}>
            {selectedCell ? '候选数 (点击填入)' : '选择格子'}
          </span>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(9, 35px)',
              gap: '5px',
            }}
          >
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
              <button
                key={num}
                onClick={() => {
                  if (!selectedCell) return;
                  handleNumberInput(num);
                }}
                style={getCandidateButtonStyle(num)}
              >
                {num}
              </button>
            ))}
          </div>
        </div>

        {/* 剩余数字数量显示 */}
        {config.showRemainingCount && (
          <div style={{ padding: '15px 25px', backgroundColor: '#f5f5f5', borderRadius: '8px' }}>
            <span style={{ fontSize: '16px', color: '#666' }}>
              剩余：<strong style={{ color: '#1890ff', fontSize: '20px' }}>{remainingCount}</strong> 格
            </span>
          </div>
        )}
      </div>

      {/* 快捷键提示 */}
      <div style={{ marginTop: '20px', padding: '10px', backgroundColor: '#f9f9f9', borderRadius: '4px', fontSize: '12px', color: '#666' }}>
        <strong>快捷键:</strong> 1-9 输入数字 | 空格/Backspace 清除 | ↑↓←→ 移动选择
      </div>
    </div>
  );
};

export default SudokuGame;
