import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Custom domain (amberbroihier.com) served from root, so base is '/'.
export default defineConfig({
  plugins: [react()],
  base: '/',
})
