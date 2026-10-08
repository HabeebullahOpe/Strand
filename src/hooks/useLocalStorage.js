// src/hooks/useLocalStorage.js
import { useState, useEffect } from 'react';

/**
 * useState that persists to localStorage.
 * Behaves exactly like useState but survives page reloads.
 *
 * @param {string} key - localStorage key
 * @param {*} initialValue - value to use if nothing is stored
 * @returns {[value, setValue]} - same tuple as useState
 */
export function useLocalStorage(key, initialValue) {
  const [value, setValue] = useState(() => {
    try {
      const stored = window.localStorage.getItem(key);
      if (stored === null) return initialValue;
      return JSON.parse(stored);
    } catch {
      // If the stored value is corrupt or JSON is malformed, fall back.
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Quota exceeded, private mode, etc. Silently ignore — persistence
      // is a nice-to-have, not a requirement.
    }
  }, [key, value]);

  return [value, setValue];
}