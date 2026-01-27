import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// 복잡한 경로 설정 다 빼고 기본으로 갑니다.
export default defineConfig({
  plugins: [react()],
})