import type { Tile, BoardTile } from './types';
import { BOARD_SIZE, TRIPLE_LETTER_SQUARES, DOUBLE_LETTER_SQUARES, TRIPLE_WORD_SQUARES, DOUBLE_WORD_SQUARES } from './constants';

export interface PlayValidationResult {
  isValid: boolean;
  score: number;
  invalidReason?: string;
}

// Validation functions
export const validateContinuousLine = (board: (BoardTile | null)[][], currentPlay: { row: number; col: number; tile: Tile; isBlank?: boolean }[]): boolean => {
  if (currentPlay.length === 0) return true;
  if (currentPlay.length === 1) return true;

  // Group positions by row and column to determine direction
  const rows = new Set(currentPlay.map(play => play.row));
  const cols = new Set(currentPlay.map(play => play.col));

  // All tiles must be in same row (horizontal) or same column (vertical)
  const isHorizontal = rows.size === 1;
  const isVertical = cols.size === 1;

  if (!isHorizontal && !isVertical) {
    return false; // Tiles are scattered, not in a line
  }

  // Sort positions to check continuity
  const positions = currentPlay.map(play => ({ row: play.row, col: play.col }));

  if (isHorizontal) {
    // Check horizontal continuity
    positions.sort((a, b) => a.col - b.col);

    const row = positions[0].row;

    // Check if positions form a continuous sequence (allowing gaps where existing tiles are)
    for (let i = 0; i < positions.length - 1; i++) {
      const currentCol = positions[i].col;
      const nextCol = positions[i + 1].col;

      // Check that gaps between played tiles are filled with existing tiles
      for (let col = currentCol + 1; col < nextCol; col++) {
        if (!board[row][col]) {
          return false; // Gap not filled with existing tile
        }
      }
    }
  } else {
    // Check vertical continuity
    positions.sort((a, b) => a.row - b.row);

    const col = positions[0].col;

    // Check if positions form a continuous sequence
    for (let i = 0; i < positions.length - 1; i++) {
      const currentRow = positions[i].row;
      const nextRow = positions[i + 1].row;

      // Check that gaps between played tiles are filled with existing tiles
      for (let row = currentRow + 1; row < nextRow; row++) {
        if (!board[row][col]) {
          return false; // Gap not filled with existing tile
        }
      }
    }
  }

  return true;
};

// Scoring functions
export const getLetterMultiplier = (row: number, col: number): number => {
  if (TRIPLE_LETTER_SQUARES.some(([r, c]) => r === row && c === col)) return 3;
  if (DOUBLE_LETTER_SQUARES.some(([r, c]) => r === row && c === col)) return 2;
  return 1;
};

export const getWordMultiplier = (row: number, col: number): number => {
  if (TRIPLE_WORD_SQUARES.some(([r, c]) => r === row && c === col)) return 3;
  if (DOUBLE_WORD_SQUARES.some(([r, c]) => r === row && c === col)) return 2;
  return 1;
};

// Helper function to find the start position of a word
export const findWordStart = (board: (BoardTile | null)[][], row: number, col: number, direction: 'across' | 'down'): { startRow: number; startCol: number } => {
  let startRow = row;
  let startCol = col;

  if (direction === 'across') {
    while (startCol > 0 && board[startRow][startCol - 1]) startCol--;
  } else {
    while (startRow > 0 && board[startRow - 1][startCol]) startRow--;
  }

  return { startRow, startCol };
};

export const extractWord = (board: (BoardTile | null)[][], startRow: number, startCol: number, direction: 'across' | 'down'): string => {
  let word = '';
  let row = startRow;
  let col = startCol;

  // Extract word
  while (row < BOARD_SIZE && col < BOARD_SIZE && board[row][col]) {
    word += board[row][col]!.letter;
    if (direction === 'across') {
      col++;
    } else {
      row++;
    }
  }

  return word;
};

// Find all unique words formed by the current play
export const findUniqueWords = (board: (BoardTile | null)[][], currentPlay: { row: number; col: number; tile: Tile; isBlank?: boolean }[]): { startRow: number; startCol: number; direction: 'across' | 'down' }[] => {
  const uniqueWords = new Set<string>();

  for (const play of currentPlay) {
    // Check across word
    const acrossStart = findWordStart(board, play.row, play.col, 'across');
    const acrossKey = `across-${acrossStart.startRow}-${acrossStart.startCol}`;
    uniqueWords.add(acrossKey);

    // Check down word
    const downStart = findWordStart(board, play.row, play.col, 'down');
    const downKey = `down-${downStart.startRow}-${downStart.startCol}`;
    uniqueWords.add(downKey);
  }

  return Array.from(uniqueWords).map(key => {
    const [direction, startRow, startCol] = key.split('-');
    return {
      startRow: parseInt(startRow),
      startCol: parseInt(startCol),
      direction: direction as 'across' | 'down'
    };
  }).filter(word => extractWord(board, word.startRow, word.startCol, word.direction).length > 1);
};

