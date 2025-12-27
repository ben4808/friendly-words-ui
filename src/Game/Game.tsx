import React, { useState, useEffect, useContext } from 'react';
import styles from './Game.module.scss';
import Board from './Board';
import {
  DictionaryContext
} from './types';
import type {
  GameProps,
  GameState,
  BoardTile
} from './types';
import { BOARD_SIZE } from './constants';
import { createTilePool } from './tileUtils';
import {
  useGameHandlers,
  useKeyboardInput,
  useSquareSelection
} from './gameLogic';

const Game: React.FC<GameProps> = ({ players }) => {
  const dictionary = useContext(DictionaryContext);

  // Initialize game state
  const [gameState, setGameState] = useState<GameState>(() => {
    const initialBoard: (BoardTile | null)[][] = Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(null));

    return {
      players: players.map(player => ({ ...player, rack: [] })), // Initialize with empty racks
      currentPlayerIndex: Math.floor(Math.random() * players.length), // Random starting player
      tilePool: createTilePool(),
      board: initialBoard,
      selectedSquare: null,
      playDirection: 'across',
      currentPlay: [],
      gamePhase: 'ready',
      dictionary, // Use dictionary from context
      exchangeMode: false,
      tilesToExchange: [],
      blankDesignationPrompt: null
    };
  });

  const currentPlayer = gameState.players[gameState.currentPlayerIndex];

  // Use extracted hooks for game logic
  const {
    handleTileClick,
    handleBlankDesignation,
    handleBlankCancel,
    handleExchange,
    handleReady,
    handleSubmit
  } = useGameHandlers(gameState, setGameState);

  const handleKeyPress = useKeyboardInput(gameState, setGameState);
  const handleSquareClick = useSquareSelection(gameState, setGameState);

  // Keyboard input handling
  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handleKeyPress]);

  return (
    <div className={styles.game}>
      <div className={styles.boardSection}>
        <Board gameState={gameState} onSquareClick={handleSquareClick} />
      </div>

      <div className={styles.sidebarSection}>
        <div className={styles.scoresSection}>
          <div className={styles.players}>
            {gameState.players.map((player, index) => (
              <div key={index} className={styles.player}>
                <div className={styles.playerName}>{player.name}</div>
                <div className={styles.playerScore}>{player.score}</div>
              </div>
            ))}
          </div>
        </div>

        <div className={styles.rackSection}>
          {gameState.gamePhase === 'ready' ? (
            <div className={styles.readyMessage}>
              {currentPlayer.name} Ready?
            </div>
          ) : (
            <div className={styles.rack}>
              {currentPlayer.rack.map((tile, index) => (
                <div
                  key={index}
                  className={`${styles.tile} ${gameState.tilesToExchange.includes(index) ? styles.selectedForExchange : ''}`}
                  onClick={() => handleTileClick(index)}
                >
                  <span className={styles.tileLetter}>{tile.letter}</span>
                  <span className={styles.tileValue}>{tile.value}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className={styles.controlsSection}>
          {gameState.gamePhase === 'gameOver' ? (
            <div className={styles.gameOverSection}>
              <h3>Game Over!</h3>
              <div className={styles.finalScores}>
                {gameState.players
                  .sort((a, b) => b.score - a.score)
                  .map((player, index) => (
                    <div key={index} className={styles.finalScore}>
                      <span className={styles.finalPlayerName}>{player.name}</span>
                      <span className={styles.finalPlayerScore}>{player.score}</span>
                    </div>
                  ))}
              </div>
              <button className={styles.newGameButton}>New Game</button>
            </div>
          ) : gameState.gamePhase === 'ready' ? (
            <button className={styles.submitButton} onClick={handleReady}>Ready</button>
          ) : (
            <>
              <button
                className={styles.submitButton}
                onClick={handleSubmit}
                disabled={gameState.exchangeMode ? gameState.tilesToExchange.length === 0 : gameState.currentPlay.length === 0}
              >
                {gameState.exchangeMode ? 'Exchange' : 'Submit'}
              </button>
              <button className={styles.exchangeButton} onClick={handleExchange}>
                {gameState.exchangeMode ? 'Cancel Exchange' : 'Exchange'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Blank Designation Prompt */}
      {gameState.blankDesignationPrompt?.show && (
        <div className={styles.blankPromptOverlay}>
          <div className={styles.blankPrompt}>
            <h3>Designate Blank Tile</h3>
            <p>Choose a letter for your blank tile:</p>
            <div className={styles.letterGrid}>
              {'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map(letter => (
                <button
                  key={letter}
                  className={styles.letterButton}
                  onClick={() => handleBlankDesignation(letter)}
                >
                  {letter}
                </button>
              ))}
            </div>
            <button className={styles.cancelButton} onClick={handleBlankCancel}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export { DictionaryContext } from './types';
export default Game;
