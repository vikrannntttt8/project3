import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Saavn.dev is CORS-friendly — no proxy needed.
// lrclib.net is also CORS-open.
export default defineConfig({
  plugins: [react()],
})
