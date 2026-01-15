import path from 'node:path';
import { crx, defineManifest } from '@crxjs/vite-plugin';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react-swc';
import { defineConfig } from 'vite';

const manifest = defineManifest({
  manifest_version: 3,
  name: 'テスト拡張機能',
  version: '0.0.1',
  description:
    '拡張機能のオプションページを開いてボタンを押すと、コンソールにメッセージが表示されます。',
  host_permissions: ['http://localhost:5173/*'],
  action: {
    default_popup: 'index.html',
  },
});

export default defineConfig({
  plugins: [react(), tailwindcss(), crx({ manifest })],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
