import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(({ mode }) => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: true,
    },
    esbuild: {
      // Strip console/debugger from the production APK bundle — free size +
      // a little runtime overhead removed from hot paths (game loops).
      drop: mode === 'production' ? ['console', 'debugger'] : [],
    },
    build: {
      target: 'es2019',
      cssCodeSplit: true,
      sourcemap: false,
      chunkSizeWarningLimit: 600,
      rollupOptions: {
        output: {
          // Split vendor libs from app code so the hub screen's initial
          // chunk is as small as possible; each game engine already gets
          // its own chunk automatically via the dynamic import() in App.tsx.
          manualChunks: {
            vendor: ['react', 'react-dom'],
            motion: ['motion/react'],
            icons: ['lucide-react'],
          },
        },
      },
    },
  };
});
