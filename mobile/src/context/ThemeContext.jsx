import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Theme Color Definitions ────────────────────────────────────────────────

// 1. The ORIGINAL Indigo theme from previous code
const originalIndigo = {
  id: 'originalIndigo',
  statusBarStyle: 'light-content',
  background: '#0f172a', // safe area/void void background
  formBackground: '#0a0f1a', // inner container for forms
  card: '#1e293b',       // major card containers
  cardAccent: '#273549', // subtle dividers within cards/lists
  inputBg: '#1e293b',    // input fields background
  inputBorder: '#334155', // input field borders
  
  header: '#0f172a',     
  headerDivider: '#1e293b',
  
  primaryAction: '#4f46e5', // Main blue (e.g., Sign In button)
  secondaryAction: '#818cf8', // Lighter accent blue
  primaryAccent: '#818cf8',    // E.g., Tab indicator color for Exam Papers
  secondaryAccent: '#34d399',  // E.g., Notes color accent
  tertiaryAccent: '#f472b6',   // E.g., Books color accent

  textMain: '#f1f5f9',    // Main title text
  textBody: '#f1f5f9',    // Body content text
  textSub: '#94a3b8',     // Subtitle gray text
  textTertiary: '#64748b', // Even lighter tertiary text
  textIndigo: '#818cf8',  // Text that is indigo accent color
};

// 2. The NEW PREMIUM GOLD theme from provided image
// const premiumGold = {
//   id: 'premiumGold',
//   statusBarStyle: 'light-content',
//   background: '#151411', // Deep near-black background
//   formBackground: '#1c1b18', // slightly lighter elevated container
//   card: '#1c1b18',       // card containers
//   cardAccent: '#2e2d29', // dividers
//   inputBg: '#1c1b18',    // input fields
//   inputBorder: '#3d3c39', // input field borders
  
//   header: '#151411',
//   headerDivider: '#1c1b18',
  
//   // Luxury gold palette from image
//   primaryAction: '#AA7733', // Solid ochre gold (e.g., Sign In button)
//   secondaryAction: '#EECC77', // Bright champagne gold (e.g., Highlights)
//   primaryAccent: '#AA7733',   // Primary gold accent (Exam Papers/Tabs)
//   secondaryAccent: '#EECC77', // Secondary accent gold (Notes)
//   tertiaryAccent: '#67481F',  // Deep dark gold (Books - maybe use for less stark accents)

//   textMain: '#FFFFFF',    // Pure white for major titles
//   textBody: '#FFFFFF',    // Pure white for body text (use white from palette)
//   textSub: '#EECC77',     // GRAY variant of text. Let's use champagne gold for subtitles to feel premium
//   textTertiary: '#b0afa8', // lighter body gray
//   textGold: '#EECC77',    // Text that is specifically champagne gold accent color
// };

const premiumGold = {
  id: 'premiumGold',
  statusBarStyle: 'dark-content',
  background: '#F9F8F6',      // Warm alabaster/ivory background
  formBackground: '#FFFFFF',  // Pure white elevated container
  card: '#FFFFFF',            // Card containers
  cardAccent: '#EAE6DF',      // Very subtle warm gray/tan dividers
  inputBg: '#FFFFFF',         // Input fields
  inputBorder: '#DCD7D0',     // Input field borders
  
  header: '#F9F8F6',
  headerDivider: '#EAE6DF',
  
  // Classic crimson and slate palette
  primaryAction: '#8B1E0F',   // Deep classic crimson (Sign In button)
  secondaryAction: '#2C3E50', // Classic deep slate navy (Highlights)
  primaryAccent: '#8B1E0F',   // Primary accent (Exam Papers/Tabs)
  secondaryAccent: '#2C3E50', // Secondary accent (Notes)
  tertiaryAccent: '#4A3B32',  // Deep warm umber (Books)
  
  textMain: '#1A1A1A',        // Near-black for crisp readability on major titles
  textBody: '#333333',        // Dark charcoal for body text
  textSub: '#8B1E0F',         // Crimson for subtitles to add a premium touch
  textTertiary: '#858079',    // Muted warm gray
  textGold: '#8B1E0F',
};
  

// ─── The Context Logic ────────────────────────────────────────────────────────

export const ThemeContext = createContext({
  theme: originalIndigo, // Default value
  toggleTheme: () => {},
  themeId: 'originalIndigo',
});

export const ThemeProvider = ({ children }) => {
  const [themeId, setThemeId] = useState('originalIndigo'); // State to track which ID is active

  // Derived state: get the full theme object based on active ID
  const activeTheme = themeId === 'premiumGold' ? premiumGold : originalIndigo;

  // 1. Load preference on app start
  useEffect(() => {
    const loadThemePreference = async () => {
      try {
        const savedThemeId = await AsyncStorage.getItem('@kampuscart_themePreference');
        if (savedThemeId !== null && (savedThemeId === 'premiumGold' || savedThemeId === 'originalIndigo')) {
          setThemeId(savedThemeId);
        }
      } catch (error) {
        console.log('[Theme] Could not load theme preference:', error);
      }
    };
    loadThemePreference();
  }, []);

  // 2. The actual function that screens will call to toggle the theme
  const toggleTheme = async () => {
    const newThemeId = themeId === 'originalIndigo' ? 'premiumGold' : 'originalIndigo';
    setThemeId(newThemeId);
    
    // Save preference to local memory so it survives app restarts
    try {
      await AsyncStorage.setItem('@kampuscart_themePreference', newThemeId);
    } catch (error) {
      console.log('[Theme] Could not save theme preference:', error);
    }
  };

  const value = {
    theme: activeTheme,
    toggleTheme,
    themeId,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

// ─── Custom Hook for Easy Access ─────────────────────────────────────────────
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
