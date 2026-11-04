import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { apiBase } from './services/cloudProgress';
export default defineConfig(({ mode }) => {
  const env = { ...loadEnv(mode, process.cwd(), ''), ...process.env };
  if (env.VITE_PROGRESS_API_URL && !apiBase(env.VITE_PROGRESS_API_URL)) throw new Error('VITE_PROGRESS_API_URL must be an HTTPS API URL, without credentials, query or fragment. Local development may use http://127.0.0.1.');
  return ({
  plugins: [react()],
  base: env.VITE_BASE_PATH || './',
  build: { outDir: 'dist' },
});
});
