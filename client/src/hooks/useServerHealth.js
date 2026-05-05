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
      const fallbackUrl = import.meta.env.VITE_FALLBACK_SERVER_URL;

      try {
        const results = await Promise.allSettled([
          axios.get(`${primaryUrl}/api/health`, { timeout: 10000 }),
          axios.get(`${fallbackUrl}/api/health`, { timeout: 10000 })
        ]);

        const primarySuccess = results[0].status === 'fulfilled' && results[0].value?.status === 200;
        const fallbackSuccess = results[1].status === 'fulfilled' && results[1].value?.status === 200;

        // If either server responds successfully, clear failure count
        if (primarySuccess || fallbackSuccess) {
          if (failureCountRef.current > 0) {
            console.log('[ServerHealth] Server recovered, clearing failure count');
          }
          failureCountRef.current = 0;
          return;
        }

        // Both servers failed
        failureCountRef.current += 1;
        console.warn(`[ServerHealth] Both servers failed. Strike ${failureCountRef.current}/2`);

        // Redirect on second consecutive failure
        if (failureCountRef.current >= 2) {
          console.error('[ServerHealth] 2 consecutive failures detected. Redirecting to maintenance page.');
          navigate('/maintenance', { replace: true });
        }
      } catch (error) {
        console.error('[ServerHealth] Unexpected error during health check:', error);
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
