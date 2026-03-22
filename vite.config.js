import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    headers: {
      'Content-Security-Policy':
        "default-src * 'unsafe-inline' 'unsafe-eval' data: blob:;",
    },
  },
});