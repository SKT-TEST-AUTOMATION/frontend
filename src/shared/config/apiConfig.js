// src/shared/config/apiConfig.js
export const API_ORIGIN =
  (import.meta.env.VITE_BACKEND_ORIGIN ?? "") ||
  (import.meta.env.DEV ? "http://localhost:18080" : "");