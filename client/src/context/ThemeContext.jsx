import React, { createContext, useState, useEffect, useContext, useCallback, useRef } from 'react';

const ThemeContext = createContext();

const STORAGE_KEY = 'theme';

// Resolve the theme the app should start with. Priority:
// 1. an explicit choice the user made before (localStorage)
// 2. the OS-level preference
// 3. dark (the brand default)
const getInitialTheme = () => {
 if (typeof window === 'undefined') return 'dark';
 const stored = window.localStorage.getItem(STORAGE_KEY);
 if (stored === 'light' || stored === 'dark') return stored;
 const prefersLight = window.matchMedia?.('(prefers-color-scheme: light)').matches;
 return prefersLight ? 'light' : 'dark';
};

const hasStoredChoice = () => {
 if (typeof window === 'undefined') return false;
 const stored = window.localStorage.getItem(STORAGE_KEY);
 return stored === 'light' || stored === 'dark';
};

export const ThemeProvider = ({ children }) => {
 const [theme, setTheme] = useState(getInitialTheme);
 // If the user has already chosen a theme, don't follow the OS afterwards.
 const explicitRef = useRef(hasStoredChoice());

 // Apply the theme to <html>: 'dark' class + persisted preference.
 useEffect(() => {
 const root = window.document.documentElement;
 root.classList.toggle('dark', theme === 'dark');
 root.style.colorScheme = theme;
 window.localStorage.setItem(STORAGE_KEY, theme);
 }, [theme]);

 // Keep in sync with OS changes until the user chooses explicitly.
 useEffect(() => {
 const mq = window.matchMedia?.('(prefers-color-scheme: light)');
 if (!mq) return;
 const onChange = (e) => {
 if (!explicitRef.current) setTheme(e.matches ? 'light' : 'dark');
 };
 mq.addEventListener?.('change', onChange);
 return () => mq.removeEventListener?.('change', onChange);
 }, []);

 const toggleTheme = useCallback(() => {
 explicitRef.current = true;
 setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
 }, []);

 const setThemeExplicit = useCallback((next) => {
 explicitRef.current = true;
 setTheme(next);
 }, []);

 return (
 <ThemeContext.Provider value={{ theme, isDark: theme === 'dark', toggleTheme, setTheme: setThemeExplicit }}>
 {children}
 </ThemeContext.Provider>
 );
};

export const useTheme = () => useContext(ThemeContext);
