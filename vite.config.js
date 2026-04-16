import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    // 로컬 개발: `vercel dev`를 실행하면 포트 3000에서 API가 제공됩니다.
    // `npm run dev`만 사용할 경우 /api 요청은 vercel dev(포트 3000)로 프록시됩니다.
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
})
