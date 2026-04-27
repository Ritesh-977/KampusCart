import { useState, useEffect, useRef } from 'react';
import { apiCall } from '../api/apiWithFallback';

export function useSearchSuggestions(query, college) {
  const [suggestions, setSuggestions] = useState([]);
  const [isLoading, setIsLoading]     = useState(false);

  const cacheRef = useRef({});

  useEffect(() => {
    const trimmed = query.trim();

    if (trimmed.length === 0) {
      setSuggestions([]);
      setIsLoading(false);
      return;
    }

    const cacheKey = `${trimmed.toLowerCase()}::${college ?? ''}`;

    if (cacheRef.current[cacheKey]) {
      setSuggestions(cacheRef.current[cacheKey]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    const controller = new AbortController();

    const params = { q: trimmed };
    if (college) params.college = college;

    apiCall.get('/items/suggest', { params, signal: controller.signal })
      .then(({ data }) => {
        const results = Array.isArray(data) ? data.slice(0, 6) : [];
        if (results.length > 0) cacheRef.current[cacheKey] = results;
        setSuggestions(results);
        setIsLoading(false);
      })
      .catch(err => {
        if (err.name === 'AbortError' || err.code === 'ERR_CANCELED') return;
        console.error('[useSearchSuggestions]', err);
        setSuggestions([]);
        setIsLoading(false);
      });

    return () => controller.abort();
  }, [query, college]);

  const clearSuggestions = () => setSuggestions([]);

  return { suggestions, isLoading, clearSuggestions };
}
