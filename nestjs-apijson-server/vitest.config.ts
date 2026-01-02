import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    exclude: [
      'node_modules',
      'dist',
      '.idea',
      '.git',
      '.cache',
      'coverage',
    ],
    testTimeout: 10000,
    hookTimeout: 10000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'src/test/',
        'dist/',
        '**/*.d.ts',
        '**/*.spec.ts',
        '**/*.test.ts',
        '**/index.ts',
        '**/main.ts',
        '**/types/**/*.ts',
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
    },
    setupFiles: ['./src/test/setup.ts'],
    reporters: ['verbose', 'json'],
    outputFile: './test-results/results.json',
    testNamePattern: process.env.TEST_NAME_PATTERN || undefined,
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
});
