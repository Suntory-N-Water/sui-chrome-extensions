import path from 'node:path';
import { crx, defineManifest } from '@crxjs/vite-plugin';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react-swc';
import { defineConfig } from 'vite';

const manifest = defineManifest({
  manifest_version: 3,
  name: 'H Reviews Collector',
  version: '0.1.0',
  description: 'レビューを収集する拡張機能',
  permissions: ['tabs', 'activeTab', 'storage', 'scripting'],
  host_permissions: ['https://www.cityheaven.net/*', 'http://localhost:5173/*'],
  action: {
    default_popup: 'index.html',
  },
  background: {
    service_worker: 'src/background/index.ts',
    type: 'module',
  },
  content_scripts: [
    {
      matches: [
        'https://www.cityheaven.net/*/reviews/*',
        'https://www.cityheaven.net/*/*/*/*/reviews/*',
      ],
      js: ['src/content/index.ts'],
    },
  ],
});

export default defineConfig({
  plugins: [react(), tailwindcss(), crx({ manifest })],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
