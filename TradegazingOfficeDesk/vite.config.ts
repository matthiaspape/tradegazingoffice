import vinext from 'vinext';
import { defineConfig } from 'vite';

export default defineConfig({
  ssr: { external: ['node:sqlite'] },
  server: { host: '127.0.0.1', port: 43120, strictPort: true },
  plugins: [vinext()],
});
