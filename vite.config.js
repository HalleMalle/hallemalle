import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // @를 src 폴더 절대 경로로 바인딩
      '@': path.resolve(__dirname, './src'),
    },
  },
})
