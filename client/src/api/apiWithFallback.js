/**
 * apiWithFallback.js — Simplified wrapper for KampusCart API.
 * NOTE: Fallback and circuit-breaker logic has been removed.
 */
import API from './baseAxios.js';

export async function apiCall(method, path, data = null, config = {}) {
  const lowerMethod = method.toLowerCase();
  
  if (['post', 'put', 'patch', 'delete'].includes(lowerMethod)) {
    if (!config.headers) config.headers = {};
    if (!config.headers['X-Idempotency-Key']) {
      try {
        config.headers['X-Idempotency-Key'] = crypto.randomUUID();
      } catch {
        config.headers['X-Idempotency-Key'] = Math.random().toString(36).substring(2) + Date.now().toString(36);
      }
    }
  }

  if (['post', 'put', 'patch'].includes(lowerMethod)) {
    return API[lowerMethod](path, data, config);
  }
  return API[lowerMethod](path, config);
}

apiCall.get = (path, config) => apiCall('get', path, null, config);
apiCall.post = (path, data, config) => apiCall('post', path, data, config);
apiCall.put = (path, data, config) => apiCall('put', path, data, config);
apiCall.patch = (path, data, config) => apiCall('patch', path, data, config);
apiCall.delete = (path, config) => apiCall('delete', path, null, config);