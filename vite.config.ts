import { resolve } from 'path'
import { defineConfig } from 'vite'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  build: {
    // Enable minification and optimization
    minify: 'terser',
    terserOptions: {
      compress: {
        // Aggressive optimizations
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info', 'console.debug'],
      },
      mangle: true,
    },
    rollupOptions: {
      output: {
        // Split chunks for better caching
        manualChunks: {
          phaser: ['phaser'],
          vendor: ['lodash'],
          game: [
            './src/game/Game.ts',
            './src/game/objects/Character.ts',
          ],
          scenes: [
            './src/game/scenes/GameScene.ts',
            './src/game/scenes/HUDScene.ts',
            './src/game/scenes/PreloadScene.ts',
            './src/game/scenes/VictoryScene.ts',
            './src/game/scenes/GameOverScene.ts',
          ]
        },
        // Generate asset file names with hashes for better caching
        assetFileNames: 'assets/[name]-[hash][extname]',
        chunkFileNames: 'js/[name]-[hash].js',
        entryFileNames: 'js/[name]-[hash].js',
      }
    },
    // Reduce chunk size warnings
    chunkSizeWarningLimit: 1000,
    // Enable source map for production (can be removed for smaller files)
    sourcemap: false,
    // Reduce CSS code splitting
    cssCodeSplit: false,
    // Target modern browsers for smaller bundle size
    target: 'esnext',
  },
  server: {
    // Optimize dev server
    hmr: {
      overlay: false, // Disable HMR overlay for performance
    },
  },
  // Optimize dependencies
  optimizeDeps: {
    include: ['phaser'],
    exclude: [],
  },
  // Set esbuild to minimize output
  esbuild: {
    minifyIdentifiers: true,
    minifySyntax: true,
    minifyWhitespace: true,
    keepNames: false,
    treeShaking: true,
  },
})
