import { defineConfig } from 'vitest/config';
import type { PluginOption } from 'vite';
import react from '@vitejs/plugin-react';
import { execSync } from 'node:child_process';

/**
 * ビルドを識別する ID。
 * 公開後に「更新したのに古いままだ」となるのを避けるため、実行中の版と
 * 公開中の版を突き合わせるのに使う。コミットが同じならビルドし直しても同じ ID になる。
 */
function buildId(): string {
  try {
    return execSync('git rev-parse --short HEAD', {
      stdio: ['ignore', 'pipe', 'ignore'],
    })
      .toString()
      .trim();
  } catch {
    // git のない環境（zip 展開など）ではビルド時刻で代用する
    return Date.now().toString(36);
  }
}

const BUILD_ID = buildId();

/** 公開中の版を知らせるための version.json を dist に置く。 */
function emitVersion(): PluginOption {
  return {
    name: 'emit-version',
    apply: 'build',
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'version.json',
        source: JSON.stringify({ buildId: BUILD_ID }),
      });
    },
  };
}

// 個人学習用途のため base は相対パスにしておき、静的ホスティングでもそのまま動くようにする
export default defineConfig({
  plugins: [react(), emitVersion()],
  base: './',
  define: {
    __BUILD_ID__: JSON.stringify(BUILD_ID),
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
  },
});
