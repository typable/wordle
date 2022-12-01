export type UseState<T> = [T, SetState<T>];
export type UseStateRef<T> = [T, SetState<T>, Ref<T>];
export type UseMultiRef<T> = [T[], (t: T) => void];
export type SetState<T> = (t: Option<T>) => void;
export type Option<T> = T | null | undefined;

export interface Ref<T> {
  current: T,
}


export enum Indicator {
  UNKNOWN = "unknown",
  NOT_INCLUDED = "not-included",
  IS_INCLUDED = "is-included",
  CORRECT = "correct",
}

export interface Letter {
  char: string,
  indicator: Indicator,
}

export interface Guess {
  letters: Letter[],
}

export interface GameState {
  isCorrect: boolean,
  message: string,
}
