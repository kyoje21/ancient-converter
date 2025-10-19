import { defineConfig } from 'vite';

export default defineConfig({
  root: 'public', // 👈 this is the key change
  build: {
    outDir: '../dist', // 👈 build output should go up one level
    emptyOutDir: true,
  },
  server: {
    port: 3000, // optional: 5173 also works
    open: true,
  },
});
