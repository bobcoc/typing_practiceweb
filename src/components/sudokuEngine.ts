export type GameBoard = number[][];
export type Difficulty = 'easy' | 'medium' | 'hard';
export type GameMode = 'standard' | 'irregular';
export type RegionMap = number[][];

export const createEmptyBoard = (): GameBoard => Array.from({ length: 9 }, () => Array(9).fill(0));

const shuffleArray = (arr: number[]) => {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
};

export const STANDARD_REGION_MAP: RegionMap = Array.from({ length: 9 }, (_, row) =>
  Array.from({ length: 9 }, (_, col) => Math.floor(row / 3) * 3 + Math.floor(col / 3))
);

export const IRREGULAR_REGION_MAP: RegionMap = [
  [0, 0, 0, 0, 0, 1, 1, 1, 1],
  [2, 2, 0, 0, 3, 3, 1, 1, 1],
  [2, 2, 0, 0, 3, 1, 1, 4, 4],
  [2, 3, 3, 3, 3, 4, 4, 4, 4],
  [2, 2, 2, 2, 3, 4, 5, 5, 5],
  [6, 6, 6, 6, 3, 4, 7, 5, 5],
  [6, 6, 6, 8, 8, 4, 7, 5, 5],
  [6, 6, 8, 8, 8, 7, 7, 7, 5],
  [8, 8, 8, 8, 7, 7, 7, 7, 5],
];

const IRREGULAR_FULL_BOARD: GameBoard = [
  [2, 3, 6, 9, 4, 7, 5, 8, 1],
  [5, 2, 7, 8, 6, 1, 3, 9, 4],
  [3, 4, 1, 5, 9, 6, 2, 7, 8],
  [8, 5, 2, 4, 7, 9, 1, 3, 6],
  [6, 1, 9, 7, 3, 5, 8, 4, 2],
  [1, 7, 5, 2, 8, 4, 9, 6, 3],
  [9, 8, 3, 6, 5, 2, 4, 1, 7],
  [4, 6, 8, 1, 2, 3, 7, 5, 9],
  [7, 9, 4, 3, 1, 8, 6, 2, 5],
];

export const getRegionId = (regionMap: RegionMap, row: number, col: number): number => regionMap[row][col];

export const isValidRegionMap = (regionMap: RegionMap): boolean => {
  if (regionMap.length !== 9 || regionMap.some((row) => row.length !== 9)) {
    return false;
  }

  const cellsByRegion = Array.from({ length: 9 }, () => [] as Array<[number, number]>);

  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      const regionId = regionMap[row][col];
      if (!Number.isInteger(regionId) || regionId < 0 || regionId > 8) {
        return false;
      }
      cellsByRegion[regionId].push([row, col]);
    }
  }

  return cellsByRegion.every((cells) => cells.length === 9 && isConnectedRegion(cells));
};

const isConnectedRegion = (cells: Array<[number, number]>): boolean => {
  if (cells.length === 0) return false;

  const cellSet = new Set(cells.map(([row, col]) => `${row}-${col}`));
  const seen = new Set<string>();
  const queue: Array<[number, number]> = [cells[0]];
  seen.add(`${cells[0][0]}-${cells[0][1]}`);

  for (let index = 0; index < queue.length; index++) {
    const [row, col] = queue[index];
    const neighbors: Array<[number, number]> = [
      [row - 1, col],
      [row + 1, col],
      [row, col - 1],
      [row, col + 1],
    ];

    for (const [nextRow, nextCol] of neighbors) {
      const key = `${nextRow}-${nextCol}`;
      if (cellSet.has(key) && !seen.has(key)) {
        seen.add(key);
        queue.push([nextRow, nextCol]);
      }
    }
  }

  return seen.size === cells.length;
};

const isSameRegionMap = (left: RegionMap, right: RegionMap): boolean =>
  left.length === right.length &&
  left.every((row, rowIndex) => row.length === right[rowIndex].length && row.every((cell, colIndex) => cell === right[rowIndex][colIndex]));

const randomizeDigits = (board: GameBoard): GameBoard => {
  const shuffledDigits = shuffleArray([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  const digitMap = new Map(shuffledDigits.map((digit, index) => [index + 1, digit]));

  return board.map((row) => row.map((cell) => digitMap.get(cell) ?? cell));
};

export const isPlacementValid = (
  board: GameBoard,
  row: number,
  col: number,
  num: number,
  regionMap: RegionMap
): boolean => {
  for (let c = 0; c < 9; c++) {
    if (c !== col && board[row][c] === num) return false;
  }

  for (let r = 0; r < 9; r++) {
    if (r !== row && board[r][col] === num) return false;
  }

  const targetRegion = getRegionId(regionMap, row, col);
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if ((r !== row || c !== col) && getRegionId(regionMap, r, c) === targetRegion && board[r][c] === num) {
        return false;
      }
    }
  }

  return true;
};

const fillBoard = (board: GameBoard, regionMap: RegionMap): boolean => {
  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      if (board[row][col] !== 0) continue;

      const numbers = shuffleArray([1, 2, 3, 4, 5, 6, 7, 8, 9]);
      for (const num of numbers) {
        if (isPlacementValid(board, row, col, num, regionMap)) {
          board[row][col] = num;
          if (fillBoard(board, regionMap)) {
            return true;
          }
          board[row][col] = 0;
        }
      }

      return false;
    }
  }

  return true;
};

export const generateFullBoard = (regionMap: RegionMap): GameBoard => {
  if (!isValidRegionMap(regionMap)) {
    throw new Error('Invalid sudoku region map');
  }

  if (isSameRegionMap(regionMap, IRREGULAR_REGION_MAP)) {
    return randomizeDigits(IRREGULAR_FULL_BOARD);
  }

  const board = createEmptyBoard();
  if (!fillBoard(board, regionMap)) {
    throw new Error('Unable to generate sudoku board');
  }
  return board;
};

const getRemovalCount = (difficulty: Difficulty) => {
  switch (difficulty) {
    case 'easy':
      return 35;
    case 'medium':
      return 45;
    case 'hard':
      return 55;
    default:
      return 45;
  }
};

export const generatePuzzle = (difficulty: Difficulty, regionMap: RegionMap): GameBoard => {
  const fullBoard = generateFullBoard(regionMap);
  const puzzle = fullBoard.map((row) => [...row]);
  const positions = Array.from({ length: 81 }, (_, idx) => idx);
  const toRemove = shuffleArray(positions).slice(0, getRemovalCount(difficulty));

  for (const idx of toRemove) {
    const row = Math.floor(idx / 9);
    const col = idx % 9;
    puzzle[row][col] = 0;
  }

  return puzzle;
};

export const getRegionNeighbors = (regionMap: RegionMap, row: number, col: number) => {
  const regionId = getRegionId(regionMap, row, col);

  return {
    top: row === 0 || getRegionId(regionMap, row - 1, col) !== regionId,
    right: col === 8 || getRegionId(regionMap, row, col + 1) !== regionId,
    bottom: row === 8 || getRegionId(regionMap, row + 1, col) !== regionId,
    left: col === 0 || getRegionId(regionMap, row, col - 1) !== regionId,
  };
};

export const getRegionMapByMode = (mode: GameMode): RegionMap =>
  mode === 'irregular' ? IRREGULAR_REGION_MAP : STANDARD_REGION_MAP;
