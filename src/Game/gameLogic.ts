import { useCallback } from 'react';
import type { GameState } from './types';
import { BOARD_SIZE, BINGO_BONUS } from './constants';
import { drawTiles, getTileValue } from './tileUtils';
import { calculatePlayScore, type PlayValidationResult } from './scoring';

export const useGameHandlers = (
  gameState: GameState,
  setGameState: React.Dispatch<React.SetStateAction<GameState>>
) => {
  const handleTileClick = useCallback((tileIndex: number) => {
    if (gameState.gamePhase !== 'playing') return;

    if (gameState.exchangeMode) {
      // In exchange mode, toggle tile selection for exchange
      setGameState(prev => {
        const tilesToExchange = prev.tilesToExchange.includes(tileIndex)
          ? prev.tilesToExchange.filter(i => i !== tileIndex)
          : [...prev.tilesToExchange, tileIndex];
        return { ...prev, tilesToExchange };
      });
    } else {
      // Check if blank tile clicked manually
      const playerRack = gameState.players[gameState.currentPlayerIndex].rack;
      const tile = playerRack[tileIndex];

      if (tile && tile.letter === '' && tile.value === 0) {
        // Show blank designation prompt
        setGameState(prev => ({
          ...prev,
          blankDesignationPrompt: { tileIndex, show: true }
        }));
        return;
      }

      // If no square selected and not a blank tile, do nothing
      if (!gameState.selectedSquare) return;
    }

    if (gameState.selectedSquare) {
      // Normal tile placement
      const { row, col } = gameState.selectedSquare;
      const playerRack = gameState.players[gameState.currentPlayerIndex].rack;
      const tile = playerRack[tileIndex];

      if (!tile) return;

      // Check if square has a pre-existing tile (not played this turn)
      const existingTile = gameState.board[row][col];
      const existingCurrentPlayIndex = gameState.currentPlay.findIndex(play => play.row === row && play.col === col);
      if (existingTile && existingCurrentPlayIndex === -1) return;

      setGameState(prev => {
        const newBoard = prev.board.map(boardRow => [...boardRow]);
        newBoard[row][col] = {
          letter: tile.letter,
          value: tile.value,
          isBlank: tile.letter === '' && tile.value === 0,
          playedBy: prev.currentPlayerIndex
        };

        // Remove tile from rack
        const updatedPlayers = [...prev.players];
        updatedPlayers[prev.currentPlayerIndex] = {
          ...updatedPlayers[prev.currentPlayerIndex],
          rack: updatedPlayers[prev.currentPlayerIndex].rack.filter((_, index) => index !== tileIndex)
        };

        let newCurrentPlay = [...prev.currentPlay];

        // If replacing a tile played this turn, return it to rack and remove from current play
        if (existingTile && existingCurrentPlayIndex !== -1) {
          const tileToReturn = prev.currentPlay[existingCurrentPlayIndex].tile;
          updatedPlayers[prev.currentPlayerIndex] = {
            ...updatedPlayers[prev.currentPlayerIndex],
            rack: [...updatedPlayers[prev.currentPlayerIndex].rack, tileToReturn]
          };
          newCurrentPlay = newCurrentPlay.filter((_, index) => index !== existingCurrentPlayIndex);
        }

        // Add to current play
        newCurrentPlay.push({
          row,
          col,
          tile: { letter: tile.letter, value: tile.value },
          isBlank: tile.letter === '' && tile.value === 0
        });

        // Move to next square in direction, skipping pre-existing letters
        let nextSquare = null;
        if (prev.playDirection === 'across') {
          for (let c = col + 1; c < BOARD_SIZE; c++) {
            const boardTile = newBoard[row][c];
            if (!boardTile || prev.currentPlay.some(play => play.row === row && play.col === c)) {
              nextSquare = { row, col: c };
              break;
            }
          }
        } else {
          for (let r = row + 1; r < BOARD_SIZE; r++) {
            const boardTile = newBoard[r][col];
            if (!boardTile || prev.currentPlay.some(play => play.row === r && play.col === col)) {
              nextSquare = { row: r, col };
              break;
            }
          }
        }

        return {
          ...prev,
          board: newBoard,
          players: updatedPlayers,
          currentPlay: newCurrentPlay,
          selectedSquare: nextSquare
        };
      });
    }
  }, [gameState.gamePhase, gameState.exchangeMode, gameState.selectedSquare, gameState.players, gameState.currentPlayerIndex, gameState.playDirection, gameState.currentPlay]);

  const handleBlankDesignation = useCallback((letter: string) => {
    if (!gameState.blankDesignationPrompt || !gameState.selectedSquare) return;

    const { tileIndex } = gameState.blankDesignationPrompt;
    const { row, col } = gameState.selectedSquare;
    const playerRack = gameState.players[gameState.currentPlayerIndex].rack;
    const tile = playerRack[tileIndex];

    if (!tile || tile.letter !== '' || tile.value !== 0) return;

    // Check if square has a pre-existing tile (not played this turn)
    const existingTile = gameState.board[row][col];
    const existingCurrentPlayIndex = gameState.currentPlay.findIndex(play => play.row === row && play.col === col);
    if (existingTile && existingCurrentPlayIndex === -1) return;

    setGameState(prev => {
      const newBoard = prev.board.map(boardRow => [...boardRow]);
      newBoard[row][col] = {
        letter,
        value: 0, // Blank tiles have no point value
        isBlank: true,
        playedBy: prev.currentPlayerIndex
      };

      // Remove tile from rack
      const updatedPlayers = [...prev.players];
      updatedPlayers[prev.currentPlayerIndex] = {
        ...updatedPlayers[prev.currentPlayerIndex],
        rack: updatedPlayers[prev.currentPlayerIndex].rack.filter((_, index) => index !== tileIndex)
      };

      let newCurrentPlay = [...prev.currentPlay];

      // If replacing a tile played this turn, return it to rack and remove from current play
      if (existingTile && existingCurrentPlayIndex !== -1) {
        const tileToReturn = prev.currentPlay[existingCurrentPlayIndex].tile;
        updatedPlayers[prev.currentPlayerIndex] = {
          ...updatedPlayers[prev.currentPlayerIndex],
          rack: [...updatedPlayers[prev.currentPlayerIndex].rack, tileToReturn]
        };
        newCurrentPlay = newCurrentPlay.filter((_, index) => index !== existingCurrentPlayIndex);
      }

      // Add to current play
      newCurrentPlay.push({
        row,
        col,
        tile: { letter, value: 0 },
        isBlank: true
      });

      // Move to next square in direction, skipping pre-existing letters
      let nextSquare = null;
      if (prev.playDirection === 'across') {
        for (let c = col + 1; c < BOARD_SIZE; c++) {
          const boardTile = newBoard[row][c];
          if (!boardTile || prev.currentPlay.some(play => play.row === row && play.col === c)) {
            nextSquare = { row, col: c };
            break;
          }
        }
      } else {
        for (let r = row + 1; r < BOARD_SIZE; r++) {
          const boardTile = newBoard[r][col];
          if (!boardTile || prev.currentPlay.some(play => play.row === r && play.col === col)) {
            nextSquare = { row: r, col };
            break;
          }
        }
      }

      return {
        ...prev,
        board: newBoard,
        players: updatedPlayers,
        currentPlay: newCurrentPlay,
        selectedSquare: nextSquare,
        blankDesignationPrompt: null
      };
    });
  }, [gameState.blankDesignationPrompt, gameState.selectedSquare, gameState.players, gameState.currentPlayerIndex, gameState.playDirection, gameState.currentPlay]);

  const handleBlankCancel = useCallback(() => {
    setGameState(prev => ({
      ...prev,
      blankDesignationPrompt: null
    }));
  }, []);

  const handleExchange = useCallback(() => {
    if (gameState.gamePhase !== 'playing') return;

    if (gameState.exchangeMode) {
      // Cancel exchange
      setGameState(prev => ({
        ...prev,
        exchangeMode: false,
        tilesToExchange: []
      }));
    } else {
      // Enter exchange mode
      setGameState(prev => ({
        ...prev,
        exchangeMode: true,
        selectedSquare: null,
        currentPlay: []
      }));
    }
  }, [gameState.gamePhase, gameState.exchangeMode]);

  const handleExchangeSubmit = useCallback(() => {
    if (!gameState.exchangeMode || gameState.tilesToExchange.length === 0) return;

    setGameState(prev => {
      const playerRack = prev.players[prev.currentPlayerIndex].rack;
      const tilesToExchangeTiles = prev.tilesToExchange.map(index => playerRack[index]).filter(Boolean);

      // Remove exchanged tiles from rack
      const newRack = playerRack.filter((_, index) => !prev.tilesToExchange.includes(index));

      // Draw new tiles
      const { tiles: newTiles, remainingPool } = drawTiles(prev.tilePool, tilesToExchangeTiles.length);

      // Add exchanged tiles back to pool
      const updatedPool = [...remainingPool, ...tilesToExchangeTiles];

      // Shuffle the pool
      for (let i = updatedPool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [updatedPool[i], updatedPool[j]] = [updatedPool[j], updatedPool[i]];
      }

      const updatedPlayers = [...prev.players];
      updatedPlayers[prev.currentPlayerIndex] = {
        ...updatedPlayers[prev.currentPlayerIndex],
        rack: [...newRack, ...newTiles]
      };

      // Move to next player
      const nextPlayerIndex = (prev.currentPlayerIndex + 1) % prev.players.length;

      return {
        ...prev,
        players: updatedPlayers,
        tilePool: updatedPool,
        currentPlayerIndex: nextPlayerIndex,
        exchangeMode: false,
        tilesToExchange: [],
        selectedSquare: null,
        playDirection: 'across',
        currentPlay: [],
        gamePhase: 'ready'
      };
    });
  }, [gameState.exchangeMode, gameState.tilesToExchange, gameState.players, gameState.currentPlayerIndex, gameState.tilePool]);

  const handleReady = useCallback(() => {
    if (gameState.gamePhase !== 'ready') return;

    setGameState(prev => {
      // Draw up to 7 tiles for the current player
      const { tiles: drawnTiles, remainingPool } = drawTiles(prev.tilePool, 7 - prev.players[prev.currentPlayerIndex].rack.length);

      // Update player's rack
      const updatedPlayers = [...prev.players];
      updatedPlayers[prev.currentPlayerIndex] = {
        ...updatedPlayers[prev.currentPlayerIndex],
        rack: [...updatedPlayers[prev.currentPlayerIndex].rack, ...drawnTiles]
      };

      return {
        ...prev,
        players: updatedPlayers,
        tilePool: remainingPool,
        gamePhase: 'playing'
      };
    });
  }, [gameState.gamePhase]);

  const isPlayValid = useCallback((): boolean => {
    if (gameState.currentPlay.length === 0) return false;
    const validationResult = calculatePlayScore(gameState.board, gameState.currentPlay, gameState.dictionary);
    return validationResult.isValid;
  }, [gameState.board, gameState.currentPlay, gameState.dictionary]);

  const handleSubmit = useCallback(() => {
    if (gameState.gamePhase !== 'playing') return;

    if (gameState.exchangeMode) {
      handleExchangeSubmit();
    } else {
      if (gameState.currentPlay.length === 0) return;

      const validationResult: PlayValidationResult = calculatePlayScore(gameState.board, gameState.currentPlay, gameState.dictionary);

      if (!validationResult.isValid) {
        // Invalid play - could show error message
        console.log('Invalid play:', validationResult.invalidReason);
        return;
      }

      setGameState(prev => {
        // Check for bingo bonus (using all tiles from rack)
        const bingoBonus = (prev.players[prev.currentPlayerIndex].rack.length === 0) ? BINGO_BONUS : 0;

        // Update player score
        const updatedPlayers = [...prev.players];
        updatedPlayers[prev.currentPlayerIndex] = {
          ...updatedPlayers[prev.currentPlayerIndex],
          score: updatedPlayers[prev.currentPlayerIndex].score + validationResult.score + bingoBonus
        };

        // Check for game end condition: player emptied rack and pool is empty
        const tilesNeeded = 7 - updatedPlayers[prev.currentPlayerIndex].rack.length;
        const { tiles: drawnTiles, remainingPool } = drawTiles(prev.tilePool, tilesNeeded);

        updatedPlayers[prev.currentPlayerIndex] = {
          ...updatedPlayers[prev.currentPlayerIndex],
          rack: [...updatedPlayers[prev.currentPlayerIndex].rack, ...drawnTiles]
        };

        // Game ends if player played all tiles and pool is now empty
        const playerEmptiedRack = tilesNeeded === 7;
        const poolIsEmpty = remainingPool.length === 0;

        if (playerEmptiedRack && poolIsEmpty) {
          // Calculate final scores: winner gets sum of all other players' remaining tiles
          const winnerIndex = prev.currentPlayerIndex;
          let totalRemainingValue = 0;

          // Sum all remaining tiles from other players
          prev.players.forEach((player, index) => {
            if (index !== winnerIndex) {
              player.rack.forEach(tile => {
                totalRemainingValue += tile.value;
              });
              // Subtract remaining tile values from other players
              updatedPlayers[index] = {
                ...updatedPlayers[index],
                score: updatedPlayers[index].score - player.rack.reduce((sum, tile) => sum + tile.value, 0)
              };
            }
          });

          // Add remaining tile values to winner
          updatedPlayers[winnerIndex] = {
            ...updatedPlayers[winnerIndex],
            score: updatedPlayers[winnerIndex].score + totalRemainingValue
          };

          return {
            ...prev,
            players: updatedPlayers,
            tilePool: remainingPool,
            gamePhase: 'gameOver'
          };
        }

        // Move to next player
        const nextPlayerIndex = (prev.currentPlayerIndex + 1) % prev.players.length;

        return {
          ...prev,
          players: updatedPlayers,
          tilePool: remainingPool,
          currentPlayerIndex: nextPlayerIndex,
          selectedSquare: null,
          playDirection: 'across',
          currentPlay: [],
          gamePhase: 'ready'
        };
      });
    }
  }, [gameState.gamePhase, gameState.exchangeMode, gameState.currentPlay, gameState.board, gameState.dictionary, gameState.players, gameState.currentPlayerIndex, gameState.tilePool, handleExchangeSubmit]);

  return {
    handleTileClick,
    handleBlankDesignation,
    handleBlankCancel,
    handleExchange,
    handleExchangeSubmit,
    handleReady,
    handleSubmit,
    isPlayValid
  };
};

