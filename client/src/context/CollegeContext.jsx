// src/context/CollegeContext.jsx
import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import { findCollegeByName } from '../data/colleges';

const CollegeContext = createContext();

const STORAGE_KEY = 'selectedCollege';

export const CollegeProvider = ({ children }) => {
  // Lazy initialization: load from localStorage on first render
  const [selectedCollege, setSelectedCollegeState] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Persist to localStorage whenever selection changes
  useEffect(() => {
    if (selectedCollege) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(selectedCollege));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [selectedCollege]);

  // When a user logs in, sync selectedCollege with user.college (user's registered college takes priority)
  useEffect(() => {
    try {
      const userRaw = localStorage.getItem('user');
      if (!userRaw) return; // Not logged in, keep whatever is in storage
      const user = JSON.parse(userRaw);
      if (user?.college) {
        const matched = findCollegeByName(user.college);
        if (matched) {
          // Only update if different, to avoid infinite loops
          setSelectedCollegeState(prev =>
            prev?.name === matched.name ? prev : matched
          );
        }
      }
    } catch {
      // Silently ignore malformed data
    }
  }, []); // Runs once on mount — syncs with currently logged-in user

  const setSelectedCollege = useCallback((college) => {
    setSelectedCollegeState(college);
  }, []);

  const clearCollege = useCallback(() => {
    setSelectedCollegeState(null);
  }, []);

  return (
    <CollegeContext.Provider value={{ selectedCollege, setSelectedCollege, clearCollege }}>
      {children}
    </CollegeContext.Provider>
  );
};

export const useCollege = () => {
  const context = useContext(CollegeContext);
  if (!context) {
    throw new Error('useCollege must be used within a CollegeProvider');
  }
  return context;
};
