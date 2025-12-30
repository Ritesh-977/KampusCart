import axios from 'axios';

const API = axios.create({
    baseURL: `${import.meta.env.VITE_SERVER_URL}/api`, // Make sure this matches your backend port
});

// This is the "Magic" part that fixes the 401 error
API.interceptors.request.use((req) => {
    const token = localStorage.getItem('token');
    if (token) {
        // Must use 'Bearer ' (with a space)
        req.headers.Authorization = `Bearer ${token}`;
    }
    return req;
});

export default API;