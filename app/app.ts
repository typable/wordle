import { html, useState, useEffect } from './deps.ts';
import { Guess, Indicator, GameState, UseState, UseStateRef, UseMultiRef } from "./types.ts";
import { useMultiRef, useStateRef } from './hooks.ts';
import WORDS from './words.ts';
import { createGuess, doCount, evaluateGuess, generateWord, isCorrectWord, isEvaluated, isValidWord } from "./utils.ts";

const ALPHABET = 'abcdefghijklmnopqrstuvwxyz';
const COLS = 5;
const ROWS = 6;

const INSERT_ANIMATION = [
  { transform: 'scale(1)' },
  { transform: 'scale(1.15)' },
  { transform: 'scale(1)' },
];
const REMOVE_ANIMATION = [
  { transform: 'scale(1)' },
  { transform: 'scale(0.9)' },
  { transform: 'scale(1)' },
];
const INVALID_ANIMATION = [
  { transform: 'translateX(0px)' },
  { transform: 'translateX(5px)' },
  { transform: 'translateX(-5px)' },
  { transform: 'translateX(0px)' },
];

export default function App() {
  const [state, setState]: UseState<GameState> = useState(null);
  const [, setWord, wordRef]: UseStateRef<string> = useStateRef(null);
  const [guesses, setGuesses, guessesRef]: UseStateRef<Guess[]> = useStateRef([]);
  const [refs, ref]: UseMultiRef<HTMLElement> = useMultiRef();
  
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
            const element = refs[index];
            element?.animate(INVALID_ANIMATION, { duration: 200 });
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
          const row = refs[index];
          if (row) {
            const letter = Array.from(row.querySelectorAll('.letter'));
            const element = letter?.[guess.letters.length];
            element?.animate(REMOVE_ANIMATION, { duration: 150 });
          }
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
        const row = refs[index];
        if (row) {
          const elements = Array.from(row.querySelectorAll('.letter'));
          const element = elements?.[guess.letters.length - 1];
          element?.animate(INSERT_ANIMATION, { duration: 150 });
        }
      }
    }
  }

  function renderRow(index: number) {
    const guess: Guess = guesses[index];
    const isCurrent = !state && index === guesses.length - 1;
    return html`
      <div ref="${ref}" class="row ${isCurrent ? 'current' : ''}">
        ${doCount(COLS).map((index) => renderCell(guess, index))}
      </div>
    `;
  }

  function renderCell(guess: Guess, index: number) {
    const letter = guess?.letters[index];
    return html`
      <div class="letter ${letter ? (isEvaluated(letter) ? 'entered' : '') : ''}">
        <div class="flip col-${index}">
          <div class="front">${letter?.char}</div>
          <div class="back ${letter?.indicator}">${letter?.char}</div>
        </div>
      </div>
    `;
  }
  
  return html`
    <main>
      <section>
        <div class="headline">
          <img src="assets/images/favicon.png">
          <p>Wordle</p>
        </div>
        <p class="mode">${isDaily ? 'Daily' : 'Freeplay'} mode</p>
        <p class="word">${state ? state.message : ''}</p>
        <div class="grid">
          ${doCount(ROWS).map((index) => renderRow(index))}
        </div>
      </section>
    </main>
  `;
}
