import React, { createContext, useState, useEffect } from 'react';
import { getToken, saveToken, removeToken } from '../utils/secureStorage';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [userToken, setUserToken] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [isGuest, setIsGuest] = useState(false);

  const checkToken = async () => {
    try {
      const token = await getToken();
      const userDataStr = await AsyncStorage.getItem('userData');
      if (token && userDataStr) {
        setUserToken(token);
        setCurrentUser(JSON.parse(userDataStr));
      }
    } catch (error) {
      console.log('Failed to restore session:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { checkToken(); }, []);

  const login = async (token, user) => {
    setIsLoading(true);
    await saveToken(token);
    if (user) {
      await AsyncStorage.setItem('userData', JSON.stringify(user));
      setCurrentUser(user);
    } else {
      // Fetch user data if not provided
      try {
        const { default: API } = await import('../api/axios');
        const response = await API.get('/users/profile');
        await AsyncStorage.setItem('userData', JSON.stringify(response.data));
        setCurrentUser(response.data);
      } catch (e) {
        console.log('Could not fetch user profile:', e);
      }
    }
    setUserToken(token);
    setIsGuest(false);
    setIsLoading(false);
  };

  const skipLogin = () => {
    setIsGuest(true);
  };

  const logout = async () => {
    setIsLoading(true);
    await removeToken();
    await AsyncStorage.removeItem('userData');
    setUserToken(null);
    setCurrentUser(null);
    setIsGuest(false);
    setIsLoading(false);
  };

  const updateCurrentUser = async (updatedUser) => {
    await AsyncStorage.setItem('userData', JSON.stringify(updatedUser));
    setCurrentUser(updatedUser);
  };

  return (
    <AuthContext.Provider value={{
      login, logout, skipLogin, updateCurrentUser,
      userToken, currentUser, isGuest, isLoading,
    }}>
      {children}
    </AuthContext.Provider>
  );
};
