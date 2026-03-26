import React, { useRef, useContext } from 'react';
import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { AuthProvider, AuthContext } from './src/context/AuthContext';
import { SocketProvider } from './src/context/SocketContext';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { usePushNotifications } from './src/hooks/usePushNotifications';
import AppNavigator from './src/navigation/AppNavigator';

// 1. IMPORT TOAST AND ITS BASE COMPONENTS
import Toast, { BaseToast, ErrorToast } from 'react-native-toast-message';

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

  // 2. CREATE DYNAMIC TOAST CONFIG
  // Because this is inside AppWithTheme, it listens to your ThemeContext!
  const toastConfig = {
    success: (props) => (
      <BaseToast
        {...props}
        style={{ 
          borderLeftColor: '#10b981', // Success Green
          backgroundColor: theme.card, 
          borderRadius: 12, 
          borderWidth: 1, 
          borderColor: theme.cardAccent 
        }}
        contentContainerStyle={{ paddingHorizontal: 15 }}
        text1Style={{ fontSize: 15, fontWeight: '700', color: theme.textMain }}
        text2Style={{ fontSize: 13, color: theme.textSub }}
      />
    ),
    error: (props) => (
      <ErrorToast
        {...props}
        style={{ 
          borderLeftColor: '#ef4444', // Error Red
          backgroundColor: theme.card, 
          borderRadius: 12, 
          borderWidth: 1, 
          borderColor: theme.cardAccent 
        }}
        contentContainerStyle={{ paddingHorizontal: 15 }}
        text1Style={{ fontSize: 15, fontWeight: '700', color: theme.textMain }}
        text2Style={{ fontSize: 13, color: theme.textSub }}
      />
    ),
    info: (props) => (
      <BaseToast
        {...props}
        style={{ 
          borderLeftColor: theme.primaryAction, // Uses current theme's primary color
          backgroundColor: theme.card, 
          borderRadius: 12, 
          borderWidth: 1, 
          borderColor: theme.cardAccent 
        }}
        contentContainerStyle={{ paddingHorizontal: 15 }}
        text1Style={{ fontSize: 15, fontWeight: '700', color: theme.textMain }}
        text2Style={{ fontSize: 13, color: theme.textSub }}
      />
    )
  };

  return (
    <>
      <StatusBar backgroundColor={theme.background} barStyle={theme.statusBarStyle} />
      <NavigationContainer ref={navigationRef} theme={navigationTheme}>
        <AppWithNotifications navigationRef={navigationRef} />
      </NavigationContainer>
      
      {/* 3. PLACE TOAST OUTSIDE NAVIGATION SO IT FLOATS OVER EVERYTHING */}
      <Toast config={toastConfig} />
    </>
  );
}