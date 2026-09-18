import { useState, useEffect } from 'react';

/**
 * useDebounce — Reusable hook for debouncing fast input updates.
 *
 * @param {*} value - The input value to debounce.
 * @param {number} [delay=350] - Debounce delay in milliseconds (default 350ms).
 * @returns {*} The debounced value after the specified delay.
 */
export function useDebounce(value, delay = 350) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Clean up active timers on fast consecutive updates
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

export default useDebounce;
