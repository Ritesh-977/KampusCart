import React, { useContext } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { AuthContext } from '../context/AuthContext';
import AuthNavigator from './AuthNavigator';

// 🚨 IMPORT THE NEW TAB NAVIGATOR (Remove the HomeScreen import)
import MainTabNavigator from './MainTabNavigator'; 

const AppNavigator = () => {
  const { isLoading, userToken, isGuest } = useContext(AuthContext);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#4f46e5" />
      </View>
    );
  }

  // 🚨 IF LOGGED IN, SHOW TABS. IF NOT, SHOW LOGIN.
  return (userToken !== null || isGuest) ? <MainTabNavigator /> : <AuthNavigator />;
  
};

export default AppNavigator;