import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // Configuración adicional para asegurar que el servidor se comporte correctamente
  server: {
    port: 3000,
    open: true
  }
})
