/**
 * KarunaGrid API Configuration
 * Reads VITE_API_BASE_URL from environment variables (e.g., on Vercel)
 * and falls back to local Django backend during development.
 */
let rawBase = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_BASE_URL) || 'http://127.0.0.1:8000';
rawBase = rawBase.replace(/\/+$/, '');

export const API_BASE_URL = rawBase.endsWith('/api') ? rawBase.slice(0, -4) : rawBase;
export const API_ROOT = `${API_BASE_URL}/api`;

export default {
  API_BASE_URL,
  API_ROOT,
};
