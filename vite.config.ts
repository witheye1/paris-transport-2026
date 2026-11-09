import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

// Vercel에서는 base 설정 없이 루트(/)에서 서비스합니다.
// (GitHub Pages로 배포할 경우에만 base: '/paris-transport-2026/' 를 사용하세요.)
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
});
