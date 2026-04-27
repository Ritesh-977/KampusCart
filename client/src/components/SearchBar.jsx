import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FaSearch, FaHistory, FaTrashAlt, FaTimes, FaImage } from 'react-icons/fa';
import { useSearchSuggestions } from '../hooks/useSearchSuggestions';

/**
 * SearchBar
 *
 * Props:
 *   college      {string}   - scopes suggestions to a campus
 *   onSearch     {function} - called with the final query string on explicit search
 *   placeholder  {string}
 *   className    {string}   - wrapper class overrides
 */
const SearchBar = ({ college, onSearch, placeholder = 'Search for items...', className = '' }) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const [history, setHistory]           = useState(() =>
    JSON.parse(localStorage.getItem('searchHistory') || '[]')
  );

  const navigate = useNavigate();
  const location  = useLocation();

  const [query, setQuery] = useState(() => new URLSearchParams(location.search).get('search') || '');

  const { suggestions, isLoading, clearSuggestions } = useSearchSuggestions(query, college);

  // ── Explicit search: bypasses debounce entirely ───────────────────────────
  const executeSearch = (term) => {
    const q = (term ?? query).trim();

    clearSuggestions();
    setShowDropdown(false);

    if (!q) {
      navigate('/browse');
      if (onSearch) onSearch('');
      return;
    }

    saveToHistory(q);
    navigate(`/browse?search=${encodeURIComponent(q)}`);
    if (onSearch) onSearch(q);
  };

  // ── Input change: state updates immediately, hook handles debounce ────────
  const handleChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    // Show dropdown as soon as user starts typing or focuses
    setShowDropdown(true);
    // If cleared, close dropdown immediately — hook handles clearing suggestions
    if (!val.trim()) setShowDropdown(false);
  };

  // ── Enter key: explicit search, no debounce ───────────────────────────────
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      executeSearch();
    }
  };

  const handleFocus = () => {
    const saved = JSON.parse(localStorage.getItem('searchHistory') || '[]');
    setHistory(saved);
    setShowDropdown(true);
  };

  // ── History helpers ───────────────────────────────────────────────────────
  const saveToHistory = (term) => {
    const updated = [term, ...history.filter(t => t !== term)].slice(0, 5);
    localStorage.setItem('searchHistory', JSON.stringify(updated));
    setHistory(updated);
  };

  const deleteHistoryItem = (e, term) => {
    e.preventDefault();
    e.stopPropagation();
    const updated = history.filter(t => t !== term);
    localStorage.setItem('searchHistory', JSON.stringify(updated));
    setHistory(updated);
  };

  const clearAllHistory = (e) => {
    e.preventDefault();
    localStorage.removeItem('searchHistory');
    setHistory([]);
  };

  // ── Dropdown content decision ─────────────────────────────────────────────
  const showSuggestions = query.trim().length > 0 && suggestions.length > 0;
  const showHistory     = query.trim().length === 0 && history.length > 0;
  const dropdownVisible = showDropdown && (showSuggestions || showHistory || isLoading);

  return (
    <div className={`relative w-full ${className}`}>
      {/* ── Input + Search button ── */}
      <form onSubmit={(e) => { e.preventDefault(); executeSearch(); }} className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <FaSearch className="text-gray-400" />
        </div>

        <input
          type="text"
          value={query}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
          placeholder={placeholder}
          autoComplete="off"
          aria-label="Search"
          aria-autocomplete="list"
          aria-expanded={dropdownVisible}
          className="block w-full pl-10 pr-24 py-2.5 bg-white dark:bg-slate-800 rounded-full border-none shadow-xl focus:ring-2 focus:ring-teal-400 focus:outline-none text-gray-800 dark:text-white placeholder-gray-500 dark:placeholder-slate-400 text-sm transition-all"
        />

        <button
          type="submit"
          className="absolute right-1.5 top-1/2 -translate-y-1/2 px-4 py-1.5 bg-teal-500 hover:bg-teal-600 text-white text-sm font-bold rounded-full transition"
        >
          Search
        </button>
      </form>

      {/* ── Dropdown ── */}
      {dropdownVisible && (
        <div className="absolute top-full left-0 mt-1 w-full bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 z-[100] overflow-hidden">

          {/* Loading skeleton */}
          {isLoading && !showSuggestions && (
            <div className="py-3 px-4 space-y-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="flex items-center gap-3 animate-pulse">
                  <div className="h-10 w-10 rounded-lg bg-gray-200 dark:bg-gray-700 flex-shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
                    <div className="h-2.5 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Suggestions list */}
          {showSuggestions && (
            <div className="py-2">
              {suggestions.map(item => (
                <button
                  key={item._id}
                  onMouseDown={() => {
                    setQuery(item.title);
                    executeSearch(item.title);
                    navigate(`/item/${item._id}`);
                  }}
                  className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-3 transition border-b border-gray-100 dark:border-gray-700 last:border-none"
                >
                  <div className="h-10 w-10 rounded-lg bg-gray-100 dark:bg-gray-700 overflow-hidden flex-shrink-0 border border-gray-200 dark:border-gray-600">
                    {item.images?.[0]
                      ? <img src={item.images[0]} alt="" className="h-full w-full object-cover" />
                      : <FaImage className="h-full w-full p-2.5 text-gray-300" />
                    }
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm text-gray-800 dark:text-gray-200 font-semibold line-clamp-1">
                      {item.title}
                    </p>
                    {item.category && (
                      <p className="text-xs text-indigo-500 dark:text-indigo-400 mt-0.5">
                        in {item.category}
                      </p>
                    )}
                  </div>
                </button>
              ))}

              {/* "See all results" footer */}
              <button
                onMouseDown={() => executeSearch()}
                className="w-full text-center py-2.5 text-sm text-indigo-700 dark:text-indigo-400 font-bold hover:bg-indigo-50 dark:hover:bg-gray-700 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800"
              >
                See all results for "{query}"
              </button>
            </div>
          )}

          {/* Search history */}
          {showHistory && (
            <div className="py-2">
              {/* Header */}
              <div className="flex items-center justify-between px-4 pt-1 pb-2">
                <div className="flex items-center gap-2">
                  <FaHistory className="text-teal-400 text-xs" />
                  <span className="text-xs font-bold text-gray-400 dark:text-slate-400 uppercase tracking-widest">
                    Recent Searches
                  </span>
                </div>
                <button
                  onMouseDown={clearAllHistory}
                  className="flex items-center gap-1 text-[10px] font-semibold text-gray-400 hover:text-red-500 dark:text-slate-500 dark:hover:text-red-400 transition-colors px-2 py-0.5 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20"
                >
                  <FaTrashAlt size={9} /> Clear all
                </button>
              </div>

              {/* History items */}
              <div className="px-2 space-y-0.5">
                {history.map((term, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700/60 group transition-colors"
                  >
                    <button
                      onMouseDown={() => { setQuery(term); executeSearch(term); }}
                      className="flex-grow text-left px-3 py-2.5 text-sm text-gray-700 dark:text-slate-300 flex items-center gap-3 min-w-0"
                    >
                      <span className="flex-shrink-0 w-7 h-7 rounded-full bg-gray-100 dark:bg-slate-700 flex items-center justify-center">
                        <FaHistory className="text-gray-400 dark:text-slate-400 text-[10px] group-hover:text-teal-500 transition-colors" />
                      </span>
                      <span className="truncate font-medium">{term}</span>
                    </button>
                    <button
                      onMouseDown={e => deleteHistoryItem(e, term)}
                      className="flex-shrink-0 mr-2 w-6 h-6 rounded-full flex items-center justify-center text-gray-300 dark:text-slate-600 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <FaTimes size={10} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchBar;
