import React, { useContext } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { AuthContext } from '../context/AuthContext';
import AuthNavigator from './AuthNavigator';
import HomeScreen from '../screens/HomeScreen'; 
// Later, HomeScreen will be replaced by a MainTabNavigator!

const AppNavigator = () => {
  const { isLoading, userToken } = useContext(AuthContext);

  // Show a loading spinner while checking for the token on app startup
  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#4f46e5" />
      </View>
    );
  }

  // THE MASTER SWITCH: 
  // If we have a token, show the app. If not, show the Login screen!
  return userToken !== null ? <HomeScreen /> : <AuthNavigator />;
};

export default AppNavigator;