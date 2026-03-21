import React, { useRef, useContext } from 'react';
import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { AuthProvider, AuthContext } from './src/context/AuthContext';
import { SocketProvider } from './src/context/SocketContext';
import { usePushNotifications } from './src/hooks/usePushNotifications';
import AppNavigator from './src/navigation/AppNavigator';

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
          <StatusBar backgroundColor="#000000" barStyle="light-content" />
          <NavigationContainer ref={navigationRef}>
            <AppWithNotifications navigationRef={navigationRef} />
          </NavigationContainer>
        </SafeAreaProvider>
      </SocketProvider>
    </AuthProvider>
  );
}
