import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist/orienta/browser', // Подстраиваемся под ожидание Timeweb из вашего скриншота, или меняем в настройках
  }
})