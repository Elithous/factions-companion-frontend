"use client";

import { DependencyList, useEffect, useRef } from "react";

/**
 * Runs `effect` `delay` ms after `deps` last changed. The latest `effect`
 * closure is always the one that fires, so it can safely close over state
 * without being listed as a dependency.
 */
export function useDebouncedEffect(effect: () => void, deps: DependencyList, delay: number) {
  const callback = useRef(effect);

  useEffect(() => {
    callback.current = effect;
  }, [effect]);

  useEffect(() => {
    const handler = setTimeout(() => callback.current(), delay);
    return () => clearTimeout(handler);
  }, [...deps, delay]);
}
