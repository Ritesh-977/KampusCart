import React, { createContext, useState, useEffect } from 'react';
import { getToken, saveToken, removeToken } from '../utils/secureStorage';
import AsyncStorage from '@react-native-async-storage/async-storage'; 

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [userToken, setUserToken] = useState(null);
  const [currentUser, setCurrentUser] = useState(null); 
  const [isGuest, setIsGuest] = useState(false); // 🚀 NEW: Guest State

  const checkToken = async () => {
    try {
      const token = await getToken();
      const userDataStr = await AsyncStorage.getItem('userData');
      if (token && userDataStr) {
        setUserToken(token);
        setCurrentUser(JSON.parse(userDataStr));
      }
    } catch (error) {
      console.log("Failed to fetch token", error);
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
    }
    setUserToken(token);
    setIsGuest(false); // Make sure guest mode is off
    setIsLoading(false);
  };

  // 🚀 NEW: Function to trigger Guest Mode
  const skipLogin = () => {
    setIsGuest(true);
  };

  const logout = async () => {
    setIsLoading(true);
    await removeToken();
    await AsyncStorage.removeItem('userData');
    setUserToken(null);
    setCurrentUser(null);
    setIsGuest(false); // 🚀 Reset guest mode on logout
    setIsLoading(false);
  };

  // 🚀 Expose isGuest and skipLogin to the rest of the app
  return (
    <AuthContext.Provider value={{ login, logout, skipLogin, userToken, currentUser, isGuest, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};