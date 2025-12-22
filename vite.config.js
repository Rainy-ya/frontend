import { defineConfig } from 'vite'
import mkcert from 'vite-plugin-mkcert'

export default defineConfig({
  server: {
    https: true,
    host: true,    
    port: 5173,
    proxy: {
      '/ask': 'http://localhost:3000'
    }
  },
  plugins: [
    mkcert()
  ]
})
