import React, { createContext, useState, useEffect } from 'react';
import { FiAlertTriangle } from 'react-icons/fi';

export const MaintenanceContext = createContext();

const MaintenanceScreen = () => (
  <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-surface-inverse text-white p-6 text-center">
    <FiAlertTriangle className="text-warning w-24 h-24 mb-6 animate-pulse" />
    <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-accent to-primary mb-4">
      Under Maintenance
    </h1>
    <p className="text-inverse-muted max-w-md text-lg">
      KampusCart is currently undergoing scheduled maintenance or experiencing unexpectedly high traffic. 
      Please check back in a few minutes!
    </p>
  </div>
);

export const MaintenanceProvider = ({ children }) => {
  const [isDown, setIsDown] = useState(false);

  useEffect(() => {
    const handleApiExhausted = () => setIsDown(true);

    window.addEventListener('kampuscart-api-exhausted', handleApiExhausted);
    return () => window.removeEventListener('kampuscart-api-exhausted', handleApiExhausted);
  }, []);

  if (isDown) {
    return <MaintenanceScreen />;
  }

  return (
    <MaintenanceContext.Provider value={{ isDown }}>
      {children}
    </MaintenanceContext.Provider>
  );
};
