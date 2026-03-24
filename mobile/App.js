import React, { useRef, useContext } from 'react';
import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer, DarkTheme } from '@react-navigation/native'; // <-- Imported DarkTheme
import { AuthProvider, AuthContext } from './src/context/AuthContext';
import { SocketProvider } from './src/context/SocketContext';
import { usePushNotifications } from './src/hooks/usePushNotifications';
import AppNavigator from './src/navigation/AppNavigator';

// ─── Global Dark Theme ───────────────────────────────────────────────────────
const KampusCartTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: '#0f172a', // Paints the empty void between screens dark blue
    card: '#1e293b',       // Default color for headers and bottom tabs
    text: '#f1f5f9',       // Default text color
    border: '#334155',     // Default border color
  },
};

// Separate component so it can access AuthContext and navigationRef
function AppWithNotifications({ navigationRef }) {
  const { userToken } = useContext(AuthContext);

  // Only register push notifications when logged in
  usePushNotifications(userToken ? navigationRef : null);

  return <AppNavigator />;
}

export default function App() {
  const navigationRef = useRef(null);

  return (
    <AuthProvider>
      <SocketProvider>
        <SafeAreaProvider>
          {/* Changed status bar to match the dark theme perfectly */}
          <StatusBar backgroundColor="#0f172a" barStyle="light-content" />
          
          {/* Applied the global theme here */}
          <NavigationContainer ref={navigationRef} theme={KampusCartTheme}>
            <AppWithNotifications navigationRef={navigationRef} />
          </NavigationContainer>
        </SafeAreaProvider>
      </SocketProvider>
    </AuthProvider>
  );
}