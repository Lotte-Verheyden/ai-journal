import { defineConfig, loadEnv } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const target = env.VITE_BACKEND_URL || 'http://localhost:3000'
  return {
    plugins: [svelte()],
    server: {
      proxy: {
        '/entries': { target, changeOrigin: true },
        '/images': { target, changeOrigin: true },
        '/question': { target, changeOrigin: true },
        '/questions': { target, changeOrigin: true },
        '/static-questions': { target, changeOrigin: true },
        '/wildcard-categories': { target, changeOrigin: true },
      },
    },
  }
})
