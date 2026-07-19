import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@schoolos/types': path.resolve(__dirname, '../../packages/types/src'),
      '@schoolos/utils': path.resolve(__dirname, '../../packages/utils/src'),
    },
  },
  server: {
    port: Number(process.env.PORT) || 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (id.includes('react-router-dom') || id.includes('/react-dom/') || id.includes('/react/')) return 'vendor-react';
          if (id.includes('@tanstack')) return 'vendor-query';
          if (id.includes('framer-motion')) return 'vendor-motion';
          return undefined;
        },
      },
    },
  },
});
