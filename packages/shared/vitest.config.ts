import { defineConfig } from 'vitest/config';

export default defineConfig({
  cacheDir: './node_modules/.vite-shared',
  test: {
    include: ['src/**/*.spec.ts'],
    exclude: ['dist/**', 'node_modules/**'],
  },
});
