import { apiCall as API } from './apiWithFallback.js';

// By exporting the wrapper from here, ALL components in the app 
// that import API from '../api/axios.js' will automatically use the circuit breaker!
export default API;
