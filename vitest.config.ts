import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    env: { NODE_ENV: 'test' },
    include: ['server/src/__tests__/**/*.test.ts', 'apps/**/__tests__/**/*.test.{ts,tsx}'],
  },
})
