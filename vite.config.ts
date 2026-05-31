import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  // Vite dev server serves index.html for all routes automatically (SPA mode)
  // No extra config needed — React Router handles client-side routing
})

