import { defineConfig } from 'vite';

export default defineConfig({
  root: '.', // make sure it's the project root
  publicDir: 'public', // ✅ ensure public/ folder is copied to dist
  build: {
    outDir: 'dist', // Vercel serves from dist by default
  },
  server: {
    port: 3000,
  },
});
