import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Custom domain (amberbroihier.com) served from root, so base is '/'.
export default defineConfig({
  plugins: [react()],
  base: '/',
  build: {
    rollupOptions: {
      output: {
        // React and the router change only when we upgrade them, while the app
        // chunk changes on every deploy. Keeping them apart means a returning
        // visitor re-downloads the app code, not the framework underneath it.
        manualChunks(id) {
          if (!id.includes('node_modules')) return
          if (/node_modules\/(react|react-dom|scheduler|react-router|react-router-dom)\//.test(id)) {
            return 'react-vendor'
          }
        },
      },
    },
  },
})
