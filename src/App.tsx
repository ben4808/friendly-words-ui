import { useState } from 'react';
import Setup from './Setup/Setup';
import Game, { DictionaryContext } from './Game/Game';
import type { Player } from './Game/types';

function App() {
  const [gameStarted, setGameStarted] = useState(false);
  const [players, setPlayers] = useState<Player[]>([]);
  const [dictionary, setDictionary] = useState<{ [word: string]: number }>({});

  const handleStartGame = (wordList: Map<string, number>, playerNames: string[]) => {
    // Convert player names to Player objects
    const gamePlayers: Player[] = playerNames.map(name => ({
      name,
      score: 0,
      rack: []
    }));

    // Convert Map to object for context
    const dictObj: { [word: string]: number } = {};
    wordList.forEach((value, key) => {
      dictObj[key] = value;
    });

    setPlayers(gamePlayers);
    setDictionary(dictObj);
    setGameStarted(true);
  };

  if (!gameStarted) {
    return <Setup onStartGame={handleStartGame} />;
  }

  return (
    <DictionaryContext.Provider value={dictionary}>
      <Game players={players} />
    </DictionaryContext.Provider>
  );
}

export default App;
