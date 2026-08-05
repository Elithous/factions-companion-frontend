"use client";

import { useEffect, useRef, useState } from "react";

/**
 * `useState` backed by localStorage.
 *
 * Reads happen once on mount (not during render) so server and client markup
 * match. `validate` rejects stale values written by an older version of the
 * app; anything it rejects is dropped from storage.
 */
export function useLocalStorageState<T>(
  key: string,
  initialValue: T,
  validate: (value: unknown) => value is T = (value): value is T => value !== undefined,
) {
  const [value, setValue] = useState<T>(initialValue);
  const hasLoaded = useRef(false);

  useEffect(() => {
    const stored = localStorage.getItem(key);
    hasLoaded.current = true;
    if (!stored) return;

    try {
      const parsed: unknown = JSON.parse(stored);
      if (validate(parsed)) {
        setValue(parsed);
      } else {
        localStorage.removeItem(key);
      }
    } catch (error) {
      console.error(`Error loading "${key}" from localStorage:`, error);
      localStorage.removeItem(key);
    }
  }, [key]);

  useEffect(() => {
    // Don't write the initial value back before the stored one has loaded.
    if (!hasLoaded.current || value === undefined) return;
    localStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);

  return [value, setValue] as const;
}
