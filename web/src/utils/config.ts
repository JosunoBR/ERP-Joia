/**
 * Configurações globais de conexão com o Backend
 *
 * Em Produção (Render/Vercel/Cloud):
 * - Usa caminho relativo '/api' quando hospedado junto com o backend
 * - Ou usa a variável de ambiente VITE_API_URL
 *
 * Desenvolvimento Local:
 * - Web Browser: http://127.0.0.1:3001
 * - Emulador Android: http://10.0.2.2:3001
 */

const isProd = import.meta.env.PROD;

export const API_BASE_URL = import.meta.env.VITE_API_URL || (isProd ? '/api' : 'http://127.0.0.1:3001/api');
export const API_HOST = import.meta.env.VITE_API_HOST || (isProd ? (typeof window !== 'undefined' ? window.location.origin : '') : 'http://127.0.0.1:3001');

