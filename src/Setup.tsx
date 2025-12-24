/**
Create a Setup component in React Typescript with the following steps:

1. A title saying "Friendly Words"
2. A control for the user to upload the file with their word list to use.
3. A list of textboxes to input player names
  - By default, there will be 2 players "Player 1" and "Player 2", but there are 
    buttons to add or subtract players, between 2 and 4 players.
4. A button to "Start Game"

The word list file should be a CSV file formatted according to these examples, each
line with a word and a score, separated by a comma.

CABINFEVER,2
CABINING,-1
CABINMATE,1

On uploading of the word list file, the words should be loaded into memory with a Map
of words to scores. This Map should be easily referenced by the game logic to get the 
score for a given word.

If the word list file is not formatted correctly, indicate an error instead of showing the
uploaded file name on the screen.

The component should be styled in Dark Mode with grays and blue accent colors. 
Styling should be done using an SCSS module without the use of Tailwind or similar 
  frameworks.
The component should be responsive and work on both desktop and mobile devices.
 */

import { useState } from 'react';
import styles from './Setup.module.scss';

interface SetupProps {
  onStartGame: (wordList: Map<string, number>, playerNames: string[]) => void;
}

export default function Setup({ onStartGame }: SetupProps) {
  const [wordListMap, setWordListMap] = useState<Map<string, number>>(new Map());
  const [fileError, setFileError] = useState<string>('');
  const [playerNames, setPlayerNames] = useState<string[]>(['Player 1', 'Player 2']);

  const parseWordListFile = async (file: File): Promise<Map<string, number>> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const text = e.target?.result as string;
          const lines = text.trim().split('\n');
          const wordMap = new Map<string, number>();

          for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue; // Skip empty lines

            const parts = line.split(',');
            if (parts.length !== 2) {
              throw new Error(`Invalid format on line ${i + 1}: expected "word,score"`);
            }

            const [word, scoreStr] = parts;
            const trimmedWord = word.trim();
            const trimmedScore = scoreStr.trim();

            if (!trimmedWord) {
              throw new Error(`Invalid word on line ${i + 1}: word cannot be empty`);
            }

            const score = parseInt(trimmedScore, 10);
            if (isNaN(score)) {
              throw new Error(`Invalid score on line ${i + 1}: "${trimmedScore}" is not a valid number`);
            }

            wordMap.set(trimmedWord.toUpperCase(), score);
          }

          if (wordMap.size === 0) {
            throw new Error('File contains no valid word entries');
          }

          resolve(wordMap);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      setWordListMap(new Map());
      setFileError('');
      return;
    }

    try {
      const wordMap = await parseWordListFile(file);
      setWordListMap(wordMap);
      setFileError('');
    } catch (error) {
      setWordListMap(new Map());
      setFileError(error instanceof Error ? error.message : 'Invalid file format');
    }
  };

  const handlePlayerNameChange = (index: number, name: string) => {
    const newPlayerNames = [...playerNames];
    newPlayerNames[index] = name;
    setPlayerNames(newPlayerNames);
  };

  const addPlayer = () => {
    if (playerNames.length < 4) {
      setPlayerNames([...playerNames, `Player ${playerNames.length + 1}`]);
    }
  };

  const removePlayer = (index: number) => {
    if (playerNames.length > 2) {
      const newPlayerNames = playerNames.filter((_, i) => i !== index);
      setPlayerNames(newPlayerNames);
    }
  };

  const handleStartGame = () => {
    onStartGame(wordListMap, playerNames);
  };

  return (
    <div className={styles.setup}>
      <h1 className={styles.title}>Friendly Words</h1>

      <div className={`${styles.section} ${styles.wordListSection}`}>
        <h2 className={styles.sectionTitle}>Word List</h2>
        <div className={styles.fileInput}>
          <input
            type="file"
            accept=".csv,.txt"
            onChange={handleFileChange}
            id="wordListInput"
            className={styles.fileInputField}
          />
          <label htmlFor="wordListInput" className={`${styles.fileInputLabel} ${fileError ? styles.fileInputLabelError : ''}`}>
            {fileError ? 'Invalid file format' : wordListMap.size > 0 ? `${wordListMap.size} words loaded` : 'Choose word list file...'}
          </label>
          {fileError && (
            <div className={styles.errorMessage}>
              {fileError}
            </div>
          )}
        </div>
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Players ({playerNames.length})</h2>
        <div className={styles.playersList}>
          {playerNames.map((name, index) => (
            <div key={index} className={styles.playerInput}>
              <input
                type="text"
                value={name}
                onChange={(e) => handlePlayerNameChange(index, e.target.value)}
                className={styles.playerNameInput}
                placeholder={`Player ${index + 1}`}
              />
              {playerNames.length > 2 && (
                <button
                  type="button"
                  onClick={() => removePlayer(index)}
                  className={styles.removePlayerButton}
                  aria-label="Remove player"
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
        {playerNames.length < 4 && (
          <button
            type="button"
            onClick={addPlayer}
            className={styles.addPlayerButton}
          >
            Add Player
          </button>
        )}
      </div>

      <button
        onClick={handleStartGame}
        className={styles.startGameButton}
        disabled={wordListMap.size === 0 || !!fileError}
      >
        Start Game
      </button>
    </div>
  );
}
