// src/components/CollegeProtectedRoute.jsx
// Redirects to /select-college if no college has been chosen yet.
// Works independently of ProtectedRoute (auth check) — both can be stacked.
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useCollege } from '../context/CollegeContext';

const CollegeProtectedRoute = ({ children }) => {
  const { selectedCollege } = useCollege();

  if (!selectedCollege) {
    return <Navigate to="/select-college" replace />;
  }

  return children;
};

export default CollegeProtectedRoute;