// Check if a word includes existing tiles (not played in current turn)
export const wordIncludesExistingTile = (
  board: (BoardTile | null)[][],
  startRow: number,
  startCol: number,
  direction: 'across' | 'down',
  playedPositions: Set<string>
): boolean => {
  let row = startRow;
  let col = startCol;

  while (row < BOARD_SIZE && col < BOARD_SIZE && board[row][col]) {
    if (!playedPositions.has(`${row},${col}`)) {
      return true;
    }
    if (direction === 'across') {
      col++;
    } else {
      row++;
    }
  }

  return false;
};

// Calculate the base score for a word (sum of letter values without multipliers)
export const calculateBaseScore = (board: (BoardTile | null)[][], startRow: number, startCol: number, direction: 'across' | 'down'): number => {
  let baseScore = 0;
  let row = startRow;
  let col = startCol;

  while (row < BOARD_SIZE && col < BOARD_SIZE && board[row][col]) {
    baseScore += board[row][col]!.value;
    if (direction === 'across') {
      col++;
    } else {
      row++;
    }
  }

  return baseScore;
};

// Apply letter multipliers to new tiles and calculate adjusted score
export const calculateScoreWithLetterMultipliers = (
  board: (BoardTile | null)[][],
  startRow: number,
  startCol: number,
  direction: 'across' | 'down',
  playedPositions: Set<string>
): { score: number; wordMultiplier: number } => {
  let adjustedScore = 0;
  let wordMultiplier = 1;
  let row = startRow;
  let col = startCol;

  while (row < BOARD_SIZE && col < BOARD_SIZE && board[row][col]) {
    const tile = board[row][col]!;
    const positionKey = `${row},${col}`;
    const isNewTile = playedPositions.has(positionKey);

    if (isNewTile) {
      const letterMultiplier = getLetterMultiplier(row, col);
      adjustedScore += tile.value * letterMultiplier;

      const positionMultiplier = getWordMultiplier(row, col);
      wordMultiplier *= positionMultiplier;
    } else {
      adjustedScore += tile.value;
    }

    if (direction === 'across') {
      col++;
    } else {
      row++;
    }
  }

  return { score: adjustedScore, wordMultiplier };
};

// Calculate the final word score with word multipliers applied
export const calculateWordScore = (
  board: (BoardTile | null)[][],
  startRow: number,
  startCol: number,
  direction: 'across' | 'down',
  playedPositions: Set<string>
): number => {
  const { score, wordMultiplier } = calculateScoreWithLetterMultipliers(board, startRow, startCol, direction, playedPositions);
  return score * wordMultiplier;
};

export const calculatePlayScore = (board: (BoardTile | null)[][], currentPlay: { row: number; col: number; tile: Tile; isBlank?: boolean }[], dictionary: { [word: string]: number }): PlayValidationResult => {
  if (currentPlay.length === 0) return { isValid: false, score: 0, invalidReason: 'No tiles played' };

  // Check if all played tiles are in one continuous line
  if (!validateContinuousLine(board, currentPlay)) {
    return { isValid: false, score: 0, invalidReason: 'Tiles must be placed in one continuous line' };
  }

  const playedPositions = new Set(currentPlay.map(play => `${play.row},${play.col}`));

  // Find all unique words formed by this play
  const uniqueWords = findUniqueWords(board, currentPlay);

  // Calculate score for each unique word and check validity
  let totalScore = 0;
  let invalidWord = '';

  for (const { startRow, startCol, direction } of uniqueWords) {
    const word = extractWord(board, startRow, startCol, direction);
    const score = calculateWordScore(board, startRow, startCol, direction, playedPositions);

    // Apply dictionary multiplier
    const multiplier = dictionary[word.toUpperCase()];
    if (multiplier === undefined) {
      invalidWord = word;
      break; // Invalid word found
    }
    totalScore += score * multiplier;
  }

  if (invalidWord) {
    return { isValid: false, score: 0, invalidReason: `Invalid word: ${invalidWord}` };
  }

  // Check if play connects to existing tiles (except first play)
  const hasExistingTiles = board.some(row =>
    row.some(tile => tile && !playedPositions.has(`${board.indexOf(row)},${row.indexOf(tile)}`))
  );

  const isFirstPlay = !hasExistingTiles;
  if (isFirstPlay) {
    // Check if first play covers the center square
    const coversCenterSquare = currentPlay.some(play => play.row === 7 && play.col === 7);
    if (!coversCenterSquare) {
      return { isValid: false, score: 0, invalidReason: 'First word must cover the center square' };
    }
  } else {
    // Check if at least one word includes existing tiles
    const hasWordWithExistingTile = uniqueWords.some(({ startRow, startCol, direction }) =>
      wordIncludesExistingTile(board, startRow, startCol, direction, playedPositions)
    );
    if (!hasWordWithExistingTile) {
      return { isValid: false, score: 0, invalidReason: 'At least one word must include existing tiles' };
    }
  }

  return { isValid: true, score: totalScore };
};
