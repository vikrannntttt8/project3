/**
 * authSync.js — Multi-Mode Authentication & InnerTube Account Sync Manager
 * ──────────────────────────────────────────────────────────────────────────
 * Supports:
 *   - Mode A: SAPISID Cookie / Session String (with dynamic SAPISIDHASH calculation)
 *   - Mode B: OAuth 2.0 Credentials JSON Blob (with access_token validation)
 * ──────────────────────────────────────────────────────────────────────────
 */

import CryptoJS from 'crypto-js';

export const AUTH_STORAGE_KEY = 'pulse_auth_config';

/**
 * Default empty auth state
 */
export const DEFAULT_AUTH_CONFIG = {
  mode: 'sapisid', // 'sapisid' | 'oauth'
  sapisid: '',
  oauthJson: '',
  oauthData: null,
  status: 'unconfigured', // 'unconfigured' | 'connected' | 'error' | 'expired'
  lastTested: null,
  accountName: '',
  errorMessage: '',
};

/**
 * Retrieve persisted auth configuration from localStorage
 */
export function getAuthConfig() {
  if (typeof window === 'undefined') return { ...DEFAULT_AUTH_CONFIG };
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) {
      // Legacy fallback check
      const legacyToken = localStorage.getItem('pulse_yt_token');
      if (legacyToken) {
        return {
          ...DEFAULT_AUTH_CONFIG,
          mode: 'sapisid',
          sapisid: legacyToken.trim(),
        };
      }
      return { ...DEFAULT_AUTH_CONFIG };
    }
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_AUTH_CONFIG, ...parsed };
  } catch (err) {
    console.warn('[AuthSync] Error parsing stored auth config:', err);
    return { ...DEFAULT_AUTH_CONFIG };
  }
}

/**
 * Persist auth configuration to localStorage
 */
export function saveAuthConfig(config) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(config));
    // Also keep legacy token updated for backward compatibility
    if (config.sapisid) {
      localStorage.setItem('pulse_yt_token', config.sapisid);
    }
  } catch (err) {
    console.error('[AuthSync] Failed to persist auth config:', err);
  }
}

/**
 * Extract SAPISID from a full cookie header string or return raw if only token provided
 */
export function extractSapisid(cookieStr) {
  if (!cookieStr || typeof cookieStr !== 'string') return '';
  const trimmed = cookieStr.trim();
  
  // If user pasted "SAPISID=xxx;" or "__Secure-3PAPISID=xxx;"
  const match = trimmed.match(/(?:SAPISID|__Secure-3PAPISID)=([^;]+)/i);
  if (match && match[1]) {
    return match[1].trim();
  }
  return trimmed;
}

/**
 * Generate SAPISIDHASH header value
 * Algorithm: SHA1(`${timestamp} ${sapisid} ${origin}`)
 * Format: `SAPISIDHASH ${timestamp}_${hash}`
 */
export function generateSapisidHash(sapisid, origin = 'https://music.youtube.com') {
  if (!sapisid) return '';
  const timestamp = Math.floor(Date.now() / 1000);
  const payload = `${timestamp} ${sapisid} ${origin}`;
  const hash = CryptoJS.SHA1(payload).toString(CryptoJS.enc.Hex);
  return `SAPISIDHASH ${timestamp}_${hash}`;
}

/**
 * Validate and parse OAuth JSON blob
 * Requires at least access_token
 */
export function parseAndValidateOAuthJson(jsonString) {
  if (!jsonString || typeof jsonString !== 'string' || !jsonString.trim()) {
    throw new Error('OAuth JSON payload is empty');
  }

  let parsed;
  try {
    parsed = JSON.parse(jsonString.trim());
  } catch {
    throw new Error('Invalid JSON format. Please paste a valid JSON object.');
  }

  if (typeof parsed !== 'object' || parsed === null) {
    throw new Error('Payload must be a valid JSON object');
  }

  const accessToken = parsed.access_token || parsed.accessToken;
  if (!accessToken || typeof accessToken !== 'string' || !accessToken.trim()) {
    throw new Error('Missing "access_token" in OAuth JSON');
  }

  return {
    access_token: accessToken.trim(),
    refresh_token: parsed.refresh_token || parsed.refreshToken || '',
    token_type: parsed.token_type || 'Bearer',
    expiry_date: parsed.expiry_date || parsed.expires_at || null,
  };
}

/**
 * Get HTTP headers for authenticated InnerTube requests based on active configuration
 */
