import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  resolve: {
    alias: {
      '@cineai/shared': path.resolve(__dirname, './shared/src'),
    },
  },
  test: {
    environment: 'node',
    setupFiles:  ['./vitest.setup.ts'],
  },
})
