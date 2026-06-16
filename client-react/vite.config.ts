import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import federation from '@originjs/vite-plugin-federation'

export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    federation({
      name: 'tease',
      filename: 'remoteEntry.js',
      exposes: {
        './Dashboard': './src/components/Dashboard',
      },
      shared: ['react', 'react-dom', 'zustand'],
    }),
  ],
  base: mode === 'traefik' ? '/tease/' : '/',
  build: {
    target: 'esnext',
    minify: mode !== 'development',
  },
  server: {
    port: 5173,
    proxy: {
      '/tease.v1.TeamAllocationService': {
        target: 'http://localhost:8081',
        changeOrigin: true,
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
    exclude: ['**/node_modules/**', '**/e2e/**'],
    coverage: {
      provider: 'v8',
    },
  },
}))
