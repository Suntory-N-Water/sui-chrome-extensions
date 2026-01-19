import path from 'node:path';
import { crx, defineManifest } from '@crxjs/vite-plugin';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react-swc';
import { defineConfig } from 'vite';

const manifest = defineManifest({
  manifest_version: 3,
  name: 'X Lists User Spam Reporter',
  version: '0.2.0',
  description: 'リストのメンバーを一括スパム報告するツール',
  permissions: ['tabs', 'activeTab', 'storage', 'scripting'],
  host_permissions: ['https://x.com/*', 'http://localhost:5173/*'],
  icons: {
    '16': 'icons/icon-16.png',
    '32': 'icons/icon-32.png',
    '48': 'icons/icon-48.png',
    '128': 'icons/icon-128.png',
  },
  action: {
    default_popup: 'index.html',
  },
  background: {
    service_worker: 'src/background/index.ts',
    type: 'module',
  },
  content_scripts: [
    {
      matches: ['https://x.com/*'],
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
