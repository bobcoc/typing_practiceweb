import {
  createEmptyBoard,
  generateFullBoard,
  generatePuzzle,
  getRegionId,
  getRegionNeighbors,
  IRREGULAR_REGION_MAP,
  isValidRegionMap,
  isPlacementValid,
  STANDARD_REGION_MAP,
} from './sudokuEngine';

const expectSolvedBoard = (board: number[][], regionMap: number[][]) => {
  const expected = [1, 2, 3, 4, 5, 6, 7, 8, 9];
  const sortNumbers = (values: number[]) => [...values].sort((a, b) => a - b);

  for (let index = 0; index < 9; index++) {
    expect(sortNumbers(board[index])).toEqual(expected);
    expect(sortNumbers(board.map((row) => row[index]))).toEqual(expected);

    const regionValues = board.flatMap((row, rowIndex) =>
      row.filter((_, colIndex) => regionMap[rowIndex][colIndex] === index)
    );
    expect(sortNumbers(regionValues)).toEqual(expected);
  }
};

describe('sudokuEngine', () => {
  test('standard region map groups cells by 3x3 boxes', () => {
    expect(getRegionId(STANDARD_REGION_MAP, 0, 0)).toBe(getRegionId(STANDARD_REGION_MAP, 2, 2));
    expect(getRegionId(STANDARD_REGION_MAP, 0, 0)).not.toBe(getRegionId(STANDARD_REGION_MAP, 0, 3));
  });

  test('irregular region map has 9 connected regions with 9 cells each', () => {
    expect(isValidRegionMap(IRREGULAR_REGION_MAP)).toBe(true);
  });

  test('isPlacementValid uses irregular regions instead of 3x3 boxes', () => {
    const board = createEmptyBoard();
    board[0][0] = 5;

    expect(isPlacementValid(board, 1, 2, 5, IRREGULAR_REGION_MAP)).toBe(false);

    const sameStandardBoxDifferentIrregularRegion = [1, 1] as const;
    expect(getRegionId(IRREGULAR_REGION_MAP, 0, 0)).not.toBe(
      getRegionId(IRREGULAR_REGION_MAP, sameStandardBoxDifferentIrregularRegion[0], sameStandardBoxDifferentIrregularRegion[1])
    );
    expect(isPlacementValid(board, sameStandardBoxDifferentIrregularRegion[0], sameStandardBoxDifferentIrregularRegion[1], 5, IRREGULAR_REGION_MAP)).toBe(true);
  });

  test('generatePuzzle creates a 9x9 puzzle with blanks for irregular mode', () => {
    const puzzle = generatePuzzle('medium', IRREGULAR_REGION_MAP);

    expect(puzzle).toHaveLength(9);
    expect(puzzle.every((row) => row.length === 9)).toBe(true);
    expect(puzzle.flat().some((cell) => cell === 0)).toBe(true);
  });

  test('generateFullBoard creates a solved irregular board', () => {
    const board = generateFullBoard(IRREGULAR_REGION_MAP);

    expectSolvedBoard(board, IRREGULAR_REGION_MAP);
  });

  test('region neighbors mark borders only when region changes', () => {
    const border = getRegionNeighbors(IRREGULAR_REGION_MAP, 0, 0);

    expect(border.top).toBe(true);
    expect(border.left).toBe(true);
    expect(typeof border.right).toBe('boolean');
    expect(typeof border.bottom).toBe('boolean');
  });
});
