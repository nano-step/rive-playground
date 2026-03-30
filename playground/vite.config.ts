import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  assetsInclude: ['**/*.wasm'],
  base: '/rive-playground/playground/',
  build: {
    outDir: '../docs/playground',
    emptyOutDir: true,
  },
})
