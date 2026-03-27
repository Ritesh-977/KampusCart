import React, { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import AuthNavigator from './AuthNavigator';
import MainTabNavigator from './MainTabNavigator';

const AppNavigator = () => {
  const { userToken, isGuest } = useContext(AuthContext);
  return (userToken !== null || isGuest) ? <MainTabNavigator /> : <AuthNavigator />;
};

export default AppNavigator;