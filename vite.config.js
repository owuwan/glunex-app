import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  // [중요] 빌드 시 경로 문제 해결을 위한 설정
  base: '/', 
  build: {
    outDir: 'dist',
  }
})