export function getInnertubeAuthHeaders(origin = 'https://music.youtube.com') {
  const config = getAuthConfig();
  const headers = {
    'Content-Type': 'application/json',
    'X-YouTube-Client-Name': '67', // WEB_REMIX YouTube Music client
    'X-YouTube-Client-Version': '1.20250101.01.00',
    'X-Origin': origin,
  };

  if (config.mode === 'oauth' && config.oauthData?.access_token) {
    headers['Authorization'] = `Bearer ${config.oauthData.access_token}`;
  } else if (config.mode === 'sapisid' && config.sapisid) {
    const sapisid = extractSapisid(config.sapisid);
    if (sapisid) {
      headers['Authorization'] = generateSapisidHash(sapisid, origin);
      headers['X-Goog-AuthUser'] = '0';
      headers['Cookie'] = `SAPISID=${sapisid}; __Secure-3PAPISID=${sapisid};`;
    }
  }

  return headers;
}

/**
 * Client-side fetch wrapper for InnerTube /youtubei/v1/* endpoints
 */
export async function innertubeFetch(endpoint, options = {}) {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  // Prefer local Vite gateway proxy (/youtubei/v1/...)
  const targetUrl = cleanEndpoint.startsWith('/youtubei/v1')
    ? cleanEndpoint
    : `/youtubei/v1${cleanEndpoint}`;

  const authHeaders = getInnertubeAuthHeaders();
  const mergedHeaders = {
    ...authHeaders,
    ...(options.headers || {}),
  };

  const config = {
    ...options,
    headers: mergedHeaders,
  };

  return fetch(targetUrl, config);
}

/**
 * Test InnerTube authentication and sync connectivity
 * Pings /api/sync/test or /youtubei/v1/browse with browseId: 'FEmusic_liked'
 */
export async function testSyncConnection() {
  const config = getAuthConfig();
  if (config.mode === 'sapisid' && !config.sapisid.trim()) {
    return { success: false, message: 'Please enter a SAPISID token or cookie string first' };
  }
  if (config.mode === 'oauth' && !config.oauthData?.access_token) {
    return { success: false, message: 'Please enter and validate a valid OAuth JSON blob first' };
  }

  try {
    // 1. Try local Vite test-sync endpoint first
    const testRes = await fetch('/api/sync/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode: config.mode,
        sapisid: config.mode === 'sapisid' ? extractSapisid(config.sapisid) : '',
        accessToken: config.mode === 'oauth' ? config.oauthData?.access_token : '',
      }),
    });

    if (testRes.ok) {
      const data = await testRes.json();
      const updated = {
        ...config,
        status: 'connected',
        lastTested: Date.now(),
        accountName: data.accountName || 'YouTube Music Account',
        errorMessage: '',
      };
      saveAuthConfig(updated);
      return { success: true, message: 'Connected / Sync Active', accountName: updated.accountName };
    }

    if (testRes.status === 401 || testRes.status === 403) {
      const errData = await testRes.json().catch(() => ({}));
      const updated = {
        ...config,
        status: 'expired',
        lastTested: Date.now(),
        errorMessage: errData.message || 'Token or cookie expired (401/403)',
      };
      saveAuthConfig(updated);
      return { success: false, message: 'Authentication expired or invalid credentials (401)', status: testRes.status };
    }

    // 2. Direct fallback ping through /youtubei/v1/browse
    const fallbackRes = await innertubeFetch('/youtubei/v1/browse', {
      method: 'POST',
      body: JSON.stringify({
        context: {
          client: {
            clientName: 'WEB_REMIX',
            clientVersion: '1.20250101.01.00',
            hl: 'en',
            gl: 'US',
          },
        },
        browseId: 'FEmusic_liked',
      }),
    });

    if (fallbackRes.ok) {
      const updated = {
        ...config,
        status: 'connected',
        lastTested: Date.now(),
        accountName: 'YouTube Music Account',
        errorMessage: '',
      };
      saveAuthConfig(updated);
      return { success: true, message: 'Connected / Sync Active' };
    }

    const updated = {
      ...config,
      status: 'error',
      lastTested: Date.now(),
      errorMessage: `Status ${fallbackRes.status}`,
    };
    saveAuthConfig(updated);
    return { success: false, message: `Sync verification failed (${fallbackRes.status})` };
  } catch (err) {
    console.error('[AuthSync] Test error:', err);
    return { success: false, message: err.message || 'Connection error. Check network or CORS proxy.' };
  }
}
