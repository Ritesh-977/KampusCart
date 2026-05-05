import { useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';

const useServerHealth = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const failureCountRef = useRef(0);
  const intervalRef = useRef(null);

  useEffect(() => {
    // Don't run health checks if already on maintenance page
    if (location.pathname === '/maintenance') {
      return;
    }

    const checkServerHealth = async () => {
      // Abort if user's internet is down
      if (!navigator.onLine) {
        console.log('[ServerHealth] User is offline, skipping health check');
        return;
      }

      const primaryUrl = import.meta.env.VITE_PRIMARY_SERVER_URL;

      try {
        const response = await axios.get(`${primaryUrl}/api/health`, { timeout: 10000 });
        
        if (response.status === 200) {
          if (failureCountRef.current > 0) {
            console.log('[ServerHealth] Server recovered, clearing failure count');
          }
          failureCountRef.current = 0;
          return;
        }
      } catch (error) {
        console.error('[ServerHealth] Error during health check:', error);
      }

      // Server failed
      failureCountRef.current += 1;
      console.warn(`[ServerHealth] Server failed. Strike ${failureCountRef.current}/2`);

      // Redirect on second consecutive failure
      if (failureCountRef.current >= 2) {
        console.error('[ServerHealth] 2 consecutive failures detected. Redirecting to maintenance page.');
        navigate('/maintenance', { replace: true });
      }
    };

    // Run initial check immediately
    checkServerHealth();

    // Set up 5-minute interval
    intervalRef.current = setInterval(checkServerHealth, 300000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [navigate, location.pathname]);
};

export default useServerHealth;
