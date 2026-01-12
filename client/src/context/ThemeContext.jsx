import React, { createContext, useState, useEffect, useContext } from 'react';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  // 1. Initialize state (Lazy Initialization)
  const [theme, setTheme] = useState(() => {
    // Check localStorage immediately
    const savedTheme = localStorage.getItem('theme');
    
    // If a theme is saved, use it. 
    // If NOT saved (first visit), return 'dark' by default.
    return savedTheme || 'dark';
  });

  useEffect(() => {
    // 2. Apply the class to the <html> tag whenever theme changes
    const root = window.document.documentElement;
    
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    
    // Save the current preference to localStorage
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);