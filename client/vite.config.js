import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    // Dev proxy — replaces setupProxy.js
    proxy: {
      '/api': 'http://localhost:5000',
    },
  },
})
