/**
 * apiWithFallback.js — Production circuit-breaker wrapper for KampusCart API.
 */
import axios from 'axios';
import API, { applyInterceptors } from './baseAxios.js';

const REQUEST_TIMEOUT = 15_000; 
const CIRCUIT_COOLDOWN_MS = 30_000; 
let primaryCircuitOpen = false;
let circuitOpenedAt = 0;

const FALLBACK_URL = import.meta.env.VITE_FALLBACK_SERVER_URL;

const fallbackAPI = FALLBACK_URL
  ? axios.create({
      baseURL: `${FALLBACK_URL}/api`,
      withCredentials: true, 
      timeout: REQUEST_TIMEOUT,
    })
  : null;

if (fallbackAPI) {
  applyInterceptors(fallbackAPI);
}

function callInstance(instance, method, path, data, config) {
  const lowerMethod = method.toLowerCase();
  if (['post', 'put', 'patch'].includes(lowerMethod)) {
    return instance[lowerMethod](path, data, config);
  }
  return instance[lowerMethod](path, config);
}

function isFallbackWorthy(error) {
  if (!error.response) return true; // Network/DNS/Timeout
  return error.response.status >= 500; // Server crash
}

function shouldRetestPrimary() {
  if (!primaryCircuitOpen) return true;
  if (Date.now() - circuitOpenedAt > CIRCUIT_COOLDOWN_MS) {
    primaryCircuitOpen = false;
    return true;
  }
  return false;
}

export async function apiCall(method, path, data = null, config = {}) {
  const hasFallback = !!fallbackAPI;
  const lowerMethod = method.toLowerCase();
  
  // Guard DB modifications when retrying on Fallback
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

  // 1. Fast-path: Circuit is open, go straight to fallback
  if (primaryCircuitOpen && hasFallback && !shouldRetestPrimary()) {
    try {
      return await callInstance(fallbackAPI, method, path, data, config);
    } catch (fallbackError) {
      throw buildExhaustedError(fallbackError, null);
    }
  }

  // 2. Normal path: Try primary first
  try {
    const result = await callInstance(API, method, path, data, config);
    if (primaryCircuitOpen) primaryCircuitOpen = false; // Close circuit on success
    return result;
  } catch (primaryError) {
    if (!isFallbackWorthy(primaryError)) {
      throw primaryError; // Rethrow 4xx client errors immediately
    }

    if (!hasFallback) {
      // Primary is down and we don't have a fallback configured
      throw buildExhaustedError(null, primaryError);
    }

    primaryCircuitOpen = true;
    circuitOpenedAt = Date.now();
    console.warn(`[KampusCart] Primary API down. Switching to fallback…`);

    try {
      return await callInstance(fallbackAPI, method, path, data, config);
    } catch (fallbackError) {
      throw buildExhaustedError(fallbackError, primaryError);
    }
    
  }
}

function buildExhaustedError(fallbackError, primaryError) {
  const err = new Error('Service is temporarily unavailable.');
  err.isFallbackExhausted = true;
  err.code = 'SERVICE_UNAVAILABLE';
  err.response = fallbackError?.response ?? primaryError?.response ?? null;
  
  // TRIGGER GLOBAL MAINTENANCE STATE
  window.dispatchEvent(new CustomEvent('kampuscart-api-exhausted'));
  
  return err;
}

// Convenience methods
apiCall.get = (path, config) => apiCall('get', path, null, config);
apiCall.post = (path, data, config) => apiCall('post', path, data, config);
apiCall.put = (path, data, config) => apiCall('put', path, data, config);
apiCall.patch = (path, data, config) => apiCall('patch', path, data, config);
apiCall.delete = (path, config) => apiCall('delete', path, null, config);