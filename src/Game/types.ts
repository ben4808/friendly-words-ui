import React from 'react';

export interface Tile {
  letter: string;
  value: number;
}

export interface Player {
  name: string;
  score: number;
  rack: Tile[];
}

export interface BoardTile extends Tile {
  isBlank?: boolean;
  playedBy?: number; // player index who played this tile
}

export type GamePhase = 'ready' | 'playing' | 'exchanging' | 'gameOver';

export interface GameState {
  players: Player[];
  currentPlayerIndex: number;
  tilePool: Tile[];
  board: (BoardTile | null)[][];
  selectedSquare: { row: number; col: number } | null;
  playDirection: 'across' | 'down';
  currentPlay: { row: number; col: number; tile: Tile; isBlank?: boolean }[];
  gamePhase: GamePhase;
  dictionary: { [word: string]: number }; // word -> multiplier
  exchangeMode: boolean;
  tilesToExchange: number[]; // indices of tiles in rack to exchange
  blankDesignationPrompt: { tileIndex: number; show: boolean } | null;
}

export interface GameProps {
  players: Player[];
}

export interface DictionaryContextType {
  [word: string]: number;
}

// Context for dictionary - should be provided by parent component
export const DictionaryContext = React.createContext<DictionaryContextType>({});
