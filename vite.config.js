import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  server: {
    host: '0.0.0.0',
    port: 5173
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        browse: resolve(__dirname, 'browse.html'),
        videos: resolve(__dirname, 'videos.html')
      }
    },
    assetsInlineLimit: 4096,
    sourcemap: false
  }
});
