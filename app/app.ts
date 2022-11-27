import { html, dyn, createContext, useState, useEffect } from './deps.ts';
import { Guess, Indicator, Letter, GameState, UseState, UseStateRef } from "./types.ts";
import { useStateRef } from './hooks.ts';
import WORDS from './words.ts';

const ALPHABET = 'abcdefghijklmnopqrstuvwxyz';
const COLS = 5;
const ROWS = 6;

export const global = createContext({});

export default function App() {
  const [state, setState]: UseState<GameState> = useState(null);
  const [, setWord, wordRef]: UseStateRef<string> = useStateRef(null);
  const [guesses, setGuesses, guessesRef]: UseStateRef<Guess[]> = useStateRef([]);
  
  useEffect(() => {
    const word: string = generateWord();
    const guesses: Guess[] = [createGuess()];
    setWord(word);
    setGuesses(guesses);
    document.addEventListener('keydown', onInput);
    return () => {
      document.removeEventListener('keydown', onInput);
    };
  }, []);
  
  function onInput(event: KeyboardEvent) {
    if (state) {
      return;
    }
    const { key, ctrlKey, altKey, metaKey } = event;
    if (ctrlKey || altKey || metaKey) {
      return;
    }
    const guesses: Guess[] = [...guessesRef.current];
    const index = guesses.length - 1;
    const guess = guesses[index];
    if (guess) {
      if (key === 'Enter') {
        if (guess.letters.length === COLS) {
          if (!isValidWord(WORDS, guess)) {
            console.log('not in list');
            return;
          }
          guesses[index] = evaluateGuess(wordRef.current, guess);
          const isCorrect = isCorrectWord(wordRef.current, guess);
          if (isCorrect || index + 1 === ROWS) {
            const state: GameState = {
              isCorrect,
              message: `The word was ${wordRef.current.toUpperCase()}.`,
            };
            setState(state);
          }
          else {
            guesses.push(createGuess());
          }
          setGuesses(guesses);
        }
        return;
      }
      if (key === 'Backspace') {
        if (guess.letters.length > 0) {
          guess.letters.pop();
          setGuesses(guesses);
        }
        return;
      }
      const char = key.toLowerCase();
      if (!ALPHABET.includes(char)) {
        return;
      }
      if (guess.letters.length < COLS) {
        guess.letters.push({ char, indicator: Indicator.UNKNOWN });
        setGuesses(guesses);
      }
    }
  }
  
  return html`
    ${dyn(global.Provider, { value: null })`
      <main>
        <section>
          <div class="headline">
            <img src="assets/images/favicon.png">
            <p>Wordle</p>
          </div>
          <p class="word">${state ? state.message : ''}</p>
          <div class="grid">
            ${Array(ROWS).fill(0).map((_, row) => {
              const guess: Guess = guesses[row];
              return html`
                <div class="row">
                  ${Array(COLS).fill(0).map((_, col) => {
                    const letter = guess?.letters[col];
                    return letter ? html`
                      <div class="letter ${isEvaluated(letter) ? 'entered' : ''}">
                        <div class="flip col-${col}">
                          <div class="front">${letter.char}</div>
                          <div class="back ${letter.indicator}">${letter.char}</div>
                        </div>
                      </div>
                    ` : html`
                      <div class="letter col-${col} unknown">
                        <div class="flip">
                          <div class="front"></div>
                        </div>
                      </div>
                    `;
                  })}
                </div>
              `;
            })}
          </div>
        </section>
      </main>
    `}
  `;
}

function generateWord(): string {
  const index = Math.floor(Math.random() * WORDS.length);
  return WORDS[index];
}

function createLetters(word: string): Letter[] {
  return word.split('')
    .map((char) => ({ char, indicator: Indicator.UNKNOWN }));
}

function createGuess(word?: string): Guess {
  const letters: Letter[] = createLetters(word ?? '');
  return { letters };
}

function evaluateGuess(word: string, guess: Guess): Guess {
  for (let i = 0; i < word.length; i++) {
    const letter = guess.letters[i];
    if (word[i] === letter.char) {
      letter.indicator = Indicator.CORRECT;
    }
    else if (word.includes(letter.char)) {
      letter.indicator = Indicator.IS_INCLUDED;
    }
    else {
      letter.indicator = Indicator.NOT_INCLUDED;
    }
  }
  return guess;
}

function isCorrectWord(word: string, guess: Guess): boolean {
  return guess.letters.every((letter, i) => {
    return word[i] === letter.char;
  });
}

function isValidWord(words: string[], guess: Guess): boolean {
  const word = guess.letters
    .map((letter) => letter.char)
    .join('');
  return words.includes(word);
}

function isEvaluated(letter: Letter): boolean {
  return letter.indicator !== Indicator.UNKNOWN;
}
