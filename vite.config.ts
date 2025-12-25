import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],

  // Path aliases for cleaner imports
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@modules': path.resolve(__dirname, './src/modules'),
      '@shared': path.resolve(__dirname, './src/shared'),
      '@hooks': path.resolve(__dirname, './src/hooks'),
      '@components': path.resolve(__dirname, './src/components'),
      '@services': path.resolve(__dirname, './src/services'),
      '@types': path.resolve(__dirname, './src/types'),
    },
  },

  // Build optimizations
  build: {
    // Increase chunk size warning limit (Mermaid is large)
    chunkSizeWarningLimit: 600,

    rollupOptions: {
      output: {
        // Manual chunks for better caching
        manualChunks: {
          // React and core libraries
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          // ReactFlow (diagram rendering)
          'vendor-reactflow': ['reactflow'],
          // Mermaid (flowchart rendering)
          'vendor-mermaid': ['mermaid'],
          // MindElixir (mind map rendering)
          'vendor-mind-elixir': ['mind-elixir'],
          // Icons
          'vendor-icons': ['lucide-react'],
        },
      },
    },
  },

  // Development server config
  server: {
    port: 5173,
    strictPort: false,
    // Proxy API requests to backend in development
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
})
