/**
 * apiWithFallback.js — Production circuit-breaker wrapper for KampusCart API calls.
 *
 * Strategy:
 *   1. Try the primary API (VITE_SERVER_URL).
 *   2. On network error, timeout, or 5xx → silently retry on the fallback API (VITE_FALLBACK_SERVER_URL).
 *   3. On 4xx → rethrow immediately; these are intentional server responses, not infrastructure failures.
 *   4. If both fail → throw a standardised error with `isFallbackExhausted: true`.
 *
 * Both instances share the same interceptors (401 logout, 403 ban) via applyInterceptors.
 *
 * Usage:
 *   import { apiCall } from '../api/apiWithFallback';
 *   const res = await apiCall('get',  '/items', null, { params: { category: 'Books' } });
 *   const res = await apiCall('post', '/auth/login', { email, password });
 *   const res = await apiCall('put',  '/items/123', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
 */

import axios from 'axios';
import API, { applyInterceptors } from './axios';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const REQUEST_TIMEOUT = 15_000; // 15s — prevents infinite hang on Render cold starts

// Circuit-breaker state — avoids hammering a known-dead primary server for a while
let primaryCircuitOpen = false;
let circuitOpenedAt = 0;
const CIRCUIT_COOLDOWN_MS = 30_000; // 30s before re-testing primary

// ---------------------------------------------------------------------------
// Fallback instance — identical config, different baseURL.
// ---------------------------------------------------------------------------
const FALLBACK_URL = import.meta.env.VITE_FALLBACK_SERVER_URL;

const fallbackAPI = FALLBACK_URL
  ? axios.create({
      baseURL: `${FALLBACK_URL}/api`,
      withCredentials: true, // Must match primary — cookies need to be sent here too.
      timeout: REQUEST_TIMEOUT,
    })
  : null;

if (fallbackAPI) {
  applyInterceptors(fallbackAPI);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Dispatches the request through the given axios instance.
 * GET / DELETE / HEAD have no body; POST / PUT / PATCH do.
 */
function callInstance(instance, method, path, data, config) {
  const lowerMethod = method.toLowerCase();
  if (['post', 'put', 'patch'].includes(lowerMethod)) {
    return instance[lowerMethod](path, data, config);
  }
  return instance[lowerMethod](path, config);
}

/**
 * Returns true when the error is caused by infrastructure failure,
 * meaning a fallback attempt is worthwhile.
 *
 * - No `error.response`  → network error or timeout (Render cold-start, DNS, etc.)
 * - status >= 500        → server crashed or threw an unhandled exception
 *
 * Returns false for 4xx errors — those mean the server understood and rejected
 * the request (bad input, auth failure, not found). Retrying on a different
 * server won't help and might cause duplicate side-effects (e.g. double POST).
 */
function isFallbackWorthy(error) {
  // Network error (no response at all) — DNS, CORS pre-flight failure, timeout
  if (!error.response) return true;
  // Server error — 500, 502, 503, 504 etc.
  return error.response.status >= 500;
}

/**
 * Check if the circuit-breaker has cooled down and we should re-test primary.
 */
function shouldRetestPrimary() {
  if (!primaryCircuitOpen) return true;
  if (Date.now() - circuitOpenedAt > CIRCUIT_COOLDOWN_MS) {
    // Cooldown elapsed — close the circuit and try primary again
    primaryCircuitOpen = false;
    return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

/**
 * apiCall — drop-in replacement for direct `API.get / API.post / ...` calls.
 *
 * @param {string} method  - HTTP method: 'get' | 'post' | 'put' | 'delete' | 'patch'
 * @param {string} path    - Endpoint path, e.g. '/items' or '/auth/login'
 * @param {*}      data    - Request body for POST/PUT/PATCH. Pass null for GET/DELETE.
 * @param {object} config  - Extra axios config: { params, headers, signal, onUploadProgress, ... }
 * @returns {Promise<import('axios').AxiosResponse>}
 */
export async function apiCall(method, path, data = null, config = {}) {
  const hasFallback = !!fallbackAPI;

  // ── Fast-path: circuit open → skip primary, go straight to fallback ──
  if (primaryCircuitOpen && hasFallback && !shouldRetestPrimary()) {
    try {
      return await callInstance(fallbackAPI, method, path, data, config);
    } catch (fallbackError) {
      // Fallback also failed — surface a clean error
      throw buildExhaustedError(fallbackError, null);
    }
  }

  // ── Normal path: try primary first ──
  try {
    const result = await callInstance(API, method, path, data, config);
    // Primary succeeded — if the circuit was half-open, close it fully
    if (primaryCircuitOpen) {
      primaryCircuitOpen = false;
    }
    return result;
  } catch (primaryError) {
    // 4xx errors are intentional — rethrow so components handle them normally.
    if (!isFallbackWorthy(primaryError)) {
      throw primaryError;
    }

    // No fallback configured — rethrow primary error as-is
    if (!hasFallback) {
      throw primaryError;
    }

    // Open the circuit so subsequent requests skip primary for a while
    primaryCircuitOpen = true;
    circuitOpenedAt = Date.now();

    console.warn(
      `[KampusCart] Primary API unreachable (${primaryError.message}). Switching to fallback…`
    );

    try {
      return await callInstance(fallbackAPI, method, path, data, config);
    } catch (fallbackError) {
      // Both servers failed — surface a clean, user-friendly error.
      throw buildExhaustedError(fallbackError, primaryError);
    }
  }
}

/**
 * Build a standardised error when both APIs are down.
 * UI components can check `err.isFallbackExhausted` to show a service-down banner.
 */
function buildExhaustedError(fallbackError, primaryError) {
  const err = new Error(
    'Our service is temporarily unavailable. Please try again in a moment.'
  );
  err.isFallbackExhausted = true;
  err.code = 'SERVICE_UNAVAILABLE';
  // Preserve .response so any status-based checks in components still work.
  err.response = fallbackError.response ?? primaryError?.response ?? null;
  return err;
}

// ---------------------------------------------------------------------------
// Convenience shortcuts — matches the familiar API.get / API.post shape
// ---------------------------------------------------------------------------

/** apiCall.get('/items', { params: { category: 'Books' } }) */
apiCall.get = (path, config) => apiCall('get', path, null, config);

/** apiCall.post('/auth/login', { email, password }) */
apiCall.post = (path, data, config) => apiCall('post', path, data, config);

/** apiCall.put('/items/123', formData, { headers: ... }) */
apiCall.put = (path, data, config) => apiCall('put', path, data, config);

/** apiCall.patch('/users/profile', { name: 'New Name' }) */
apiCall.patch = (path, data, config) => apiCall('patch', path, data, config);

/** apiCall.delete('/items/123') */
apiCall.delete = (path, config) => apiCall('delete', path, null, config);
