import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react(), tailwindcss()],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.HF_TOKEN': JSON.stringify(env.HF_TOKEN),
      'process.env.MODEL_NAME': JSON.stringify(env.MODEL_NAME),
      'process.env.API_BASE_URL': JSON.stringify(env.API_BASE_URL),
      'process.env.MAX_STEPS': JSON.stringify(env.MAX_STEPS),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      proxy: {
        '/api': 'http://localhost:7860',
        '/reset': 'http://localhost:7860',
        '/step': 'http://localhost:7860',
      },
    },
  };
});
