import React, { useRef, useContext, useEffect, useState } from 'react';
import { View, Image, Text, StatusBar, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import * as ExpoLinking from 'expo-linking';
import { AuthProvider, AuthContext } from './src/context/AuthContext';
import { SocketProvider } from './src/context/SocketContext';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { usePushNotifications } from './src/hooks/usePushNotifications';
import AppNavigator from './src/navigation/AppNavigator';
import * as SplashScreen from 'expo-splash-screen';
import Toast, { BaseToast, ErrorToast } from 'react-native-toast-message';

SplashScreen.preventAutoHideAsync();

// ─── Gradient text helper (purple #8b5cf6 → blue #3b82f6) ───────────────────
const GRADIENT_TEXT = 'KampusCart';
const GRAD_START = [139, 92, 246];   // #8b5cf6
const GRAD_END   = [59,  130, 246];  // #3b82f6
const GradientText = ({ style }) => (
  <Text style={[{ flexDirection: 'row' }, style]}>
    {GRADIENT_TEXT.split('').map((char, i) => {
      const t = i / (GRADIENT_TEXT.length - 1);
      const r = Math.round(GRAD_START[0] + t * (GRAD_END[0] - GRAD_START[0]));
      const g = Math.round(GRAD_START[1] + t * (GRAD_END[1] - GRAD_START[1]));
      const b = Math.round(GRAD_START[2] + t * (GRAD_END[2] - GRAD_START[2]));
      return <Text key={i} style={[style, { color: `rgb(${r},${g},${b})` }]}>{char}</Text>;
    })}
  </Text>
);

// ─── JS Splash Screen ────────────────────────────────────────────────────────
const AppSplash = () => (
  <View style={splash.container}>
    <StatusBar backgroundColor="#0f172a" barStyle="light-content" />
    <Image
      source={require('./assets/images/splash-icon.png')}
      style={splash.logo}
    />
    <GradientText style={splash.appName} />
  </View>
);

const splash = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: 130,
    height: 130,
    resizeMode: 'contain',
    marginBottom: 4,
  },
  appName: {
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: 1,
  },
});

// ─── Deep Linking ────────────────────────────────────────────────────────────
//
// Primary mechanism: HTTPS App Links (Android) / Universal Links (iOS)
//   kampuscart.site/item/:id  →  opens app directly (no dialog, no chooser)
//   Falls back to the browser automatically if the app is not installed.
//
// The custom scheme (kampuscart://) is kept as a silent fallback so that any
// old links shared before this change still work. It is never used in new
// share messages.
//
// Verification files the server MUST serve (see server.js):
//   Android: https://kampuscart.site/.well-known/assetlinks.json
//   iOS:     https://kampuscart.site/.well-known/apple-app-site-association
const linking = {
  prefixes: [
    // HTTPS first — these are the canonical links shared by the app
    'https://kampuscart.site',
    'https://www.kampuscart.site',
    // Custom scheme kept as a backward-compatibility fallback only
    ExpoLinking.createURL('/'),
  ],
  config: {
    screens: {
      Home: {
        screens: {
          ItemDetails: {
            path: 'item/:itemId',
            parse: { itemId: String },
          },
        },
      },
    },
  },
};

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

function AppWithNotifications({ navigationRef }) {
  const { userToken } = useContext(AuthContext);
  const { theme } = useTheme();

  usePushNotifications(userToken ? navigationRef : null);

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

const SPLASH_MIN_MS = 2000;

function AppWithTheme({ navigationRef }) {
  const { theme } = useTheme();
  const { isLoading } = useContext(AuthContext);
  const navigationTheme = createNavigationTheme(theme);
  const [minTimeElapsed, setMinTimeElapsed] = useState(false);

  // Hide native splash after first render so our JS splash shows seamlessly beneath it
  useEffect(() => {
    SplashScreen.hideAsync();
    const t = setTimeout(() => setMinTimeElapsed(true), SPLASH_MIN_MS);
    return () => clearTimeout(t);
  }, []);

  // Show splash until auth is done AND minimum time has passed
  if (isLoading || !minTimeElapsed) return <AppSplash />;

  const toastConfig = {
    success: (props) => (
      <BaseToast
        {...props}
        style={{
          borderLeftColor: '#10b981',
          backgroundColor: theme.card,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: theme.cardAccent,
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
          borderLeftColor: '#ef4444',
          backgroundColor: theme.card,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: theme.cardAccent,
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
          borderLeftColor: theme.primaryAction,
          backgroundColor: theme.card,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: theme.cardAccent,
        }}
        contentContainerStyle={{ paddingHorizontal: 15 }}
        text1Style={{ fontSize: 15, fontWeight: '700', color: theme.textMain }}
        text2Style={{ fontSize: 13, color: theme.textSub }}
      />
    ),
  };

  return (
    <>
      <StatusBar backgroundColor={theme.background} barStyle={theme.statusBarStyle} />
      <NavigationContainer ref={navigationRef} theme={navigationTheme} linking={linking}>
        <AppWithNotifications navigationRef={navigationRef} />
      </NavigationContainer>
      <Toast config={toastConfig} />
    </>
  );
}
