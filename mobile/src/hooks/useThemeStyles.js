/**
 * Theme Helper Hook - Simplifies theme color usage and style generation
 * Usage: const { colors, styles } = useThemeStyles(myStyleFunction);
 */

import { useMemo } from 'react';
import { useTheme } from '../context/ThemeContext';

/**
 * Hook that takes a style generator function and memoizes the result
 * The function receives theme as parameter and should return a styles object
 * 
 * Example:
 * const { colors } = useThemeStyles((theme) => ({
 *   container: { backgroundColor: theme.background },
 *   button: { backgroundColor: theme.primaryAction }
 * }));
 */
export const useThemeStyles = (styleGenerator) => {
  const { theme } = useTheme();
  
  const styles = useMemo(() => {
    return styleGenerator(theme);
  }, [theme]);

  return { colors: theme, styles };
};

/**
 * Quick color access - just returns the theme object
 * Usage: const theme = useThemeColors();
 *        <View style={{ backgroundColor: theme.background }} />
 */
export const useThemeColors = () => {
  const { theme } = useTheme();
  return theme;
};

/**
 * Applies theme-aware color to an array of style objects
 * Useful for inline conditional styles
 */
export const withThemeColor = (baseStyle, colorKey, theme) => {
  return {
    ...baseStyle,
    color: theme[colorKey],
  };
};
