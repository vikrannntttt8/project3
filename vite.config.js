import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Proxy Piped API calls to avoid CORS issues in dev
      '/piped': {
        target: 'https://pipedapi.kavin.rocks',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/piped/, ''),
      },
      // Proxy lrclib.net
      '/lrclib': {
        target: 'https://lrclib.net',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/lrclib/, ''),
      },
    },
  },
})