export const useKeyboardInput = (
  gameState: GameState,
  setGameState: React.Dispatch<React.SetStateAction<GameState>>
) => {
  const handleKeyPress = useCallback((event: KeyboardEvent) => {
    if (gameState.gamePhase !== 'playing' || !gameState.selectedSquare) return;

    const key = event.key;
    const keyUpper = key.toUpperCase();

    if (key === 'Backspace') {
      const { row, col } = gameState.selectedSquare;
      const boardTile = gameState.board[row][col];
      const currentPlayTileIndex = gameState.currentPlay.findIndex(play => play.row === row && play.col === col);

      // Determine next square in opposite direction, skipping pre-existing letters
      let nextSquare = null;
      if (gameState.playDirection === 'across') {
        for (let c = col - 1; c >= 0; c--) {
          const tile = gameState.board[row][c];
          if (!tile || gameState.currentPlay.some(play => play.row === row && play.col === c)) {
            nextSquare = { row, col: c };
            break;
          }
        }
      } else {
        for (let r = row - 1; r >= 0; r--) {
          const tile = gameState.board[r][col];
          if (!tile || gameState.currentPlay.some(play => play.row === r && play.col === col)) {
            nextSquare = { row: r, col };
            break;
          }
        }
      }

      if (boardTile && currentPlayTileIndex !== -1) {
        // Square has a tile played this turn - remove it
        setGameState(prev => {
          const newBoard = prev.board.map(boardRow => [...boardRow]);
          newBoard[row][col] = null;

          // Add tile back to player's rack
          const updatedPlayers = [...prev.players];
          const tileToReturn = prev.currentPlay[currentPlayTileIndex].tile;
          updatedPlayers[prev.currentPlayerIndex] = {
            ...updatedPlayers[prev.currentPlayerIndex],
            rack: [...updatedPlayers[prev.currentPlayerIndex].rack, tileToReturn]
          };

          // Remove from current play
          const newCurrentPlay = prev.currentPlay.filter((_, index) => index !== currentPlayTileIndex);

          return {
            ...prev,
            board: newBoard,
            players: updatedPlayers,
            currentPlay: newCurrentPlay,
            selectedSquare: nextSquare
          };
        });
      } else {
        // Square is empty or has a tile not played this turn - just move selection
        setGameState(prev => ({
          ...prev,
          selectedSquare: nextSquare
        }));
      }
    } else if (keyUpper.length === 1 && keyUpper >= 'A' && keyUpper <= 'Z') {
      // Find tile in rack
      const playerRack = gameState.players[gameState.currentPlayerIndex].rack;
      const tileIndex = playerRack.findIndex(tile => tile.letter === keyUpper || (tile.letter === '' && tile.value === 0));

      if (tileIndex !== -1) {
        // Place tile on board
        const { row, col } = gameState.selectedSquare;
        const existingTile = gameState.board[row][col];
        const existingCurrentPlayIndex = gameState.currentPlay.findIndex(play => play.row === row && play.col === col);

        // Check if square has a pre-existing tile (not played this turn)
        if (existingTile && existingCurrentPlayIndex === -1) return;

        const isBlank = playerRack[tileIndex].letter === '' && playerRack[tileIndex].value === 0;

        setGameState(prev => {
          const newBoard = prev.board.map(boardRow => [...boardRow]);
          newBoard[row][col] = {
            letter: keyUpper,
            value: isBlank ? 0 : getTileValue(keyUpper),
            isBlank,
            playedBy: prev.currentPlayerIndex
          };

          // Remove tile from rack
          const updatedPlayers = [...prev.players];
          updatedPlayers[prev.currentPlayerIndex] = {
            ...updatedPlayers[prev.currentPlayerIndex],
            rack: updatedPlayers[prev.currentPlayerIndex].rack.filter((_, index) => index !== tileIndex)
          };

          let newCurrentPlay = [...prev.currentPlay];

          // If replacing a tile played this turn, return it to rack and remove from current play
          if (existingTile && existingCurrentPlayIndex !== -1) {
            const tileToReturn = prev.currentPlay[existingCurrentPlayIndex].tile;
            updatedPlayers[prev.currentPlayerIndex] = {
              ...updatedPlayers[prev.currentPlayerIndex],
              rack: [...updatedPlayers[prev.currentPlayerIndex].rack, tileToReturn]
            };
            newCurrentPlay = newCurrentPlay.filter((_, index) => index !== existingCurrentPlayIndex);
          }

          // Add new tile to current play
          newCurrentPlay.push({
            row,
            col,
            tile: { letter: keyUpper, value: isBlank ? 0 : getTileValue(keyUpper) },
            isBlank
          });

          // Move to next square in direction, skipping pre-existing letters
          let nextSquare = null;
          if (prev.playDirection === 'across') {
            for (let c = col + 1; c < BOARD_SIZE; c++) {
              const tile = newBoard[row][c];
              if (!tile || prev.currentPlay.some(play => play.row === row && play.col === c)) {
                nextSquare = { row, col: c };
                break;
              }
            }
          } else {
            for (let r = row + 1; r < BOARD_SIZE; r++) {
              const tile = newBoard[r][col];
              if (!tile || prev.currentPlay.some(play => play.row === r && play.col === col)) {
                nextSquare = { row: r, col };
                break;
              }
            }
          }

          return {
            ...prev,
            board: newBoard,
            players: updatedPlayers,
            currentPlay: newCurrentPlay,
            selectedSquare: nextSquare
          };
        });
      }
    }
  }, [gameState.gamePhase, gameState.selectedSquare, gameState.players, gameState.currentPlayerIndex, gameState.playDirection, gameState.currentPlay]);

  return handleKeyPress;
};

export const useSquareSelection = (
  gameState: GameState,
  setGameState: React.Dispatch<React.SetStateAction<GameState>>
) => {
  const handleSquareClick = useCallback((row: number, col: number) => {
    if (gameState.gamePhase !== 'playing') return;

    setGameState(prev => {
      const isSelected = prev.selectedSquare?.row === row && prev.selectedSquare?.col === col;

      if (isSelected) {
        // Toggle direction if clicking same square
        return {
          ...prev,
          playDirection: prev.playDirection === 'across' ? 'down' : 'across'
        };
      } else {
        // Select new square - keep current direction
        return {
          ...prev,
          selectedSquare: { row, col }
        };
      }
    });
  }, [gameState.gamePhase]);

  return handleSquareClick;
};
