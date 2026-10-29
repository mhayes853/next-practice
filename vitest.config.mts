import { configDefaults, defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    fileParallelism: false,
    projects: [
      {
        extends: true,
        test: {
          name: 'client',
          environment: 'jsdom',
          include: ['lib/client/**/*.test.{ts,tsx}', 'components/**/*.test.{ts,tsx}'],
        },
      },
      {
        extends: true,
        test: {
          name: 'default',
          environment: 'jsdom',
          exclude: [...configDefaults.exclude, 'lib/client/**', 'components/**'],
          setupFiles: ['./test/setup.ts'],
        },
      },
    ],
  },
})
