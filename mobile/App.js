import React, { useRef, useContext } from 'react';
import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer, DarkTheme } from '@react-navigation/native'; // <-- Imported DarkTheme
import { AuthProvider, AuthContext } from './src/context/AuthContext';
import { SocketProvider } from './src/context/SocketContext';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { usePushNotifications } from './src/hooks/usePushNotifications';
import AppNavigator from './src/navigation/AppNavigator';

// ─── Global Dark Theme ───────────────────────────────────────────────────────
const createNavigationTheme = (themeColors) => ({
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: themeColors.background,
    card: themeColors.card,
    text: themeColors.textMain,
    border: themeColors.inputBorder,
  },
});

// Separate component so it can access AuthContext and ThemeContext and navigationRef
function AppWithNotifications({ navigationRef }) {
  const { userToken } = useContext(AuthContext);
  const { theme } = useTheme();

  // Only register push notifications when logged in
  usePushNotifications(userToken ? navigationRef : null);

  // Update StatusBar based on active theme
  React.useEffect(() => {
    StatusBar.setBarStyle(theme.statusBarStyle);
  }, [theme]);

  return <AppNavigator />;
}

export default function App() {
  const navigationRef = useRef(null);

  return (
    <AuthProvider>
      <SocketProvider>
        <ThemeProvider>
          <SafeAreaProvider>
            <AppWithTheme navigationRef={navigationRef} />
          </SafeAreaProvider>
        </ThemeProvider>
      </SocketProvider>
    </AuthProvider>
  );
}

// Inner component that accesses theme context to create navigation theme
function AppWithTheme({ navigationRef }) {
  const { theme } = useTheme();
  const navigationTheme = createNavigationTheme(theme);

  return (
    <>
      <StatusBar backgroundColor={theme.background} barStyle={theme.statusBarStyle} />
      <NavigationContainer ref={navigationRef} theme={navigationTheme}>
        <AppWithNotifications navigationRef={navigationRef} />
      </NavigationContainer>
    </>
  );
}