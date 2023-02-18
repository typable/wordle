import { useEffect, useRef, useState } from "./deps.ts";
import { Option, UseMultiRef, UseState, UseStateRef } from "./types.ts";

export function useStateRef<T>(initial: Option<unknown>): UseStateRef<T> {
  const [value, setValue]: UseState<T> = useState(initial);
  const ref = useRef(value);
  
  useEffect(() => {
    ref.current = value;
  }, [value]);
  
  return [value, setValue, ref];
}

export function useMultiRef<T>(): UseMultiRef<T> {
  const refs: T[] = [];
  
  function ref(el: T) {
    if (el) {
      refs.push(el);
    }
  }
  
  return [refs, ref];
}
