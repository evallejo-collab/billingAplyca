import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/',
  define: {
    'process.env': process.env,
    global: 'globalThis',
    'globalThis.process': JSON.stringify({}),
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
    '__WS_TOKEN__': JSON.stringify('dev-token')
  },
  resolve: {
    alias: {
      // Fix for OpenAI module issues
      stream: 'stream-browserify',
      path: 'path-browserify',
      crypto: 'crypto-browserify'
    }
  },
  build: {
    assetsDir: 'assets',
    rollupOptions: {
      external: [],
      output: {
        assetFileNames: 'assets/[name]-[hash][extname]',
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js'
      }
    },
    commonjsOptions: {
      include: [/openai/, /node_modules/]
    }
  },
  optimizeDeps: {
    include: ['openai']
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      }
    }
  }
})
