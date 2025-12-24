import Setup from './Setup';

function App() {
  const handleStartGame = (wordList: File | null, playerNames: string[]) => {
    console.log('Starting game with:', {
      wordList: wordList?.name,
      playerNames
    });
    // TODO: Implement game logic
  };

  return <Setup onStartGame={handleStartGame} />;
}

export default App;
