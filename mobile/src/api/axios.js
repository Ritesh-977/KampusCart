import axios from 'axios';
import { getToken } from '../utils/secureStorage';

const API = axios.create({
  baseURL: 'https://api.kampuscart.site/api', // Pointing directly to your live backend!
});

// Automatically attach the token to every request
API.interceptors.request.use(
  async (config) => {
    const token = await getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export default API;