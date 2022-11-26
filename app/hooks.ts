import { useEffect, useRef, useState } from "./deps.ts";
import { Option, UseState, UseStateRef } from "./types.ts";

export function useStateRef<T>(initial: Option<unknown>): UseStateRef<T> {
  const [value, setValue]: UseState<T> = useState(initial);
  const ref = useRef(value);
  
  useEffect(() => {
    ref.current = value;
  }, [value]);
  
  return [value, setValue, ref];
}
