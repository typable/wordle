import { Guess, Indicator, Letter } from "./types.ts";
import WORDS from './words.ts';

export function generateWord(): string {
  const index = Math.floor(Math.random() * WORDS.length);
  return WORDS[index];
}

export function createLetters(word: string): Letter[] {
  return word.split('')
    .map((char) => ({ char, indicator: Indicator.UNKNOWN }));
}

export function createGuess(word?: string): Guess {
  const letters: Letter[] = createLetters(word ?? '');
  return { letters };
}

export function evaluateGuess(word: string, guess: Guess): Guess {
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

export function isCorrectWord(word: string, guess: Guess): boolean {
  return guess.letters.every((letter, i) => {
    return word[i] === letter.char;
  });
}

export function isValidWord(words: string[], guess: Guess): boolean {
  const word = guess.letters
    .map((letter) => letter.char)
    .join('');
  return words.includes(word);
}

export function isEvaluated(letter: Letter): boolean {
  return letter.indicator !== Indicator.UNKNOWN;
}

export function doCount(length: number): number[] {
  return Array.from({ length }, (_, i) => i);
}
