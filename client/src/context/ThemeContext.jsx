import React, { createContext, useState, useEffect, useContext } from 'react';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  // 1. Initialize state (Always dark mode)
  const [theme, setTheme] = useState('dark');

  useEffect(() => {
    // 2. Apply the dark class to the <html> tag
    const root = window.document.documentElement;
    root.classList.add('dark');
    
    // Save dark mode preference to localStorage
    localStorage.setItem('theme', 'dark');
  }, []);

  // Removed toggleTheme function - always dark mode

  return (
    <ThemeContext.Provider value={{ theme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);