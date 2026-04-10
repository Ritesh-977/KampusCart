import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css' // <--- THIS LINE IS MANDATORY
import { BrowserRouter } from 'react-router-dom'
import { ThemeProvider } from './context/ThemeContext.jsx'
import { CollegeProvider } from './context/CollegeContext.jsx'
import { HelmetProvider } from 'react-helmet-async';
import { MaintenanceProvider } from './context/MaintenanceContext.jsx';
import { GoogleOAuthProvider } from '@react-oauth/google';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <HelmetProvider>
      <BrowserRouter>
        <ThemeProvider>
          <CollegeProvider>
            <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID || ''}>
              <MaintenanceProvider>
                <App />
              </MaintenanceProvider>
            </GoogleOAuthProvider>
          </CollegeProvider>
        </ThemeProvider>
      </BrowserRouter>
    </HelmetProvider>
  </React.StrictMode>,
)