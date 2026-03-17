import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'https://chat-app-backend-g19j.onrender.com',
        changeOrigin: true
      },
      '/socket.io': {
        target: 'https://chat-app-backend-g19j.onrender.com',
        ws: true,
        changeOrigin: true
      }
    }
  }
})
