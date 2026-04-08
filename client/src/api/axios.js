import axios from 'axios';

const API = axios.create({
    baseURL: `${import.meta.env.VITE_SERVER_URL}/api`,
    withCredentials: true, // 👈 Critical for cookies
    timeout: 15000, // 15s — prevents infinite hang on Render cold starts
});

// Exported so the fallback instance in apiWithFallback.js can share the same logic.
export function applyInterceptors(instance) {
    instance.interceptors.response.use(
        (response) => response,
        (error) => {
            // A. Handle Session Expiry (401 Unauthorized)
            // If the backend says "No token" or "Invalid token", log us out.
            if (error.response && error.response.status === 401) {
                localStorage.removeItem('user');
                localStorage.removeItem('userInfo');

                // Only redirect if we aren't already on the login page
                if (window.location.pathname !== '/login') {
                    window.location.href = '/login';
                }
            }

            // B. Handle Bans (403 Forbidden)
            if (error.response && error.response.status === 403) {
                const errorMessage = error.response.data.message || "";
                if (
                    errorMessage.toLowerCase().includes('banned') ||
                    errorMessage.toLowerCase().includes('suspended')
                ) {
                    localStorage.removeItem('user');
                    localStorage.removeItem('userInfo');
                    localStorage.removeItem('searchHistory');
                    alert(`SESSION TERMINATED:\n\n${errorMessage}`);
                    window.location.href = '/login';
                }
            }
            return Promise.reject(error);
        }
    );
}

applyInterceptors(API);

export default API;