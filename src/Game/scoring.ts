import type { Tile, BoardTile } from './types';
import { BOARD_SIZE, TRIPLE_LETTER_SQUARES, DOUBLE_LETTER_SQUARES, TRIPLE_WORD_SQUARES, DOUBLE_WORD_SQUARES } from './constants';

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

export const extractWord = (board: (BoardTile | null)[][], startRow: number, startCol: number, direction: 'across' | 'down'): string => {
  let word = '';
  let row = startRow;
  let col = startCol;

  // Find start of word
  if (direction === 'across') {
    while (col > 0 && board[row][col - 1]) col--;
  } else {
    while (row > 0 && board[row - 1][col]) row--;
  }

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

export const calculateWordScore = (board: (BoardTile | null)[][], startRow: number, startCol: number, direction: 'across' | 'down', playedPositions: Set<string>): number => {
  let wordScore = 0;
  let wordMultiplier = 1;
  let row = startRow;
  let col = startCol;

  // Find start of word
  if (direction === 'across') {
    while (col > 0 && board[row][col - 1]) col--;
  } else {
    while (row > 0 && board[row - 1][col]) row--;
  }

  // Calculate score
  while (row < BOARD_SIZE && col < BOARD_SIZE && board[row][col]) {
    const tile = board[row][col]!;
    const positionKey = `${row},${col}`;
    const isNewTile = playedPositions.has(positionKey);

    if (isNewTile) {
      const letterMultiplier = getLetterMultiplier(row, col);
      const tileScore = tile.value * letterMultiplier;
      wordScore += tileScore;

      const positionMultiplier = getWordMultiplier(row, col);
      wordMultiplier *= positionMultiplier;
    } else {
      wordScore += tile.value;
    }

    if (direction === 'across') {
      col++;
    } else {
      row++;
    }
  }

  return wordScore * wordMultiplier;
};

export const calculatePlayScore = (board: (BoardTile | null)[][], currentPlay: { row: number; col: number; tile: Tile; isBlank?: boolean }[], dictionary: { [word: string]: number }): number => {
  if (currentPlay.length === 0) return 0;

  const playedPositions = new Set(currentPlay.map(play => `${play.row},${play.col}`));
  const words: { word: string; score: number }[] = [];

  // Find all words formed by this play
  const processedWords = new Set<string>();

  for (const play of currentPlay) {
    // Check across word
    const acrossWord = extractWord(board, play.row, play.col, 'across');
    if (acrossWord.length > 1 && !processedWords.has(`across-${play.row}-${play.col}`)) {
      const score = calculateWordScore(board, play.row, play.col, 'across', playedPositions);
      words.push({ word: acrossWord, score });
      processedWords.add(`across-${play.row}-${play.col}`);
    }

    // Check down word
    const downWord = extractWord(board, play.row, play.col, 'down');
    if (downWord.length > 1 && !processedWords.has(`down-${play.row}-${play.col}`)) {
      const score = calculateWordScore(board, play.row, play.col, 'down', playedPositions);
      words.push({ word: downWord, score });
      processedWords.add(`down-${play.row}-${play.col}`);
    }
  }

  // Check if all words are valid and apply dictionary multipliers
  let totalScore = 0;
  for (const { word, score } of words) {
    const multiplier = dictionary[word.toLowerCase()] || 1;
    if (multiplier === 0) return 0; // Invalid word
    totalScore += score * multiplier;
  }

  // Check if play connects to existing tiles (except first play)
  const hasExistingTiles = board.some(row =>
    row.some(tile => tile && !playedPositions.has(`${board.indexOf(row)},${row.indexOf(tile)}`))
  );

  const isFirstPlay = !hasExistingTiles;
  if (!isFirstPlay) {
    const connectsToExisting = currentPlay.some(play => {
      const { row, col } = play;
      // Check adjacent squares for existing tiles
      return (
        (row > 0 && board[row - 1][col] && !playedPositions.has(`${row - 1},${col}`)) ||
        (row < BOARD_SIZE - 1 && board[row + 1][col] && !playedPositions.has(`${row + 1},${col}`)) ||
        (col > 0 && board[row][col - 1] && !playedPositions.has(`${row},${col - 1}`)) ||
        (col < BOARD_SIZE - 1 && board[row][col + 1] && !playedPositions.has(`${row},${col + 1}`))
      );
    });

    if (!connectsToExisting) return 0; // Play doesn't connect
  }

  return totalScore;
};
