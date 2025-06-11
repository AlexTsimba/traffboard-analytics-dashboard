/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'node',
    globals: true,
    setupFiles: ['./src/tests/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'], // Only include tests in src/
    exclude: [
      'node_modules/**',
      '.next/**',
      'dist/**',
      'tests/**', // Exclude Playwright tests
      '**/*.config.*'
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/**',
        '.next/**',
        'coverage/**',
        '**/*.config.*',
        '**/*.d.ts',
        'src/middleware.ts', // Exclude middleware from coverage
        'src/tests/**', // Exclude test files themselves
        'scripts/**'
      ],
      include: [
        'src/**/*.{ts,tsx}',
        '!src/**/*.test.{ts,tsx}',
        '!src/**/*.spec.{ts,tsx}'
      ],
      thresholds: {
        global: {
          branches: 75,
          functions: 75,
          lines: 75,
          statements: 75
        }
      }
    }
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@traffboard/normalization': resolve(__dirname, '../../packages/normalization'),
      '@traffboard/database': resolve(__dirname, '../../packages/database'),
      '@traffboard/auth': resolve(__dirname, '../../packages/auth'),
      '@traffboard/types': resolve(__dirname, '../../packages/types'),
    }
  }
});
