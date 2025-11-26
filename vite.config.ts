import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path';
import { copyFileSync, mkdirSync } from 'fs';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'copy-files',
      closeBundle() {
        copyFileSync('public/manifest.json', 'dist/manifest.json');
        
        mkdirSync('dist/src/content', { recursive: true });
        copyFileSync('src/content/styles.css', 'dist/src/content/styles.css');
      }
    }
  ],
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        content: resolve(__dirname, 'src/content/index.tsx'),
        options: resolve(__dirname, 'src/options/index.html'),
        popup: resolve(__dirname, 'src/popup/index.html'),
      },
      output: {
        entryFileNames: (chunkInfo) => {
          if (chunkInfo.name === 'content') {
            return 'src/content/[name].js';
          }
          return 'assets/[name]-[hash].js';
        }
      }
    }
  }
})