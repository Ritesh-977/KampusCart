// src/components/ProtectedRoute.jsx
import React from 'react';
import { Navigate } from 'react-router-dom';

const ProtectedRoute = ({ children }) => {
  // 1. Check if user is logged in
  // For now, we check if a "token" exists in localStorage (common way to store login info)
  // Later, you can replace this with a real check from your AuthContext
  const isAuthenticated = localStorage.getItem("token") || false; 

  if (!isAuthenticated) {
    // 2. If not logged in, redirect to Login page immediately
    return <Navigate to="/login" replace />;
  }

  // 3. If logged in, return the child component (e.g., Dashboard, Sell Page)
  return children;
};

export default ProtectedRoute;