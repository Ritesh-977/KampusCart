import React from 'react';
import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { AuthProvider } from './src/context/AuthContext';
import { SocketProvider } from './src/context/SocketContext';
import AppNavigator from './src/navigation/AppNavigator';

export default function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <SafeAreaProvider>
          <KeyboardProvider>
            <StatusBar backgroundColor="#000000" barStyle="light-content" />
            <NavigationContainer>
              <AppNavigator />
            </NavigationContainer>
          </KeyboardProvider>
        </SafeAreaProvider>
      </SocketProvider>
    </AuthProvider>
  );
}