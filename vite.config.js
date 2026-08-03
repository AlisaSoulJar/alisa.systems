import { defineConfig } from 'vite';
import { fileURLToPath, URL } from 'url';

export default defineConfig({
  server: {
    fs: {
      allow: ['..']
    },
    proxy: {
      '/props': 'http://127.0.0.1:8741/colony/overworld',
      '/labs': 'http://127.0.0.1:8741/colony/overworld',
      '/rooms': 'http://127.0.0.1:8741/colony/overworld'
    }
  },
  resolve: {
    alias: {
      '@alisa-engine': fileURLToPath(new URL('../overworld/js/alisa-engine', import.meta.url))
    }
  }
});
