import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  server: {
    port: 3000,
    open: true,
    host: true,
    proxy : {
      '/api' : {
        target: 'http://172.16.16.176:18080',
        changeOrigin: true,
      }
    }
  },
  plugins: [react()],
})
