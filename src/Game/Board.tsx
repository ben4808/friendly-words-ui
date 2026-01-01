import React from 'react';
import styles from './Game.module.scss';
import type { GameState } from './types';
import { getBonusType, getBonusText, BOARD_SIZE } from './constants';
import { calculatePlayScore } from './scoring';

interface BoardProps {
  gameState: GameState;
  onSquareClick: (row: number, col: number) => void;
}

const Board: React.FC<BoardProps> = ({ gameState, onSquareClick }) => {
  const currentPlayResult = gameState.currentPlay.length > 0 ?
    calculatePlayScore(gameState.board, gameState.currentPlay, gameState.dictionary) : null;

  const renderBoard = () => {
    const squares = [];

    // Calculate play bounds for score display
    let minRow = Infinity, maxRow = -Infinity, minCol = Infinity, maxCol = -Infinity;
    if (gameState.currentPlay.length > 0) {
      gameState.currentPlay.forEach(play => {
        minRow = Math.min(minRow, play.row);
        maxRow = Math.max(maxRow, play.row);
        minCol = Math.min(minCol, play.col);
        maxCol = Math.max(maxCol, play.col);
      });
    }

    for (let row = 0; row < BOARD_SIZE; row++) {
      for (let col = 0; col < BOARD_SIZE; col++) {
        const bonusType = getBonusType(row, col);
        const bonusText = getBonusText(bonusType);
        const boardTile = gameState.board[row][col];
        const hasTile = boardTile !== null;
        const isSelected = gameState.selectedSquare?.row === row && gameState.selectedSquare?.col === col;
        const isInCurrentPlay = gameState.currentPlay.some(play => play.row === row && play.col === col);

        squares.push(
          <div
            key={`${row}-${col}`}
            className={`${styles.square} ${bonusType ? styles[bonusType] : ''} ${hasTile ? styles.hasTile : ''} ${isSelected ? styles.selected : ''} ${isInCurrentPlay ? styles.inCurrentPlay : ''}`}
            onClick={() => onSquareClick(row, col)}
          >
            {hasTile ? (
              <>
                <span className={`${styles.tileLetter} ${boardTile!.isBlank ? styles.blankLetter : ''}`}>
                  {boardTile!.letter}
                </span>
                {!boardTile!.isBlank && <span className={styles.tileValue}>{boardTile!.value}</span>}
              </>
            ) : bonusText}
            {isSelected && (
              <div className={`${styles.directionArrow} ${styles[gameState.playDirection]}`}>
                {gameState.playDirection === 'across' ? '▶' : '▼'}
              </div>
            )}
            {/* Score display positioned at bottom-right of play area */}
            {row === maxRow && col === maxCol && gameState.currentPlay.length > 0 && currentPlayResult && (
              <div className={`${styles.scoreCircle} ${!currentPlayResult.isValid ? styles.invalidPlay : ''}`}>
                {currentPlayResult.isValid ? currentPlayResult.score : '✗'}
              </div>
            )}
          </div>
        );
      }
    }
    return squares;
  };

  return (
    <div className={styles.board}>
      {renderBoard()}
    </div>
  );
};

export default Board;
