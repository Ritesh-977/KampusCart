import React, { createContext, useState, useEffect } from 'react';
import { getToken, saveToken, removeToken } from '../utils/secureStorage';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [userToken, setUserToken] = useState(null);

  // When the app starts, check if a token is saved on the phone
  const checkToken = async () => {
    try {
      const token = await getToken();
      if (token) {
        setUserToken(token);
      }
    } catch (error) {
      console.log("Failed to fetch token", error);
    } finally {
      setIsLoading(false); // Stop the loading spinner
    }
  };

  useEffect(() => {
    checkToken();
  }, []);

  // Call this from LoginScreen/RegisterScreen
  const login = async (token) => {
    setIsLoading(true);
    await saveToken(token);
    setUserToken(token);
    setIsLoading(false);
  };

  // Call this from the Profile/Home screen
  const logout = async () => {
    setIsLoading(true);
    await removeToken();
    setUserToken(null);
    setIsLoading(false);
  };

  return (
    <AuthContext.Provider value={{ login, logout, userToken, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};