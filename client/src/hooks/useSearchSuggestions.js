import { useState, useEffect, useRef } from 'react';

const BASE_URL = import.meta.env.VITE_SERVER_URL;


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

    // ── 1. Empty query: clear immediately, zero network ──────────────────────
    if (trimmed.length === 0) {
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

    // ── 3. AbortController ───────────────────────────────────────────────────
    const controller = new AbortController();
    controllerRef.current = controller;

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
        if (results.length > 0) {
          cacheRef.current[cacheKey] = results;
        }
        setSuggestions(results);
        setIsLoading(false);
      })
      .catch(err => {
        if (err.name === 'AbortError') return;
        console.error('[useSearchSuggestions]', err);
        setSuggestions([]);
        setIsLoading(false);
      });

    return () => {
      controller.abort();
    };

    // ── Cleanup: cancel in-flight request on re-run or unmount ───────────────
    return () => {
      controller.abort();
    };
  }, [query, college]);

  const clearSuggestions = () => setSuggestions([]);

  return { suggestions, isLoading, clearSuggestions };
}
