import { useEffect, useState } from 'react';

/**
 * useDebouncedValue — returns the input value after `delay` ms of inactivity.
 * Used to debounce search inputs that drive network requests.
 */
export function useDebouncedValue(value, delay = 350) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);

  return debounced;
}

export default useDebouncedValue;
