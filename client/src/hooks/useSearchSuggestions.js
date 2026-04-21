import { useState, useEffect, useRef } from 'react';

const BASE_URL = import.meta.env.VITE_SERVER_URL;
const MIN_CHARS = 3;
const DEBOUNCE_MS = 300;

/**
 * useSearchSuggestions
 *
 * Three optimizations layered in order:
 *   1. Min-char threshold  — skips fetch entirely under 3 chars
 *   2. Client-side cache   — useRef map keyed by "query::college"
 *   3. AbortController     — stale requests cancelled before next effect
 *                            runs AND on unmount
 *
 * Cleanup order inside the returned function matters:
 *   clearTimeout first  → prevents the fetch from ever starting
 *   controller.abort()  → cancels any fetch that already started
 *   Both must fire on every re-run and on unmount.
 */
export function useSearchSuggestions(query, college) {
  const [suggestions, setSuggestions] = useState([]);
  const [isLoading, setIsLoading]     = useState(false);

  const cacheRef      = useRef({});   // { [cacheKey]: Item[] }
  const controllerRef = useRef(null); // tracks the live AbortController

  useEffect(() => {
    const trimmed = query.trim();

    // ── 1. Below threshold: clear immediately, zero network ──────────────────
    if (trimmed.length < MIN_CHARS) {
      setSuggestions([]);
      setIsLoading(false);
      return;
    }

    const cacheKey = `${trimmed.toLowerCase()}::${college ?? ''}`;

    // ── 2. Cache hit: instant, no fetch ──────────────────────────────────────
    if (cacheRef.current[cacheKey]) {
      setSuggestions(cacheRef.current[cacheKey]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    // ── 3. Debounce + AbortController ────────────────────────────────────────
    const controller = new AbortController();
    controllerRef.current = controller;

    const timerId = setTimeout(() => {
      const params = new URLSearchParams({ q: trimmed });
      if (college) params.set('college', college);

      fetch(`${BASE_URL}/api/items/suggest?${params}`, {
        signal:      controller.signal,
        credentials: 'include',
      })
        .then(res => {
          if (!res.ok) throw new Error(`Suggest API ${res.status}`);
          return res.json();
        })
        .then(data => {
          const results = Array.isArray(data) ? data.slice(0, 6) : [];
          // Only cache non-empty results — empty arrays are falsy-equivalent
          // for cache purposes; we want to retry on the next keystroke
          if (results.length > 0) {
            cacheRef.current[cacheKey] = results;
          }
          setSuggestions(results);
          setIsLoading(false);
        })
        .catch(err => {
          if (err.name === 'AbortError') return; // expected — swallow silently
          console.error('[useSearchSuggestions]', err);
          setSuggestions([]);
          setIsLoading(false);
        });
    }, DEBOUNCE_MS);

    // ── Cleanup: fires before next effect run AND on unmount ─────────────────
    // clearTimeout first: if the 300ms hasn't elapsed, the fetch never starts.
    // abort() second: if the fetch already started, cancel the in-flight request.
    return () => {
      clearTimeout(timerId);
      controller.abort();
    };
  }, [query, college]);

  const clearSuggestions = () => setSuggestions([]);

  return { suggestions, isLoading, clearSuggestions };
}
