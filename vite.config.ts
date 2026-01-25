import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    const isProduction = mode === 'production';

    return {
      server: {
        port: 3000,
        host: '127.0.0.1', // Changed from 0.0.0.0 for security
      },
      build: {
        target: 'ES2022',
        minify: 'terser',
        terserOptions: {
          compress: {
            drop_console: isProduction, // Remove console logs in production
            drop_debugger: true,
          },
          output: {
            comments: false, // Remove comments from output
          },
        },
        rollupOptions: {
          output: {
            manualChunks: {
              'vendor': ['react', 'react-dom'],
              'lucide': ['lucide-react'],
              'gemini': ['@google/genai'],
              'pdf': ['jspdf'],
            },
          },
        },
        sourcemap: !isProduction, // Only generate source maps in dev
        cssCodeSplit: true,
        reportCompressedSize: false,
        chunkSizeWarningLimit: 500, // Warn if chunks are larger than 500kb
      },
      plugins: [react()],
      define: {
        'import.meta.env.VITE_GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        '__PROD__': JSON.stringify(isProduction),
      },
      resolve: {
        alias: {
          '@': path.resolve('.'),
        }
      }
    };
});
