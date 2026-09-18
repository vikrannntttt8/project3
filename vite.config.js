import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api/saavn': {
        target: 'https://saavn.dev/api',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api\/saavn/, ''),
      },
      '/api/jiosaavn': {
        target: 'https://www.jiosaavn.com',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api\/jiosaavn/, ''),
      },
      '/api/yt': {
        target: 'https://www.youtube.com',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api\/yt/, ''),
      },
    },
  },
})
