import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// 個人学習用途のため base は相対パスにしておき、静的ホスティングでもそのまま動くようにする
export default defineConfig({
  plugins: [react()],
  base: './',
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
  },
});
